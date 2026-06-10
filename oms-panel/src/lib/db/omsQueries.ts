"use server";

import { revalidatePath } from 'next/cache';
import connectToDatabase from '@/lib/mongodb';
import Order from '@/lib/models/Order';
import Product from '@/lib/models/Product';
import User from '@/lib/models/User';
import CartItem from '@/lib/models/CartItem';

// Prevent tree-shaking from removing these models so they register in Mongoose populate
const _mongooseModelRegistryGuard = [Order, Product, User, CartItem];

// ============================================================================
// TYPES
// ============================================================================

export interface AdminOrder {
    id: string;
    order_number: string;
    status: string;
    payment_status: string;
    payment_method: string | null;
    subtotal: number;
    discount_amount: number;
    shipping_cost: number;
    tax: number;
    total: number;
    coupon_code: string | null;
    currency: string;
    shipping_name: string | null;
    shipping_phone: string | null;
    created_at: string;
}

export interface AdminOrderItem {
    id: string;
    product_id: string;
    product_name: string;
    product_image: string | null;
    product_slug: string | null;
    size_label: string | null;
    unit_price: number;
    original_price: number | null;
    quantity: number;
    total_price: number;
}

export interface AdminStatusHistory {
    id: string;
    status: string;
    note: string | null;
    changed_by: string | null;
    created_at: string;
}

export interface AdminOrderDetail extends AdminOrder {
    shipping_address_line_1: string | null;
    shipping_address_line_2: string | null;
    shipping_city: string | null;
    shipping_state: string | null;
    shipping_postal_code: string | null;
    shipping_country: string;
    billing_name: string | null;
    billing_phone: string | null;
    billing_address_line_1: string | null;
    billing_address_line_2: string | null;
    billing_city: string | null;
    billing_state: string | null;
    billing_postal_code: string | null;
    billing_country: string;
    notes: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    estimated_delivery: string | null;
    delivered_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    transaction_id: string | null;
    order_items: AdminOrderItem[];
    status_history: AdminStatusHistory[];
}

export interface AdminOrderStats {
    totalRevenue: number;
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
}

// ============================================================================
// ORDERS CRUD & STATS
// ============================================================================

export async function getAdminOrders(): Promise<AdminOrder[]> {
    await connectToDatabase();
    const orders = await Order.find().sort({ createdAt: -1 }).lean();
    return orders.map(o => ({
        id: String(o._id),
        order_number: o.orderNumber,
        status: o.status,
        payment_status: o.paymentStatus,
        payment_method: o.paymentMethod || null,
        subtotal: o.subtotal,
        discount_amount: o.discountAmount || 0,
        shipping_cost: o.shippingCost || 0,
        tax: o.tax || 0,
        total: o.total,
        coupon_code: o.couponCode || null,
        currency: o.currency || 'BDT',
        shipping_name: o.shippingName || null,
        shipping_phone: o.shippingPhone || null,
        created_at: o.createdAt.toISOString(),
    }));
}

