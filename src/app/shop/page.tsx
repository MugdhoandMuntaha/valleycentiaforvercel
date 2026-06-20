'use client';

import React, { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Star, ArrowLeft, Filter, Check } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { getProductCards } from '@/lib/db/queries';
import type { ProductCard as DbProductCard } from '@/lib/db/queries';
import type { SectionProduct } from '@/data/homeSections';
import ProductCard from '@/components/ProductCard';

/* ─── Extended product with filterable tags ─── */
interface TaggedProduct extends SectionProduct {
    brand: string;
    productType: string;
    concerns: string[];
}

/** Convert a Supabase ProductCard into a TaggedProduct */
function supabaseToTagged(p: DbProductCard): TaggedProduct {
    const badges = p.badges as { badge: string; label: string | null; color: string | null }[] | null;
    const primaryBadge = badges?.find((b) => b.label) || badges?.[0];
    const badgeText = primaryBadge ? (primaryBadge.label || primaryBadge.badge).replace(/_/g, ' ').toUpperCase() : undefined;
    const isPremium = badgeText?.toLowerCase() === 'premium';
    const formatReviewCount = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);

    return {
        id: p.id,
        slug: p.slug,
        image: p.primary_image_url || '/no-image.svg',
        title: p.name,
        description: p.short_description || '',
        price: Math.ceil(Number(p.base_price)),
        originalPrice: p.compare_at_price ? Math.ceil(Number(p.compare_at_price)) : undefined,
        discountPercent: p.discount_percent ? Number(p.discount_percent) : undefined,
        rating: Number(p.rating_avg),
        reviewCount: formatReviewCount(Number(p.review_count) || 0),
        badge: badgeText,
        badgeColor: isPremium ? '#f0c14b' : (primaryBadge?.color || undefined),
        brand: p.brand_slug || 'bare-anatomy',
        productType: p.category_slug || 'other',
        concerns: p.concerns || [],
        inStock: p.in_stock !== undefined ? p.in_stock : true,
        couponCode: p.coupon_code || undefined,
        couponPrice: p.coupon_price ? Math.ceil(Number(p.coupon_price)) : undefined,
    };
}

/* ─── Category config (labels only, products fetched from Supabase) ─── */
const categoryLabels: Record<string, { label: string; subtitle: string }> = {
    'best-sellers': {
        label: 'Best Sellers Across Brands',
        subtitle: 'The most-loved essentials, all in one place',
    },
    'power-care-duos': {
        label: 'Power Care Duos',
        subtitle: 'Essentials that work from root to glow',
    },
    'new-launches': {
        label: 'New Launches',
        subtitle: 'New formulas to love every day',
    },
};

/* ─── Label maps for display ─── */
const brandLabels: Record<string, string> = {
    'bare-anatomy': 'Bare Anatomy',
    'chemist-at-play': 'Chemist at Play',
    'sun-scoop': 'Sun Scoop',
};

const concernLabels: Record<string, string> = {
    'hair-fall': 'Hair Fall',
    'dandruff': 'Dandruff',
    'acne': 'Acne & Pimples',
    'dark-spots': 'Dark Spots',
    'sun-protection': 'Sun Protection',
    'anti-aging': 'Anti Aging',
};

const typeLabels: Record<string, string> = {
    'hair-care': 'Hair Care',
    'skin-care': 'Skin Care',
    'sun-care': 'Sun Care',
    'shampoo': 'Shampoo',
    'conditioner': 'Conditioner',
    'hair-oil': 'Hair Oil',
    'hair-serum': 'Hair Serum',
    'hair-mask': 'Hair Mask',
    'face-wash': 'Face Wash',
    'moisturizer': 'Moisturizer',
    'serum': 'Serum',
    'toner': 'Toner',
    'face-mask': 'Face Mask',
    'sunscreen': 'Sunscreen',
    'after-sun': 'After Sun',
    'spf-moisturizer': 'SPF Moisturizer',
    'lip-spf': 'Lip SPF',
    'roll-on': 'Roll On',
};

const sortLabels: Record<string, string> = {
    'top-rated': 'Top Rated',
    'popular': 'Most Popular',
    'trending': 'Trending Now',
    'staff-picks': 'Staff Picks',
};

