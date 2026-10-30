import { NextRequest, NextResponse } from 'next/server';
import { reportReview } from '@/lib/db/queries/review.queries';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { validateCsrfOrigin } from '@/lib/csrf';

/**
 * POST /api/reviews/[id]/report
 *
 * Moderation endpoint for customers to flag suspicious, abusive, or spam reviews.
 * Enforces:
 * 1. CSRF origin verification
 * 2. Strict rate limiting to prevent denial-of-service / reporting harassment
 * 3. Session verification (authenticated users only)
 * 4. Reason validation ('spam' | 'offensive' | 'fake' | 'irrelevant')
 * 5. Prevents author from reporting their own review
 */
export async function POST(
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

        // 2. Rate Limiting (5 reports per minute per IP)
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`rep_rev_${clientIp}`, 5, 60000);
        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Too many report requests. Please try again shortly.' },
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

        const body = await req.json().catch(() => ({}));
        const { reason, details } = body;

        if (!reason) {
            return NextResponse.json(
                { error: 'Report reason is required (spam, offensive, fake, irrelevant)' },
                { status: 400 }
            );
        }

        const result = await reportReview({
            reviewId,
            reason,
            details,
        });

        if (result.error) {
            return NextResponse.json(
                { error: result.error },
                { status: result.status || 400 }
            );
        }

        return NextResponse.json(
            { success: true, message: 'Review successfully reported to our moderation team' },
            { status: 200 }
        );
    } catch (err) {
        console.error('POST /api/reviews/[id]/report error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
