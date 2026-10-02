import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/order.service';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';
import { sanitizeNoSql } from '@/lib/sanitize';

/**
 * Controller: Initiate Online Gateway Payment
 * 
 * Production protections:
 * - Rate limiting (max 15 payment session inits per minute per IP)
 * - NoSQL injection sanitization
 * - HTTP Transport layer delegating business logic to OrderService:
 *   - Extracts transport request payload and idempotency headers
 *   - Enforces validation of required fields
 *   - Delegates order creation and gateway session initialization to domain service
 *   - Returns exact contract `{ url, orderNumber }` expected by checkout frontend
 */
export async function POST(req: NextRequest) {
    try {
        // 1. Rate Limiting Protection
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`pay_init_${clientIp}`, 15, 60000);
        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Too many payment requests. Please wait a moment before trying again.' },
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
        const { userId, items, address, shipping, couponCode, email } = body;
        const idempotencyKey = req.headers.get('x-idempotency-key') || req.headers.get('idempotency-key') || body.idempotencyKey || null;

        const isGuest = !userId || userId === 'guest';
        if ((!userId && !isGuest) || !items?.length || !address) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const result = await OrderService.initiateOnlinePayment({
            userId,
            email,
            items,
            address,
            shipping,
            couponCode,
            idempotencyKey,
            baseUrl,
        });

        if (!result.success || !result.gatewayUrl) {
            return NextResponse.json(
                { error: result.error || 'Payment gateway initialization failed' },
                { status: 500 }
            );
        }

        return NextResponse.json({
            url: result.gatewayUrl,
            orderNumber: result.orderNumber,
        });
    } catch (err) {
        console.error('[PaymentInitControllerError]', err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Internal server error' },
            { status: 500 }
        );
    }
}
