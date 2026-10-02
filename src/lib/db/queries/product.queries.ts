"use server";

import connectToDatabase from '@/lib/mongodb';
import Product from '@/lib/models/Product';
import Brand from '@/lib/models/Brand';
import Category from '@/lib/models/Category';
import ProductCoupon from '@/lib/models/ProductCoupon';
import { toProductCard, attachCouponsToCards, mapProductsToCards } from './helpers';
import type { ProductCard, ProductDetail, ProductFilters, AISearchParams } from './types';

// ============================================================================
// PRODUCT CARDS (shop page)
// ============================================================================

export async function getProductCards(filters?: ProductFilters): Promise<ProductCard[]> {
    await connectToDatabase();

    const query: Record<string, unknown> = { isActive: true };

    if (filters?.brand) {
        const brand = await Brand.findOne({ slug: filters.brand }).lean();
        if (brand) query.brandId = brand._id;
        else return [];
    }

    if (filters?.category || filters?.type) {
        const slug = filters.category || filters.type;
        const cat = await Category.findOne({ slug }).lean();
        if (cat) query.categoryId = cat._id;
        else return [];
    }

    if (filters?.concern) {
        query.concerns = filters.concern;
    }

    if (filters?.search) {
        query.name = { $regex: filters.search, $options: 'i' };
    }

    let sortObj: Record<string, 1 | -1> = { isFeatured: -1, ratingAvg: -1 };
    if (filters?.sort === 'price-low') sortObj = { basePrice: 1 };
    else if (filters?.sort === 'price-high') sortObj = { basePrice: -1 };
    else if (filters?.sort === 'top-rated') sortObj = { ratingAvg: -1 };
    else if (filters?.sort === 'newest') sortObj = { createdAt: -1 };

    const products = await Product.find(query)
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .sort(sortObj)
        .lean();

    return attachCouponsToCards(mapProductsToCards(products as unknown as Record<string, unknown>[]));
}

// ============================================================================
// PRODUCT DETAIL (PDP)
// ============================================================================

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
    await connectToDatabase();

    const product = await Product.findOne({ slug })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .lean();

    if (!product) return null;

    const brand = product.brandId as Record<string, unknown> | null;
    const category = product.categoryId as Record<string, unknown> | null;

    // Get coupon info
    let coupon_price: number | null = null;
    let coupon_code: string | null = null;

    const productCoupons = await ProductCoupon.find({ productId: product._id })
        .populate('couponId', 'code')
        .lean();

    if (productCoupons.length > 0) {
        const best = productCoupons.reduce((a, b) =>
            (a.couponPrice || Infinity) < (b.couponPrice || Infinity) ? a : b
        );
        coupon_price = best.couponPrice || null;
        const couponDoc = best.couponId as unknown as Record<string, unknown> | null;
        coupon_code = couponDoc ? (couponDoc.code as string) : null;
    }

    return {
        id: String(product._id),
        slug: product.slug,
        name: product.name,
        subtitle: product.subtitle,
        short_description: product.shortDescription,
        description: product.description,
        how_to_use: product.howToUse,
        ingredients: product.ingredients,
        base_price: product.basePrice,
        compare_at_price: product.compareAtPrice,
        discount_percent: product.discountPercent,
        rating_avg: product.ratingAvg,
        review_count: product.reviewCount,
        in_stock: product.inStock && (product.stockQuantity !== undefined ? product.stockQuantity > 0 : true),
        stock_quantity: product.stockQuantity,
        concerns: product.concerns?.length ? product.concerns : null,
        tags: product.tags?.length ? product.tags : null,
        brand_name: brand ? (brand.name as string) : null,
        brand_slug: brand ? (brand.slug as string) : null,
        category_name: category ? (category.name as string) : null,
        category_slug: category ? (category.slug as string) : null,
        images: product.images?.map(i => ({ url: i.url, alt: i.altText || null })) || null,
        sizes: product.sizes?.filter(s => s.isActive).map(s => ({
            id: String(s._id),
            label: s.label,
            ml: s.mlValue || null,
            price: s.price,
            is_default: s.isDefault,
            stockQuantity: s.stockQuantity !== undefined ? s.stockQuantity : 0,
        })) || null,
        key_benefits: product.keyBenefits?.map(kb => ({
            icon: kb.iconName,
            title: kb.title,
            desc: kb.description,
        })) || null,
        highlights: product.highlights?.map(h => h.highlight) || null,
        badges: product.badges?.map(b => ({
            badge: b.badge,
            label: b.customLabel || null,
            color: b.badgeColor || null,
        })) || null,
        coupon_price,
        coupon_code,
    };
}

// ============================================================================
// RELATED PRODUCTS
// ============================================================================

export async function getRelatedProducts(slug: string, limit: number = 4): Promise<ProductCard[]> {
    await connectToDatabase();
    const products = await Product.find({ slug: { $ne: slug }, isActive: true })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ ratingAvg: -1 })
        .limit(limit)
        .lean();

    return attachCouponsToCards(mapProductsToCards(products as unknown as Record<string, unknown>[]));
}

