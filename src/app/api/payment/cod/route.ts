import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/order.service';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sanitizeNoSql } from '@/lib/sanitize';

/**
 * REST Endpoint: POST /api/payment/cod
 * 
 * Production protections:
 * - Rate limiting (max 10 checkout orders per minute per IP)
 * - NoSQL injection sanitization
 * - Idempotency via 'Idempotency-Key' header or body
 * - Server-side canonical price re-validation via OrderService
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Rate Limiting Protection
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`cod_${clientIp}`, 10, 60000);
        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment before trying again.' },
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

        // 2. Parse & Sanitize Input
        const rawBody = await req.json();
        const body = sanitizeNoSql(rawBody);
        const { userId, email, items, address, shipping, couponCode } = body;

        const isGuest = !userId || userId === 'guest';

        if ((!userId && !isGuest) || !items?.length || !address) {
            return NextResponse.json({ error: 'Missing required delivery or item fields' }, { status: 400 });
        }

        const idempotencyKey = req.headers.get('idempotency-key') || body.idempotencyKey || null;

        // 3. Delegate to Domain Service
        const result = await OrderService.createCodOrder({
            userId,
            email,
            items,
            address,
            shipping,
            couponCode,
            idempotencyKey,
        });

        return NextResponse.json(result);
    } catch (err) {
        console.error('COD order error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
    }
}