export async function getAdminOrderById(id: string): Promise<AdminOrderDetail | null> {
    await connectToDatabase();
    const o = await Order.findById(id).lean();
    if (!o) return null;

    return {
        id: String(o._id),
        order_number: o.orderNumber,
        status: o.status,
        payment_status: o.paymentStatus,
        payment_method: o.paymentMethod || null,
        subtotal: o.subtotal,
        discount_amount: o.discountAmount || 0,
        shipping_cost: o.shippingCost || 0,
        tax: o.tax || 0,
        total: o.total,
        coupon_code: o.couponCode || null,
        currency: o.currency || 'BDT',
        shipping_name: o.shippingName || null,
        shipping_phone: o.shippingPhone || null,
        created_at: o.createdAt.toISOString(),

        shipping_address_line_1: o.shippingAddressLine1 || null,
        shipping_address_line_2: o.shippingAddressLine2 || null,
        shipping_city: o.shippingCity || null,
        shipping_state: o.shippingState || null,
        shipping_postal_code: o.shippingPostalCode || null,
        shipping_country: o.shippingCountry || 'Bangladesh',

        billing_name: o.billingName || null,
        billing_phone: o.billingPhone || null,
        billing_address_line_1: o.billingAddressLine1 || null,
        billing_address_line_2: o.billingAddressLine2 || null,
        billing_city: o.billingCity || null,
        billing_state: o.billingState || null,
        billing_postal_code: o.billingPostalCode || null,
        billing_country: o.billingCountry || 'Bangladesh',

        notes: o.notes || null,
        tracking_number: o.trackingNumber || null,
        tracking_url: o.trackingUrl || null,
        estimated_delivery: o.estimatedDelivery ? o.estimatedDelivery.toISOString() : null,
        delivered_at: o.deliveredAt ? o.deliveredAt.toISOString() : null,
        cancelled_at: o.cancelledAt ? o.cancelledAt.toISOString() : null,
        cancellation_reason: o.cancellationReason || null,
        transaction_id: o.transactionId || null,

        order_items: (o.orderItems || []).map((item: any) => ({
            id: String(item._id),
            product_id: String(item.productId),
            product_name: item.productName,
            product_image: item.productImage || null,
            product_slug: item.productSlug || null,
            size_label: item.sizeLabel || null,
            unit_price: item.unitPrice,
            original_price: item.originalPrice || null,
            quantity: item.quantity,
            total_price: item.totalPrice,
        })),

        status_history: (o.statusHistory || []).map((h: any) => ({
            id: String(h._id),
            status: h.status,
            note: h.note || null,
            changed_by: h.changedBy ? String(h.changedBy) : null,
            created_at: h.createdAt.toISOString(),
        })).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), // Newest history first
    };
}

export async function updateOrderStatus(id: string, status: string, note?: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        const updateDoc: Record<string, any> = {
            status,
            $push: {
                statusHistory: {
                    status,
                    note: note || `Status updated to ${status}`,
                    createdAt: new Date(),
                }
            }
        };

        if (status === 'delivered') {
            updateDoc.deliveredAt = new Date();
        } else if (status === 'cancelled') {
            updateDoc.cancelledAt = new Date();
            if (note) updateDoc.cancellationReason = note;
        }

        await Order.findByIdAndUpdate(id, updateDoc);
        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);
        revalidatePath('/admin');
        return { error: null };
    } catch (err) {
        console.error('Error updating order status:', err);
        return { error: err instanceof Error ? err.message : 'Failed to update order status' };
    }
}

export async function updateOrderPaymentStatus(id: string, paymentStatus: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await Order.findByIdAndUpdate(id, {
            paymentStatus,
            $push: {
                statusHistory: {
                    status: 'payment_status_update',
                    note: `Payment status updated to ${paymentStatus}`,
                    createdAt: new Date(),
                }
            }
        });
        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);
        revalidatePath('/admin');
        return { error: null };
    } catch (err) {
        console.error('Error updating payment status:', err);
        return { error: err instanceof Error ? err.message : 'Failed to update payment status' };
    }
}

export async function updateOrderTracking(
    id: string,
    data: { trackingNumber: string; trackingUrl?: string; estimatedDelivery?: string }
): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        const updates: Record<string, any> = {
            trackingNumber: data.trackingNumber,
            trackingUrl: data.trackingUrl || null,
        };

        if (data.estimatedDelivery) {
            updates.estimatedDelivery = new Date(data.estimatedDelivery);
        }

        await Order.findByIdAndUpdate(id, {
            ...updates,
            $push: {
                statusHistory: {
                    status: 'tracking_update',
                    note: `Tracking info updated. Number: ${data.trackingNumber}`,
                    createdAt: new Date(),
                }
            }
        });
        revalidatePath('/admin/orders');
        revalidatePath(`/admin/orders/${id}`);
        return { error: null };
    } catch (err) {
        console.error('Error updating order tracking:', err);
        return { error: err instanceof Error ? err.message : 'Failed to update tracking info' };
    }
}

