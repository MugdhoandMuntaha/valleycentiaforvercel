import connectToDatabase from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import { OrderService } from './order.service';
import { jobQueue } from '@/lib/queue/jobQueue';

export interface ReconciliationResult {
    processed: number;
    recovered: number;
    failed: number;
    skipped: number;
    details: Array<{
        orderNumber: string;
        transactionId: string;
        status: string;
        action: 'CONFIRMED' | 'MARKED_FAILED' | 'SKIPPED';
    }>;
}

/**
 * Payment Reconciliation Engine
 * Automatically recovers dropped or unconfirmed payment sessions by cross-referencing
 * pending database orders with SSLCommerz gateway records.
 */
export class PaymentReconciliationService {
    static async reconcilePendingPayments(): Promise<ReconciliationResult> {
        await connectToDatabase();

        const store_id = process.env.SSLCOMMERZ_STORE_ID;
        const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const is_sandbox = process.env.SSLCOMMERZ_IS_SANDBOX === 'true';

        const result: ReconciliationResult = {
            processed: 0,
            recovered: 0,
            failed: 0,
            skipped: 0,
            details: [],
        };

        if (!store_id || !store_passwd) {
            console.warn('[Reconciliation] SSLCommerz credentials missing; skipping reconciliation');
            return result;
        }

        // Look for orders that were initiated between 15 minutes ago and 24 hours ago
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const pendingOrders = await Order.find({
            paymentMethod: 'credit_card',
            status: 'pending',
            createdAt: { $gte: oneDayAgo, $lte: fifteenMinutesAgo },
            isDeleted: { $ne: true },
        }).lean();

        result.processed = pendingOrders.length;

        for (const order of pendingOrders) {
            const tran_id = order.transactionId;
            if (!tran_id) {
                result.skipped++;
                continue;
            }

            try {
                const queryUrl = is_sandbox
                    ? `https://sandbox.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=${encodeURIComponent(tran_id)}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&format=json`
                    : `https://securepay.sslcommerz.com/validator/api/merchantTransIDvalidationAPI.php?tran_id=${encodeURIComponent(tran_id)}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&format=json`;

                const res = await fetch(queryUrl);
                if (!res.ok) {
                    result.skipped++;
                    continue;
                }

                const data = await res.json();
                const element = Array.isArray(data?.element) ? data.element[0] : data?.element;

                if (element && (element.status === 'VALID' || element.status === 'VALIDATED')) {
                    // Gateway confirmed payment was successful -> idempotently capture
                    await OrderService.confirmOnlinePayment({
                        tran_id,
                        val_id: element.val_id || null,
                        status: element.status,
                    });

                    result.recovered++;
                    result.details.push({
                        orderNumber: order.orderNumber,
                        transactionId: tran_id,
                        status: element.status,
                        action: 'CONFIRMED',
                    });
                } else if (element && (element.status === 'FAILED' || element.status === 'CANCELLED')) {
                    await Order.updateOne({ _id: order._id }, {
                        $set: { status: 'failed', paymentStatus: 'failed' },
                        $push: { statusHistory: { status: 'failed', note: `Reconciled: Gateway status ${element.status}` } },
                    });

                    result.failed++;
                    result.details.push({
                        orderNumber: order.orderNumber,
                        transactionId: tran_id,
                        status: element.status,
                        action: 'MARKED_FAILED',
                    });
                } else {
                    result.skipped++;
                    result.details.push({
                        orderNumber: order.orderNumber,
                        transactionId: tran_id,
                        status: element?.status || 'UNKNOWN',
                        action: 'SKIPPED',
                    });
                }
            } catch (err) {
                console.error(`[Reconciliation] Error reconciling tran_id ${tran_id}:`, err);
                result.skipped++;
            }
        }

        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'reconciliation',
            recordId: `REC_${Date.now()}`,
            action: 'INSERT',
            newData: {
                processed: result.processed,
                recovered: result.recovered,
                failed: result.failed,
            },
        });

        return result;
    }
}
