import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Order, { IOrder } from '@/lib/models/Order';
import CartItem from '@/lib/models/CartItem';
import { updateStockForOrder, restoreStockForOrder } from '@/lib/db/queries';
import { validateAndCalculateOrder, IncomingOrderItem, VerifiedOrderCalculation } from '@/lib/orderValidation';
import { jobQueue } from '@/lib/queue/jobQueue';
import { VALID_ORDER_TRANSITIONS } from '@/lib/constants/orderTransitions';
export { VALID_ORDER_TRANSITIONS };

export interface UpdateOrderStatusParams {
    orderIdOrNumber: string;
    newStatus: string;
    note?: string | null;
    changedBy?: string | null;
    trackingNumber?: string | null;
    trackingUrl?: string | null;
}

export interface UpdateOrderStatusResult {
    success: boolean;
    orderNumber?: string;
    previousStatus?: string;
    currentStatus?: string;
    error?: string;
}

export interface DeliveryAddress {
    full_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    state: string;
    postal_code: string;
    country?: string;
}

export interface CreateOrderParams {
    userId?: string | null;
    email?: string | null;
    items: IncomingOrderItem[];
    address: DeliveryAddress;
    shipping?: number;
    couponCode?: string | null;
    idempotencyKey?: string | null;
}

export interface OrderResult {
    success: boolean;
    orderNumber: string;
    orderId: string | mongoose.Types.ObjectId;
    items: Array<{
        name: string;
        quantity: number;
        price: number;
        size?: string;
    }>;
    address: DeliveryAddress;
    subtotal: number;
    shipping: number;
    tax: number;
    total: number;
    isDuplicate?: boolean;
}

export interface InitiatePaymentParams extends CreateOrderParams {
    baseUrl?: string;
}

export interface InitiatePaymentResult {
    success: boolean;
    orderNumber: string;
    orderId: string | mongoose.Types.ObjectId;
    transactionId: string;
    gatewayUrl?: string | null;
    sessionKey?: string | null;
    isDuplicate?: boolean;
    error?: string;
}

export interface ConfirmPaymentParams {
    tran_id: string;
    val_id?: string | null;
    status: string;
}

export interface ConfirmPaymentResult {
    success: boolean;
    orderNumber?: string;
    isDuplicate?: boolean;
    error?: string;
}

function generateOrderNumber(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random6 = Math.floor(100000 + Math.random() * 900000);
    return `VC-${day}${month}-${random6}`;
}

/**
 * Domain Service: Order & Checkout Management
 * 
 * Implements core business logic:
 * - Idempotent order placement & payment callbacks
 * - Canonical server-side price re-validation
 * - Atomic inventory decrement
 * - Decoupled asynchronous post-processing (audit logs, stock sync, notifications)
 */
