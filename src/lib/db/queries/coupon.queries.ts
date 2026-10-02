"use server";

import connectToDatabase from '@/lib/mongodb';
import Coupon from '@/lib/models/Coupon';
import type { CouponData } from './types';

export async function getActiveCoupons(): Promise<CouponData[]> {
    await connectToDatabase();
    const now = new Date();
    const coupons = await Coupon.find({
        isActive: true,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    }).sort('code').lean();

    return coupons.map(c => ({
        id: String(c._id),
        code: c.code,
        description: c.description,
        discount_type: c.discountType as 'percentage' | 'fixed_amount',
        discount_value: c.discountValue,
        minimum_order_value: c.minimumOrderValue,
        max_discount_amount: c.maxDiscountAmount,
        is_active: c.isActive,
    }));
}
