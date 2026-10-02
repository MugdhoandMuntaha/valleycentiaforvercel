import { NextRequest, NextResponse } from 'next/server';
import { OrderService } from '@/lib/services/order.service';

/**
 * Controller: SSLCommerz Payment Success & IPN Webhook Handler
 * 
 * HTTP Transport layer delegating validation, idempotency guard,
 * inventory decrement, and background events to OrderService.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const tran_id = formData.get('tran_id') as string;
        const val_id = (formData.get('val_id') as string) || null;
        const status = (formData.get('status') as string) || '';

        if (!tran_id) {
            return NextResponse.redirect(new URL('/checkout/fail', req.url));
        }

        const result = await OrderService.confirmOnlinePayment({
            tran_id,
            val_id,
            status,
        });

        if (result.success && result.orderNumber) {
            return NextResponse.redirect(
                new URL(`/checkout/success?order=${encodeURIComponent(result.orderNumber)}`, req.url)
            );
        }

        return NextResponse.redirect(new URL('/checkout/fail', req.url));
    } catch (err) {
        console.error('[PaymentSuccessControllerError]', err);
        return NextResponse.redirect(new URL('/checkout/fail', req.url));
    }
}
