'use client';

import React, { useState, useEffect, useRef, use, useMemo } from 'react';
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
    Camera,
    Search,
    Filter,
    MessageSquare,
    CheckCircle2,
    Edit3,
    Trash2,
    MapPin,
    Flag,
    AlertCircle,
} from 'lucide-react';
import {
    getProductPageData,
    getProductReviews,
    submitReview,
    deleteReview,
    updateReview,
    getUserAddresses,
    type ProductDetail as SupabaseProduct,
    type ProductCard as DBProductCard,
    type Review
} from '@/lib/db/queries';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import { useAuth } from '@/lib/AuthContext';
import { ProductDetailSkeleton } from '@/components/Skeletons';
import ProductCard from '@/components/ProductCard';
import ProductBadge from '@/components/common/ProductBadge';
import StickyActionBar from '@/components/product/StickyActionBar';
import ReviewImageGalleryModal from '@/components/product/ReviewImageGalleryModal';
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

    // Scroll to #reviews section and focus review form if arriving via hash or section query param
    useEffect(() => {
        if (loading || !product || typeof window === 'undefined') return;

        const isReviewsTarget = () => {
            const hasHash = window.location.hash === '#reviews';
            const hasSectionParam = new URLSearchParams(window.location.search).get('section') === 'reviews';
            return hasHash || hasSectionParam;
        };

        if (!isReviewsTarget()) return;

        let attempts = 0;
        const maxAttempts = 60; // Check up to 6 seconds

        const timer = setInterval(() => {
            attempts++;
            const reviewsEl = document.getElementById('reviews');
            if (reviewsEl) {
                clearInterval(timer);
                reviewsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // If hash was dropped (e.g. during OAuth provider round-trip), restore #reviews
                if (window.location.hash !== '#reviews') {
                    try {
                        const newUrl = `${window.location.pathname}${window.location.search}#reviews`;
                        window.history.replaceState(null, '', newUrl);
                    } catch {}
                }

                // Focus the review form body textarea
                setTimeout(() => {
                    const bodyTextarea = document.getElementById('review-body-textarea') as HTMLTextAreaElement | null;
                    if (bodyTextarea) {
                        bodyTextarea.focus({ preventScroll: true });
                    }
                }, 400);
            } else if (attempts >= maxAttempts) {
                clearInterval(timer);
            }
        }, 100);

        return () => clearInterval(timer);
    }, [loading, product]);

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
        <div className="pdp-page-container" style={{ background: '#ffffff', minHeight: '100vh' }}>
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
    const originalActionsRef = useRef<HTMLDivElement>(null);
    const [isStickyVisible, setIsStickyVisible] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const { addToCart } = useCart();
    const { isWishlisted, toggleWishlist } = useWishlist();
    const wishlisted = isWishlisted(product.id);
    const router = useRouter();

    // Track viewport width for mobile-only sticky bar (< 768px)
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // IntersectionObserver to show sticky bar earlier when original buttons scroll near the top
    useEffect(() => {
        if (!isMobile) {
            setIsStickyVisible(false);
            return;
        }

        const target = originalActionsRef.current;
        if (!target) return;

        // Offset in px: triggers earlier as original buttons scroll into the upper screen area (e.g. 280px)
        const STICKY_TRIGGER_OFFSET = 280;

        const observer = new IntersectionObserver(
            ([entry]) => {
                // Show sticky bar earlier once buttons reach or pass the top offset boundary
                const isScrolledPast = !entry.isIntersecting && entry.boundingClientRect.top <= STICKY_TRIGGER_OFFSET;
                setIsStickyVisible(isScrolledPast);
            },
            {
                root: null,
                rootMargin: `-${STICKY_TRIGGER_OFFSET}px 0px 0px 0px`,
                threshold: 0,
            }
        );

        observer.observe(target);

        return () => {
            observer.disconnect();
        };
    }, [isMobile]);

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
                <a
                    href="#reviews"
                    onClick={(e) => {
                        e.preventDefault();
                        document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                        setTimeout(() => {
                            document.getElementById('review-body-textarea')?.focus();
                        }, 300);
                    }}
                    style={{ fontSize: '12px', color: '#888', textDecoration: 'underline', cursor: 'pointer' }}
                >
                    {product.reviewCount} Reviews
                </a>
                <span style={{
                    fontSize: '11px',
                    color: product.inStock ? '#2e7d32' : '#d32f2f',
                    fontWeight: 600,
                    background: product.inStock ? '#e8f5e9' : '#ffebee',
                    padding: '3px 10px',
                    borderRadius: '20px',
                }}>
                    {product.inStock ? `${product.stockQuantity} In Stock` : 'Out of Stock'}
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
            <div ref={originalActionsRef} className="pdp-action-buttons" style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
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

            {/* Mobile Sticky Action Bar */}
            <StickyActionBar
                isVisible={isStickyVisible}
                isMobile={isMobile}
                isCurrentSizeInStock={Boolean(isCurrentSizeInStock)}
                isProductInStock={product.inStock}
                showAdded={showAdded}
                onAddToCart={handleAddToCart}
                onBuyNow={handleBuyNow}
                wishlisted={wishlisted}
                onToggleWishlist={() => toggleWishlist(product.id)}
                productTitle={product.title}
            />

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

