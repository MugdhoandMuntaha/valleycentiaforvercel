"use server";

import connectToDatabase from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import type { UserOrder } from './types';

export async function getUserOrders(userId: string): Promise<UserOrder[]> {
    await connectToDatabase();
    const orders = await Order.find({ userId }).sort({ createdAt: -1 }).lean();

    return orders.map(o => ({
        id: String(o._id),
        order_number: o.orderNumber,
        status: o.status,
        payment_status: o.paymentStatus,
        subtotal: o.subtotal,
        shipping_cost: o.shippingCost,
        tax: o.tax,
        total: o.total,
        shipping_name: o.shippingName || '',
        shipping_city: o.shippingCity || '',
        shipping_state: o.shippingState || '',
        created_at: o.createdAt.toISOString(),
        order_items: (o.orderItems || []).map(item => ({
            id: String(item._id),
            product_id: String(item.productId),
            product_name: item.productName,
            product_image: item.productImage || null,
            product_slug: item.productSlug || null,
            size: item.sizeLabel || null,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
        })),
    }));
}

export async function getUserOrderCount(userId: string): Promise<number> {
    await connectToDatabase();
    return Order.countDocuments({ userId });
}
