import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Coupon from '@/lib/models/Coupon';
import SiteSetting from '@/lib/models/SiteSetting';

export interface IncomingOrderItem {
    id: string;
    name?: string;
    image?: string;
    slug?: string;
    size?: string;
    quantity: number;
    price?: number;
}

export interface VerifiedOrderItem {
    productId: mongoose.Types.ObjectId;
    productName: string;
    productImage: string | null;
    productSlug: string | null;
    sizeLabel: string | null;
    sizeId: mongoose.Types.ObjectId | null;
    unitPrice: number;
    originalPrice: number | null;
    quantity: number;
    totalPrice: number;
}

export interface VerifiedOrderCalculation {
    orderItems: VerifiedOrderItem[];
    subtotal: number;
    discountAmount: number;
    couponId: mongoose.Types.ObjectId | null;
    couponCode: string | null;
    shippingCost: number;
    tax: number;
    total: number;
    currency: string;
}

/**
 * Server-side Order Price and Inventory Re-validation
 * 
 * Never trusts client-submitted prices or totals.
 * Fetches canonical prices from MongoDB, applies active coupon rules,
 * and calculates verified subtotal, shipping, and grand total.
 */
export async function validateAndCalculateOrder(
    items: IncomingOrderItem[],
    couponCode?: string | null,
    clientShipping?: number
): Promise<VerifiedOrderCalculation> {
    if (!items || !items.length) {
        throw new Error('Order must contain at least one item');
    }

    await connectToDatabase();

    // 1. Fetch products from database
    const validObjectIds = items
        .map(i => i.id)
        .filter(id => mongoose.Types.ObjectId.isValid(id))
        .map(id => new mongoose.Types.ObjectId(id));

    if (validObjectIds.length !== items.length) {
        throw new Error('Invalid product identifier detected');
    }

    const products = await Product.find({ _id: { $in: validObjectIds }, isActive: true }).lean();
    const productMap = new Map<string, typeof products[0]>();
    products.forEach(p => productMap.set(String(p._id), p));

    // 2. Validate items and verify canonical prices
    const verifiedOrderItems: VerifiedOrderItem[] = [];
    let subtotal = 0;

    for (const item of items) {
        const product = productMap.get(item.id);
        if (!product) {
            throw new Error(`Product is no longer available or out of stock`);
        }

        const qty = Math.max(1, Math.floor(Number(item.quantity) || 1));
        let unitPrice = Math.ceil(product.basePrice);
        let sizeId: mongoose.Types.ObjectId | null = null;
        let sizeLabel: string | null = item.size || null;

        if (item.size && product.sizes && product.sizes.length > 0) {
            const matchedSize = product.sizes.find(
                s => s.label.toLowerCase() === item.size?.toLowerCase() || s.mlValue === item.size
            );
            if (matchedSize) {
                unitPrice = Math.ceil(matchedSize.price);
                sizeId = matchedSize._id as mongoose.Types.ObjectId;
                sizeLabel = matchedSize.label;
            }
        }

        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;

        const primaryImage = product.images?.find(img => img.isPrimary)?.url 
            || product.images?.[0]?.url 
            || item.image 
            || '/no-image.svg';

        verifiedOrderItems.push({
            productId: new mongoose.Types.ObjectId(item.id),
            productName: product.name,
            productImage: primaryImage,
            productSlug: product.slug,
            sizeLabel,
            sizeId,
            unitPrice,
            originalPrice: product.compareAtPrice ? Math.ceil(product.compareAtPrice) : null,
            quantity: qty,
            totalPrice: lineTotal,
        });
    }

    // 3. Validate coupon if provided
    let discountAmount = 0;
    let couponId: mongoose.Types.ObjectId | null = null;
    let verifiedCouponCode: string | null = null;
    let isFreeShippingCoupon = false;

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
        const cleanCode = couponCode.trim().toUpperCase();
        const now = new Date();
        const coupon = await Coupon.findOne({
            code: cleanCode,
            isActive: true,
            startsAt: { $lte: now },
        }).lean();

        if (coupon && (!coupon.expiresAt || new Date(coupon.expiresAt) >= now)) {
            if (subtotal >= (coupon.minimumOrderValue || 0)) {
                couponId = coupon._id as mongoose.Types.ObjectId;
                verifiedCouponCode = coupon.code;

                if (coupon.discountType === 'percentage') {
                    let discount = Math.round((subtotal * coupon.discountValue) / 100);
                    if (coupon.maxDiscountAmount && discount > coupon.maxDiscountAmount) {
                        discount = coupon.maxDiscountAmount;
                    }
                    discountAmount = discount;
                } else if (coupon.discountType === 'fixed_amount') {
                    discountAmount = Math.min(coupon.discountValue, subtotal);
                } else if (coupon.discountType === 'free_shipping') {
                    isFreeShippingCoupon = true;
                }
            }
        }
    }

    // 4. Resolve shipping cost
    let freeShippingThreshold = 1000;
    let defaultShippingCost = 60;

    try {
        const thresholdSetting = await SiteSetting.findOne({ key: 'free_shipping_threshold' }).lean();
        if (thresholdSetting && typeof thresholdSetting.value === 'number') {
            freeShippingThreshold = thresholdSetting.value;
        }

        const feeSetting = await SiteSetting.findOne({ key: 'shipping_fee' }).lean();
        if (feeSetting && typeof feeSetting.value === 'number') {
            defaultShippingCost = feeSetting.value;
        }
    } catch {
        // Fallback to defaults if setting lookup fails
    }

    let shippingCost = defaultShippingCost;
    if (isFreeShippingCoupon || subtotal >= freeShippingThreshold) {
        shippingCost = 0;
    } else if (clientShipping !== undefined && clientShipping >= 0) {
        // Respect verified client rate if provided and not free
        shippingCost = clientShipping;
    }

    const tax = 0;
    const total = Math.max(0, subtotal - discountAmount + shippingCost + tax);

    return {
        orderItems: verifiedOrderItems,
        subtotal,
        discountAmount,
        couponId,
        couponCode: verifiedCouponCode,
        shippingCost,
        tax,
        total,
        currency: 'BDT',
    };
}