export async function getAdminOrderStats(): Promise<AdminOrderStats> {
    await connectToDatabase();
    try {
        const allOrders = await Order.find().lean();
        
        // Sum total revenue of non-cancelled orders (standard e-commerce metrics)
        const totalRevenue = allOrders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, o) => sum + (o.total || 0), 0);

        const totalOrders = allOrders.length;
        const pendingOrders = allOrders.filter(o => o.status === 'pending').length;
        const deliveredOrders = allOrders.filter(o => o.status === 'delivered').length;

        return {
            totalRevenue,
            totalOrders,
            pendingOrders,
            deliveredOrders,
        };
    } catch (err) {
        console.error('Error getting admin order stats:', err);
        return {
            totalRevenue: 0,
            totalOrders: 0,
            pendingOrders: 0,
            deliveredOrders: 0,
        };
    }
}

// ============================================================================
// INCOMPLETE CARTS / ABANDONED ORDERS
// ============================================================================

export interface IncompleteCartItem {
    id: string;
    product_name: string;
    product_image: string | null;
    size_label: string | null;
    unit_price: number;
    quantity: number;
    total_price: number;
}

export interface IncompleteCart {
    user_id: string;
    user_name: string;
    user_email: string;
    user_phone: string | null;
    user_avatar: string | null;
    items: IncompleteCartItem[];
    total_items: number;
    total_value: number;
    updated_at: string;
}

export async function getIncompleteCarts(): Promise<IncompleteCart[]> {
    await connectToDatabase();
    try {
        // Find all cart items
        const cartItems = await CartItem.find()
            .populate('userId')
            .populate('productId')
            .lean();
            
        // Group by user
        const userMap: Record<string, IncompleteCart> = {};
        
        for (const item of cartItems) {
            if (!item.userId || !item.productId) continue;
            
            const userObj = item.userId as any;
            const prodObj = item.productId as any;
            const userIdStr = String(userObj._id);
            
            // Find price based on sizeId
            let unitPrice = prodObj.basePrice;
            let sizeLabel = null;
            if (item.sizeId && prodObj.sizes) {
                const sizeObj = prodObj.sizes.find((s: any) => String(s._id) === String(item.sizeId));
                if (sizeObj) {
                    unitPrice = sizeObj.price;
                    sizeLabel = sizeObj.label + (sizeObj.mlValue ? ` (${sizeObj.mlValue})` : '');
                }
            }
            
            // Primary image
            let primaryImg = null;
            if (prodObj.images && prodObj.images.length > 0) {
                const primary = prodObj.images.find((img: any) => img.isPrimary) || prodObj.images[0];
                primaryImg = primary.url;
            }
            
            const cartItemVal: IncompleteCartItem = {
                id: String(item._id),
                product_name: prodObj.name,
                product_image: primaryImg,
                size_label: sizeLabel,
                unit_price: unitPrice,
                quantity: item.quantity,
                total_price: unitPrice * item.quantity,
            };
            
            if (!userMap[userIdStr]) {
                userMap[userIdStr] = {
                    user_id: userIdStr,
                    user_name: userObj.fullName || userObj.displayName || 'Anonymous User',
                    user_email: userObj.email,
                    user_phone: userObj.phone || null,
                    user_avatar: userObj.avatarUrl || null,
                    items: [],
                    total_items: 0,
                    total_value: 0,
                    updated_at: item.updatedAt ? item.updatedAt.toISOString() : new Date().toISOString(),
                };
            }
            
            userMap[userIdStr].items.push(cartItemVal);
            userMap[userIdStr].total_items += item.quantity;
            userMap[userIdStr].total_value += cartItemVal.total_price;
            
            // Keep the latest updatedAt time
            if (item.updatedAt) {
                const currentLatest = new Date(userMap[userIdStr].updated_at);
                const itemTime = new Date(item.updatedAt);
                if (itemTime > currentLatest) {
                    userMap[userIdStr].updated_at = itemTime.toISOString();
                }
            }
        }
        
        return Object.values(userMap).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    } catch (err) {
        console.error('Error fetching incomplete carts:', err);
        return [];
    }
}