/* ===== Review Helpers ===== */
function formatReviewDate(dateStr: string): string {
    try {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

const AVATAR_BG_COLORS = ['#e0f2fe', '#fce7f3', '#fef3c7', '#dcfce7', '#ede9fe', '#ffedd5'];
function getAvatarColor(name: string): string {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return AVATAR_BG_COLORS[Math.abs(hash) % AVATAR_BG_COLORS.length];
}

const RATING_VERBAL_LABELS: Record<number, string> = {
    0: 'Select your rating',
    1: 'Poor — Dissatisfied',
    2: 'Fair — Below expectations',
    3: 'Average — Met expectations',
    4: 'Good — Very pleased',
    5: 'Excellent — Highly recommended!',
};

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
    const { user, profile } = useAuth();
    const [reviewForm, setReviewForm] = useState({ rating: 5, title: '', body: '', location: '' });
    const [hoverRating, setHoverRating] = useState<number | null>(null);

    const [userDistrict, setUserDistrict] = useState<string | null>(null);

    // Automatically resolve user district from saved profile / addresses (user must NOT enter it)
    useEffect(() => {
        async function loadUserDistrict() {
            if (!user?.id) return;
            try {
                const addrs = await getUserAddresses(user.id);
                if (addrs && addrs.length > 0) {
                    const defaultAddr = addrs.find(a => a.is_default) || addrs[0];
                    const dist = defaultAddr?.city || defaultAddr?.state || null;
                    if (dist) {
                        setUserDistrict(dist);
                        setReviewForm(prev => ({ ...prev, location: dist }));
                    }
                }
            } catch {}
        }
        loadUserDistrict();
    }, [user?.id]);

    const userExistingReview = user?.id ? reviews.find(r => r.user_id === user.id) : null;

    const handleToggleRating = (s: number) => {
        setHoverRating(null);
        setReviewForm(prev => ({
            ...prev,
            rating: prev.rating === s ? s - 1 : s
        }));
    };

    const handleToggleEditRating = (s: number) => {
        setEditForm(prev => ({
            ...prev,
            rating: prev.rating === s ? s - 1 : s
        }));
    };
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [uploadedImages, setUploadedImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);

    // Mobile UX & Business Logic state
    const [isWriteOpen, setIsWriteOpen] = useState(false);
    const [selectedStarFilter, setSelectedStarFilter] = useState<number | null>(null);
    const [onlyWithPhotos, setOnlyWithPhotos] = useState(false);
    const [onlyVerified, setOnlyVerified] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'newest' | 'highest' | 'lowest'>('newest');
    const [visibleCount, setVisibleCount] = useState(5);
    const [expandedReviewIds, setExpandedReviewIds] = useState<Set<string>>(new Set());
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [isMobileWriteOpen, setIsMobileWriteOpen] = useState(true);
    const [mobileWriteMenuOpen, setMobileWriteMenuOpen] = useState(false);

    // Edit/delete state hooks
    const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<{
        rating: number;
        title: string;
        body: string;
        location: string;
        images: { url: string; altText?: string | null; sortOrder?: number }[];
    }>({ rating: 5, title: '', body: '', location: '', images: [] });
    const [editUploading, setEditUploading] = useState(false);
    const [updatingReview, setUpdatingReview] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);
    const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

    // Delete Confirmation Dialog state
    const [deletingReview, setDeletingReview] = useState<Review | null>(null);
    const [isDeletingReview, setIsDeletingReview] = useState(false);

    // Report Modal state
    const [reportingReview, setReportingReview] = useState<Review | null>(null);
    const [reportReason, setReportReason] = useState<'spam' | 'offensive' | 'fake' | 'irrelevant'>('spam');
    const [reportDetails, setReportDetails] = useState('');
    const [isSubmittingReport, setIsSubmittingReport] = useState(false);

    // Fixed scroll area & IntersectionObserver infinite loading
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    const [isLoadingMoreReviews, setIsLoadingMoreReviews] = useState(false);


    // Review Gallery / Lightbox modal state (opens all images of a review)
    const [galleryState, setGalleryState] = useState<{ images: string[]; activeIndex: number } | null>(null);
    const zoomedImage = galleryState ? galleryState.images[galleryState.activeIndex] : null;
    const setZoomedImage = (url: string | null) => {
        if (!url) {
            setGalleryState(null);
        } else {
            setGalleryState({ images: [url], activeIndex: 0 });
        }
    };

    // 3-dot menu active review ID
    const [activeMenuReviewId, setActiveMenuReviewId] = useState<string | null>(null);

    // Review callback destination & sessionStorage preservation
    const reviewReturnUrl = `/product/${product.slug}?section=reviews#reviews`;
    const signInReturnUrl = `/signin?callbackUrl=${encodeURIComponent(reviewReturnUrl)}`;

    // Restore draft review from sessionStorage on mount or product change
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = sessionStorage.getItem(`pending_review_${product.id}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed && typeof parsed === 'object') {
                    setReviewForm(prev => ({
                        rating: typeof parsed.rating === 'number' && parsed.rating >= 1 && parsed.rating <= 5 ? parsed.rating : prev.rating,
                        title: typeof parsed.title === 'string' ? parsed.title : prev.title,
                        body: typeof parsed.body === 'string' ? parsed.body : prev.body,
                        location: typeof parsed.location === 'string' ? parsed.location : prev.location,
                    }));
                    setIsWriteOpen(true);
                }
            }
        } catch (e) {
            console.error('Failed to restore review draft from sessionStorage', e);
        }
    }, [product.id]);

    // Save review draft to sessionStorage as the user types
    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            if (reviewForm.title || reviewForm.body || reviewForm.rating !== 5) {
                sessionStorage.setItem(`pending_review_${product.id}`, JSON.stringify(reviewForm));
            }
        } catch (e) {
            console.error('Failed to save review draft to sessionStorage', e);
        }
    }, [reviewForm, product.id]);



    // Open write form automatically if returning with hash anchor
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (window.location.hash === '#reviews' || new URLSearchParams(window.location.search).get('section') === 'reviews') {
            setIsWriteOpen(true);
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;
            if (!document.body.contains(target)) return;
            if (target.closest && (target.closest('.review-menu-btn') || target.closest('.review-menu-dropdown'))) return;
            setActiveMenuReviewId(null);
        };
        document.addEventListener('click', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, []);

    // Review gallery navigation, touch gestures, focus trapping, and scroll lock are handled by ReviewImageGalleryModal

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

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => setToastMessage(null), 2500);
    };



    // Aggregate statistics
    const ratingDist = useMemo(() => {
        return [5, 4, 3, 2, 1].map(star => {
            const count = reviews.filter(r => r.rating === star).length;
            return { star, count, pct: reviews.length > 0 ? (count / reviews.length) * 100 : 0 };
        });
    }, [reviews]);

    const recommendationPercent = useMemo(() => {
        if (reviews.length === 0) return 100;
        const positive = reviews.filter(r => r.rating >= 4).length;
        return Math.round((positive / reviews.length) * 100);
    }, [reviews]);

    const photosCount = useMemo(() => {
        return reviews.filter(r => r.images && r.images.length > 0).length;
    }, [reviews]);

    const verifiedCount = useMemo(() => {
        return reviews.filter(r => r.is_verified).length;
    }, [reviews]);

    // Filtered and sorted reviews
    const filteredReviews = useMemo(() => {
        return reviews
            .filter(r => {
                if (selectedStarFilter !== null && r.rating !== selectedStarFilter) return false;
                if (onlyWithPhotos && (!r.images || r.images.length === 0)) return false;
                if (onlyVerified && !r.is_verified) return false;
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase().trim();
                    const titleMatch = r.title ? r.title.toLowerCase().includes(q) : false;
                    const bodyMatch = r.body ? r.body.toLowerCase().includes(q) : false;
                    const userMatch = r.user_name ? r.user_name.toLowerCase().includes(q) : false;
                    if (!titleMatch && !bodyMatch && !userMatch) return false;
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'highest') return b.rating - a.rating;
                if (sortBy === 'lowest') return a.rating - b.rating;
                // default newest
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });
    }, [reviews, selectedStarFilter, onlyWithPhotos, onlyVerified, searchQuery, sortBy]);

    const displayedReviews = filteredReviews.slice(0, visibleCount);

    useEffect(() => {
        if (displayedReviews.length >= filteredReviews.length) return;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !isLoadingMoreReviews) {
                    setIsLoadingMoreReviews(true);
                    setTimeout(() => {
                        setVisibleCount(prev => Math.min(prev + 5, filteredReviews.length));
                        setIsLoadingMoreReviews(false);
                    }, 180);
                }
            },
            {
                root: scrollContainerRef.current,
                rootMargin: '100px',
                threshold: 0.1,
            }
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [displayedReviews.length, filteredReviews.length, isLoadingMoreReviews]);


    const hasActiveFilters = selectedStarFilter !== null || onlyWithPhotos || onlyVerified || searchQuery.trim().length > 0;

    const resetAllFilters = () => {
        setSelectedStarFilter(null);
        setOnlyWithPhotos(false);
        setOnlyVerified(false);
        setSearchQuery('');
        setVisibleCount(5);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const remainingSlots = 5 - uploadedImages.length;
        if (remainingSlots <= 0) {
            alert('You can upload a maximum of 5 photos.');
            e.target.value = '';
            return;
        }

        const allowedExts = /\.(jpe?g|png|webp)$/i;
        const validFiles: File[] = [];
        for (const file of files.slice(0, remainingSlots)) {
            const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || allowedExts.test(file.name);
            if (!isValidType) {
                alert(`File "${file.name}" is not supported. Please upload JPG, PNG, or WebP images only.`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 5 MB limit. Please select smaller images.`);
                continue;
            }
            validFiles.push(file);
        }

        if (files.length > remainingSlots) {
            alert(`You can only add ${remainingSlots} more photo${remainingSlots > 1 ? 's' : ''} (maximum 5 photos total).`);
        }

        if (validFiles.length === 0) {
            e.target.value = '';
            return;
        }

        setUploading(true);
        try {
            const uploadPromises = validFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.url) {
                    return data.url as string;
                }
                if (data.error) {
                    alert(data.error);
                }
                return null;
            });

            const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
            if (uploadedUrls.length > 0) {
                setUploadedImages(prev => [...prev, ...uploadedUrls]);
            } else {
                alert('Image upload failed');
            }
        } catch (err) {
            console.error('Error uploading images:', err);
            alert('Upload failed');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveUploadedImage = (indexToRemove: number) => {
        setUploadedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleEditImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;

        const files = Array.from(fileList);
        const remainingSlots = 5 - editForm.images.length;
        if (remainingSlots <= 0) {
            alert('You can upload a maximum of 5 photos.');
            e.target.value = '';
            return;
        }

        const allowedExts = /\.(jpe?g|png|webp)$/i;
        const validFiles: File[] = [];
        for (const file of files.slice(0, remainingSlots)) {
            const isValidType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || allowedExts.test(file.name);
            if (!isValidType) {
                alert(`File "${file.name}" is not supported. Please upload JPG, PNG, or WebP images only.`);
                continue;
            }
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 5 MB limit.`);
                continue;
            }
            validFiles.push(file);
        }

        if (validFiles.length === 0) {
            e.target.value = '';
            return;
        }

        setEditUploading(true);
        try {
            const uploadPromises = validFiles.map(async (file) => {
                const formData = new FormData();
                formData.append('file', file);
                const res = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData,
                });
                const data = await res.json();
                if (data.url) {
                    return data.url as string;
                }
                if (data.error) {
                    alert(data.error);
                }
                return null;
            });

            const uploadedUrls = (await Promise.all(uploadPromises)).filter(Boolean) as string[];
            if (uploadedUrls.length > 0) {
                setEditForm(prev => ({
                    ...prev,
                    images: [
                        ...prev.images,
                        ...uploadedUrls.map((url, idx) => ({
                            url,
                            altText: 'Review Image',
                            sortOrder: prev.images.length + idx
                        }))
                    ]
                }));
            }
        } catch (err) {
            console.error('Error uploading edit images:', err);
            alert('Upload failed');
        } finally {
            setEditUploading(false);
            e.target.value = '';
        }
    };

    const handleRemoveEditImage = (indexToRemove: number) => {
        setEditForm(prev => ({
            ...prev,
            images: prev.images.filter((_, idx) => idx !== indexToRemove)
        }));
    };

    const handleSubmitReview = async () => {
        const authorId = user?.id || (process.env.NODE_ENV !== 'production' ? 'dev-guest-user' : null);
        if (!authorId) return;

        if (userExistingReview) {
            setSubmitError('You have already reviewed this.');
            return;
        }

        if (reviewForm.rating < 1) {
            setSubmitError('Please select a star rating between 1 and 5 stars.');
            return;
        }

        if (reviewForm.body.trim().length < 10) {
            setSubmitError('Please write at least 10 characters so other customers find your review helpful.');
            return;
        }

        setSubmitting(true);
        setSubmitError(null);

        const authorName = profile?.full_name || profile?.display_name || user?.fullName || user?.displayName || user?.name || (user?.email ? user.email.split('@')[0] : null) || 'Anonymous';
        const finalLocation = (userDistrict || reviewForm.location || '').trim() || null;

        const { error, reviewId, isVerified } = await submitReview({
            product_id: product.id,
            user_id: authorId,
            user_name: authorName !== 'Anonymous' ? authorName : null,
            location: finalLocation,
            rating: reviewForm.rating,
            title: reviewForm.title.trim(),
            body: reviewForm.body.trim(),
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
                user_id: authorId,
                rating: reviewForm.rating,
                title: reviewForm.title.trim() || null,
                body: reviewForm.body.trim() || null,
                location: finalLocation,
                is_verified: !!isVerified,
                helpful_count: 0,
                created_at: new Date().toISOString(),
                user_name: authorName,
                images: uploadedImages.map((url, idx) => ({
                    url,
                    altText: 'Review Image',
                    sortOrder: idx
                }))
            };
            setReviews(prev => [newReview, ...prev]);
            setReviewForm(prev => ({ rating: 5, title: '', body: '', location: prev.location }));
            if (typeof window !== 'undefined') {
                sessionStorage.removeItem(`pending_review_${product.id}`);
            }
            setUploadedImages([]);
            onReviewSubmitted(reviewForm.rating);
            showToast('Review submitted successfully!');
        } else {
            setSubmitError(error || 'Failed to submit review.');
        }
    };

    const handleDeleteReview = (review: Review) => {
        setDeletingReview(review);
    };

    const confirmDeleteReview = async () => {
        if (!deletingReview) return;
        setIsDeletingReview(true);

        if (deletingReview.id.startsWith('temp-')) {
            setReviews(prev => prev.filter(r => r.id !== deletingReview.id));
            onReviewDeleted(deletingReview.rating);
            showToast('Review removed');
            setDeletingReview(null);
            setIsDeletingReview(false);
            return;
        }

        try {
            const res = await fetch(`/api/reviews/${deletingReview.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'x-requested-with': 'XMLHttpRequest',
                },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setReviews(prev => prev.filter(r => r.id !== deletingReview.id));
                onReviewDeleted(deletingReview.rating);
                showToast('Review removed');
                setDeletingReview(null);
            } else {
                const fallback = await deleteReview({ reviewId: deletingReview.id });
                if (!fallback.error) {
                    setReviews(prev => prev.filter(r => r.id !== deletingReview.id));
                    onReviewDeleted(deletingReview.rating);
                    showToast('Review removed');
                    setDeletingReview(null);
                } else {
                    alert(data.error || fallback.error || 'Failed to remove review');
                }
            }
        } catch {
            const fallback = await deleteReview({ reviewId: deletingReview.id });
            if (!fallback.error) {
                setReviews(prev => prev.filter(r => r.id !== deletingReview.id));
                onReviewDeleted(deletingReview.rating);
                showToast('Review removed');
                setDeletingReview(null);
            } else {
                alert('An error occurred while removing the review.');
            }
        } finally {
            setIsDeletingReview(false);
        }
    };

    const submitReportReview = async () => {
        if (!reportingReview) return;
        if (!user) {
            alert('Please sign in to report a review.');
            return;
        }
        setIsSubmittingReport(true);
        try {
            const res = await fetch(`/api/reviews/${reportingReview.id}/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-requested-with': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    reason: reportReason,
                    details: reportDetails,
                }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                showToast('Thank you. Review has been reported to our moderation team.');
                setReportingReview(null);
                setReportDetails('');
                setReportReason('spam');
            } else {
                alert(data.error || 'Failed to submit report');
            }
        } catch {
            alert('Failed to report review. Please try again.');
        } finally {
            setIsSubmittingReport(false);
        }
    };

    const startEditing = (review: Review) => {
        setEditingReviewId(review.id);
        setEditForm({
            rating: review.rating,
            title: review.title || '',
            body: review.body || '',
            location: review.location || '',
            images: review.images ? [...review.images] : []
        });
        setEditError(null);
        if (typeof window !== 'undefined') {
            const el = document.getElementById(`review-${review.id}`);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    };

    const handleSaveEdit = async (reviewId: string, oldRating: number) => {
        if (editForm.rating < 1) {
            setEditError('Rating must be at least 1 star');
            return;
        }

        if (editForm.body.trim().length < 10) {
            setEditError('Please write at least 10 characters for your review.');
            return;
        }

        setUpdatingReview(true);
        setEditError(null);

        if (reviewId.startsWith('temp-')) {
            setReviews(prev => prev.map(r => {
                if (r.id === reviewId) {
                    return {
                        ...r,
                        rating: editForm.rating,
                        title: editForm.title.trim() || null,
                        body: editForm.body.trim() || null,
                        location: editForm.location.trim() || null,
                        images: editForm.images.map((img, idx) => ({
                            url: img.url,
                            altText: img.altText ?? null,
                            sortOrder: img.sortOrder ?? idx,
                        })),
                    };
                }
                return r;
            }));
            setEditingReviewId(null);
            setUpdatingReview(false);
            onReviewUpdated(oldRating, editForm.rating);
            showToast('Review updated successfully');
            return;
        }

        const effectiveUserId = user?.id || (reviews.find(r => r.id === reviewId)?.user_id) || 'anonymous';
        const { error } = await updateReview({
            reviewId,
            userId: effectiveUserId,
            rating: editForm.rating,
            title: editForm.title.trim(),
            body: editForm.body.trim(),
            location: editForm.location.trim() || null,
            images: editForm.images,
        });

        setUpdatingReview(false);

        if (!error) {
            setReviews(prev => prev.map(r => {
                if (r.id === reviewId) {
                    return {
                        ...r,
                        rating: editForm.rating,
                        title: editForm.title.trim() || null,
                        body: editForm.body.trim() || null,
                        location: editForm.location.trim() || null,
                        images: editForm.images.map((img, idx) => ({
                            url: img.url,
                            altText: img.altText ?? null,
                            sortOrder: img.sortOrder ?? idx,
                        })),
                    };
                }
                return r;
            }));
            setEditingReviewId(null);
            onReviewUpdated(oldRating, editForm.rating);
            showToast('Review updated successfully');
        } else {
            setEditError(error || 'Failed to update review');
        }
    };



    const toggleExpandReview = (reviewId: string) => {
        setExpandedReviewIds(prev => {
            const next = new Set(prev);
            if (next.has(reviewId)) {
                next.delete(reviewId);
            } else {
                next.add(reviewId);
            }
            return next;
        });
    };

    const activeRatingDisplay = hoverRating !== null ? hoverRating : reviewForm.rating;

    return (
        <section id="reviews" className="pdp-reviews-section">
            <div className="pdp-reviews-container">
                {/* ── Desktop Review View (Visible on screens > 768px) ── */}
                <div className="desktop-reviews-view">
                    {/* Header Title */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h2 style={{
                            fontFamily: "'Outfit', sans-serif", fontSize: '26px', fontWeight: 700,
                            color: '#1a1a1a', margin: 0,
                        }}>
                            Customer Reviews
                        </h2>
                        <span style={{
                            background: '#f0f0f0', color: '#555', fontSize: '13px', fontWeight: 700,
                            padding: '3px 10px', borderRadius: '14px',
                        }}>
                            {reviews.length}
                        </span>
                    </div>

                    {/* Quick CTA button */}
                    {userExistingReview ? (
                        <button
                            onClick={() => startEditing(userExistingReview)}
                            style={{
                                padding: '9px 18px', background: '#1a1a1a',
                                color: '#fff', border: 'none',
                                borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Edit3 size={15} />
                            Edit Your Review
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                if (!isWriteOpen) {
                                    setSubmitted(false);
                                }
                                setIsWriteOpen(prev => !prev);
                            }}
                            style={{
                                padding: '9px 18px', background: isWriteOpen ? '#f5f5f5' : '#1a1a1a',
                                color: isWriteOpen ? '#333' : '#fff',
                                border: isWriteOpen ? '1px solid #ddd' : 'none',
                                borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <MessageSquare size={15} />
                            {isWriteOpen ? 'Close Review Form' : 'Write a Review'}
                        </button>
                    )}
                </div>

                {reviewLoading ? (
                    <div style={{ textAlign: 'center', padding: '48px', color: '#888', background: '#fafafa', borderRadius: '16px' }}>
                        Loading customer reviews...
                    </div>
                ) : (
                    <div className="review-grid">
                        {/* Rating Summary Card (Mobile Friendly) */}
                        <div className="review-rating-summary" style={{
                            background: '#fafafa', borderRadius: '18px', padding: '24px',
                            border: '1px solid #f0f0f0', position: 'relative',
                        }}>
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '50px', fontWeight: 700, color: '#1a1a1a', lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>
                                    {Number(product.rating || 0).toFixed(1)}
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '4px', margin: '10px 0 6px' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star key={s} size={20}
                                            fill={s <= Math.round(product.rating) ? '#ffb700' : 'none'}
                                            stroke="#ffb700" />
                                    ))}
                                </div>
                                <div style={{ fontSize: '13px', color: '#777', fontWeight: 500 }}>
                                    Based on {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
                                </div>
                            </div>

                            {/* Recommendation rate indicator */}
                            {reviews.length > 0 && (
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    padding: '8px 12px', background: '#e8f5e9', borderRadius: '10px',
                                    color: '#2e7d32', fontSize: '12px', fontWeight: 700, marginBottom: '20px',
                                }}>
                                    <CheckCircle2 size={15} />
                                    <span>{recommendationPercent}% of customers recommend this</span>
                                </div>
                            )}

                            {/* Distribution bars (Clickable filter triggers) */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                    <span style={{ fontSize: '11px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Rating Breakdown
                                    </span>
                                    {selectedStarFilter !== null && (
                                        <button
                                            onClick={() => setSelectedStarFilter(null)}
                                            style={{ background: 'none', border: 'none', color: '#2e7d32', fontSize: '11px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                        >
                                            Reset Filter
                                        </button>
                                    )}
                                </div>

                                {ratingDist.map(rd => {
                                    const isSelected = selectedStarFilter === rd.star;
                                    return (
                                        <div
                                            key={rd.star}
                                            onClick={() => setSelectedStarFilter(prev => prev === rd.star ? null : rd.star)}
                                            className={`review-star-bar ${isSelected ? 'is-active' : ''}`}
                                            title={`Filter by ${rd.star} stars`}
                                        >
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#333', width: '12px' }}>{rd.star}</span>
                                            <Star size={13} fill="#ffb700" stroke="#ffb700" />
                                            <div style={{
                                                flex: 1, height: '8px', background: '#eee', borderRadius: '4px', overflow: 'hidden',
                                            }}>
                                                <div style={{
                                                    width: `${rd.pct}%`, height: '100%',
                                                    background: isSelected ? '#e6a100' : '#ffb700', borderRadius: '4px',
                                                    transition: 'width 0.4s ease',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '12px', color: '#777', width: '28px', textAlign: 'right', fontWeight: 500 }}>
                                                {rd.count}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Mobile CTA inside card */}
                            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                                {user ? (
                                    <button
                                        onClick={() => {
                                            setSubmitted(false);
                                            setIsWriteOpen(true);
                                            document.getElementById('write-review-container')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        style={{
                                            width: '100%', padding: '11px', background: '#1a1a1a', color: '#fff',
                                            border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                            cursor: 'pointer', textAlign: 'center',
                                        }}
                                    >
                                        Write a Review
                                    </button>
                                ) : (
                                    <a
                                        href={signInReturnUrl}
                                        onClick={() => {
                                            if (typeof window !== 'undefined') {
                                                sessionStorage.setItem(`pending_review_${product.id}`, JSON.stringify(reviewForm));
                                            }
                                        }}
                                        style={{
                                            display: 'block', width: '100%', padding: '11px', background: '#1a1a1a', color: '#fff',
                                            borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                            textDecoration: 'none', textAlign: 'center', boxSizing: 'border-box',
                                        }}
                                    >
                                        Sign in to write a review
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Reviews list + Write form */}
                        <div>
                            {/* Write review form (Collapsible / Dynamic) */}
                            <AnimatePresence>
                                {isWriteOpen && (
                                    <motion.div
                                        id="write-review-container"
                                        initial={{ opacity: 0, height: 0, y: -10 }}
                                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                                        exit={{ opacity: 0, height: 0, y: -10 }}
                                        transition={{ duration: 0.25 }}
                                        style={{ overflow: 'hidden', marginBottom: '28px' }}
                                    >
                                        {user ? (
                                            userExistingReview ? (
                                                <div style={{
                                                    background: '#fafafa', borderRadius: '16px', padding: '28px 24px',
                                                    border: '1px solid #e0e0e0', textAlign: 'center',
                                                }}>
                                                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                                                        <CheckCircle2 size={32} color="#2e7d32" />
                                                    </div>
                                                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
                                                        You have already reviewed this product
                                                    </div>
                                                    <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px 0', lineHeight: 1.5 }}>
                                                        Each customer can submit only one review per item. You can edit your existing review anytime.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setIsWriteOpen(false);
                                                            startEditing(userExistingReview);
                                                        }}
                                                        style={{
                                                            padding: '9px 20px', background: '#1a1a1a', color: '#fff',
                                                            border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                                            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px',
                                                        }}
                                                    >
                                                        <Edit3 size={15} />
                                                        Edit Your Review
                                                    </button>
                                                </div>
                                            ) : (
                                                <div style={{
                                                    background: '#fafafa', borderRadius: '16px', padding: '24px',
                                                    border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                                        <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
                                                            Write a Review
                                                        </h4>
                                                        <button
                                                            onClick={() => setIsWriteOpen(false)}
                                                            style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>

                                                    {submitted ? (
                                                        <div style={{
                                                            padding: '24px', background: '#e8f5e9', borderRadius: '12px',
                                                            color: '#2e7d32', fontSize: '14px', fontWeight: 600, textAlign: 'center',
                                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                                        }}>
                                                            <div>✓ Thank you! Your review has been submitted and published.</div>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSubmitted(false);
                                                                    setReviewForm(prev => ({ rating: 5, title: '', body: '', location: prev.location }));
                                                                    setUploadedImages([]);
                                                                }}
                                                                style={{
                                                                    padding: '8px 18px', background: '#1a1a1a', color: '#fff',
                                                                    border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                Write Another Review
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {submitError && (
                                                                <div style={{
                                                                    padding: '12px 16px', background: '#ffebee', borderRadius: '10px',
                                                                    color: '#c62828', fontSize: '13px', fontWeight: 600, marginBottom: '16px',
                                                                }}>
                                                                    ⚠️ {submitError}
                                                                </div>
                                                            )}

                                                            {/* Interactive Star Selector with live verbal description */}
                                                            <div style={{ marginBottom: '18px' }}>
                                                                <label style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '8px', display: 'block' }}>
                                                                    Your Overall Rating <span style={{ color: '#d32f2f' }}>*</span>
                                                                </label>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                                    <div style={{ display: 'flex', gap: '6px' }}>
                                                                        {[1, 2, 3, 4, 5].map(s => (
                                                                            <button
                                                                                key={s}
                                                                                type="button"
                                                                                onClick={() => handleToggleRating(s)}
                                                                                onMouseEnter={() => setHoverRating(s)}
                                                                                onMouseLeave={() => setHoverRating(null)}
                                                                                style={{
                                                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                                                    padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    touchAction: 'manipulation',
                                                                                }}
                                                                            >
                                                                                <Star
                                                                                    size={28}
                                                                                    fill={s <= activeRatingDisplay ? '#ffb700' : 'none'}
                                                                                    stroke="#ffb700"
                                                                                    strokeWidth={2}
                                                                                />
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#ff9800', marginLeft: '6px' }}>
                                                                        {RATING_VERBAL_LABELS[activeRatingDisplay]}
                                                                    </span>
                                                                </div>
                                                            </div>



                                                            {/* Body with min/max indicator */}
                                                            <div style={{ marginBottom: '16px' }}>
                                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>
                                                                        Your Review <span style={{ color: '#d32f2f' }}>*</span>
                                                                    </label>
                                                                    <span style={{
                                                                        fontSize: '11px',
                                                                        color: reviewForm.body.length > 0 && reviewForm.body.length < 10 ? '#d32f2f' : '#999'
                                                                    }}>
                                                                        {reviewForm.body.length}/1000 {reviewForm.body.length < 10 ? '(min 10)' : ''}
                                                                    </span>
                                                                </div>
                                                                <textarea
                                                                    id="review-body-textarea"
                                                                    placeholder="How did this product work for you? Share details about texture, application, skin changes, or scent..."
                                                                    value={reviewForm.body}
                                                                    maxLength={1000}
                                                                    onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                                                                    rows={4}
                                                                    style={{
                                                                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                                                                        border: '1px solid #e0e0e0', fontSize: '14px',
                                                                        fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none', color: '#1a1a1a',
                                                                        background: '#fff', boxSizing: 'border-box', lineHeight: 1.5,
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Image Upload with preview & delete */}
                                                            <div style={{ marginBottom: '20px' }}>
                                                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '8px', display: 'block' }}>
                                                                    Add Photos (optional, up to 5)
                                                                </span>
                                                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                                    {uploadedImages.map((url, idx) => (
                                                                        <div key={idx} style={{
                                                                            position: 'relative', width: '64px', height: '64px',
                                                                            borderRadius: '10px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                                        }}>
                                                                            <Image src={url} alt="Uploaded" fill style={{ objectFit: 'cover' }} />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => handleRemoveUploadedImage(idx)}
                                                                                style={{
                                                                                    position: 'absolute', top: '3px', right: '3px',
                                                                                    background: 'rgba(0,0,0,0.65)', color: '#fff', border: 'none',
                                                                                    borderRadius: '50%', width: '18px', height: '18px',
                                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                                    cursor: 'pointer', fontSize: '12px', lineHeight: 1, padding: 0,
                                                                                }}
                                                                            >
                                                                                ×
                                                                            </button>
                                                                        </div>
                                                                    ))}

                                                                    {uploadedImages.length < 5 && (
                                                                        <label style={{
                                                                            width: '64px', height: '64px', borderRadius: '10px',
                                                                            border: '2px dashed #ccc', display: 'flex', flexDirection: 'column',
                                                                            alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                                            background: '#fff', transition: 'all 0.2s', gap: '3px',
                                                                        }}>
                                                                            <Camera size={18} color="#777" />
                                                                            <span style={{ fontSize: '10px', color: '#777', fontWeight: 600 }}>Add Photos</span>
                                                                            <input
                                                                                type="file"
                                                                                accept="image/*"
                                                                                multiple
                                                                                onChange={handleImageUpload}
                                                                                disabled={uploading}
                                                                                style={{ display: 'none' }}
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                                {uploading && (
                                                                    <span style={{ fontSize: '11px', color: '#2e7d32', marginTop: '6px', display: 'block', fontWeight: 600 }}>
                                                                        Uploading photos...
                                                                    </span>
                                                                )}
                                                            </div>

                                                            <button
                                                                onClick={handleSubmitReview}
                                                                disabled={submitting || uploading}
                                                                style={{
                                                                    padding: '12px 28px', background: '#1a1a1a', color: '#fff',
                                                                    border: 'none', borderRadius: '10px', fontSize: '14px',
                                                                    fontWeight: 700, cursor: (submitting || uploading) ? 'not-allowed' : 'pointer',
                                                                    opacity: (submitting || uploading) ? 0.6 : 1, width: '100%',
                                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                                                }}
                                                            >
                                                                {submitting ? 'Submitting Review...' : 'Submit Review'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            /* Unauthenticated User Guest Draft Box */
                                            <div style={{
                                                background: '#fafafa', borderRadius: '16px', padding: '24px',
                                                border: '1px solid #f0f0f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
                                            }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                                    <h4 style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a' }}>
                                                        Write a Review
                                                    </h4>
                                                    <button
                                                        onClick={() => setIsWriteOpen(false)}
                                                        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}
                                                    >
                                                        <X size={18} />
                                                    </button>
                                                </div>

                                                <div style={{ marginBottom: '16px' }}>
                                                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#444', marginBottom: '8px', display: 'block' }}>
                                                        Rate this product
                                                    </label>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <div style={{ display: 'flex', gap: '6px' }}>
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    onClick={() => handleToggleRating(s)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                                                                >
                                                                    <Star
                                                                        size={28}
                                                                        fill={s <= reviewForm.rating ? '#ffb700' : 'none'}
                                                                        stroke="#ffb700"
                                                                        strokeWidth={2}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#ff9800', marginLeft: '6px' }}>
                                                            {RATING_VERBAL_LABELS[reviewForm.rating]}
                                                        </span>
                                                    </div>
                                                </div>

                                                <textarea
                                                    id="review-body-textarea"
                                                    placeholder="Write your review here... Your draft will be preserved when signing in."
                                                    value={reviewForm.body}
                                                    maxLength={1000}
                                                    onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                                                    rows={4}
                                                    style={{
                                                        width: '100%', padding: '11px 14px', borderRadius: '10px',
                                                        border: '1px solid #e0e0e0', fontSize: '14px', marginBottom: '16px',
                                                        fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none', color: '#1a1a1a',
                                                        background: '#fff', boxSizing: 'border-box',
                                                    }}
                                                />

                                                <div style={{
                                                    padding: '16px 20px', background: '#fff8e1', borderRadius: '12px',
                                                    border: '1px solid #fef3cd', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                    flexWrap: 'wrap', gap: '14px',
                                                }}>
                                                    <div style={{ fontSize: '14px', color: '#856404' }}>
                                                        <a
                                                            href={signInReturnUrl}
                                                            onClick={() => {
                                                                if (typeof window !== 'undefined') {
                                                                    sessionStorage.setItem(`pending_review_${product.id}`, JSON.stringify(reviewForm));
                                                                }
                                                            }}
                                                            style={{ color: '#2e7d32', fontWeight: 700, textDecoration: 'underline' }}
                                                        >
                                                            Sign in
                                                        </a>
                                                        {' '}to write a review
                                                    </div>
                                                    <a
                                                        href={signInReturnUrl}
                                                        onClick={() => {
                                                            if (typeof window !== 'undefined') {
                                                                sessionStorage.setItem(`pending_review_${product.id}`, JSON.stringify(reviewForm));
                                                            }
                                                        }}
                                                        style={{
                                                            padding: '10px 22px', background: '#1a1a1a', color: '#fff',
                                                            borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                                                            textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer',
                                                        }}
                                                    >
                                                        Sign in to submit review
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Fixed-Height Vertically Scrollable Reviews Area with Pinned Header */}
                            <div
                                ref={scrollContainerRef}
                                className="reviews-scroll-area"
                                tabIndex={0}
                                role="region"
                                aria-label="Customer reviews"
                            >
                                {/* Pinned Sticky Header */}
                                {reviews.length > 0 && (
                                    <div className="reviews-sticky-header">
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                            {/* Search Bar */}
                                    <div style={{ position: 'relative', width: '100%' }}>
                                        <Search size={16} color="#888" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                                        <input
                                            type="text"
                                            placeholder="Search reviews (e.g. scent, hydration, texture...)"
                                            value={searchQuery}
                                            onChange={e => { setSearchQuery(e.target.value); setVisibleCount(5); }}
                                            style={{
                                                width: '100%', padding: '10px 36px 10px 38px',
                                                borderRadius: '10px', border: '1px solid #e0e0e0',
                                                fontSize: '13px', fontFamily: "'Inter', sans-serif",
                                                outline: 'none', background: '#fff', boxSizing: 'border-box',
                                            }}
                                        />
                                        {searchQuery && (
                                            <button
                                                onClick={() => setSearchQuery('')}
                                                style={{
                                                    position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                                                    background: 'none', border: 'none', color: '#999', cursor: 'pointer', padding: '4px',
                                                }}
                                            >
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>

                                    {/* Filter Chips & Sort row */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        gap: '12px', flexWrap: 'wrap',
                                    }}>
                                        {/* Horizontal Filter Chips */}
                                        <div className="review-filter-chips" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                onClick={() => { setSelectedStarFilter(null); setOnlyWithPhotos(false); setOnlyVerified(false); }}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px', border: !hasActiveFilters ? '1px solid #1a1a1a' : '1px solid #e0e0e0',
                                                    background: !hasActiveFilters ? '#1a1a1a' : '#fff', color: !hasActiveFilters ? '#fff' : '#555',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                All ({reviews.length})
                                            </button>

                                            {selectedStarFilter !== null && (
                                                <button
                                                    onClick={() => setSelectedStarFilter(null)}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: '20px', border: '1px solid #ffb700',
                                                        background: '#fff8e1', color: '#b78103', fontSize: '12px', fontWeight: 700,
                                                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    ★ {selectedStarFilter} Stars
                                                    <X size={12} />
                                                </button>
                                            )}

                                            <button
                                                onClick={() => { setOnlyWithPhotos(p => !p); setVisibleCount(5); }}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px',
                                                    border: onlyWithPhotos ? '1px solid #1a1a1a' : '1px solid #e0e0e0',
                                                    background: onlyWithPhotos ? '#1a1a1a' : '#fff',
                                                    color: onlyWithPhotos ? '#fff' : '#555',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                                                }}
                                            >
                                                <Camera size={13} />
                                                With Photos ({photosCount})
                                            </button>

                                            <button
                                                onClick={() => { setOnlyVerified(p => !p); setVisibleCount(5); }}
                                                style={{
                                                    padding: '6px 12px', borderRadius: '20px',
                                                    border: onlyVerified ? '1px solid #2e7d32' : '1px solid #e0e0e0',
                                                    background: onlyVerified ? '#e8f5e9' : '#fff',
                                                    color: onlyVerified ? '#2e7d32' : '#555',
                                                    fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                                    whiteSpace: 'nowrap', transition: 'all 0.2s',
                                                }}
                                            >
                                                <CheckCircle2 size={13} />
                                                Verified Buyers ({verifiedCount})
                                            </button>
                                        </div>

                                        {/* Sort Dropdown */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                                            <span style={{ fontSize: '12px', color: '#888', whiteSpace: 'nowrap' }}>Sort:</span>
                                            <select
                                                value={sortBy}
                                                onChange={e => setSortBy(e.target.value as any)}
                                                style={{
                                                    padding: '6px 10px', borderRadius: '8px', border: '1px solid #e0e0e0',
                                                    fontSize: '12px', fontWeight: 600, color: '#333', background: '#fff',
                                                    outline: 'none', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                }}
                                            >
                                                <option value="newest">Most Recent</option>
                                                <option value="highest">Highest Rating</option>
                                                <option value="lowest">Lowest Rating</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Active Filter Notice */}
                                    {hasActiveFilters && (
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', background: '#f5f5f5', borderRadius: '8px', fontSize: '12px', color: '#666',
                                        }}>
                                            <span>Showing {filteredReviews.length} matching {filteredReviews.length === 1 ? 'review' : 'reviews'}</span>
                                            <button
                                                onClick={resetAllFilters}
                                                style={{ background: 'none', border: 'none', color: '#2e7d32', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                                            >
                                                Clear all filters
                                            </button>
                                        </div>
                                    )}
                                        </div>
                                    </div>
                                )}

                                {/* Scrollable Reviews Content */}
                                <div className="reviews-scroll-content">
                                    {/* Review List */}
                            {filteredReviews.length === 0 ? (
                                <div style={{
                                    textAlign: 'center', padding: '48px 24px', background: '#fafafa',
                                    borderRadius: '16px', border: '1px dashed #e0e0e0',
                                }}>
                                    {hasActiveFilters ? (
                                        <>
                                            <p style={{ color: '#555', fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
                                                No reviews match your selected filter
                                            </p>
                                            <p style={{ color: '#888', fontSize: '13px', marginBottom: '16px' }}>
                                                Try adjusting your star rating or search terms.
                                            </p>
                                            <button
                                                onClick={resetAllFilters}
                                                style={{
                                                    padding: '8px 20px', background: '#1a1a1a', color: '#fff',
                                                    border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                }}
                                            >
                                                Reset Filters
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <p style={{ color: '#555', fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>
                                                No reviews yet
                                            </p>
                                            <p style={{ color: '#888', fontSize: '13px', marginBottom: '18px' }}>
                                                Be the first to share your experience with this product!
                                            </p>
                                            <button
                                                onClick={() => setIsWriteOpen(true)}
                                                style={{
                                                    padding: '10px 22px', background: '#1a1a1a', color: '#fff',
                                                    border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                                }}
                                            >
                                                Write the First Review
                                            </button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {displayedReviews.map(review => {
                                        const isAuthor = Boolean(user?.id && review.user_id === user.id);
                                        const isAdmin = user?.role === 'admin';
                                        const isDev = process.env.NODE_ENV !== 'production';
                                        const canManage = Boolean(isAuthor || isAdmin);
                                        const isEditing = editingReviewId === review.id;
                                        const isExpanded = expandedReviewIds.has(review.id);
                                        const bodyText = review.body || '';
                                        const isLong = bodyText.length > 180;
                                        const avatarInitial = ((review.user_name || 'Anonymous').trim().charAt(0) || 'A').toUpperCase();

                                        return (
                                            <div
                                                key={review.id}
                                                id={`review-${review.id}`}
                                                className="review-card"
                                            >
                                                {/* 3-dot action menu: Edit (Author), Delete (Author & Admin), Report (Other Customers) */}
                                                {!isEditing && (
                                                    <div style={{ position: 'absolute', top: '18px', right: '18px' }}>
                                                        <button
                                                            type="button"
                                                            className="review-menu-btn"
                                                            onClick={(e) => { e.stopPropagation(); setActiveMenuReviewId(prev => prev === review.id ? null : review.id); }}
                                                            aria-label="Review options"
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
                                                                borderRadius: '10px', boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                                                                padding: '6px 0', zIndex: 20, minWidth: '130px',
                                                            }}>
                                                                {isAuthor && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setActiveMenuReviewId(null); startEditing(review); }}
                                                                        style={{
                                                                            width: '100%', padding: '8px 16px', border: 'none',
                                                                            background: 'none', color: '#1a1a1a', textAlign: 'left',
                                                                            fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <Edit3 size={13} />
                                                                        Edit
                                                                    </button>
                                                                )}
                                                                {canManage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setActiveMenuReviewId(null); setDeletingReview(review); }}
                                                                        style={{
                                                                            width: '100%', padding: '8px 16px', border: 'none',
                                                                            background: 'none', color: '#cc0000', textAlign: 'left',
                                                                            fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                                            fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#fff0f0'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <Trash2 size={13} />
                                                                        {isAdmin && !isAuthor ? 'Delete (Admin)' : 'Delete'}
                                                                    </button>
                                                                )}
                                                                {!isAuthor && !isAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { setActiveMenuReviewId(null); setReportingReview(review); }}
                                                                        style={{
                                                                            width: '100%', padding: '8px 16px', border: 'none',
                                                                            background: 'none', color: '#666', textAlign: 'left',
                                                                            fontSize: '13px', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                                                                            display: 'flex', alignItems: 'center', gap: '6px',
                                                                        }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                                    >
                                                                        <Flag size={13} />
                                                                        Report
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}

                                                {/* Header: User avatar, Name, Badge, Date */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                                    <div style={{
                                                        width: '36px', height: '36px', borderRadius: '50%',
                                                        background: getAvatarColor(review.user_name || 'Anonymous'),
                                                        color: '#1a1a1a', fontWeight: 700, fontSize: '14px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        flexShrink: 0,
                                                    }}>
                                                        {avatarInitial}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>
                                                                {review.user_name || 'Anonymous'}
                                                            </span>
                                                            {review.is_verified && (
                                                                <span style={{
                                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                                    fontSize: '11px', fontWeight: 700, color: '#2e7d32',
                                                                    background: '#e8f5e9', padding: '2px 7px', borderRadius: '12px',
                                                                }}>
                                                                    <CheckCircle2 size={11} />
                                                                    Verified Buyer
                                                                </span>
                                                            )}
                                                        </div>
                                                        {review.location && (
                                                            <div style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '2px' }}>
                                                                <MapPin size={11} color="#888" />
                                                                <span>{review.location}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Star Rating */}
                                                {!isEditing && (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                                                        <div style={{ display: 'flex', gap: '2px' }}>
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star key={s} size={15}
                                                                    fill={s <= review.rating ? '#ffb700' : 'none'}
                                                                    stroke="#ffb700" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Edit Mode In-Place */}
                                                {isEditing ? (
                                                    <div id="review-edit-box" style={{
                                                        display: 'flex', flexDirection: 'column', gap: '10px',
                                                        padding: '16px', background: '#fafafa', borderRadius: '12px',
                                                        border: '1px solid #e0e0e0', marginTop: '6px', marginBottom: '10px',
                                                    }}>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    onClick={() => handleToggleEditRating(s)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                                >
                                                                    <Star size={22}
                                                                        fill={s <= editForm.rating ? '#ffb700' : 'none'}
                                                                        stroke="#ffb700" />
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <textarea
                                                            placeholder="Write your review here (min 10 characters)..."
                                                            value={editForm.body}
                                                            maxLength={1000}
                                                            onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                                                            rows={3}
                                                            style={{
                                                                width: '100%', padding: '9px 12px', borderRadius: '8px',
                                                                border: '1px solid #e0e0e0', fontSize: '13px',
                                                                fontFamily: "'Inter', sans-serif", resize: 'vertical', outline: 'none', color: '#1a1a1a',
                                                                background: '#fff', boxSizing: 'border-box',
                                                            }}
                                                        />

                                                        {/* Edit Images Thumbnails & Upload */}
                                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            {editForm.images.map((img, idx) => (
                                                                <div key={idx} style={{
                                                                    position: 'relative', width: '56px', height: '56px',
                                                                    borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                                    flexShrink: 0,
                                                                }}>
                                                                    <Image src={img.url} alt="Review Image" fill style={{ objectFit: 'cover' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveEditImage(idx)}
                                                                        style={{
                                                                            position: 'absolute', top: '2px', right: '2px',
                                                                            background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                                                                            borderRadius: '50%', width: '16px', height: '16px',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            cursor: 'pointer', fontSize: '11px', lineHeight: 1, padding: 0,
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {editForm.images.length < 5 && (
                                                                <label style={{
                                                                    width: '56px', height: '56px', borderRadius: '8px',
                                                                    border: '1px dashed #ccc', display: 'flex', flexDirection: 'column',
                                                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                                    background: '#fff', gap: '2px', flexShrink: 0,
                                                                }}>
                                                                    <Camera size={16} color="#777" />
                                                                    <span style={{ fontSize: '9px', color: '#777', fontWeight: 600 }}>+ Add</span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/jpeg,image/png,image/webp"
                                                                        multiple
                                                                        onChange={handleEditImageUpload}
                                                                        disabled={editUploading}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                        {editUploading && (
                                                            <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 600 }}>
                                                                Uploading photos...
                                                            </span>
                                                        )}

                                                        {editError && (
                                                            <div style={{ color: '#d32f2f', fontSize: '12px', fontWeight: 600 }}>{editError}</div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                                            <button
                                                                onClick={() => handleSaveEdit(review.id, review.rating)}
                                                                disabled={updatingReview || editUploading}
                                                                style={{
                                                                    padding: '7px 18px', background: '#1a1a1a', color: '#fff',
                                                                    border: 'none', borderRadius: '8px', fontSize: '12px',
                                                                    fontWeight: 700, cursor: (updatingReview || editUploading) ? 'not-allowed' : 'pointer',
                                                                    opacity: (updatingReview || editUploading) ? 0.6 : 1,
                                                                }}
                                                            >
                                                                {updatingReview ? 'Saving...' : 'Save Changes'}
                                                            </button>
                                                            <button
                                                                onClick={() => setEditingReviewId(null)}
                                                                disabled={updatingReview}
                                                                style={{
                                                                    padding: '7px 18px', background: '#fff', color: '#444',
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
                                                        {/* Review Title */}
                                                        {review.title && (
                                                            <h5 style={{
                                                                fontSize: '15px', fontWeight: 700, color: '#1a1a1a',
                                                                margin: '0 0 6px', fontFamily: "'Inter', sans-serif",
                                                            }}>
                                                                {review.title}
                                                            </h5>
                                                        )}

                                                        {/* Review Body with Read More toggle */}
                                                        {bodyText && (
                                                            <div style={{ fontSize: '14px', color: '#444', lineHeight: 1.6, marginBottom: '10px' }}>
                                                                {isLong && !isExpanded ? `${bodyText.slice(0, 180)}... ` : bodyText}
                                                                {isLong && (
                                                                    <button
                                                                        onClick={() => toggleExpandReview(review.id)}
                                                                        style={{
                                                                            background: 'none', border: 'none', color: '#1a1a1a',
                                                                            fontWeight: 700, fontSize: '13px', cursor: 'pointer',
                                                                            padding: 0, textDecoration: 'underline', marginLeft: '4px',
                                                                        }}
                                                                    >
                                                                        {isExpanded ? 'Read less' : 'Read more'}
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Review Images: exactly one row, max 3 equal thumbnails, 3+ overlay if > 3 */}
                                                        {review.images && review.images.length > 0 && (() => {
                                                            const displayImages = review.images.slice(0, 3);
                                                            const hasMore = review.images.length > 3;
                                                            const allImageUrls = review.images.map(img => img.url);

                                                            return (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    flexWrap: 'nowrap',
                                                                    marginTop: '10px',
                                                                    marginBottom: '14px',
                                                                    overflow: 'hidden',
                                                                }}>
                                                                    {displayImages.map((img, idx) => {
                                                                        const isThirdWithMore = hasMore && idx === 2;
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                aria-label={`View review image ${idx + 1} of ${allImageUrls.length}`}
                                                                                onClick={() => setGalleryState({ images: allImageUrls, activeIndex: idx })}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        setGalleryState({ images: allImageUrls, activeIndex: idx });
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    position: 'relative',
                                                                                    width: '74px',
                                                                                    height: '74px',
                                                                                    maxWidth: displayImages.length > 2 ? 'calc((100% - 16px) / 3)' : '74px',
                                                                                    aspectRatio: '1 / 1',
                                                                                    borderRadius: '10px',
                                                                                    overflow: 'hidden',
                                                                                    border: '1px solid #e0e0e0',
                                                                                    cursor: 'pointer',
                                                                                    flexShrink: 0,
                                                                                    transition: 'transform 0.2s',
                                                                                }}
                                                                            >
                                                                                <Image
                                                                                    src={img.url}
                                                                                    alt={img.altText || `Review Image ${idx + 1}`}
                                                                                    fill
                                                                                    sizes="80px"
                                                                                    style={{ objectFit: 'cover' }}
                                                                                />
                                                                                {isThirdWithMore && (
                                                                                    <div
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            inset: 0,
                                                                                            background: 'rgba(0, 0, 0, 0.55)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            color: '#ffffff',
                                                                                            fontSize: '15px',
                                                                                            fontWeight: 700,
                                                                                            fontFamily: "'Inter', sans-serif",
                                                                                            letterSpacing: '0.5px',
                                                                                            userSelect: 'none',
                                                                                        }}
                                                                                    >
                                                                                        3+
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })()}
                                                    </>
                                                )}

                                                {/* Card Footer: Verified review metadata */}
                                                <div style={{
                                                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                    paddingTop: '10px', borderTop: '1px solid #f5f5f5', marginTop: '8px',
                                                    fontSize: '12px',
                                                }}>
                                                    <span style={{ fontSize: '11px', color: '#aaa' }}>
                                                        Verified Review
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Infinite Scroll Sentinel */}
                                    {filteredReviews.length > displayedReviews.length && (
                                        <div ref={sentinelRef} style={{ padding: '16px 0', textAlign: 'center' }}>
                                            {isLoadingMoreReviews ? (
                                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '13px' }}>
                                                    <div style={{
                                                        width: '16px', height: '16px',
                                                        border: '2px solid #ccc', borderTopColor: '#1a1a1a',
                                                        borderRadius: '50%',
                                                        animation: 'spin 0.8s linear infinite'
                                                    }} />
                                                    <span>Loading more reviews...</span>
                                                </div>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setVisibleCount(prev => Math.min(prev + 5, filteredReviews.length))}
                                                    style={{
                                                        padding: '8px 18px', background: '#fafafa', color: '#444',
                                                        border: '1px solid #ddd', borderRadius: '8px',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                                                    }}
                                                >
                                                    Load More Reviews
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {filteredReviews.length > 5 && displayedReviews.length >= filteredReviews.length && (
                                        <div style={{ textAlign: 'center', padding: '12px 0 4px', fontSize: '12px', color: '#888' }}>
                                            Showing all {filteredReviews.length} reviews
                                        </div>
                                    )}
                                </div>
                            )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                </div>

                {/* ── Mobile Review View (Active on mobile <= 768px only) ── */}
                <div className="mobile-reviews-view">
                    {/* Header Title */}
                    <h2 style={{
                        fontFamily: "'Outfit', sans-serif",
                        fontSize: '22px',
                        fontWeight: 700,
                        color: '#1a1a1a',
                        margin: '0 0 12px',
                    }}>
                        Customer Reviews
                    </h2>

                    {reviewLoading ? (
                        <div style={{
                            textAlign: 'center', padding: '36px 16px', color: '#888',
                            borderRadius: '16px', background: '#fafafa',
                        }}>
                            Loading customer reviews...
                        </div>
                    ) : (
                        <>
                            {/* Card 1: Top Rating Box (Border removed) */}
                            <div style={{
                                borderRadius: '16px',
                                padding: '16px 20px',
                                textAlign: 'center',
                                background: '#fafafa',
                            }}>
                                <div style={{
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: '#1a1a1a',
                                    marginBottom: '6px',
                                    lineHeight: 1.2,
                                }}>
                                    {Number(product.rating || 0).toFixed(1)}({reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'})
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '5px' }}>
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            size={22}
                                            fill={s <= Math.round(product.rating || 0) ? '#ffb700' : 'none'}
                                            stroke="#ffb700"
                                            strokeWidth={1.5}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Card 2: Reviews Horizontal Swipe Carousel (Posted reviews KEEP their border) */}
                            <div className="mobile-reviews-carousel">
                                {reviews.length === 0 ? (
                                    <div className="mobile-review-card-item">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '38px', height: '38px', borderRadius: '50%',
                                                background: '#f0f0f0',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '14px', fontWeight: 700, color: '#1a1a1a',
                                            }}>
                                                V
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a' }}>Valleycentia</div>
                                                <div style={{ fontSize: '11px', color: '#888' }}>Just now</div>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '3px' }}>
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} size={16} fill="#ffb700" stroke="#ffb700" />
                                            ))}
                                        </div>
                                        <div style={{ fontSize: '14px', color: '#444', lineHeight: 1.45 }}>
                                            No reviews yet. Be the first to share your experience below!
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '6px' }}>
                                            <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>verified review</span>
                                        </div>
                                    </div>
                                ) : (
                                    reviews.map(review => {
                                        const isAuthor = Boolean(user?.id && review.user_id === user.id);
                                        const isAdmin = user?.role === 'admin';
                                        const isDev = process.env.NODE_ENV !== 'production';
                                        const canManage = isAuthor || isAdmin || isDev;
                                        const isEditing = editingReviewId === review.id;
                                        const authorInitial = ((review.user_name || 'Anonymous').trim().charAt(0) || 'A').toUpperCase();

                                        return (
                                            <div key={review.id} className="mobile-review-card-item">
                                                {/* Top: Avatar circle + User name + Date + Three dots button */}
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                                                        <div style={{
                                                            width: '38px', height: '38px', borderRadius: '50%',
                                                            background: getAvatarColor(review.user_name || 'Anonymous'),
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '14px', fontWeight: 700, color: '#1a1a1a',
                                                            flexShrink: 0,
                                                        }}>
                                                            {authorInitial}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <div style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a1a', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {review.user_name || 'Anonymous'}
                                                            </div>
                                                            {review.location && (
                                                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                                    <MapPin size={11} color="#888" />
                                                                    <span>{review.location}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Three dots ⋮ action menu */}
                                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                                        <button
                                                            type="button"
                                                            className="review-menu-btn"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setActiveMenuReviewId(prev => prev === review.id ? null : review.id);
                                                            }}
                                                            title="Review options"
                                                            aria-label="Review options"
                                                            style={{
                                                                background: 'none', border: 'none', color: '#666',
                                                                cursor: 'pointer', padding: '6px', display: 'flex',
                                                                alignItems: 'center', justifyContent: 'center',
                                                                borderRadius: '50%',
                                                            }}
                                                        >
                                                            <MoreVertical size={18} />
                                                        </button>

                                                        {/* Dropdown Options: Edit, Remove, Report */}
                                                        {activeMenuReviewId === review.id && (
                                                            <div
                                                                className="review-menu-dropdown"
                                                                style={{
                                                                    position: 'absolute',
                                                                    right: 0,
                                                                    top: '32px',
                                                                    background: '#ffffff',
                                                                    border: '1px solid #e0e0e0',
                                                                    borderRadius: '12px',
                                                                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                                                                    padding: '6px 0',
                                                                    zIndex: 50,
                                                                    minWidth: '130px',
                                                                }}
                                                            >
                                                                {isAuthor && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveMenuReviewId(null);
                                                                            startEditing(review);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '9px 14px',
                                                                            border: 'none',
                                                                            background: 'none',
                                                                            color: '#1a1a1a',
                                                                            textAlign: 'left',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            fontFamily: "'Inter', sans-serif",
                                                                        }}
                                                                    >
                                                                        <Edit3 size={14} />
                                                                        <span>Edit</span>
                                                                    </button>
                                                                )}
                                                                {canManage && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveMenuReviewId(null);
                                                                            handleDeleteReview(review);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '9px 14px',
                                                                            border: 'none',
                                                                            background: 'none',
                                                                            color: '#dc2626',
                                                                            textAlign: 'left',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            fontFamily: "'Inter', sans-serif",
                                                                        }}
                                                                    >
                                                                        <Trash2 size={14} color="#dc2626" />
                                                                        <span>{isAdmin && !isAuthor ? 'Delete (Admin)' : 'Remove'}</span>
                                                                    </button>
                                                                )}
                                                                {!isAuthor && !isAdmin && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveMenuReviewId(null);
                                                                            setReportingReview(review);
                                                                        }}
                                                                        style={{
                                                                            width: '100%',
                                                                            padding: '9px 14px',
                                                                            border: 'none',
                                                                            background: 'none',
                                                                            color: '#666',
                                                                            textAlign: 'left',
                                                                            fontSize: '13px',
                                                                            fontWeight: 600,
                                                                            cursor: 'pointer',
                                                                            display: 'flex',
                                                                            alignItems: 'center',
                                                                            gap: '8px',
                                                                            fontFamily: "'Inter', sans-serif",
                                                                        }}
                                                                    >
                                                                        <Flag size={14} color="#666" />
                                                                        <span>Report</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* In-place Edit Form or Review Display */}
                                                {isEditing ? (
                                                    <div style={{
                                                        display: 'flex', flexDirection: 'column', gap: '8px',
                                                        marginTop: '4px', background: '#fafafa', padding: '10px',
                                                        borderRadius: '12px', border: '1px solid #e0e0e0',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                            <span style={{ fontSize: '12px', fontWeight: 700, color: '#1a1a1a' }}>Edit Your Review</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingReviewId(null)}
                                                                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', padding: '2px' }}
                                                            >
                                                                <X size={15} />
                                                            </button>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '4px' }}>
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <button
                                                                    key={s}
                                                                    type="button"
                                                                    onClick={() => handleToggleEditRating(s)}
                                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                                >
                                                                    <Star
                                                                        size={20}
                                                                        fill={s <= editForm.rating ? '#ffb700' : 'none'}
                                                                        stroke="#ffb700"
                                                                        strokeWidth={1.5}
                                                                    />
                                                                </button>
                                                            ))}
                                                        </div>

                                                        <textarea
                                                            placeholder="Write your review here (min 10 characters)..."
                                                            value={editForm.body}
                                                            maxLength={1000}
                                                            onChange={e => setEditForm(p => ({ ...p, body: e.target.value }))}
                                                            rows={3}
                                                            style={{
                                                                width: '100%', padding: '8px 10px', borderRadius: '8px',
                                                                border: '1px solid #e0e0e0', fontSize: '13px',
                                                                fontFamily: "'Inter', sans-serif", resize: 'none', outline: 'none', color: '#1a1a1a',
                                                                background: '#fff', boxSizing: 'border-box', lineHeight: 1.4,
                                                            }}
                                                        />

                                                        {/* Edit Images Thumbnails & Upload */}
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                                            {editForm.images.map((img, idx) => (
                                                                <div key={idx} style={{
                                                                    position: 'relative', width: '52px', height: '52px',
                                                                    borderRadius: '8px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                                    flexShrink: 0,
                                                                }}>
                                                                    <Image src={img.url} alt="Review Image" fill style={{ objectFit: 'cover' }} />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveEditImage(idx)}
                                                                        style={{
                                                                            position: 'absolute', top: '2px', right: '2px',
                                                                            background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none',
                                                                            borderRadius: '50%', width: '16px', height: '16px',
                                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                            cursor: 'pointer', fontSize: '11px', lineHeight: 1, padding: 0,
                                                                        }}
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>
                                                            ))}
                                                            {editForm.images.length < 5 && (
                                                                <label style={{
                                                                    width: '52px', height: '52px', borderRadius: '8px',
                                                                    border: '1px dashed #ccc', display: 'flex', flexDirection: 'column',
                                                                    alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                                                                    background: '#fff', gap: '2px', flexShrink: 0,
                                                                }}>
                                                                    <Camera size={16} color="#777" />
                                                                    <span style={{ fontSize: '9px', color: '#777', fontWeight: 600 }}>+ Add</span>
                                                                    <input
                                                                        type="file"
                                                                        accept="image/jpeg,image/png,image/webp"
                                                                        multiple
                                                                        onChange={handleEditImageUpload}
                                                                        disabled={editUploading}
                                                                        style={{ display: 'none' }}
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>
                                                        {editUploading && (
                                                            <span style={{ fontSize: '11px', color: '#2e7d32', fontWeight: 600 }}>
                                                                Uploading photos...
                                                            </span>
                                                        )}

                                                        {editError && (
                                                            <div style={{ color: '#d32f2f', fontSize: '11px', fontWeight: 600 }}>{editError}</div>
                                                        )}
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleSaveEdit(review.id, review.rating)}
                                                                disabled={updatingReview || editUploading}
                                                                style={{
                                                                    flex: 1, padding: '8px 14px', background: '#1a1a1a', color: '#fff',
                                                                    border: 'none', borderRadius: '8px', fontSize: '12px',
                                                                    fontWeight: 700, cursor: (updatingReview || editUploading) ? 'not-allowed' : 'pointer',
                                                                    opacity: (updatingReview || editUploading) ? 0.6 : 1,
                                                                }}
                                                            >
                                                                {updatingReview ? 'Saving...' : 'Save'}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingReviewId(null)}
                                                                disabled={updatingReview}
                                                                style={{
                                                                    padding: '8px 14px', background: '#fff', color: '#444',
                                                                    border: '1px solid #ddd', borderRadius: '8px', fontSize: '12px',
                                                                    fontWeight: 600, cursor: 'pointer',
                                                                }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {/* Stars: 5 stars */}
                                                        <div style={{ display: 'flex', gap: '3px' }}>
                                                            {[1, 2, 3, 4, 5].map(s => (
                                                                <Star
                                                                    key={s}
                                                                    size={16}
                                                                    fill={s <= review.rating ? '#ffb700' : 'none'}
                                                                    stroke="#ffb700"
                                                                />
                                                            ))}
                                                        </div>

                                                        {/* Review text */}
                                                        <div style={{ fontSize: '14px', color: '#222', lineHeight: 1.45 }}>
                                                            {review.title && (
                                                                <div style={{ fontWeight: 700, marginBottom: '2px', color: '#1a1a1a' }}>
                                                                    {review.title}
                                                                </div>
                                                            )}
                                                            <div>
                                                                {review.body || 'very good product'}
                                                            </div>
                                                        </div>

                                                        {/* Images row: exactly one row, max 3 equal thumbnails, responsive on mobile */}
                                                        {review.images && review.images.length > 0 && (() => {
                                                            const displayImages = review.images.slice(0, 3);
                                                            const hasMore = review.images.length > 3;
                                                            const allImageUrls = review.images.map(img => img.url);

                                                            return (
                                                                <div style={{
                                                                    display: 'flex',
                                                                    gap: '8px',
                                                                    flexWrap: 'nowrap',
                                                                    width: '100%',
                                                                    overflow: 'hidden',
                                                                    marginTop: '4px',
                                                                    marginBottom: '4px',
                                                                    boxSizing: 'border-box',
                                                                }}>
                                                                    {displayImages.map((img, idx) => {
                                                                        const isThirdWithMore = hasMore && idx === 2;
                                                                        return (
                                                                            <div
                                                                                key={idx}
                                                                                role="button"
                                                                                tabIndex={0}
                                                                                aria-label={`View review image ${idx + 1} of ${allImageUrls.length}`}
                                                                                onClick={() => setGalleryState({ images: allImageUrls, activeIndex: idx })}
                                                                                onKeyDown={(e) => {
                                                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                                                        e.preventDefault();
                                                                                        setGalleryState({ images: allImageUrls, activeIndex: idx });
                                                                                    }
                                                                                }}
                                                                                style={{
                                                                                    position: 'relative',
                                                                                    width: '68px',
                                                                                    height: '68px',
                                                                                    maxWidth: displayImages.length > 2 ? 'calc((100% - 16px) / 3)' : '68px',
                                                                                    aspectRatio: '1 / 1',
                                                                                    borderRadius: '10px',
                                                                                    overflow: 'hidden',
                                                                                    border: '1px solid #e0e0e0',
                                                                                    cursor: 'pointer',
                                                                                    flexShrink: 0,
                                                                                    boxSizing: 'border-box',
                                                                                }}
                                                                            >
                                                                                <Image
                                                                                    src={img.url}
                                                                                    alt={img.altText || `Review Image ${idx + 1}`}
                                                                                    fill
                                                                                    sizes="70px"
                                                                                    style={{ objectFit: 'cover' }}
                                                                                />
                                                                                {isThirdWithMore && (
                                                                                    <div
                                                                                        style={{
                                                                                            position: 'absolute',
                                                                                            inset: 0,
                                                                                            background: 'rgba(0, 0, 0, 0.55)',
                                                                                            display: 'flex',
                                                                                            alignItems: 'center',
                                                                                            justifyContent: 'center',
                                                                                            color: '#ffffff',
                                                                                            fontSize: '14px',
                                                                                            fontWeight: 700,
                                                                                            fontFamily: "'Inter', sans-serif",
                                                                                            letterSpacing: '0.5px',
                                                                                            userSelect: 'none',
                                                                                        }}
                                                                                    >
                                                                                        3+
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Bottom Row: 'verified review' */}
                                                        <div style={{
                                                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                                                            marginTop: 'auto', paddingTop: '6px',
                                                        }}>
                                                            <span style={{ fontSize: '11px', color: '#888', fontStyle: 'italic' }}>
                                                                verified review
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Card 3: Write a Review Card / Already Reviewed Card */}
                            <div style={{
                                padding: '8px 2px',
                                background: '#ffffff',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '12px',
                                position: 'relative',
                            }}>
                                {userExistingReview ? (
                                    <div style={{
                                        padding: '16px',
                                        background: '#f9f9f9',
                                        borderRadius: '12px',
                                        border: '1px solid #e0e0e0',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '10px',
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a' }}>
                                                You reviewed this product
                                            </span>
                                            <div style={{ display: 'flex', gap: '2px' }}>
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <Star
                                                        key={s}
                                                        size={14}
                                                        fill={s <= userExistingReview.rating ? '#ffb700' : 'none'}
                                                        stroke="#ffb700"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        {userExistingReview.location && (
                                            <div style={{ fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                <MapPin size={11} color="#888" />
                                                <span>{userExistingReview.location}</span>
                                            </div>
                                        )}
                                        <p style={{ margin: 0, fontSize: '13px', color: '#555', lineHeight: 1.4 }}>
                                            {userExistingReview.body}
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                startEditing(userExistingReview);
                                                const el = document.getElementById(`review-${userExistingReview.id}`);
                                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                            }}
                                            style={{
                                                marginTop: '4px',
                                                padding: '9px 16px',
                                                background: '#1a1a1a',
                                                color: '#fff',
                                                border: 'none',
                                                borderRadius: '8px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                            }}
                                        >
                                            <Edit3 size={14} />
                                            <span>Edit Your Review</span>
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Top row: Heading + Clear */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <h3 style={{
                                                fontFamily: "'Outfit', sans-serif",
                                                fontSize: '18px',
                                                fontWeight: 700,
                                                margin: 0,
                                                color: '#1a1a1a',
                                            }}>
                                                Write a Review
                                            </h3>

                                            {reviewForm.body.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setReviewForm(prev => ({ rating: 5, title: '', body: '', location: prev.location }));
                                                        setUploadedImages([]);
                                                    }}
                                                    style={{
                                                        background: 'none', border: 'none', color: '#888',
                                                        fontSize: '12px', fontWeight: 600, cursor: 'pointer', padding: '4px',
                                                    }}
                                                >
                                                    Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Notice / Feedback */}
                                        {submitError && (
                                            <div style={{
                                                padding: '8px 12px', background: '#ffebee', borderRadius: '10px',
                                                color: '#c62828', fontSize: '12px', fontWeight: 600, border: '1px solid #ffcdd2',
                                            }}>
                                                ⚠️ {submitError}
                                            </div>
                                        )}

                                        {/* Rating Star Selector */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#444' }}>Your Rating:</span>
                                            <div style={{ display: 'flex', gap: '4px' }}>
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => handleToggleRating(s)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                                                    >
                                                        <Star
                                                            size={22}
                                                            fill={s <= reviewForm.rating ? '#ffb700' : 'none'}
                                                            stroke="#ffb700"
                                                            strokeWidth={1.5}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Review body input */}
                                        <div>
                                            <textarea
                                                placeholder="Write your review here (texture, hydration, scent, results)..."
                                                value={reviewForm.body}
                                                maxLength={1000}
                                                onChange={e => setReviewForm(p => ({ ...p, body: e.target.value }))}
                                                rows={3}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px 12px',
                                                    borderRadius: '10px',
                                                    border: '1px solid #e0e0e0',
                                                    fontSize: '13px',
                                                    fontFamily: "'Inter', sans-serif",
                                                    outline: 'none',
                                                    resize: 'none',
                                                    boxSizing: 'border-box',
                                                    background: '#ffffff',
                                                    color: '#1a1a1a',
                                                    WebkitTextFillColor: '#1a1a1a',
                                                    lineHeight: 1.4,
                                                }}
                                            />
                                        </div>

                                        {/* Uploaded images previews (if any) */}
                                        {uploadedImages.length > 0 && (
                                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                {uploadedImages.map((url, idx) => (
                                                    <div key={idx} style={{
                                                        position: 'relative', width: '56px', height: '56px',
                                                        borderRadius: '10px', overflow: 'hidden', border: '1px solid #e0e0e0',
                                                    }}>
                                                        <Image src={url} alt="Uploaded" fill style={{ objectFit: 'cover' }} />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveUploadedImage(idx)}
                                                            style={{
                                                                position: 'absolute', top: '2px', right: '2px',
                                                                background: '#1a1a1a', color: '#fff', border: 'none',
                                                                borderRadius: '50%', width: '16px', height: '16px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                cursor: 'pointer', fontSize: '11px', lineHeight: 1, padding: 0,
                                                            }}
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {/* Bottom row: [ + Upload image ] (left) and [ Submit ] (right) */}
                                        <div style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            marginTop: '4px',
                                        }}>
                                            {/* Upload image button */}
                                            <label style={{
                                                border: '1px solid #e0e0e0',
                                                borderRadius: '10px',
                                                padding: '9px 16px',
                                                fontSize: '13px',
                                                fontWeight: 600,
                                                background: '#f8f8f8',
                                                color: '#333',
                                                cursor: 'pointer',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                textAlign: 'center',
                                            }}>
                                                <span style={{ fontSize: '15px', lineHeight: 1 }}>+</span>
                                                <span>{uploading ? 'Uploading...' : 'Upload images'}</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={handleImageUpload}
                                                    disabled={uploading}
                                                    style={{ display: 'none' }}
                                                />
                                            </label>

                                            {/* Submit button */}
                                            {user || process.env.NODE_ENV !== 'production' ? (
                                                <button
                                                    type="button"
                                                    onClick={handleSubmitReview}
                                                    disabled={submitting || uploading}
                                                    style={{
                                                        borderRadius: '10px',
                                                        padding: '10px 24px',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        background: '#1a1a1a',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        cursor: (submitting || uploading) ? 'not-allowed' : 'pointer',
                                                        opacity: (submitting || uploading) ? 0.6 : 1,
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    }}
                                                >
                                                    {submitting ? 'Submitting...' : 'Submit'}
                                                </button>
                                            ) : (
                                                <a
                                                    href={signInReturnUrl}
                                                    onClick={() => {
                                                        if (typeof window !== 'undefined') {
                                                            sessionStorage.setItem(`pending_review_${product.id}`, JSON.stringify(reviewForm));
                                                        }
                                                    }}
                                                    style={{
                                                        borderRadius: '10px',
                                                        padding: '10px 22px',
                                                        fontSize: '13px',
                                                        fontWeight: 700,
                                                        background: '#1a1a1a',
                                                        color: '#ffffff',
                                                        textDecoration: 'none',
                                                        display: 'inline-block',
                                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                    }}
                                                >
                                                    Submit
                                                </a>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>


                {/* Review Delete Confirmation Dialog Modal */}
                {deletingReview && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="delete-review-dialog-title"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99998,
                            padding: '16px',
                            boxSizing: 'border-box',
                        }}
                        onClick={() => !isDeletingReview && setDeletingReview(null)}
                    >
                        <div
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                padding: '24px',
                                maxWidth: '440px',
                                width: '100%',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                                boxSizing: 'border-box',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                                <div style={{
                                    width: '42px', height: '42px', borderRadius: '50%',
                                    background: '#fee2e2', color: '#dc2626',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <Trash2 size={22} />
                                </div>
                                <h3 id="delete-review-dialog-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a', fontFamily: "'Outfit', sans-serif" }}>
                                    Remove Review
                                </h3>
                            </div>
                            <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.5, margin: '0 0 20px' }}>
                                {user?.role === 'admin' && deletingReview.user_id !== user.id
                                    ? 'As a store moderator, you are removing this customer review. This action soft-deletes the feedback, updates the product rating, and frees storage.'
                                    : 'Are you sure you want to remove your review? This action will remove your rating and feedback from this product.'}
                            </p>
                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    disabled={isDeletingReview}
                                    onClick={() => setDeletingReview(null)}
                                    style={{
                                        padding: '10px 18px',
                                        borderRadius: '10px',
                                        border: '1px solid #e0e0e0',
                                        background: '#fff',
                                        fontSize: '13px',
                                        fontWeight: 600,
                                        cursor: isDeletingReview ? 'not-allowed' : 'pointer',
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isDeletingReview}
                                    onClick={confirmDeleteReview}
                                    style={{
                                        padding: '10px 20px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: '#dc2626',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: isDeletingReview ? 'not-allowed' : 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    {isDeletingReview ? 'Removing...' : 'Confirm Remove'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Report Moderation Dialog Modal */}
                {reportingReview && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="report-review-dialog-title"
                        style={{
                            position: 'fixed',
                            inset: 0,
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(6px)',
                            WebkitBackdropFilter: 'blur(6px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99998,
                            padding: '16px',
                            boxSizing: 'border-box',
                        }}
                        onClick={() => !isSubmittingReport && setReportingReview(null)}
                    >
                        <div
                            style={{
                                background: '#ffffff',
                                borderRadius: '20px',
                                padding: '24px',
                                maxWidth: '480px',
                                width: '100%',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
                                boxSizing: 'border-box',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <div style={{
                                        width: '38px', height: '38px', borderRadius: '50%',
                                        background: '#fef3c7', color: '#d97706',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <Flag size={20} />
                                    </div>
                                    <h3 id="report-review-dialog-title" style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#1a1a1a', fontFamily: "'Outfit', sans-serif" }}>
                                        Report Review
                                    </h3>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setReportingReview(null)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888' }}
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 16px' }}>
                                Help keep our community authentic and trustworthy. Why are you reporting this review?
                            </p>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                                {[
                                    { key: 'spam', label: 'Spam or automated content', desc: 'Promotional links, ads, or bot-generated text' },
                                    { key: 'offensive', label: 'Offensive or abusive', desc: 'Hate speech, profanity, or harassment' },
                                    { key: 'fake', label: 'Fake or misleading', desc: 'Feedback not based on an authentic experience' },
                                    { key: 'irrelevant', label: 'Irrelevant to this product', desc: 'Does not review the product itself' },
                                ].map(r => (
                                    <label
                                        key={r.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'flex-start',
                                            gap: '10px',
                                            padding: '10px 12px',
                                            borderRadius: '10px',
                                            border: reportReason === r.key ? '1px solid #1a1a1a' : '1px solid #e5e5e5',
                                            background: reportReason === r.key ? '#f9f9f9' : '#fff',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <input
                                            type="radio"
                                            name="reportReason"
                                            value={r.key}
                                            checked={reportReason === r.key}
                                            onChange={() => setReportReason(r.key as any)}
                                            style={{ marginTop: '3px' }}
                                        />
                                        <div>
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{r.label}</div>
                                            <div style={{ fontSize: '11px', color: '#777' }}>{r.desc}</div>
                                        </div>
                                    </label>
                                ))}
                            </div>

                            <textarea
                                placeholder="Additional details (optional)..."
                                value={reportDetails}
                                onChange={e => setReportDetails(e.target.value)}
                                rows={2}
                                style={{
                                    width: '100%',
                                    padding: '10px 12px',
                                    borderRadius: '10px',
                                    border: '1px solid #e0e0e0',
                                    fontSize: '13px',
                                    marginBottom: '18px',
                                    boxSizing: 'border-box',
                                    fontFamily: 'inherit',
                                }}
                            />

                            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                                <button
                                    type="button"
                                    disabled={isSubmittingReport}
                                    onClick={() => setReportingReview(null)}
                                    style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid #e0e0e0', background: '#fff', fontSize: '13px', cursor: 'pointer' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={isSubmittingReport}
                                    onClick={submitReportReview}
                                    style={{
                                        padding: '9px 20px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: '#1a1a1a',
                                        color: '#ffffff',
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        cursor: isSubmittingReport ? 'not-allowed' : 'pointer'
                                    }}
                                >
                                    {isSubmittingReport ? 'Submitting...' : 'Submit Report'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Review Gallery / Lightbox Modal */}
                <ReviewImageGalleryModal
                    isOpen={galleryState !== null && galleryState.images.length > 0}
                    images={galleryState?.images || []}
                    initialIndex={galleryState?.activeIndex ?? 0}
                    onClose={() => setGalleryState(null)}
                    title={product.title}
                />

                {/* Floating Toast Notification */}
                <AnimatePresence>
                    {toastMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            style={{
                                position: 'fixed',
                                bottom: '24px',
                                right: '24px',
                                background: '#1a1a1a',
                                color: '#fff',
                                padding: '12px 20px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 600,
                                boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
                                zIndex: 2500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                            }}
                        >
                            <span>✓</span>
                            <span>{toastMessage}</span>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
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