const hairCareTypes = ['shampoo', 'conditioner', 'hair-oil', 'hair-serum', 'hair-mask'];
const skinCareTypes = ['face-wash', 'moisturizer', 'serum', 'toner', 'face-mask'];
const sunCareTypes = ['sunscreen', 'after-sun', 'spf-moisturizer', 'lip-spf'];

/* ─── Helper: filter + sort ─── */
function resolveProducts(allProducts: TaggedProduct[], params: {
    category?: string;
    brand?: string;
    concern?: string;
    type?: string;
    sort?: string;
}): { label: string; subtitle: string; products: TaggedProduct[]; activeFilter: string } {
    const { category, brand, concern, type, sort } = params;

    // Category filter
    if (category && categoryLabels[category]) {
        return {
            ...categoryLabels[category],
            products: allProducts, // All products are already fetched, no separate filter needed
            activeFilter: categoryLabels[category].label,
        };
    }

    let products = [...allProducts];
    let label = 'All Products';
    let subtitle = 'Browse our complete collection';
    let activeFilter = '';

    // Brand filter
    if (brand) {
        products = products.filter((p) => p.brand === brand);
        label = brandLabels[brand] || brand;
        subtitle = `Explore products from ${label}`;
        activeFilter = label;
    }

    // Concern filter
    if (concern) {
        products = products.filter((p) => p.concerns.includes(concern));
        label = concernLabels[concern] || concern;
        subtitle = `Products that target ${label.toLowerCase()}`;
        activeFilter = label;
    }

    // Type filter (specific type or broad category)
    if (type) {
        if (type === 'hair-care') {
            products = products.filter((p) => hairCareTypes.includes(p.productType));
            label = 'Hair Care';
            subtitle = 'Everything your hair needs';
        } else if (type === 'skin-care') {
            products = products.filter((p) => skinCareTypes.includes(p.productType));
            label = 'Skin Care';
            subtitle = 'Glow from within';
        } else if (type === 'sun-care') {
            products = products.filter((p) => sunCareTypes.includes(p.productType));
            label = 'Sun Care';
            subtitle = 'Shield your skin every day';
        } else {
            products = products.filter((p) => p.productType === type);
            label = typeLabels[type] || type;
            subtitle = `Shop ${label} products`;
        }
        activeFilter = label;
    }

    // Sort
    if (sort) {
        label = sortLabels[sort] || 'All Products';
        subtitle = `Curated selection — ${label.toLowerCase()}`;
        activeFilter = label;
        switch (sort) {
            case 'top-rated':
                products.sort((a, b) => b.rating - a.rating);
                break;
            case 'popular':
                products.sort((a, b) => {
                    const parseCount = (rc: string) => {
                        const n = parseFloat(rc.replace(/[kK]/g, ''));
                        return rc.toLowerCase().includes('k') ? n * 1000 : n;
                    };
                    return parseCount(b.reviewCount) - parseCount(a.reviewCount);
                });
                break;
            case 'trending':
                products.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
                break;
            case 'staff-picks':
                // Show products with badges first
                products.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
                break;
            default:
                break;
        }
    }

    return { label, subtitle, products, activeFilter };
}

/* ─── Quick filter pills data ─── */
function getQuickFilters(params: {
    brand?: string;
    concern?: string;
    type?: string;
    sort?: string;
}): { label: string; href: string; active: boolean }[] {
    const filters: { label: string; href: string; active: boolean }[] = [];

    // If viewing a broad type, show sub-type pills
    if (params.type === 'hair-care') {
        hairCareTypes.forEach((t) =>
            filters.push({ label: typeLabels[t], href: `/shop?type=${t}`, active: false })
        );
    } else if (params.type === 'skin-care') {
        skinCareTypes.forEach((t) =>
            filters.push({ label: typeLabels[t], href: `/shop?type=${t}`, active: false })
        );
    } else if (params.type === 'sun-care') {
        sunCareTypes.forEach((t) =>
            filters.push({ label: typeLabels[t], href: `/shop?type=${t}`, active: false })
        );
    }

    // If viewing a specific sub-type, highlight it and show siblings
    if (params.type && !['hair-care', 'skin-care', 'sun-care'].includes(params.type)) {
        let siblings: string[] = [];
        let parent = '';
        if (hairCareTypes.includes(params.type)) { siblings = hairCareTypes; parent = 'hair-care'; }
        if (skinCareTypes.includes(params.type)) { siblings = skinCareTypes; parent = 'skin-care'; }
        if (sunCareTypes.includes(params.type)) { siblings = sunCareTypes; parent = 'sun-care'; }
        if (siblings.length > 0) {
            return [
                { label: `All ${typeLabels[parent]}`, href: `/shop?type=${parent}`, active: false },
                ...siblings.map((t) => ({
                    label: typeLabels[t],
                    href: `/shop?type=${t}`,
                    active: t === params.type,
                })),
            ];
        }
    }

    return filters;
}

