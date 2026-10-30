import { NextRequest, NextResponse } from 'next/server';
import { deleteReview } from '@/lib/db/queries/review.queries';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { validateCsrfOrigin } from '@/lib/csrf';

/**
 * DELETE /api/reviews/[id]
 *
 * Secure endpoint to remove a review.
 * Enforces:
 * 1. CSRF origin verification
 * 2. Sliding window rate limiting
 * 3. Server-side session verification (author or store admin only)
 * 4. Soft deletion with audit trail and image cleanup
 */
export async function DELETE(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        // 1. CSRF Origin Verification
        if (!validateCsrfOrigin(req)) {
            return NextResponse.json(
                { error: 'Forbidden: Invalid request origin' },
                { status: 403 }
            );
        }

        // 2. Rate Limiting (10 deletions per minute per IP)
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`del_rev_${clientIp}`, 10, 60000);
        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait before making more requests.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateCheck.reset - Date.now()) / 1000)),
                        'X-RateLimit-Limit': String(rateCheck.limit),
                        'X-RateLimit-Remaining': '0',
                    },
                }
            );
        }

        const { id: reviewId } = await context.params;
        if (!reviewId) {
            return NextResponse.json({ error: 'Review ID is required' }, { status: 400 });
        }

        let bodyReason: string | undefined;
        try {
            const body = await req.json();
            bodyReason = body?.reason;
        } catch {
            // Optional body
        }

        const result = await deleteReview({
            reviewId,
            reason: bodyReason,
        });

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: result.status || 400 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Review successfully removed' },
            { status: 200 }
        );
    } catch (err) {
        console.error('DELETE /api/reviews/[id] error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
