'use client';

import React, { useState, useEffect, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Star,
    ShoppingBag,
    Heart,
    Share2,
    ChevronRight,
    ChevronLeft,
    Minus,
    Plus,
    Check,
    Truck,
    RotateCcw,
    ShieldCheck,
    Shield,
    Droplets,
    Leaf,
    Sparkles,
    Sun,
    Zap,
    FlaskConical,
    Heart as HeartIcon,
    Sprout,
    X,
    ZoomIn,
    MoreVertical,
} from 'lucide-react';
import { getProductPageData, getProductReviews, submitReview, deleteReview, updateReview, type ProductDetail as SupabaseProduct, type ProductCard as DBProductCard, type Review } from '@/lib/db/queries';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { ProductDetailSkeleton } from '@/components/Skeletons';
import ProductCard from '@/components/ProductCard';
import ProductBadge from '@/components/common/ProductBadge';
import type { SectionProduct } from '@/data/homeSections';

/* ===== Local Display Types (matches existing UI) ===== */
interface ProductDetail {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    images: string[];
    price: number;
    originalPrice: number;
    discountPercent: number;
    couponPrice: number | null;
    couponCode: string | null;
    rating: number;
    reviewCount: string;
    badges: { text: string; color: string | null }[];
    category: string;
    description: string;
    highlights: string[];
    howToUse: string;
    ingredients: string;
    keyBenefits: { icon: string; title: string; desc: string }[];
    sizes: { label: string; ml: string; price: number; active?: boolean; stockQuantity?: number }[];
    inStock: boolean;
    stockQuantity: number;
}

function mapSupabaseToDisplay(p: SupabaseProduct): ProductDetail {
    return {
        id: p.id,
        slug: p.slug,
        title: p.name,
        subtitle: p.subtitle || '',
        images: (() => {
            const urls = (p.images && p.images.length > 0) ? p.images.map(img => img.url).filter(url => url && url.trim() !== '') : [];
            return urls.length > 0 ? urls : ['/no-image.svg'];
        })(),
        price: Math.ceil(p.base_price),
        originalPrice: Math.ceil(p.compare_at_price || p.base_price),
        discountPercent: p.discount_percent || 0,
        couponPrice: p.coupon_price ? Math.ceil(p.coupon_price) : null,
        couponCode: p.coupon_code || null,
        rating: p.rating_avg || 0,
        reviewCount: String(p.review_count || 0),
        badges: (p.badges && p.badges.length > 0)
            ? p.badges.map(b => ({ text: (b.label || b.badge || '').replace(/_/g, ' ').toUpperCase(), color: b.color || null }))
            : [],
        category: p.category_name || 'Products',
        description: p.description || 'No description available.',
        highlights: p.highlights || [],
        howToUse: p.how_to_use || 'Apply as directed.',
        ingredients: p.ingredients || 'See product packaging.',
        keyBenefits: p.key_benefits || [],
        sizes: (p.sizes && p.sizes.length > 0) ? p.sizes.map(s => ({
            label: s.label,
            ml: s.ml || '',
            price: Math.ceil(s.price),
            active: s.is_default,
            stockQuantity: s.stockQuantity !== undefined ? s.stockQuantity : 0,
        })) : [{ label: 'Default', ml: '', price: Math.ceil(p.base_price), active: true, stockQuantity: p.stock_quantity }],
        inStock: p.in_stock,
        stockQuantity: p.stock_quantity || 0,
    };
}

function mapCardToDisplay(p: DBProductCard): ProductDetail {
    return {
        id: p.id,
        slug: p.slug,
        title: p.name,
        subtitle: p.subtitle || '',
        images: [p.primary_image_url || '/no-image.svg'],
        price: Math.ceil(p.base_price),
        originalPrice: Math.ceil(p.compare_at_price || p.base_price),
        discountPercent: p.discount_percent || 0,
        couponPrice: p.coupon_price ? Math.ceil(p.coupon_price) : null,
        couponCode: p.coupon_code || null,
        rating: p.rating_avg || 0,
        reviewCount: String(p.review_count || 0),
        badges: (p.badges && p.badges.length > 0)
            ? p.badges.map(b => ({ text: (b.label || b.badge || '').replace(/_/g, ' ').toUpperCase(), color: b.color || null }))
            : [],
        category: p.category_name || 'Products',
        description: p.short_description || '',
        highlights: [],
        howToUse: '',
        ingredients: '',
        keyBenefits: [],
        sizes: [{ label: 'Default', ml: '', price: Math.ceil(p.base_price), active: true }],
        inStock: p.in_stock,
        stockQuantity: p.stock_quantity || 0,
    };
}

/* ===== Icon Map ===== */
const iconMap: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
    Shield, Droplets, Leaf, Sparkles, Sun, Zap, FlaskConical, Heart: HeartIcon, Sprout,
};

/* ===== Color Helpers ===== */
function isLightColor(hex: string): boolean {
    const c = hex.replace('#', '');
    if (c.length < 6) return true;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55;
}