/* ═══════════════════════════════════════════════════════
   SHOP PAGE
   ═══════════════════════════════════════════════════════ */

export default function ShopPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fafafa' }} />}>
            <ShopContent />
        </Suspense>
    );
}

function ShopContent() {
    const searchParams = useSearchParams();
    const category = searchParams.get('category') || '';
    const brand = searchParams.get('brand') || '';
    const concern = searchParams.get('concern') || '';
    const type = searchParams.get('type') || '';
    const sort = searchParams.get('sort') || '';
    const { addToCart } = useCart();

    const [allProducts, setAllProducts] = useState<TaggedProduct[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch products from Supabase on mount
    useEffect(() => {
        setIsLoading(true);
        getProductCards().then((data) => {
            setAllProducts(data.map(supabaseToTagged));
            setIsLoading(false);
        }).catch(() => setIsLoading(false));
    }, []);

    const filterParams = useMemo(
        () => ({
            category: category || undefined,
            brand: brand || undefined,
            concern: concern || undefined,
            type: type || undefined,
            sort: sort || undefined,
        }),
        [category, brand, concern, type, sort]
    );

    const { label, subtitle, products, activeFilter } = useMemo(
        () => resolveProducts(allProducts, filterParams),
        [allProducts, filterParams]
    );

    const quickFilters = useMemo(() => getQuickFilters(filterParams), [filterParams]);

    const hasActiveFilter = !!(category || brand || concern || type || sort);

    const categoryKeys = Object.keys(categoryLabels);

    return (
        <div style={{ minHeight: '100vh', background: '#fafafa' }}>
            {/* ── Page Header ── */}
            <div
                className="shop-header"
                style={{
                    background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
                    padding: '48px 0 40px',
                }}
            >
                <div
                    className="shop-header-inner"
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                        padding: '0 48px',
                    }}
                >
                    <Link
                        href="/"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            color: '#aaa',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '13px',
                            textDecoration: 'none',
                            marginBottom: '16px',
                            transition: 'color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.color = '#fff';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.color = '#aaa';
                        }}
                    >
                        <ArrowLeft size={16} />
                        Back to Home
                    </Link>

                    <h1
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '36px',
                            fontWeight: 700,
                            color: '#ffffff',
                            marginBottom: '8px',
                            lineHeight: 1.2,
                        }}
                    >
                        {label}
                    </h1>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '16px',
                            color: '#999',
                            fontWeight: 400,
                        }}
                    >
                        {subtitle}
                    </p>
                </div>
            </div>

            {/* ── Category / Quick Filters ── */}
            <div
                className="shop-filters-container"
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '24px 48px 0',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                    }}
                >
                    {/* Show "All Products" pill always */}
                    <Link
                        href="/shop"
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '13px',
                            fontWeight: 600,
                            padding: '8px 20px',
                            borderRadius: '20px',
                            border: '1px solid',
                            borderColor: !hasActiveFilter ? '#1a1a1a' : '#e0e0e0',
                            background: !hasActiveFilter ? '#1a1a1a' : '#ffffff',
                            color: !hasActiveFilter ? '#ffffff' : '#555',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                        }}
                    >
                        All Products
                    </Link>

                    {/* Show category pills if no specific filter is active */}
                    {!brand && !concern && !type && !sort &&
                        categoryKeys.map((key) => (
                            <Link
                                key={key}
                                href={`/shop?category=${key}`}
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    padding: '8px 20px',
                                    borderRadius: '20px',
                                    border: '1px solid',
                                    borderColor: category === key ? '#1a1a1a' : '#e0e0e0',
                                    background: category === key ? '#1a1a1a' : '#ffffff',
                                    color: category === key ? '#ffffff' : '#555',
                                    textDecoration: 'none',
                                    transition: 'all 0.2s ease',
                                    cursor: 'pointer',
                                }}
                            >
                                {categoryLabels[key].label}
                            </Link>
                        ))}

                    {/* Quick sub-filters */}
                    {quickFilters.length > 0 && (
                        <>
                            <span
                                style={{
                                    width: '1px',
                                    height: '20px',
                                    background: '#ddd',
                                    margin: '0 4px',
                                }}
                            />
                            {quickFilters.map((f) => (
                                <Link
                                    key={f.href}
                                    href={f.href}
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        padding: '8px 20px',
                                        borderRadius: '20px',
                                        border: '1px solid',
                                        borderColor: f.active ? '#1a1a1a' : '#e0e0e0',
                                        background: f.active ? '#1a1a1a' : '#ffffff',
                                        color: f.active ? '#ffffff' : '#555',
                                        textDecoration: 'none',
                                        transition: 'all 0.2s ease',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {f.label}
                                </Link>
                            ))}
                        </>
                    )}

                    {/* Active filter badge */}
                    {activeFilter && (
                        <div
                            style={{
                                marginLeft: 'auto',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '12px',
                                color: '#888',
                            }}
                        >
                            <Filter size={14} />
                            Filtered: <strong style={{ color: '#333' }}>{activeFilter}</strong>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Product Count ── */}
            <div
                className="shop-count-container"
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '20px 48px 0',
                }}
            >
                <p
                    style={{
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '14px',
                        color: '#888',
                    }}
                >
                    Showing {products.length} product{products.length !== 1 ? 's' : ''}
                </p>
            </div>

            {/* ── Product Grid ── */}
            <div
                className="shop-grid-container"
                style={{
                    maxWidth: '1400px',
                    margin: '0 auto',
                    padding: '20px 48px 64px',
                }}
            >
                {isLoading ? (
                    <div
                        className="products-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '20px',
                        }}
                    >
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div
                                key={i}
                                style={{
                                    height: '532px',
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #f0f0f0',
                                    padding: '14px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                    cursor: 'default',
                                }}
                            >
                                {/* Image Area Skeleton */}
                                <div
                                    className="shimmer"
                                    style={{
                                        width: '100%',
                                        height: '50%',
                                        borderRadius: '8px',
                                        background: '#f5f5f0',
                                    }}
                                />
                                {/* Rating Row Skeleton */}
                                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                    <div className="shimmer" style={{ width: '40px', height: '18px', borderRadius: '4px' }} />
                                    <div className="shimmer" style={{ width: '80px', height: '18px', borderRadius: '4px' }} />
                                </div>
                                {/* Title Skeleton */}
                                <div className="shimmer" style={{ width: '90%', height: '20px', borderRadius: '4px' }} />
                                <div className="shimmer" style={{ width: '65%', height: '20px', borderRadius: '4px' }} />

                                <div style={{ flex: 1 }} />

                                {/* Price Skeleton */}
                                <div className="shimmer" style={{ width: '80px', height: '24px', borderRadius: '4px' }} />

                                {/* Button Skeleton */}
                                <div
                                    className="shimmer"
                                    style={{
                                        width: '100%',
                                        height: '40px',
                                        borderRadius: '8px',
                                        marginTop: '8px',
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                ) : products.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '80px 20px',
                        }}
                    >
                        <Filter size={48} color="#ddd" style={{ marginBottom: '16px' }} />
                        <h2
                            style={{
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: '24px',
                                fontWeight: 600,
                                color: '#333',
                                marginBottom: '8px',
                            }}
                        >
                            No products found
                        </h2>
                        <p
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '15px',
                                color: '#999',
                                marginBottom: '24px',
                            }}
                        >
                            Try a different filter or browse all products
                        </p>
                        <Link
                            href="/shop"
                            style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#ffffff',
                                background: '#1a1a1a',
                                padding: '12px 28px',
                                borderRadius: '24px',
                                textDecoration: 'none',
                                transition: 'background 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#333';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#1a1a1a';
                            }}
                        >
                            View All Products
                        </Link>
                    </div>
                ) : (
                    <div
                        className="products-grid"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: '20px',
                        }}
                    >
                        {products.map((product, index) => (
                            <ProductCard
                                key={`${product.id}-${index}`}
                                product={product}
                                index={index}
                                isCarousel={false}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