// ============================================================================
// SALES ANALYTICS & REPORTS
// ============================================================================

export interface DailySalesData {
    date: string;
    revenue: number;
    count: number;
}

export interface DistrictSalesData {
    district: string;
    revenue: number;
    count: number;
}

export interface StatusReportData {
    status: string;
    revenue: number;
    count: number;
}

export interface SalesAnalyticsReport {
    dailySales: DailySalesData[];
    districtSales: DistrictSalesData[];
    statusReport: StatusReportData[];
}

export async function getAdminSalesAnalytics(): Promise<SalesAnalyticsReport> {
    await connectToDatabase();
    try {
        const allOrders = await Order.find().lean();

        // 1. Daily Sales Report (last 15 days)
        const dailyMap: Record<string, { revenue: number; count: number }> = {};
        const today = new Date();
        for (let i = 14; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            dailyMap[dateStr] = { revenue: 0, count: 0 };
        }

        // 2. District Sales Report
        const districtMap: Record<string, { revenue: number; count: number }> = {};

        // 3. Status Report
        const statusMap: Record<string, { revenue: number; count: number }> = {
            'confirmed': { revenue: 0, count: 0 },
            'cancelled': { revenue: 0, count: 0 },
            'pending': { revenue: 0, count: 0 },
            'other': { revenue: 0, count: 0 }
        };

        for (const o of allOrders) {
            const revenue = o.total || 0;
            const status = (o.status || 'pending').toLowerCase();
            const date = o.createdAt;

            // Update Daily (if within last 15 days and not cancelled)
            if (date) {
                const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                if (dailyMap[dateStr] !== undefined && status !== 'cancelled') {
                    dailyMap[dateStr].revenue += revenue;
                    dailyMap[dateStr].count += 1;
                }
            }

            // Update District (if not cancelled, group by city/district)
            if (status !== 'cancelled') {
                const district = o.shippingCity ? o.shippingCity.trim() : 'Unknown';
                const capitalizedDistrict = district.charAt(0).toUpperCase() + district.slice(1).toLowerCase();
                if (!districtMap[capitalizedDistrict]) {
                    districtMap[capitalizedDistrict] = { revenue: 0, count: 0 };
                }
                districtMap[capitalizedDistrict].revenue += revenue;
                districtMap[capitalizedDistrict].count += 1;
            }

            // Update Status Map
            if (status === 'confirmed' || status === 'delivered' || status === 'processing' || status === 'shipped' || status === 'in_transit') {
                statusMap['confirmed'].revenue += revenue;
                statusMap['confirmed'].count += 1;
            } else if (status === 'cancelled') {
                statusMap['cancelled'].revenue += revenue;
                statusMap['cancelled'].count += 1;
            } else if (status === 'pending') {
                statusMap['pending'].revenue += revenue;
                statusMap['pending'].count += 1;
            } else {
                statusMap['other'].revenue += revenue;
                statusMap['other'].count += 1;
            }
        }

        const dailySales = Object.keys(dailyMap).map(date => ({
            date,
            revenue: dailyMap[date].revenue,
            count: dailyMap[date].count
        }));

        const districtSales = Object.keys(districtMap).map(district => ({
            district,
            revenue: districtMap[district].revenue,
            count: districtMap[district].count
        })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);

        const statusReport = Object.keys(statusMap).map(status => {
            let label = 'Other';
            if (status === 'confirmed') label = 'Confirmed / Fulfilled';
            else if (status === 'cancelled') label = 'Cancelled';
            else if (status === 'pending') label = 'Pending Approval';
            
            return {
                status: label,
                revenue: statusMap[status].revenue,
                count: statusMap[status].count
            };
        });

        return {
            dailySales,
            districtSales,
            statusReport
        };
    } catch (err) {
        console.error('Error calculating sales analytics:', err);
        return {
            dailySales: [],
            districtSales: [],
            statusReport: []
        };
    }
}