/* ===== Main Page Component ===== */
export default function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = use(params);
    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [related, setRelated] = useState<ProductDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState(499);

    const handleReviewSubmitted = (rating: number) => {
        setProduct(prev => {
            if (!prev) return null;
            const currentCount = Number(prev.reviewCount) || 0;
            const newCount = currentCount + 1;
            const currentAvg = prev.rating || 0;
            const newAvg = Math.round(((currentAvg * currentCount + rating) / newCount) * 10) / 10;
            return {
                ...prev,
                reviewCount: String(newCount),
                rating: newAvg,
            };
        });
    };

    const handleReviewDeleted = (rating: number) => {
        setProduct(prev => {
            if (!prev) return null;
            const currentCount = Number(prev.reviewCount) || 0;
            const newCount = Math.max(0, currentCount - 1);
            const currentAvg = prev.rating || 0;
            let newAvg = 0;
            if (newCount > 0) {
                newAvg = Math.round(((currentAvg * currentCount - rating) / newCount) * 10) / 10;
            }
            return {
                ...prev,
                reviewCount: String(newCount),
                rating: newAvg,
            };
        });
    };

    const handleReviewUpdated = (oldRating: number, newRating: number) => {
        setProduct(prev => {
            if (!prev) return null;
            const currentCount = Number(prev.reviewCount) || 0;
            if (currentCount === 0) return prev;
            const currentAvg = prev.rating || 0;
            const newAvg = Math.round(((currentAvg * currentCount - oldRating + newRating) / currentCount) * 10) / 10;
            return {
                ...prev,
                rating: newAvg,
            };
        });
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const timeout = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), 10000)
        );

        Promise.race([
            getProductPageData(slug),
            timeout,
        ]).then((result) => {
            if (cancelled) return;
            if (!result) return;

            const { product: dbProduct, related: dbRelated, threshold } = result as {
                product: any;
                related: any;
                threshold: any;
            };

            if (dbProduct) {
                setProduct(mapSupabaseToDisplay(dbProduct));
            } else {
                setProduct(null);
            }
            setRelated((dbRelated || []).map(mapCardToDisplay));
            
            if (typeof threshold === 'number') {
                setFreeShippingThreshold(threshold);
            } else if (threshold && typeof (threshold as any).amount === 'number') {
                setFreeShippingThreshold((threshold as any).amount);
            }
            setLoading(false);
        }).catch((err) => {
            console.error('Error loading product page data:', err);
            if (cancelled) return;
            setProduct(null);
            setLoading(false);
        });

        return () => { cancelled = true; };
    }, [slug]);

    if (loading) {
        return <ProductDetailSkeleton />;
    }

    if (!product) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '60vh', background: '#ffffff', fontFamily: "'Inter', sans-serif",
            }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px' }}>
                    Product not found
                </h1>
                <p style={{ color: '#888', marginBottom: '24px' }}>The product you&apos;re looking for doesn&apos;t exist.</p>
                <Link href="/" style={{
                    padding: '12px 32px', background: '#f5c518', color: '#1a1a1a', borderRadius: '10px',
                    fontWeight: 700, fontSize: '14px', textDecoration: 'none',
                }}>
                    Go Back Home
                </Link>
            </div>
        );
    }

    return (
        <div style={{ background: '#ffffff', minHeight: '100vh' }}>
            {/* Breadcrumbs */}
            <BreadcrumbNav product={product} />

            {/* Main Product Section */}
            <section style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 20px 20px' }}>
                <div className="pdp-grid" style={{
                    display: 'grid', gridTemplateColumns: '1.8fr 6fr', gap: '40px',
                }}>
                    {/* Left — Image Gallery */}
                    <div>
                        <ImageGallery images={product.images} title={product.title} badges={product.badges} />
                    </div>

                    {/* Right — Product Info */}
                    <div>
                        <ProductInfo product={product} freeShippingThreshold={freeShippingThreshold} />
                    </div>
                </div>
            </section>

            {/* Tabbed Content */}
            <TabbedContent product={product} />

            {/* Reviews Section */}
            <ReviewsSection product={product} onReviewSubmitted={handleReviewSubmitted} onReviewDeleted={handleReviewDeleted} onReviewUpdated={handleReviewUpdated} />

            {/* Related Products */}
            {related.length > 0 && <RelatedProducts products={related} />}
        </div>
    );
}