export async function getRelatedProductsSimple(currentSlug: string, limit: number = 4): Promise<ProductCard[]> {
    return getRelatedProducts(currentSlug, limit);
}

// ============================================================================
// SEARCH PRODUCTS
// ============================================================================

export async function searchProducts(query: string): Promise<ProductCard[]> {
    if (!query.trim()) return [];
    await connectToDatabase();

    const products = await Product.find({
        isActive: true,
        $or: [
            { name: { $regex: query, $options: 'i' } },
            { shortDescription: { $regex: query, $options: 'i' } },
        ],
    })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .sort({ ratingAvg: -1 })
        .limit(10)
        .lean();

    return attachCouponsToCards(mapProductsToCards(products as unknown as Record<string, unknown>[]));
}

// ============================================================================
// AI-POWERED SEARCH
// ============================================================================

export async function aiSearchProducts(params: AISearchParams): Promise<ProductCard[]> {
    const { keywords, categories, concerns, originalQuery } = params;
    if (!keywords.length && !categories.length && !concerns.length) return [];

    await connectToDatabase();

    const orConditions: Record<string, unknown>[] = [];

    for (const kw of keywords) {
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        orConditions.push(
            { name: { $regex: escaped, $options: 'i' } },
            { shortDescription: { $regex: escaped, $options: 'i' } },
            { subtitle: { $regex: escaped, $options: 'i' } },
            { tags: { $regex: escaped, $options: 'i' } },
            { 'highlights.highlight': { $regex: escaped, $options: 'i' } },
        );
    }

    for (const concern of concerns) {
        const escaped = concern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        orConditions.push({ concerns: { $regex: escaped, $options: 'i' } });
    }

    let categoryIds: unknown[] = [];
    if (categories.length > 0) {
        const cats = await Category.find({ slug: { $in: categories }, isActive: true }).lean();
        categoryIds = cats.map(c => c._id);
        if (categoryIds.length > 0) {
            orConditions.push({ categoryId: { $in: categoryIds } });
        }
    }

    if (orConditions.length === 0) return [];

    const products = await Product.find({
        isActive: true,
        $or: orConditions,
    })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .limit(20)
        .lean();

    // Score and rank results
    const scored = products.map(p => {
        let score = 0;
        const name = (p.name || '').toLowerCase();
        const desc = (p.shortDescription || '').toLowerCase();
        const query = originalQuery.toLowerCase();

        if (name === query) score += 100;
        else if (name.startsWith(query)) score += 80;
        else if (name.includes(query)) score += 60;
        if (desc.includes(query)) score += 30;

        for (const kw of keywords) {
            if (name.includes(kw.toLowerCase())) score += 20;
        }

        if (categoryIds.length > 0 && p.categoryId) {
            const catId = typeof p.categoryId === 'object' && p.categoryId !== null
                ? String((p.categoryId as unknown as { _id?: unknown })._id || p.categoryId)
                : String(p.categoryId);
            if (categoryIds.some(id => String(id) === catId)) score += 25;
        }

        if (p.concerns && concerns.length > 0) {
            for (const c of concerns) {
                if (p.concerns.some((pc: string) => pc.toLowerCase().includes(c.toLowerCase()))) {
                    score += 15;
                }
            }
        }

        if (p.isFeatured) score += 10;
        score += (p.ratingAvg || 0) * 2;

        return { product: p, score };
    });

    scored.sort((a, b) => b.score - a.score);

    return attachCouponsToCards(scored.map(({ product: p }) => {
        const brand = p.brandId as Record<string, unknown> | null;
        const category = p.categoryId as Record<string, unknown> | null;
        return toProductCard(p as unknown as Record<string, unknown>, brand, category);
    }));
}

// ============================================================================
// STOCK MANAGEMENT
// ============================================================================

export async function updateStockForOrder(orderItems: { productId: import('mongoose').Types.ObjectId | string; sizeLabel: string | null; quantity: number }[]): Promise<void> {
    await connectToDatabase();
    for (const item of orderItems) {
        const productId = item.productId;
        const quantity = item.quantity;
        const sizeLabel = item.sizeLabel;

        if (sizeLabel) {
            await Product.updateOne(
                { _id: productId, "sizes.label": sizeLabel },
                {
                    $inc: {
                        stockQuantity: -quantity,
                        "sizes.$.stockQuantity": -quantity
                    }
                }
            );
        } else {
            await Product.updateOne(
                { _id: productId },
                {
                    $inc: { stockQuantity: -quantity }
                }
            );
        }

        await Product.updateOne(
            { _id: productId, stockQuantity: { $lte: 0 } },
            { $set: { inStock: false } }
        );
    }
}

// ============================================================================
// PRODUCT PAGE DATA (aggregation)
// ============================================================================

export async function getProductPageData(slug: string) {
    await connectToDatabase();
    const { getSiteSetting } = await import('./settings.queries');
    const [product, related, threshold] = await Promise.all([
        getProductBySlug(slug),
        getRelatedProducts(slug, 4),
        getSiteSetting('free_shipping_threshold'),
    ]);
    return { product, related, threshold };
}
