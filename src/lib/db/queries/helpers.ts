import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import ProductCoupon from '@/lib/models/ProductCoupon';
import type { ProductCard } from './types';

// ============================================================================
// SHARED HELPERS — centralized product card mapping & price calculation
// ============================================================================

/**
 * Calculate the base price from product sizes, falling back to basePrice.
 * Centralizes the size-aware pricing logic used by toProductCard & getVisibleChanges.
 */
export function calculateProductPricing(
    product: Record<string, unknown>,
): { basePrice: number; compareAtPrice: number | null; activeSizes: Record<string, any>[] } {
    const sizes = (product.sizes as Array<Record<string, any>>) || [];
    const activeSizes = sizes.filter(s => s && s.isActive !== false);
    const defaultSize = activeSizes.find(s => s.isDefault) || activeSizes[0];

    const basePrice = defaultSize ? (defaultSize.price as number) : (product.basePrice as number);
    const discountPercent = (product.discountPercent as number) || 0;
    const compareAtPrice = defaultSize
        ? (discountPercent > 0 ? Math.ceil(basePrice / (1 - discountPercent / 100)) : basePrice)
        : ((product.compareAtPrice as number) || null);

    return { basePrice, compareAtPrice, activeSizes };
}

/**
 * Map a raw Mongoose product document to a ProductCard DTO.
 */
export function toProductCard(
    p: Record<string, unknown>,
    brand?: Record<string, unknown> | null,
    category?: Record<string, unknown> | null,
): ProductCard {
    const badges = (p.badges as Array<Record<string, unknown>>) || [];
    const images = (p.images as Array<Record<string, unknown>>) || [];
    const primaryImage = images.find(i => i.isPrimary) || images[0];

    const { basePrice, compareAtPrice, activeSizes } = calculateProductPricing(p);

    return {
        id: String(p._id),
        slug: p.slug as string,
        name: p.name as string,
        subtitle: (p.subtitle as string) || null,
        short_description: (p.shortDescription as string) || null,
        base_price: basePrice,
        compare_at_price: compareAtPrice,
        discount_percent: (p.discountPercent as number) || 0,
        rating_avg: (p.ratingAvg as number) || 0,
        review_count: (p.reviewCount as number) || 0,
        in_stock: (p.inStock as boolean) && (p.stockQuantity !== undefined ? (p.stockQuantity as number) > 0 : true),
        stock_quantity: (p.stockQuantity as number) || 0,
        is_featured: p.isFeatured as boolean,
        concerns: (p.concerns as string[]) || null,
        tags: (p.tags as string[]) || null,
        brand_name: brand ? (brand.name as string) : null,
        brand_slug: brand ? (brand.slug as string) : null,
        category_name: category ? (category.name as string) : null,
        category_slug: category ? (category.slug as string) : null,
        primary_image_url: primaryImage ? (primaryImage.url as string) : null,
        badges: badges.length > 0
            ? badges.map(b => ({ badge: b.badge as string, label: (b.customLabel as string) || null, color: (b.badgeColor as string) || null }))
            : null,
        sizes: activeSizes.length > 0 ? activeSizes.map(s => ({
            id: String(s._id),
            label: s.label as string,
            ml: (s.mlValue as string) || null,
            price: s.price as number,
            is_default: s.isDefault as boolean,
            stockQuantity: s.stockQuantity !== undefined ? (s.stockQuantity as number) : 0,
        })) : null,
    };
}

/**
 * Attach best coupon price/code to product cards.
 */
export async function attachCouponsToCards(cards: ProductCard[]): Promise<ProductCard[]> {
    if (!cards.length) return cards;
    const productIds = cards.map(c => new mongoose.Types.ObjectId(c.id));
    const coupons = await ProductCoupon.find({ productId: { $in: productIds } })
        .populate('couponId', 'code')
        .lean();

    const couponMap: Record<string, { price: number; code: string }> = {};
    for (const c of coupons) {
        const pid = String(c.productId);
        const couponDoc = c.couponId as unknown as Record<string, unknown> | null;
        const code = couponDoc ? (couponDoc.code as string) : '';
        if (!couponMap[pid] || (c.couponPrice !== null && c.couponPrice! < couponMap[pid].price)) {
            couponMap[pid] = { price: c.couponPrice || 0, code };
        }
    }

    return cards.map(c => ({
        ...c,
        coupon_price: couponMap[c.id]?.price || null,
        coupon_code: couponMap[c.id]?.code || null,
    }));
}

/**
 * Map an array of populated product docs to ProductCard[], then attach coupons.
 */
export function mapProductsToCards(products: Record<string, unknown>[]): ProductCard[] {
    return products.map(p => {
        const brand = p.brandId as Record<string, unknown> | null;
        const category = p.categoryId as Record<string, unknown> | null;
        return toProductCard(p as unknown as Record<string, unknown>, brand, category);
    });
}

/**
 * Recalculate and persist rating_avg and review_count for a product
 * after review changes.
 */
export async function recalculateProductRating(productId: string): Promise<void> {
    const Review = (await import('@/lib/models/Review')).default;
    const approvedReviews = await Review.find({ productId, isApproved: true }).lean();
    const reviewCount = approvedReviews.length;
    const totalRating = approvedReviews.reduce((sum, r) => sum + r.rating, 0);
    const ratingAvg = reviewCount > 0 ? Math.round((totalRating / reviewCount) * 10) / 10 : 0;

    await Product.findByIdAndUpdate(productId, { reviewCount, ratingAvg });
}

/**
 * Resolve coupons for an array of product IDs and return a map.
 */
export async function resolveCouponMap(
    productIds: unknown[],
): Promise<Record<string, { price: number; code: string }>> {
    const coupons = await ProductCoupon.find({ productId: { $in: productIds } })
        .populate('couponId', 'code')
        .lean();

    const couponMap: Record<string, { price: number; code: string }> = {};
    for (const c of coupons) {
        const pid = String(c.productId);
        const couponDoc = c.couponId as unknown as Record<string, unknown> | null;
        const code = couponDoc ? (couponDoc.code as string) : '';
        if (!couponMap[pid] || (c.couponPrice !== null && c.couponPrice! < couponMap[pid].price)) {
            couponMap[pid] = { price: c.couponPrice || 0, code };
        }
    }
    return couponMap;
}