/* ===== Breadcrumb ===== */
function BreadcrumbNav({ product }: { product: ProductDetail }) {
    return (
        <nav className="pdp-breadcrumb" style={{
            maxWidth: '1400px', margin: '0 auto', padding: '6px 20px',
            display: 'flex', alignItems: 'center', gap: '6px',
            fontFamily: "'Inter', sans-serif", fontSize: '12px', color: '#999',
        }}>
            <Link href="/" style={{ color: '#999', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#999'}>
                Home
            </Link>
            <ChevronRight size={12} style={{ color: '#ccc' }} />
            <span style={{ color: '#999' }}>{product.category}</span>
            <ChevronRight size={12} style={{ color: '#ccc' }} />
            <span style={{ color: '#1a1a1a', fontWeight: 500, maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {product.title}
            </span>
        </nav>
    );
}

/* ===== Image Gallery ===== */
function ImageGallery({ images, title, badges }: { images: string[]; title: string; badges: { text: string; color: string | null }[] }) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [showLightbox, setShowLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    const openLightbox = (idx: number) => {
        setLightboxIndex(idx);
        setShowLightbox(true);
    };

    const closeLightbox = () => setShowLightbox(false);

    const goNext = () => setLightboxIndex(i => (i + 1) % images.length);
    const goPrev = () => setLightboxIndex(i => (i - 1 + images.length) % images.length);

    // Keyboard navigation
    useEffect(() => {
        if (!showLightbox) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [showLightbox]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <>
            <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="pdp-gallery"
                style={{ position: 'sticky', top: '80px', display: 'flex', gap: '10px' }}
            >
                {/* Thumbnails — vertical strip on left */}
                <div className="pdp-thumbnails" style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
                    {images.map((img, idx) => (
                        <button
                            key={idx}
                            onClick={() => setActiveIndex(idx)}
                            style={{
                                width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden',
                                border: idx === activeIndex ? '2px solid #2e7d32' : '1.5px solid #eee',
                                cursor: 'pointer', position: 'relative', background: '#f8f6f3',
                                transition: 'all 0.25s ease', padding: 0,
                                opacity: idx === activeIndex ? 1 : 0.65,
                                transform: idx === activeIndex ? 'scale(1.02)' : 'scale(1)',
                            }}
                            onMouseEnter={(e) => { if (idx !== activeIndex) e.currentTarget.style.opacity = '0.85'; }}
                            onMouseLeave={(e) => { if (idx !== activeIndex) e.currentTarget.style.opacity = '0.65'; }}
                        >
                            <Image
                                src={img}
                                alt={`${title} thumbnail ${idx + 1}`}
                                fill
                                sizes="60px"
                                style={{ objectFit: 'cover' }}
                            />
                        </button>
                    ))}
                </div>

                {/* Main Image */}
                <div
                    className="pdp-main-image"
                    onClick={() => openLightbox(activeIndex)}
                    style={{
                        position: 'relative', height: '65vh', width: '31vw', borderRadius: '16px',
                        overflow: 'hidden', background: '#f8f6f3',
                        border: '1px solid #f0f0f0', cursor: 'zoom-in',
                    }}
                >
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeIndex}
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3 }}
                            style={{ position: 'absolute', inset: 0 }}
                        >
                            <Image
                                src={images[activeIndex]}
                                alt={title}
                                fill
                                sizes="(max-width: 768px) 100vw, 45vw"
                                style={{ objectFit: 'contain' }}
                                priority
                            />
                        </motion.div>
                    </AnimatePresence>

                    {/* Zoom hint */}
                    <div style={{
                        position: 'absolute', bottom: '14px', right: '14px', zIndex: 2,
                        background: 'rgba(0,0,0,0.55)', borderRadius: '8px',
                        padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px',
                        backdropFilter: 'blur(4px)',
                    }}>
                        <ZoomIn size={14} color="#fff" />
                        <span style={{ fontSize: '11px', color: '#fff', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>Click to zoom</span>
                    </div>

                    {/* Badges */}
                    {badges.length > 0 && (
                        <div style={{ position: 'absolute', top: '14px', left: '14px', display: 'flex', flexDirection: 'column', gap: '6px', zIndex: 2 }}>
                            {badges.map((b, i) => (
                                <ProductBadge
                                    key={i}
                                    badge={b.text}
                                    badgeColor={b.color}
                                    variant="gallery"
                                />
                            ))}
                        </div>
                    )}



                </div>
            </motion.div>

            {/* ===== Lightbox Modal ===== */}
            <AnimatePresence>
                {showLightbox && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        onClick={closeLightbox}
                        style={{
                            position: 'fixed', inset: 0, zIndex: 9999,
                            background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={closeLightbox}
                            style={{
                                position: 'absolute', top: '20px', right: '24px', zIndex: 10,
                                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                                borderRadius: '50%', width: '44px', height: '44px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                        >
                            <X size={20} color="#fff" />
                        </button>

                        {/* Image Counter */}
                        <div style={{
                            position: 'absolute', top: '28px', left: '50%', transform: 'translateX(-50%)',
                            color: 'rgba(255,255,255,0.6)', fontSize: '13px', fontWeight: 600,
                            letterSpacing: '1px',
                        }}>
                            {lightboxIndex + 1} / {images.length}
                        </div>

                        {/* Nav Arrows */}
                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={e => { e.stopPropagation(); goPrev(); }}
                                    style={{
                                        position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '50%', width: '48px', height: '48px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)',
                                        zIndex: 10,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                >
                                    <ChevronLeft size={22} color="#fff" />
                                </button>
                                <button
                                    onClick={e => { e.stopPropagation(); goNext(); }}
                                    style={{
                                        position: 'absolute', right: '20px', top: '50%', transform: 'translateY(-50%)',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)',
                                        borderRadius: '50%', width: '48px', height: '48px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        cursor: 'pointer', transition: 'all 0.2s', backdropFilter: 'blur(4px)',
                                        zIndex: 10,
                                    }}
                                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.08)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(-50%) scale(1)'; }}
                                >
                                    <ChevronRight size={22} color="#fff" />
                                </button>
                            </>
                        )}

                        {/* Main Lightbox Image */}
                        <motion.div
                            key={lightboxIndex}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            onClick={e => e.stopPropagation()}
                            style={{
                                position: 'relative',
                                width: 'min(85vw, 800px)',
                                height: 'min(75vh, 800px)',
                                borderRadius: '16px',
                                overflow: 'hidden',
                                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                            }}
                        >
                            <Image
                                src={images[lightboxIndex]}
                                alt={`${title} - Image ${lightboxIndex + 1}`}
                                fill
                                sizes="85vw"
                                style={{ objectFit: 'contain', background: '#0a0a0a' }}
                                priority
                            />
                        </motion.div>

                        {/* Thumbnail Strip */}
                        {images.length > 1 && (
                            <div
                                onClick={e => e.stopPropagation()}
                                style={{
                                    display: 'flex', gap: '8px', marginTop: '20px',
                                    padding: '8px 16px', borderRadius: '12px',
                                    background: 'rgba(255,255,255,0.06)',
                                    backdropFilter: 'blur(8px)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                }}
                            >
                                {images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setLightboxIndex(idx)}
                                        style={{
                                            width: '52px', height: '52px', borderRadius: '8px',
                                            overflow: 'hidden', position: 'relative',
                                            border: idx === lightboxIndex ? '2px solid #f5c518' : '2px solid transparent',
                                            opacity: idx === lightboxIndex ? 1 : 0.5,
                                            cursor: 'pointer', padding: 0,
                                            transition: 'all 0.2s ease',
                                            transform: idx === lightboxIndex ? 'scale(1.05)' : 'scale(1)',
                                        }}
                                        onMouseEnter={e => { if (idx !== lightboxIndex) e.currentTarget.style.opacity = '0.8'; }}
                                        onMouseLeave={e => { if (idx !== lightboxIndex) e.currentTarget.style.opacity = '0.5'; }}
                                    >
                                        <Image
                                            src={img}
                                            alt={`${title} thumb ${idx + 1}`}
                                            fill
                                            sizes="52px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/* ===== Product Info ===== */
function ProductInfo({ product, freeShippingThreshold }: { product: ProductDetail; freeShippingThreshold: number }) {
    const [quantity, setQuantity] = useState(1);
    const initialSizeIdx = (() => {
        const idx = product.sizes.findIndex(s => s.active && (s.stockQuantity === undefined || s.stockQuantity > 0));
        if (idx >= 0) return idx;
        const fallbackIdx = product.sizes.findIndex(s => s.stockQuantity === undefined || s.stockQuantity > 0);
        if (fallbackIdx >= 0) return fallbackIdx;
        const defaultIdx = product.sizes.findIndex(s => s.active);
        return defaultIdx >= 0 ? defaultIdx : 0;
    })();
    const [selectedSizeIdx, setSelectedSizeIdx] = useState(initialSizeIdx);
    const [showAdded, setShowAdded] = useState(false);
    const { addToCart } = useCart();
    const { isWishlisted, toggleWishlist } = useWishlist();
    const wishlisted = isWishlisted(product.id);
    const router = useRouter();

    const currentSize = product.sizes[selectedSizeIdx] || product.sizes[0];
    const isCurrentSizeInStock = product.inStock && (currentSize ? (currentSize.stockQuantity === undefined || currentSize.stockQuantity > 0) : true);

    const handleAddToCart = () => {
        if (!isCurrentSizeInStock) return;
        addToCart({
            id: String(product.id),
            slug: product.slug,
            name: product.title,
            image: product.images[0],
            price: currentSize.price,
            originalPrice: product.originalPrice,
            size: currentSize.label,
            stockQuantity: currentSize.stockQuantity,
        }, quantity);
        setShowAdded(true);
    };

    const handleBuyNow = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isCurrentSizeInStock) return;
        const btn = e.currentTarget;
        if (btn) {
            btn.style.background = '#1a1a1a';
            btn.style.color = '#fff';
            btn.style.transform = 'translateY(0)';
        }
        addToCart({
            id: String(product.id),
            slug: product.slug,
            name: product.title,
            image: product.images[0],
            price: currentSize.price,
            originalPrice: product.originalPrice,
            size: currentSize.label,
            stockQuantity: currentSize.stockQuantity,
        }, quantity);
        router.push('/checkout');
    };

    // Reset the "Added" toast after 2 seconds
    useEffect(() => {
        if (showAdded) {
            const timer = setTimeout(() => setShowAdded(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [showAdded]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut', delay: 0.15 }}
            style={{ fontFamily: "'Inter', sans-serif" }}
        >
            {/* Category */}
            <span style={{
                fontSize: '11px', fontWeight: 600, color: '#2e7d32', textTransform: 'uppercase',
                letterSpacing: '1.2px', marginBottom: '4px', display: 'block',
            }}>
                {product.category}
            </span>

            {/* Title */}
            <h1 style={{
                fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 700,
                color: '#1a1a1a', lineHeight: 1.25, marginBottom: '3px',
            }}>
                {product.title}
            </h1>

            {/* Subtitle */}
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>
                {product.subtitle}
            </p>

            {/* Rating Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                    background: '#fff8e1', padding: '3px 10px', borderRadius: '6px',
                }}>
                    <Star size={13} fill="#ffb700" stroke="#ffb700" />
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#ffb700' }}>{product.rating}</span>
                </div>
                <span style={{ fontSize: '12px', color: '#888' }}>{product.reviewCount} Reviews</span>
                <span style={{
                    fontSize: '11px',
                    color: product.inStock ? '#2e7d32' : '#d32f2f',
                    fontWeight: 600,
                    background: product.inStock ? '#e8f5e9' : '#ffebee',
                    padding: '3px 10px',
                    borderRadius: '20px',
                }}>
                    {product.inStock ? `✓ ${product.stockQuantity} In Stock` : '✗ Out of Stock'}
                </span>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '12px' }} />

            {/* Price Section */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, color: '#1a1a1a', fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
                        ৳{currentSize.price}
                    </span>
                    {(() => {
                        const strikePrice = product.discountPercent > 0
                            ? Math.ceil(currentSize.price / (1 - product.discountPercent / 100))
                            : null;
                        const discountPct = strikePrice
                            ? Math.ceil(((strikePrice - currentSize.price) / strikePrice) * 100)
                            : 0;
                        return (
                            <>
                                {strikePrice && strikePrice > currentSize.price && (
                                    <span style={{ fontSize: '16px', color: '#bbb', textDecoration: 'line-through', fontFamily: "'Inter', sans-serif", lineHeight: 1 }}>
                                        ৳{strikePrice}
                                    </span>
                                )}
                                {discountPct > 0 && (
                                    <span style={{
                                        fontSize: '12px', fontWeight: 700, color: '#fff', background: '#2e7d32',
                                        padding: '2px 8px', borderRadius: '5px',
                                    }}>
                                        {Math.ceil(discountPct)}% OFF
                                    </span>
                                )}
                            </>
                        );
                    })()}
                </div>


            </div>

            {/* Size Selector */}
            <div style={{ marginBottom: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '6px' }}>
                    Select Size
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {product.sizes.map((size, idx) => {
                        const isSizeOutOfStock = size.stockQuantity !== undefined && size.stockQuantity <= 0;
                        return (
                            <button
                                key={idx}
                                onClick={() => setSelectedSizeIdx(idx)}
                                style={{
                                    padding: '7px 16px', borderRadius: '8px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: 600, transition: 'all 0.2s ease',
                                    fontFamily: "'Inter', sans-serif",
                                    background: selectedSizeIdx === idx 
                                        ? '#1a1a1a' 
                                        : (isSizeOutOfStock ? '#f5f5f5' : '#fff'),
                                    color: selectedSizeIdx === idx 
                                        ? '#fff' 
                                        : (isSizeOutOfStock ? '#bbb' : '#1a1a1a'),
                                    border: selectedSizeIdx === idx 
                                        ? '2px solid #1a1a1a' 
                                        : (isSizeOutOfStock ? '2px dashed #ddd' : '2px solid #e0e0e0'),
                                    opacity: isSizeOutOfStock ? 0.6 : 1,
                                    textDecoration: isSizeOutOfStock ? 'line-through' : 'none',
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedSizeIdx !== idx && !isSizeOutOfStock) {
                                        e.currentTarget.style.borderColor = '#999';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedSizeIdx !== idx && !isSizeOutOfStock) {
                                        e.currentTarget.style.borderColor = '#e0e0e0';
                                    }
                                }}
                            >
                                {size.label}{size.ml ? `  ${size.ml}` : ''} — ৳{size.price}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Quantity + Wishlist Row */}
            {product.inStock && (
                <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '10px' }}>
                    {/* Quantity Selector */}
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '0',
                        border: '2px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden',
                    }}>
                        <button onClick={() => setQuantity(Math.max(1, quantity - 1))} style={{
                            width: '38px', height: '40px', border: 'none', background: '#fafafa',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fafafa'}
                        >
                            <Minus size={14} color="#555" />
                        </button>
                        <span style={{
                            width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 700, color: '#1a1a1a', background: '#fff',
                        }}>
                            {quantity}
                        </span>
                        <button onClick={() => setQuantity(Math.min(currentSize.stockQuantity !== undefined ? currentSize.stockQuantity : product.stockQuantity, quantity + 1))} style={{
                            width: '38px', height: '40px', border: 'none', background: '#fafafa',
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.15s',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                            onMouseLeave={(e) => e.currentTarget.style.background = '#fafafa'}
                        >
                            <Plus size={14} color="#555" />
                        </button>
                    </div>

                    {/* Wishlist */}
                    <button
                        onClick={() => toggleWishlist(product.id)}
                        style={{
                            width: '44px', height: '44px', borderRadius: '10px', border: '2px solid #e0e0e0',
                            background: wishlisted ? '#fef2f2' : '#fff', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ef4444'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = wishlisted ? '#ef4444' : '#e0e0e0'}
                    >
                        <Heart size={18} fill={wishlisted ? '#ef4444' : 'none'} color={wishlisted ? '#ef4444' : '#888'} />
                    </button>
                </div>
            )}

            {/* Add to Cart + Buy Now Row */}
            <div className="pdp-action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                {isCurrentSizeInStock ? (
                    <>
                        {/* Add to Cart */}
                        <button
                            onClick={handleAddToCart}
                            style={{
                                width: '40%', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                background: showAdded ? '#2e7d32' : '#f5c518',
                                color: showAdded ? '#fff' : '#1a1a1a',
                                border: 'none', borderRadius: '10px',
                                fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
                                transition: 'all 0.3s ease', textTransform: 'uppercase',
                                fontFamily: "'Inter', sans-serif",
                            }}
                            onMouseEnter={(e) => { if (!showAdded) { e.currentTarget.style.background = '#e6b800'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                            onMouseLeave={(e) => { if (!showAdded) { e.currentTarget.style.background = '#f5c518'; e.currentTarget.style.transform = 'translateY(0)'; } }}
                        >
                            {showAdded && <Check size={16} />}
                            {showAdded ? '✓ ADDED TO CART' : 'ADD TO CART'}
                        </button>

                        {/* Buy Now */}
                        <button
                            onClick={handleBuyNow}
                            style={{
                                width: '40%', padding: '8px', background: '#1a1a1a', color: '#fff',
                                border: '2px solid #1a1a1a', borderRadius: '10px', fontSize: '12px', fontWeight: 700,
                                letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.3s ease',
                                textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#1a1a1a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            BUY NOW
                        </button>
                    </>
                ) : !product.inStock ? (
                    /* Wishlist Button */
                    <button
                        onClick={() => toggleWishlist(product.id)}
                        style={{
                            width: '82%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            background: wishlisted ? '#fef2f2' : '#f5c518',
                            color: wishlisted ? '#ef4444' : '#1a1a1a',
                            border: wishlisted ? '2px solid #ef4444' : 'none',
                            borderRadius: '10px',
                            fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', cursor: 'pointer',
                            transition: 'all 0.3s ease', textTransform: 'uppercase',
                            fontFamily: "'Inter', sans-serif",
                        }}
                        onMouseEnter={(e) => {
                            if (!wishlisted) {
                                e.currentTarget.style.background = '#e6b800';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                            } else {
                                e.currentTarget.style.background = '#ffebee';
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!wishlisted) {
                                e.currentTarget.style.background = '#f5c518';
                                e.currentTarget.style.transform = 'translateY(0)';
                            } else {
                                e.currentTarget.style.background = '#fef2f2';
                            }
                        }}
                    >
                        <Heart size={16} fill={wishlisted ? '#ef4444' : 'none'} color={wishlisted ? '#ef4444' : '#1a1a1a'} />
                        {wishlisted ? 'REMOVE FROM WISHLIST' : 'ADD TO WISHLIST'}
                    </button>
                ) : (
                    /* Size Out of Stock Button */
                    <button
                        disabled
                        style={{
                            width: '82%', padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: '#e0e0e0', color: '#888', border: 'none', borderRadius: '10px',
                            fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px', cursor: 'not-allowed',
                            textTransform: 'uppercase', fontFamily: "'Inter', sans-serif",
                        }}
                    >
                        OUT OF STOCK (THIS SIZE)
                    </button>
                )}
            </div>

            {/* Highlights */}
            <div style={{
                background: '#fafafa', borderRadius: '12px', padding: '14px 18px',
                border: '1px solid #f0f0f0',
            }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#1a1a1a', marginBottom: '8px' }}>
                    Product Highlights
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {product.highlights.map((h, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Check size={14} color="#2e7d32" strokeWidth={3} />
                            <span style={{ fontSize: '12px', color: '#555', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{h}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}



/* ===== Tabbed Content ===== */
function TabbedContent({ product }: { product: ProductDetail }) {
    const [activeTab, setActiveTab] = useState<'description' | 'howToUse' | 'ingredients'>('description');

    const tabs = [
        { key: 'description' as const, label: 'Description' },
        { key: 'howToUse' as const, label: 'How to Use' },
        { key: 'ingredients' as const, label: 'Ingredients' },
    ];

    const textContent: Record<string, string> = {
        description: product.description,
        howToUse: product.howToUse,
        ingredients: product.ingredients,
    };

    return (
        <section className="pdp-tabs-section" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px 56px' }}>
            {/* Tab Headers */}
            <div className="pdp-tab-bar hide-scrollbar" style={{
                display: 'flex', gap: '0', borderBottom: '2px solid #f0f0f0', marginBottom: '32px',
                overflowX: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none',
            }}>
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        style={{
                            padding: '14px 28px', border: 'none', background: 'none', cursor: 'pointer',
                            fontFamily: "'Inter', sans-serif", fontSize: '15px',
                            fontWeight: activeTab === tab.key ? 700 : 500,
                            color: activeTab === tab.key ? '#1a1a1a' : '#999',
                            borderBottom: activeTab === tab.key ? '3px solid #2e7d32' : '3px solid transparent',
                            transition: 'all 0.2s ease', marginBottom: '-2px',
                            whiteSpace: 'nowrap',
                        }}
                        onMouseEnter={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = '#555'; }}
                        onMouseLeave={(e) => { if (activeTab !== tab.key) e.currentTarget.style.color = '#999'; }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.25 }}
                >
                    <div style={{
                        fontFamily: "'Inter', sans-serif", fontSize: '15px', lineHeight: 1.8,
                        color: '#555', maxWidth: '800px',
                        wordBreak: 'break-word', overflowWrap: 'anywhere',
                    }}>
                        {textContent[activeTab]}
                    </div>
                </motion.div>
            </AnimatePresence>
        </section>
    );
}

/* ===== Reviews Section ===== */
function ReviewsSection({
    product,
    onReviewSubmitted,
    onReviewDeleted,
    onReviewUpdated,
}: {
    product: ProductDetail;
    onReviewSubmitted: (rating: number) => void;
    onReviewDeleted: (rating: number) => void;
    onReviewUpdated: (oldRating: number, newRating: number) => void;
}) {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [reviewLoading, setReviewLoading] = useState(true);
    const { user } = useAuth();
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '' });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [showAllReviews, setShowAllReviews] = useState(false);

    // Edit/delete state hooks
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ rating: 5, title: '', body: '' });
    const [updatingReview, setUpdatingReview] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

    // Image Zoom modal state
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);

    // 3-dot menu active review ID
    const [activeMenuReviewId, setActiveMenuReviewId] = useState<string | null>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;
            if (!document.body.contains(target)) {
                return;
            }
            if (target.closest && (target.closest('.review-menu-btn') || target.closest('.review-menu-dropdown'))) {
                return;
            }
            setActiveMenuReviewId(null);
        };
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setZoomedImage(null);
        };
        if (zoomedImage) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [zoomedImage]);

    useEffect(() => {
        let active = true;
        getProductReviews(product.id).then(data => {
            if (active) {
                setReviews(data);
                setReviewLoading(false);
            }
        });
        return () => { active = false; };
    }, [product.id]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                setUploadedImages(prev => [...prev, data.url]);
            } else if (data.error) {
                alert(data.error);
            }
        } catch (err) {
            console.error('Error uploading image:', err);
            alert('Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmitReview = async () => {
        if (!user?.id || reviewForm.rating < 1) return;
        setSubmitting(true);
        setSubmitError(null);
        const { error, reviewId } = await submitReview({
            product_id: product.id,
            user_id: user.id,
            rating: reviewForm.rating,
            title: reviewForm.title,
            body: reviewForm.body,
            images: uploadedImages.map((url, idx) => ({
                url,
                altText: 'Review Image',
                sortOrder: idx
            })),
        });
        setSubmitting(false);
        if (!error) {
            setSubmitted(true);
            const newReview: Review = {
                id: reviewId || 'temp-' + Date.now(),
                product_id: product.id,
                user_id: user.id,
                rating: reviewForm.rating,
                title: reviewForm.title || null,
                body: reviewForm.body || null,
                is_verified: false,
                helpful_count: 0,
                created_at: new Date().toISOString(),
                user_name: user.displayName || user.fullName || 'You',
                images: uploadedImages.map((url, idx) => ({
                    url,
                    altText: 'Review Image',
                    sortOrder: idx
                }))
            };
            setReviews(prev => [newReview, ...prev]);
            setReviewForm({ rating: 5, title: '', body: '' });
            setUploadedImages([]);
            onReviewSubmitted(reviewForm.rating);
        } else {
            if (error.includes('E11000') || error.toLowerCase().includes('duplicate key')) {
                setSubmitError('You have already submitted a review for this product.');
            } else {
                setSubmitError(error || 'Failed to submit review.');
            }
        }
    };

    const handleDeleteReview = async (review: Review) => {
        if (!user?.id) return;
        if (!window.confirm('Are you sure you want to delete this review?')) return;

        setDeletingReviewId(review.id);
        const { error } = await deleteReview({
            reviewId: review.id,
            userId: user.id
        });
        setDeletingReviewId(null);

        if (!error) {
            setReviews(prev => prev.filter(r => r.id !== review.id));
            onReviewDeleted(review.rating);
        } else {
            alert(error || 'Failed to delete review');
        }
    };

    const startEditing = (review: Review) => {
        setEditingReviewId(review.id);
        setEditForm({
            rating: review.rating,
            title: review.title || '',
            body: review.body || ''
        });
        setEditError(null);
    };

    const handleSaveEdit = async (reviewId: string, oldRating: number) => {
        if (!user?.id) return;
        if (editForm.rating < 1) {
            setEditError('Rating must be at least 1 star');
            return;
        }

        setUpdatingReview(true);
        setEditError(null);

        const { error } = await updateReview({
            reviewId,
            userId: user.id,
            rating: editForm.rating,
            title: editForm.title,
            body: editForm.body
        });

        setUpdatingReview(false);

        if (!error) {
            setReviews(prev => prev.map(r => {
                if (r.id === reviewId) {
                    return {
                        ...r,
                        rating: editForm.rating,
                        title: editForm.title || null,
                        body: editForm.body || null,
                        created_at: new Date().toISOString()
                    };
                }
                return r;
            }));
            setEditingReviewId(null);
            onReviewUpdated(oldRating, editForm.rating);
        } else {
            setEditError(error || 'Failed to update review');
        }
    };

    const ratingDist = [5, 4, 3, 2, 1].map(star => {
        const count = reviews.filter(r => r.rating === star).length;
        return { star, count, pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0 };
    });

    return (
        <section className="pdp-reviews-section" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px 56px' }}>
            <h2 style={{
                fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700,
                color: '#1a1a1a', marginBottom: '24px',
            }}>
                Customer Reviews
            </h2>
            {reviewLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
                    Loading reviews...
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '48px', alignItems: 'start' }} className="review-grid">
                    {/* Rating Summary */}
                    <div style={{
                        background: '#fafafa', borderRadius: '16px', padding: '24px',
                        border: '1px solid #f0f0f0',
                    }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <div style={{ fontSize: '48px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>
                                {product.rating}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '8px 0' }}>
                                {[1, 2, 3, 4, 5].map(s => (
                                    <Star key={s} size={18}
                                        fill={s <= Math.round(product.rating) ? '#ffb700ff' : 'none'}
                                        stroke="#ffb700ff" />
                                ))}
                            </div>
                            <div style={{ fontSize: '13px', color: '#888' }}>
                                Based on {product.reviewCount} reviews
                            </div>
                        </div>
                        {/* Distribution bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {ratingDist.map(rd => (
                                <div key={rd.star} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#555', width: '14px' }}>{rd.star}</span>
                                    <Star size={12} fill="#ffb700ff" stroke="#ffb700ff" />
                                    <div style={{
                                        flex: 1, height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden',
                                    }}>
                                        <div style={{
                                            width: `${rd.pct}%`, height: '100%',
                                            background: '#ffb700ff', borderRadius: '4px',
                                            transition: 'width 0.5s ease',
                                        }} />
                                    </div>
                                    <span style={{ fontSize: '12px', color: '#999', width: '24px', textAlign: 'right' }}>{rd.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Reviews list + form */}
                    <div>
                        {/* Write review form */}
                        {user ? (
                            <div style={{
                                background: '#fafafa', borderRadius: '16px', padding: '24px',
                                border: '1px solid #f0f0f0', marginBottom: '32px',
                            }}>
                                <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, marginBottom: '16px', color: '#1a1a1a' }}>
                                    Write a Review
                                </h4>
                                {submitted ? (
                                    <div style={{
                                        padding: '16px', background: '#e8f5e9', borderRadius: '10px',
                                        color: '#2e7d32', fontSize: '14px', fontWeight: 600, textAlign: 'center',
                                    }}>
                                        ✓ Thank you! Your review has been submitted for moderation.
                                    </div>
                                ) : (
                                    <>
                                        {submitError && (
                                            <div style={{
                                                padding: '12px 16px', background: '#ffebee', borderRadius: '10px',
                                                color: '#c62828', fontSize: '13px', fontWeight: 600, marginBottom: '14px',
                                            }}>
                                                ⚠️ {submitError}
                                            </div>
                                        )}
                                        {/* Star selector */}
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <button key={s}
                                                    onClick={() => setReviewForm(p => ({ ...p, rating: s }))}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                >
                                                    <Star size={24}
                                                        fill={s <= reviewForm.rating ? '#ffb700ff' : 'none'}
                                                        stroke="#ffb700ff"
                                                        strokeWidth={2} />
                                                </button>
                                            ))}
                                        </div>
                                        <input
                                            placeholder="Review title (optional)"
                                            value={reviewForm.title}
                                            onChange={e => setReviewForm(p => ({ ...p, title: e.target.value }))}
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '10px',
                                                border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '10px',
                                                fontFamily: "'Inter', sans-serif", outline: 'none',color: 'black'
                                            }}
                                        />
                                        <textarea
                                            placeholder="Write your review here..."
                                            value={reviewForm.body}
                                            onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                                            rows={4}
                                            style={{
                                                width: '100%', padding: '10px 14px', borderRadius: '10px',
                                                border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '12px',
                                                fontFamily: "'Inter', sans-serif", resize: 'none', outline: 'none',color: 'black'
                                            }}
                                        />

                                        {/* Image Upload */}
                                        <div style={{ marginBottom: '16px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', display: 'block' }}>
                                                Add Photos (optional)
                                            </span>
                                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                {uploadedImages.map((url, idx) => (
                                                    <div key={idx} style={{
                                                        position: 'relative', width: '56px', height: '56px',
                                                        borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                    }}>
                                                        <Image src={url} alt="Uploaded" fill style={{ objectFit: 'cover' }} />
                                                    </div>
                                                ))}
                                                {uploadedImages.length < 5 && (
                                                    <label style={{
                                                        width: '56px', height: '56px', borderRadius: '8px',
                                                        border: '2px dashed #ccc', display: 'flex', flexDirection: 'column',
                                                        alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                        background: '#fff', transition: 'all 0.2s',
                                                    }}
                                                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#1a1a1a'}
                                                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#ccc'}
                                                    >
                                                        <span style={{ fontSize: '18px', color: '#666', fontWeight: 'bold', lineHeight: 1 }}>+</span>
                                                        <span style={{ fontSize: '9px', color: '#888' }}>Upload</span>
                                                        <input
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={handleImageUpload}
                                                            style={{ display: 'none' }}
                                                        />
                                                    </label>
                                                )}
                                            </div>
                                            {uploading && (
                                                <span style={{ fontSize: '11px', color: '#666', marginTop: '4px', display: 'block' }}>
                                                    Uploading photo...
                                                </span>
                                            )}
                                        </div>

                                        <button
                                            onClick={handleSubmitReview}
                                            disabled={submitting || uploading}
                                            style={{
                                                padding: '10px 24px', background: '#1a1a1a', color: '#fff',
                                                border: 'none', borderRadius: '10px', fontSize: '14px',
                                                fontWeight: 600, cursor: (submitting || uploading) ? 'not-allowed' : 'pointer',
                                                opacity: (submitting || uploading) ? 0.6 : 1,
                                            }}
                                        >
                                            {submitting ? 'Submitting...' : 'Submit Review'}
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div style={{
                                padding: '20px', background: '#fff8e1', borderRadius: '12px',
                                border: '1px solid #fef3cd', marginBottom: '32px',
                                fontSize: '14px', color: '#856404', textAlign: 'center',
                            }}>
                                <a href="/auth" style={{ color: '#2e7d32', fontWeight: 700, textDecoration: 'underline' }}>Sign in</a>
                                {' '}to write a review
                            </div>
                        )}

                        {/* Review list */}
                        {reviews.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '32px', color: '#999', fontSize: '14px' }}>
                                No reviews yet. Be the first to review this product!
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {(showAllReviews ? reviews : reviews.slice(0, 3)).map(review => (
                                    <div key={review.id} style={{
                                        padding: '20px', borderRadius: '14px', border: '1px solid #f0f0f0',
                                        background: '#fff',
                                        position: 'relative',
                                    }}>
                                        {/* 3-dot action menu for review owner */}
                                        {user?.id === review.user_id && editingReviewId !== review.id && (
                                            <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
                                                <button
                                                    className="review-menu-btn"
                                                    onClick={(e) => { e.stopPropagation(); setActiveMenuReviewId(prev => prev === review.id ? null : review.id); }}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#999',
                                                        cursor: 'pointer', padding: '4px', borderRadius: '50%',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                                {activeMenuReviewId === review.id && (
                                                    <div className="review-menu-dropdown" style={{
                                                        position: 'absolute', right: 0, top: '28px',
                                                        background: 'white', border: '1px solid #e0e0e0',
                                                        borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                        padding: '6px 0', zIndex: 10, minWidth: '100px',
                                                    }}>
                                                        <button
                                                            onClick={() => { setActiveMenuReviewId(null); startEditing(review); }}
                                                            style={{
                                                                width: '100%', padding: '8px 16px', border: 'none',
                                                                background: 'none', color: '#1a1a1a', textAlign: 'left',
                                                                fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() => { setActiveMenuReviewId(null); handleDeleteReview(review); }}
                                                            style={{
                                                                width: '100%', padding: '8px 16px', border: 'none',
                                                                background: 'none', color: '#cc0000', textAlign: 'left',
                                                                fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                                fontWeight: 500,
                                                            }}
                                                            onMouseEnter={(e) => e.currentTarget.style.background = '#fff0f0'}
                                                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {editingReviewId !== review.id && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', gap: '2px' }}>
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <Star key={s} size={14}
                                                            fill={s <= review.rating ? '#ffb700' : 'none'}
                                                            stroke="#ffb700" />
                                                    ))}
                                                </div>
                                                {review.is_verified && (
                                                    <span style={{
                                                        fontSize: '11px', fontWeight: 600, color: '#2e7d32',
                                                        background: '#e8f5e9', padding: '2px 8px', borderRadius: '4px',
                                                    }}>Verified Purchase</span>
                                                )}
                                            </div>
                                        )}

                                        {editingReviewId === review.id ? (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', marginBottom: '10px' }}>
                                                <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                                                    {[1, 2, 3, 4, 5].map(s => (
                                                        <button
                                                            key={s}
                                                            type="button"
                                                            onClick={() => setEditForm(p => ({ ...p, rating: s }))}
                                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                                                        >
                                                            <Star size={18}
                                                                fill={s <= editForm.rating ? '#ffb700' : 'none'}
                                                                stroke="#ffb700" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <input
                                                    placeholder="Review title"
                                                    value={editForm.title}
                                                    onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                                                        border: '1px solid #e0e0e0', fontSize: '13px',
                                                        fontFamily: "'Inter', sans-serif", outline: 'none', color: 'black'
                                                    }}
                                                />
                                                <textarea
                                                    placeholder="Write your review here..."
                                                    value={editForm.body}
                                                    onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                                                    rows={3}
                                                    style={{
                                                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                                                        border: '1px solid #e0e0e0', fontSize: '13px',
                                                        fontFamily: "'Inter', sans-serif", resize: 'none', outline: 'none', color: 'black'
                                                    }}
                                                />
                                                {editError && (
                                                    <div style={{ color: '#d32f2f', fontSize: '12px' }}>{editError}</div>
                                                )}
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                                    <button
                                                        onClick={() => handleSaveEdit(review.id, review.rating)}
                                                        disabled={updatingReview}
                                                        style={{
                                                            padding: '6px 16px', background: '#1a1a1a', color: '#fff',
                                                            border: 'none', borderRadius: '8px', fontSize: '12px',
                                                            fontWeight: 600, cursor: updatingReview ? 'not-allowed' : 'pointer',
                                                            opacity: updatingReview ? 0.6 : 1,
                                                        }}
                                                    >
                                                        {updatingReview ? 'Saving...' : 'Save'}
                                                    </button>
                                                    <button
                                                        onClick={() => setEditingReviewId(null)}
                                                        disabled={updatingReview}
                                                        style={{
                                                            padding: '6px 16px', background: '#f5f5f5', color: '#333',
                                                            border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px',
                                                            fontWeight: 600, cursor: updatingReview ? 'not-allowed' : 'pointer',
                                                        }}
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                {review.title && (
                                                    <h5 style={{
                                                        fontSize: '15px', fontWeight: 600, color: '#1a1a1a',
                                                        marginBottom: '6px', fontFamily: "'Inter', sans-serif",
                                                    }}>{review.title}</h5>
                                                )}
                                                {review.body && (
                                                    <p style={{
                                                        fontSize: '14px', color: '#555', lineHeight: 1.6,
                                                        marginBottom: '10px',
                                                    }}>{review.body}</p>
                                                )}
                                                {review.images && review.images.length > 0 && (
                                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px', marginBottom: '14px' }}>
                                                        {review.images.map((img, idx) => (
                                                            <div key={idx}
                                                                onClick={() => setZoomedImage(img.url)}
                                                                style={{
                                                                    position: 'relative', width: '80px', height: '80px',
                                                                    borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                                    cursor: 'pointer'
                                                                }}
                                                            >
                                                                <Image
                                                                    src={img.url}
                                                                    alt={img.altText || `Review Image ${idx + 1}`}
                                                                    fill
                                                                    style={{ objectFit: 'cover' }}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}

                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', fontSize: '12px', color: '#999' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span style={{ fontWeight: 600, color: '#666' }}>{review.user_name}</span>
                                                <span>•</span>
                                                <span>{new Date(review.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {reviews.length > 3 && (
                                    <button
                                        onClick={() => setShowAllReviews(!showAllReviews)}
                                        style={{
                                            alignSelf: 'center',
                                            padding: '10px 24px',
                                            background: '#ffffff',
                                            color: '#1a1a1a',
                                            border: '2px solid #1a1a1a',
                                            borderRadius: '10px',
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            marginTop: '12px',
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#1a1a1a';
                                            e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#ffffff';
                                            e.currentTarget.style.color = '#1a1a1a';
                                        }}
                                    >
                                        {showAllReviews ? 'Show Less' : `View All Reviews (${reviews.length})`}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Image Zoom Modal */}
            <AnimatePresence>
                {zoomedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setZoomedImage(null)}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0, 0, 0, 0.85)',
                            backdropFilter: 'blur(8px)',
                            zIndex: 2000,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'zoom-out',
                        }}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setZoomedImage(null); }}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                border: 'none',
                                color: 'white',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'background 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                        >
                            <X size={20} />
                        </button>
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                                position: 'relative',
                                maxWidth: '85vw',
                                maxHeight: '85vh',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                                cursor: 'default',
                            }}
                        >
                            <img
                                src={zoomedImage}
                                alt="Zoomed Review"
                                style={{
                                    maxWidth: '100%',
                                    maxHeight: '85vh',
                                    objectFit: 'contain',
                                    display: 'block',
                                }}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </section>
    );
}

/* ===== Related Products ===== */
function toSectionProductFromDetail(p: ProductDetail): SectionProduct {
    const primaryBadge = p.badges?.[0];
    const badgeText = primaryBadge?.text;

    return {
        id: p.id,
        slug: p.slug,
        image: p.images?.[0] || '/no-image.svg',
        title: p.title,
        description: p.description || '',
        price: p.price,
        originalPrice: p.originalPrice,
        discountPercent: p.discountPercent,
        rating: p.rating,
        reviewCount: p.reviewCount,
        badge: badgeText,
        badgeColor: primaryBadge?.color || undefined,
        inStock: p.inStock,
        stockQuantity: p.stockQuantity,
        sizes: p.sizes ? p.sizes.map((sz, idx) => ({
            id: `${p.id}-${sz.label}-${idx}`,
            label: sz.label,
            ml: sz.ml || null,
            price: sz.price,
            is_default: !!sz.active,
            stockQuantity: sz.stockQuantity,
        })) : null,
        couponCode: p.couponCode || undefined,
        couponPrice: p.couponPrice || undefined,
    };
}

function RelatedProducts({ products }: { products: ProductDetail[] }) {
    return (
        <section className="pdp-related-section" style={{ background: '#ffffff', padding: '56px 0 72px' }}>
            <div className="pdp-related-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px' }}>
                <h2 style={{
                    fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700,
                    color: '#1a1a1a', marginBottom: '8px',
                }}>
                    People also like
                </h2>
                <p style={{
                    fontFamily: "'Inter', sans-serif", fontSize: '14px', color: '#888',
                    marginBottom: '28px',
                }}>
                    Explore more products you&apos;ll love
                </p>

                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px',
                }} className="products-grid">
                    {products.map((product, i) => (
                        <ProductCard
                            key={product.id}
                            product={toSectionProductFromDetail(product)}
                            index={i}
                            isCarousel={false}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}
