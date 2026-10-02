"use server";

import connectToDatabase from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import type { UserOrder } from './types';

export async function getUserOrders(userId: string): Promise<UserOrder[]> {
    await connectToDatabase();
    const orders = await Order.find({ userId, isDeleted: { $ne: true } })
        .sort({ createdAt: -1 })
        .lean();

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
    return Order.countDocuments({ userId, isDeleted: { $ne: true } });
}

/**
 * Fetch a single order by orderNumber with optional customer access verification
 */
export async function getOrderByOrderNumber(
    orderNumber: string,
    accessCheck?: { userId?: string | null; phone?: string | null }
): Promise<UserOrder | null> {
    await connectToDatabase();
    const o = await Order.findOne({ orderNumber, isDeleted: { $ne: true } }).lean();
    if (!o) return null;

    // Authorization Guard: if accessCheck is supplied, ensure customer owns the order
    if (accessCheck) {
        const matchesUser = accessCheck.userId && o.userId && o.userId === accessCheck.userId;
        const matchesPhone = accessCheck.phone && o.shippingPhone && o.shippingPhone.replace(/\D/g, '').endsWith(accessCheck.phone.replace(/\D/g, '').slice(-8));

        if (!matchesUser && !matchesPhone) {
            return null; // Unauthorized to view another user's order
        }
    }

    return {
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
    };
}
