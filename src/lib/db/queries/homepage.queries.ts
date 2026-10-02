"use server";

import connectToDatabase from '@/lib/mongodb';
import HeroSlide from '@/lib/models/HeroSlide';
import HomepageSection from '@/lib/models/HomepageSection';
import Brand from '@/lib/models/Brand';
import Product from '@/lib/models/Product';
import VisibleChange from '@/lib/models/VisibleChange';
import { toProductCard, resolveCouponMap, calculateProductPricing } from './helpers';
import type { HeroSlideData, BrandData, HomepageSectionData, SectionProductCard, VisibleChangeItem } from './types';

// ============================================================================
// HERO SLIDES
// ============================================================================

export async function getHeroSlides(): Promise<HeroSlideData[]> {
    await connectToDatabase();
    const slides = await HeroSlide.find({ isActive: true }).sort('sortOrder').lean();

    return slides.map(s => ({
        id: String(s._id),
        title: s.title,
        subtitle: s.subtitle,
        cta_text: s.ctaText,
        cta_link: s.ctaLink,
        image_url: s.imageUrl,
        mobile_image_url: s.mobileImageUrl || null,
        image_alt: s.imageAlt,
        background_color: s.backgroundColor,
        text_color: s.textColor,
    }));
}

// ============================================================================
// BRANDS
// ============================================================================

export async function getBrands(): Promise<BrandData[]> {
    await connectToDatabase();
    const brands = await Brand.find({ isActive: true }).sort('sortOrder').lean();

    return brands.map(b => ({
        id: String(b._id),
        name: b.name,
        slug: b.slug,
        tagline: b.tagline,
        description: b.description,
        logo_url: b.logoUrl,
        accent_color: b.accentColor,
        text_color: b.textColor || null,
    }));
}

// ============================================================================
// HOMEPAGE SECTIONS
// ============================================================================

export async function getHomepageSections(): Promise<HomepageSectionData[]> {
    await connectToDatabase();

    const sections = await HomepageSection.find({ isActive: true }).sort('sortOrder').lean();
    const NON_PRODUCT_SECTIONS = ['hero_carousel', 'brands_that_lead'];

    const result: HomepageSectionData[] = [];

    for (const section of sections) {
        const sectionData: HomepageSectionData = {
            id: String(section._id),
            section_type: section.sectionType,
            title: section.title,
            subtitle: section.subtitle,
            badge_text: section.badgeText,
            cta_text: section.ctaText,
            cta_link: section.ctaLink,
            background_color: section.backgroundColor,
            sort_order: section.sortOrder,
            products: [],
        };

        if (NON_PRODUCT_SECTIONS.includes(section.sectionType) || !section.products?.length) {
            result.push(sectionData);
            continue;
        }

        const productIds = section.products.map((sp: Record<string, unknown>) => sp.productId);

        const products = await Product.find({ _id: { $in: productIds }, isActive: true })
            .populate('brandId', 'name slug')
            .populate('categoryId', 'name slug')
            .lean();

        // Use centralized coupon resolver
        const couponMap = await resolveCouponMap(productIds);

        const sectionProducts: SectionProductCard[] = products.map(p => {
            const sp = section.products.find((s: Record<string, unknown>) => String(s.productId) === String(p._id));
            const brand = p.brandId as Record<string, unknown> | null;
            const category = p.categoryId as Record<string, unknown> | null;
            const card = toProductCard(p as unknown as Record<string, unknown>, brand, category);
            const coupon = couponMap[String(p._id)];

            return {
                ...card,
                custom_badge_text: (sp?.customBadgeText as string) || null,
                custom_badge_color: (sp?.customBadgeColor as string) || null,
                section_sort_order: (sp?.sortOrder as number) || 0,
                coupon_price: coupon?.price || null,
                coupon_code: coupon?.code || null,
            };
        }).sort((a, b) => a.section_sort_order - b.section_sort_order);

        sectionData.products = sectionProducts;
        result.push(sectionData);
    }

    return result;
}

// ============================================================================
// VISIBLE CHANGES (uses shared calculateProductPricing — OCP fix)
// ============================================================================

export async function getVisibleChanges(): Promise<VisibleChangeItem[]> {
    await connectToDatabase();

    const changes = await VisibleChange.find({ isActive: true })
        .populate('productId', 'name slug basePrice compareAtPrice discountPercent ratingAvg reviewCount images sizes')
        .sort('sortOrder')
        .lean();

    return changes
        .filter(vc => vc.productId)
        .map(vc => {
            const product = vc.productId as unknown as Record<string, unknown>;
            const images = (product.images as Array<Record<string, unknown>>) || [];
            const primaryImage = images.find(i => i.isPrimary) || images[0];
            const reviewCount = Number(product.reviewCount) || 0;

            // Use shared pricing helper instead of duplicating logic
            const { basePrice, compareAtPrice } = calculateProductPricing(product);
            const discountPercent = (product.discountPercent as number) || 0;

            return {
                id: String(vc._id),
                slug: (product.slug as string) || '',
                beforeImage: vc.beforeImage,
                afterImage: vc.afterImage,
                beforeLabel: vc.beforeLabel,
                afterLabel: vc.afterLabel,
                productThumb: primaryImage ? (primaryImage.url as string) : '/no-image.svg',
                productName: (product.name as string) || 'Product',
                rating: Number(product.ratingAvg) || 0,
                reviewCount: reviewCount >= 1000 ? `${(reviewCount / 1000).toFixed(1)}K` : String(reviewCount),
                price: Math.ceil(basePrice || 0),
                originalPrice: Math.ceil(compareAtPrice || 0),
                discountPercent: Number(discountPercent) || 0,
            };
        });
}