export class OrderService {
    /**
     * Process a Cash on Delivery (COD) order idempotently
     */
    static async createCodOrder(params: CreateOrderParams): Promise<OrderResult> {
        await connectToDatabase();

        const isGuest = !params.userId || params.userId === 'guest';
        const idempotencyKey = params.idempotencyKey || null;

        // 1. Idempotency Check: prevent duplicate orders on retry or double-submission
        if (idempotencyKey) {
            const existingOrder = await Order.findOne({ idempotencyKey }).lean();
            if (existingOrder) {
                return {
                    success: true,
                    orderNumber: existingOrder.orderNumber,
                    orderId: String(existingOrder._id),
                    items: (existingOrder.orderItems || []).map(i => ({
                        name: i.productName,
                        quantity: i.quantity,
                        price: i.unitPrice,
                        size: i.sizeLabel || undefined,
                    })),
                    address: {
                        full_name: existingOrder.shippingName || '',
                        phone: existingOrder.shippingPhone || '',
                        address_line_1: existingOrder.shippingAddressLine1 || '',
                        address_line_2: existingOrder.shippingAddressLine2,
                        city: existingOrder.shippingCity || '',
                        state: existingOrder.shippingState || '',
                        postal_code: existingOrder.shippingPostalCode || '',
                        country: existingOrder.shippingCountry || 'Bangladesh',
                    },
                    subtotal: existingOrder.subtotal,
                    shipping: existingOrder.shippingCost,
                    tax: existingOrder.tax,
                    total: existingOrder.total,
                    isDuplicate: true,
                };
            }
        }

        // 2. Server-side price & coupon re-validation
        const calculation: VerifiedOrderCalculation = await validateAndCalculateOrder(
            params.items,
            params.couponCode || null,
            typeof params.shipping === 'number' ? params.shipping : undefined
        );

        const orderNumber = generateOrderNumber();

        // 3. Persist Order with verified calculations and snapshot
        const order = await Order.create({
            userId: isGuest ? null : params.userId,
            orderNumber,
            idempotencyKey,
            shippingName: params.address.full_name,
            shippingPhone: params.address.phone,
            shippingAddressLine1: params.address.address_line_1,
            shippingAddressLine2: params.address.address_line_2 || null,
            shippingCity: params.address.city,
            shippingState: params.address.state,
            shippingPostalCode: params.address.postal_code,
            shippingCountry: params.address.country || 'Bangladesh',
            subtotal: calculation.subtotal,
            discountAmount: calculation.discountAmount,
            shippingCost: calculation.shippingCost,
            tax: calculation.tax,
            total: calculation.total,
            couponId: calculation.couponId,
            couponCode: calculation.couponCode,
            currency: 'BDT',
            status: 'confirmed',
            paymentStatus: 'pending',
            paymentMethod: 'cod',
            orderItems: calculation.orderItems,
            statusHistory: [{ status: 'confirmed', note: 'COD order confirmed' }],
        });

        if (!order) {
            throw new Error('Failed to create order in database');
        }

        // 4. Update stock quantities atomically
        await updateStockForOrder(calculation.orderItems);

        // 5. Clear guest or user database cart
        if (!isGuest && params.userId) {
            await CartItem.deleteMany({ userId: params.userId });
        }

        // 6. Enqueue asynchronous background jobs (non-blocking)
        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'orders',
            recordId: String(order._id),
            action: 'INSERT',
            newData: { orderNumber, total: calculation.total, method: 'cod' },
            performedBy: !isGuest ? params.userId : null,
        });

        jobQueue.enqueue('INVENTORY_SYNC', {
            productIds: calculation.orderItems.map(i => i.productId),
        });

        jobQueue.enqueue('ORDER_NOTIFICATION', {
            orderNumber,
            orderId: String(order._id),
            customerEmail: params.email || null,
            customerPhone: params.address.phone,
            total: calculation.total,
            paymentMethod: 'Cash on Delivery',
        });

        return {
            success: true,
            orderNumber,
            orderId: order._id,
            items: calculation.orderItems.map(i => ({
                name: i.productName,
                quantity: i.quantity,
                price: i.unitPrice,
                size: i.sizeLabel || undefined,
            })),
            address: params.address,
            subtotal: calculation.subtotal,
            shipping: calculation.shippingCost,
            tax: calculation.tax,
            total: calculation.total,
        };
    }

    /**
     * Initiate an Online Gateway Payment order idempotently
     */
    static async initiateOnlinePayment(params: InitiatePaymentParams): Promise<InitiatePaymentResult> {
        await connectToDatabase();

        const isGuest = !params.userId || params.userId === 'guest';
        const idempotencyKey = params.idempotencyKey || null;

        // 1. Idempotency Check
        if (idempotencyKey) {
            const existingOrder = await Order.findOne({ idempotencyKey }).lean();
            if (existingOrder) {
                return {
                    success: true,
                    orderNumber: existingOrder.orderNumber,
                    orderId: String(existingOrder._id),
                    transactionId: existingOrder.transactionId || '',
                    isDuplicate: true,
                };
            }
        }

        // 2. Server-side canonical price re-validation
        const calculation = await validateAndCalculateOrder(
            params.items,
            params.couponCode || null,
            typeof params.shipping === 'number' ? params.shipping : undefined
        );

        const orderNumber = generateOrderNumber();
        const tran_id = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

        // 3. Create Pending Order
        const order = await Order.create({
            userId: isGuest ? null : params.userId,
            orderNumber,
            idempotencyKey,
            shippingName: params.address.full_name,
            shippingPhone: params.address.phone,
            shippingAddressLine1: params.address.address_line_1,
            shippingAddressLine2: params.address.address_line_2 || null,
            shippingCity: params.address.city,
            shippingState: params.address.state,
            shippingPostalCode: params.address.postal_code,
            shippingCountry: params.address.country || 'Bangladesh',
            subtotal: calculation.subtotal,
            discountAmount: calculation.discountAmount,
            shippingCost: calculation.shippingCost,
            tax: calculation.tax,
            total: calculation.total,
            couponId: calculation.couponId,
            couponCode: calculation.couponCode,
            currency: 'BDT',
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: 'credit_card',
            transactionId: tran_id,
            orderItems: calculation.orderItems,
            statusHistory: [{ status: 'pending', note: 'Online payment initiated' }],
        });

        if (!order) {
            throw new Error('Failed to create order');
        }

        // 4. Initiate SSLCommerz Session
        const store_id = process.env.SSLCOMMERZ_STORE_ID || '';
        const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD || '';
        const is_sandbox = process.env.SSLCOMMERZ_IS_SANDBOX === 'true';
        const base_url = params.baseUrl || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

        const SSLCOMMERZ_API = is_sandbox
            ? 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php'
            : 'https://securepay.sslcommerz.com/gwprocess/v4/api.php';

        const sslParams = new URLSearchParams({
            store_id,
            store_passwd,
            total_amount: String(calculation.total),
            currency: 'BDT',
            tran_id,
            success_url: `${base_url}/api/payment/success`,
            fail_url: `${base_url}/api/payment/fail`,
            cancel_url: `${base_url}/api/payment/cancel`,
            ipn_url: `${base_url}/api/payment/success`,
            shipping_method: 'Courier',
            product_name: calculation.orderItems.map(i => i.productName).join(', ').substring(0, 200),
            product_category: 'Beauty & Personal Care',
            product_profile: 'physical-goods',
            cus_name: params.address.full_name,
            cus_email: params.email || 'customer@valleycentia.com',
            cus_add1: params.address.address_line_1,
            cus_add2: params.address.address_line_2 || '',
            cus_city: params.address.city,
            cus_state: params.address.state,
            cus_postcode: params.address.postal_code,
            cus_country: params.address.country || 'Bangladesh',
            cus_phone: params.address.phone,
            ship_name: params.address.full_name,
            ship_add1: params.address.address_line_1,
            ship_city: params.address.city,
            ship_state: params.address.state,
            ship_postcode: params.address.postal_code,
            ship_country: params.address.country || 'Bangladesh',
        });

        let gatewayUrl: string | null = null;
        let sessionKey: string | null = null;
        let gatewayError: string | null = null;

        if (store_id && store_passwd) {
            try {
                const sslRes = await fetch(SSLCOMMERZ_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: sslParams.toString(),
                });

                const sslData = await sslRes.json();
                if (sslData?.GatewayPageURL) {
                    gatewayUrl = sslData.GatewayPageURL;
                    sessionKey = sslData.sessionkey;
                    await Order.updateOne({ _id: order._id }, { $set: { sslSessionKey: sessionKey } });
                } else {
                    console.error('[OrderService:GATEWAY_FAIL]', sslData);
                    gatewayError = sslData?.failedreason || 'Payment gateway initialization failed';
                }
            } catch (gatewayErr) {
                console.error('[OrderService:GATEWAY_ERROR]', gatewayErr);
                gatewayError = gatewayErr instanceof Error ? gatewayErr.message : 'Gateway communication error';
            }
        } else {
            gatewayError = 'Payment gateway credentials are not configured';
        }

        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'orders',
            recordId: String(order._id),
            action: 'INSERT',
            newData: { orderNumber, total: calculation.total, tran_id },
            performedBy: !isGuest ? params.userId : null,
        });

        if (!gatewayUrl) {
            return {
                success: false,
                orderNumber,
                orderId: order._id,
                transactionId: tran_id,
                error: gatewayError || 'Payment gateway error',
            };
        }

        return {
            success: true,
            orderNumber,
            orderId: order._id,
            transactionId: tran_id,
            gatewayUrl,
            sessionKey,
        };
    }

    /**
     * Confirm an online payment callback/webhook idempotently
     */
    static async confirmOnlinePayment(params: ConfirmPaymentParams): Promise<ConfirmPaymentResult> {
        await connectToDatabase();

        const { tran_id, val_id, status } = params;
        if (!tran_id) {
            return { success: false, error: 'Missing transaction identifier' };
        }

        const existingOrder = await Order.findOne({ transactionId: tran_id });
        if (!existingOrder) {
            return { success: false, error: 'Order not found for transaction' };
        }

        // Webhook Idempotency Guard: If already confirmed, acknowledge without re-running actions
        if (existingOrder.status === 'confirmed' || existingOrder.paymentStatus === 'captured') {
            return {
                success: true,
                orderNumber: existingOrder.orderNumber,
                isDuplicate: true,
            };
        }

        let isValid = status === 'VALID' || status === 'VALIDATED';

        // Server-to-server validation
        const store_id = process.env.SSLCOMMERZ_STORE_ID;
        const store_passwd = process.env.SSLCOMMERZ_STORE_PASSWORD;
        const is_sandbox = process.env.SSLCOMMERZ_IS_SANDBOX === 'true';

        if (isValid && val_id && store_id && store_passwd) {
            try {
                const validateUrl = is_sandbox
                    ? `https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&v=1&format=json`
                    : `https://securepay.sslcommerz.com/validator/api/validationserverAPI.php?val_id=${encodeURIComponent(val_id)}&store_id=${encodeURIComponent(store_id)}&store_passwd=${encodeURIComponent(store_passwd)}&v=1&format=json`;

                const valRes = await fetch(validateUrl);
                if (valRes.ok) {
                    const valData = await valRes.json();
                    if (valData.status !== 'VALID' && valData.status !== 'VALIDATED') {
                        console.error('[OrderService:VALIDATION_FAIL]', valData);
                        isValid = false;
                    }
                }
            } catch (err) {
                console.error('[OrderService:VALIDATION_ERROR]', err);
            }
        }

        if (!isValid) {
            await Order.updateOne({ _id: existingOrder._id }, {
                $set: { status: 'failed', paymentStatus: 'failed' },
                $push: { statusHistory: { status: 'failed', note: 'Payment validation failed' } },
            });
            return { success: false, orderNumber: existingOrder.orderNumber, error: 'Payment validation failed' };
        }

        // Confirm order
        const order = await Order.findOneAndUpdate(
            { _id: existingOrder._id, status: 'pending' },
            {
                status: 'confirmed',
                paymentStatus: 'captured',
                sslValId: val_id || null,
                $push: { statusHistory: { status: 'confirmed', note: 'Payment validated and captured' } },
            },
            { new: true }
        );

        if (!order) {
            // Concurrently confirmed by another IPN thread
            return { success: true, orderNumber: existingOrder.orderNumber, isDuplicate: true };
        }

        // Update inventory atomically
        await updateStockForOrder(order.orderItems);

        // Clear cart
        if (order.userId) {
            await CartItem.deleteMany({ userId: order.userId });
        }

        // Enqueue background jobs
        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'orders',
            recordId: String(order._id),
            action: 'UPDATE',
            newData: { status: 'confirmed', paymentStatus: 'captured', sslValId: val_id },
        });

        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'payments',
            recordId: tran_id,
            action: 'UPDATE',
            newData: {
                orderNumber: order.orderNumber,
                tran_id,
                val_id,
                status,
                paymentStatus: 'captured',
                confirmedAt: new Date().toISOString(),
            },
        });

        jobQueue.enqueue('INVENTORY_SYNC', {
            productIds: order.orderItems.map(i => i.productId),
        });

        jobQueue.enqueue('ORDER_NOTIFICATION', {
            orderNumber: order.orderNumber,
            orderId: String(order._id),
            total: order.total,
            paymentMethod: 'Online Payment (SSLCommerz)',
        });

        return {
            success: true,
            orderNumber: order.orderNumber,
        };
    }

    /**
     * State Machine: Transitions order status safely with inventory and audit safeguards
     */
    static async updateOrderStatus(params: UpdateOrderStatusParams): Promise<UpdateOrderStatusResult> {
        await connectToDatabase();

        const isObjectId = mongoose.Types.ObjectId.isValid(params.orderIdOrNumber);
        const query = isObjectId
            ? { _id: params.orderIdOrNumber, isDeleted: { $ne: true } }
            : { orderNumber: params.orderIdOrNumber, isDeleted: { $ne: true } };

        const order = await Order.findOne(query);
        if (!order) {
            return { success: false, error: 'Order not found' };
        }

        const currentStatus = order.status;
        const newStatus = params.newStatus;

        if (currentStatus === newStatus) {
            return {
                success: true,
                orderNumber: order.orderNumber,
                previousStatus: currentStatus,
                currentStatus: newStatus,
            };
        }

        const allowedTransitions = VALID_ORDER_TRANSITIONS[currentStatus] || [];
        if (!allowedTransitions.includes(newStatus)) {
            return {
                success: false,
                error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Allowed transitions: [${allowedTransitions.join(', ')}]`,
            };
        }

        // Inventory safety: If transitioning from confirmed/processing to cancelled, restore stock
        if (newStatus === 'cancelled' && (currentStatus === 'confirmed' || currentStatus === 'processing')) {
            await restoreStockForOrder(order.orderItems);
        }

        // Update fields
        order.status = newStatus;
        if (params.trackingNumber) order.trackingNumber = params.trackingNumber;
        if (params.trackingUrl) order.trackingUrl = params.trackingUrl;
        if (newStatus === 'cancelled') {
            order.cancelledAt = new Date();
            if (params.note) order.cancellationReason = params.note;
        }
        if (newStatus === 'delivered') {
            order.deliveredAt = new Date();
        }

        order.statusHistory.push({
            status: newStatus,
            note: params.note || `Status transitioned from ${currentStatus} to ${newStatus}`,
            changedBy: params.changedBy && mongoose.Types.ObjectId.isValid(params.changedBy)
                ? new mongoose.Types.ObjectId(params.changedBy)
                : null,
            createdAt: new Date(),
        } as any);

        await order.save();

        // Enqueue background audit log
        jobQueue.enqueue('AUDIT_LOG', {
            tableName: 'orders',
            recordId: String(order._id),
            action: 'UPDATE',
            oldData: { status: currentStatus },
            newData: { status: newStatus, note: params.note },
            performedBy: params.changedBy || null,
        });

        // Enqueue customer notification
        jobQueue.enqueue('ORDER_NOTIFICATION', {
            orderNumber: order.orderNumber,
            orderId: String(order._id),
            total: order.total,
            status: newStatus,
        });

        return {
            success: true,
            orderNumber: order.orderNumber,
            previousStatus: currentStatus,
            currentStatus: newStatus,
        };
    }
}
