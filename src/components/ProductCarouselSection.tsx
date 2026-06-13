'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ShoppingBag, ChevronLeft, ChevronRight, Star, Check, X, Minus, Plus } from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import type { SectionProduct } from '@/data/homeSections';

/* ─── Props ─── */
interface ProductCarouselSectionProps {
    title: string;
    subtitle: string;
    products: SectionProduct[];
    background?: string;
    showViewAll?: boolean;
    viewAllHref?: string;
}

/* ─── Component ─── */
export default function ProductCarouselSection({
    title,
    subtitle,
    products,
    background = '#ffffff',
    showViewAll = true,
    viewAllHref = '/shop',
}: ProductCarouselSectionProps) {
    const { addToCart } = useCart();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);
    const [addedIds, setAddedIds] = useState<Set<string | number>>(new Set());

    // Modal State
    const [selectedProductForModal, setSelectedProductForModal] = useState<SectionProduct | null>(null);
    const [selectedSize, setSelectedSize] = useState<{ id: string; label: string; ml: string | null; price: number; is_default: boolean; stockQuantity?: number } | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Scroll Lock when modal is open
    useEffect(() => {
        if (selectedProductForModal) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [selectedProductForModal]);

    /* guards */
    if (!products || products.length === 0) return null;

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    };

    useEffect(() => {
        checkScroll();
        // A small timeout ensures NextJS styles are fully resolved and DOM dimensions are accurate
        const timer = setTimeout(checkScroll, 150);

        window.addEventListener('resize', checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScroll);
        };
    }, [products]);

    const scroll = (direction: 'left' | 'right') => {
        if (!scrollRef.current) return;
        const scrollAmount = scrollRef.current.clientWidth;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
        setTimeout(checkScroll, 350);
    };

    return (
        <section
            className="homepage-section"
            style={{
                background,
                padding: '32px 0 36px',
                position: 'relative',
            }}
        >
            {/* ── Header Row ── */}
            <div
                className="section-header-row"
                style={{
                    maxWidth: '1540px',
                    margin: '0 auto',
                    padding: '0 80px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                }}
            >
                <div>
                    <h2
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '28px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            marginBottom: '6px',
                            lineHeight: 1.2,
                        }}
                    >
                        {title}
                    </h2>
                    <p
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '15px',
                            color: '#888',
                            fontWeight: 400,
                        }}
                    >
                        {subtitle}
                    </p>
                </div>
                {showViewAll && (
                    <Link
                        href={viewAllHref}
                        className="view-all-btn"
                        style={{
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '14px',
                            fontWeight: 600,
                            color: '#ffffff',
                            background: '#1a1a1a',
                            border: 'none',
                            borderRadius: '24px',
                            padding: '10px 24px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            transition: 'all 0.2s ease',
                            textDecoration: 'none',
                            display: 'inline-block',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#333';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#1a1a1a';
                        }}
                    >
                        View All
                    </Link>
                )}
            </div>

            {/* ── Scrollable Cards Row ── */}
            <div style={{ position: 'relative', maxWidth: '1540px', margin: '0 auto' }}>
                {/* Left Arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="carousel-arrow"
                        style={{
                            position: 'absolute',
                            left: '24px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                    >
                        <ChevronLeft size={22} color="#ffffff" />
                    </button>
                )}

                {/* Right Arrow */}
                {canScrollRight && (
                    <button
                        onClick={() => scroll('right')}
                        className="carousel-arrow"
                        style={{
                            position: 'absolute',
                            right: '24px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 5,
                            transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.25)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        }}
                    >
                        <ChevronRight size={22} color="#ffffff" />
                    </button>
                )}

                {/* Cards Container */}
                <div className="carousel-cards-container" style={{ padding: '0 80px', overflow: 'hidden' }}>
                    <div
                        ref={scrollRef}
                        onScroll={checkScroll}
                        style={{
                            display: 'flex',
                            gap: '20px',
                            overflowX: 'auto',
                            scrollSnapType: 'x mandatory',
                            padding: '8px 0',
                            scrollbarWidth: 'none',
                            msOverflowStyle: 'none',
                        }}
                        className="hide-scrollbar carousel-scroll-track"
                    >
                        {products.map((product) => (
                            <Link
                                key={product.id}
                                href={`/product/${product.slug}`}
                                className="carousel-card"
                                style={{
                                    minWidth: 'calc((100% - 80px) / 4.17)',
                                    maxWidth: 'calc((100% - 80px) / 4.17)',
                                    height: '532px',
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #f0f0f0',
                                    overflow: 'hidden',
                                    scrollSnapAlign: 'start',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'box-shadow 0.2s ease',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                    position: 'relative',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* ── Badges (top-left of card) ── */}
                                {product.badge && (() => {
                                    const bg = product.badgeColor || '#f0c14b';
                                    const c = bg.replace('#', '');
                                    const isLight = c.length >= 6 && (0.299 * parseInt(c.substring(0, 2), 16) + 0.587 * parseInt(c.substring(2, 4), 16) + 0.114 * parseInt(c.substring(4, 6), 16)) / 255 > 0.55;
                                    return (
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: 0,
                                                left: 0,
                                                background: bg,
                                                color: isLight ? '#1a1a1a' : '#ffffff',
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                padding: '5px 14px',
                                                borderRadius: '0 0 6px 0',
                                                zIndex: 3,
                                                letterSpacing: '0.3px',
                                                textTransform: 'uppercase',
                                            }}
                                        >
                                            {product.badge.replace(/_/g, ' ')}
                                        </span>
                                    );
                                })()}
                                {product.extraBadge && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '10px',
                                            right: '10px',
                                            background: product.badgeColor === '#2e7d32'
                                                ? '#e91e63'
                                                : 'rgba(46,125,50,0.9)',
                                            color: '#ffffff',
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: product.badgeColor ? '11px' : '9px',
                                            fontWeight: product.badgeColor ? 800 : 700,
                                            padding: '6px',
                                            borderRadius: '50%',
                                            width: product.badgeColor ? '52px' : '56px',
                                            height: product.badgeColor ? '52px' : '56px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            lineHeight: 1.15,
                                            zIndex: 3,
                                            whiteSpace: 'pre-line',
                                        }}
                                    >
                                        {product.extraBadge}
                                    </span>
                                )}

                                {/* ── Image Area ── */}
                                <div
                                    className="card-image-area"
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '50%',
                                        background: '#f8f6f3',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Image
                                        src={product.image}
                                        alt={product.title}
                                        fill
                                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>

                                {/* ── Card Content ── */}
                                <div className="card-content" style={{ padding: '14px 14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}>

                                    {/* Title */}
                                    <h3
                                        className="card-title"
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                            lineHeight: 1.4,
                                            marginBottom: '4px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {product.title}
                                    </h3>

                                    {/* Description */}
                                    <p
                                        className="card-desc"
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '13px',
                                            color: '#888',
                                            lineHeight: 1.4,
                                            marginBottom: '12px',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {product.description}
                                    </p>

                                    {/* Price Row */}
                                    <div style={{ marginTop: 'auto' }}>
                                        <div
                                            style={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px',
                                                marginBottom: '8px',
                                            }}
                                        >
                                            <span
                                                className="card-price"
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '20px',
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ৳{product.price}
                                            </span>
                                            {(product.originalPrice != null && product.originalPrice > 0 || (product.discountPercent != null && product.discountPercent > 0)) && (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    {product.originalPrice != null && product.originalPrice > 0 && (
                                                        <span
                                                            className="card-original-price"
                                                            style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '14px',
                                                                color: '#bbb',
                                                                textDecoration: 'line-through',
                                                                lineHeight: 1,
                                                            }}
                                                        >
                                                            ৳{product.originalPrice}
                                                        </span>
                                                    )}
                                                    {product.discountPercent != null && product.discountPercent > 0 && (
                                                        <span
                                                            style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '12px',
                                                                fontWeight: 600,
                                                                color: '#e67e22',
                                                            }}
                                                        >
                                                            {Math.ceil(product.discountPercent)}% OFF
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>



                                        {/* Add to Cart */}
                                        <button
                                            className="card-add-btn"
                                            disabled={product.inStock === false}
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (product.inStock === false) return;

                                                setSelectedProductForModal(product);
                                                const defaultSize = product.sizes?.find(s => s.is_default && (s.stockQuantity === undefined || s.stockQuantity > 0))
                                                    || product.sizes?.find(s => s.stockQuantity === undefined || s.stockQuantity > 0)
                                                    || product.sizes?.find(s => s.is_default)
                                                    || product.sizes?.[0]
                                                    || null;
                                                setSelectedSize(defaultSize);
                                                setQuantity(1);
                                            }}
                                            style={{
                                                width: '100%',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '8px',
                                                background: product.inStock === false ? '#e0e0e0' : (addedIds.has(product.id) ? '#1a1a1a' : '#f5c518'),
                                                color: product.inStock === false ? '#888' : (addedIds.has(product.id) ? '#ffffff' : '#1a1a1a'),
                                                border: 'none',
                                                borderRadius: '8px',
                                                padding: '11px 0',
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                letterSpacing: '0.5px',
                                                cursor: product.inStock === false ? 'not-allowed' : 'pointer',
                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                textTransform: 'uppercase',
                                            }}
                                            onMouseEnter={(e) => {
                                                if (product.inStock === false) return;
                                                if (!addedIds.has(product.id)) {
                                                    e.currentTarget.style.background = '#e6b800';
                                                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                                    e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 197, 24, 0.4)';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (product.inStock === false) return;
                                                if (!addedIds.has(product.id)) {
                                                    e.currentTarget.style.background = '#f5c518';
                                                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                    e.currentTarget.style.boxShadow = 'none';
                                                }
                                            }}
                                        >
                                            {product.inStock === false ? (
                                                'OUT OF STOCK'
                                            ) : addedIds.has(product.id) ? (
                                                <><Check size={15} className="cart-added-check" /> ADDED!</>
                                            ) : (
                                                <><ShoppingBag size={15} /> ADD TO CART</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>

            {/* Premium Size/Quantity Selector Modal Overlay */}
            {selectedProductForModal && (
                <div
                    className="cart-modal-overlay"
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        background: 'rgba(0, 0, 0, 0.65)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 99999,
                        padding: '16px',
                    }}
                    onClick={() => setSelectedProductForModal(null)}
                >
                    <div
                        className="cart-modal-container"
                        style={{
                            width: '100%',
                            maxWidth: '560px',
                            background: '#ffffff',
                            borderRadius: '24px',
                            border: '1px solid rgba(0, 0, 0, 0.08)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                            position: 'relative',
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '20px',
                            animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            maxHeight: '90vh',
                            overflowY: 'auto',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedProductForModal(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: '#f5f5f5',
                                border: 'none',
                                borderRadius: '50%',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                color: '#666',
                                zIndex: 10,
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#e5e5e5';
                                e.currentTarget.style.color = '#1a1a1a';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = '#f5f5f5';
                                e.currentTarget.style.color = '#666';
                            }}
                        >
                            <X size={18} />
                        </button>

                        {/* Top Section: Image & Info */}
                        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                            <div
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    position: 'relative',
                                    background: '#f8f6f3',
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    flexShrink: 0,
                                    border: '1px solid #f0f0f0',
                                }}
                            >
                                <Image
                                    src={selectedProductForModal.image}
                                    alt={selectedProductForModal.title}
                                    fill
                                    style={{ objectFit: 'cover' }}
                                />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '24px' }}>
                                <h3
                                    style={{
                                        fontFamily: "'Outfit', sans-serif",
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                        lineHeight: 1.25,
                                    }}
                                >
                                    {selectedProductForModal.title}
                                </h3>
                                <p
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        color: '#666',
                                        lineHeight: 1.4,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                    }}
                                >
                                    {selectedProductForModal.description}
                                </p>
                                
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                    <span
                                        style={{
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '22px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                        }}
                                    >
                                        ৳{(selectedSize ? selectedSize.price : selectedProductForModal.price) * quantity}
                                    </span>
                                    {(() => {
                                        const currentPrice = selectedSize ? selectedSize.price : selectedProductForModal.price;
                                        const discountPercent = selectedProductForModal.discountPercent || 0;
                                        if (discountPercent > 0) {
                                            const origPrice = Math.ceil(currentPrice / (1 - discountPercent / 100));
                                            return (
                                                <>
                                                    <span
                                                        style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '14px',
                                                            color: '#bbb',
                                                            textDecoration: 'line-through',
                                                        }}
                                                    >
                                                        ৳{origPrice * quantity}
                                                    </span>
                                                    <span
                                                        style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '11px',
                                                            fontWeight: 700,
                                                            color: '#e67e22',
                                                            background: '#fff3e0',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                        }}
                                                    >
                                                        {Math.ceil(discountPercent)}% OFF
                                                    </span>
                                                </>
                                            );
                                        }
                                        return null;
                                    })()}
                                </div>
                            </div>
                        </div>

                        {/* Size Selector */}
                        {selectedProductForModal.sizes && selectedProductForModal.sizes.length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Size
                                </span>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    {selectedProductForModal.sizes.map((sz) => {
                                        const isSelected = selectedSize?.id === sz.id;
                                        const isSizeOutOfStock = sz.stockQuantity !== undefined && sz.stockQuantity <= 0;
                                        return (
                                            <button
                                                key={sz.id}
                                                onClick={() => setSelectedSize(sz)}
                                                style={{
                                                    padding: '10px 18px',
                                                    borderRadius: '12px',
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '14px',
                                                    fontWeight: 600,
                                                    border: isSelected 
                                                        ? '2px solid #1a1a1a' 
                                                        : (isSizeOutOfStock ? '1px dashed #ddd' : '1px solid #e0e0e0'),
                                                    background: isSelected 
                                                        ? '#1a1a1a' 
                                                        : (isSizeOutOfStock ? '#f5f5f5' : '#ffffff'),
                                                    color: isSelected 
                                                        ? '#ffffff' 
                                                        : (isSizeOutOfStock ? '#bbb' : '#444444'),
                                                    cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                    display: 'flex',
                                                    alignItems: 'baseline',
                                                    gap: '4px',
                                                    opacity: isSizeOutOfStock ? 0.6 : 1,
                                                    textDecoration: isSizeOutOfStock ? 'line-through' : 'none',
                                                }}
                                            >
                                                <span>{sz.label}</span>
                                                {sz.ml && (
                                                    <span
                                                        style={{
                                                            fontSize: '11px',
                                                            opacity: 0.8,
                                                            fontWeight: 400,
                                                        }}
                                                    >
                                                        ({sz.ml})
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Quantity Selector */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    color: '#1a1a1a',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px',
                                }}
                            >
                                Quantity
                            </span>
                            <div
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    background: '#f5f5f5',
                                    borderRadius: '12px',
                                    padding: '4px',
                                    width: 'fit-content',
                                }}
                            >
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    disabled={quantity <= 1}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                                        color: quantity <= 1 ? '#bbb' : '#1a1a1a',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        if (quantity > 1) e.currentTarget.style.background = '#e5e5e5';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <Minus size={16} />
                                </button>
                                <span
                                    style={{
                                        width: '40px',
                                        textAlign: 'center',
                                        fontFamily: "'Outfit', sans-serif",
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                    }}
                                >
                                    {quantity}
                                </span>
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        background: 'transparent',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        cursor: 'pointer',
                                        color: '#1a1a1a',
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = '#e5e5e5';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            disabled={selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false}
                            onClick={() => {
                                const finalPrice = selectedSize ? selectedSize.price : selectedProductForModal.price;
                                const originalPrice = selectedSize
                                    ? (selectedProductForModal.discountPercent ? Math.ceil(selectedSize.price / (1 - selectedProductForModal.discountPercent / 100)) : selectedSize.price)
                                    : selectedProductForModal.originalPrice;

                                addToCart({
                                    id: String(selectedProductForModal.id),
                                    slug: selectedProductForModal.slug,
                                    name: selectedProductForModal.title,
                                    image: selectedProductForModal.image,
                                    price: finalPrice,
                                    originalPrice: originalPrice,
                                    size: selectedSize ? selectedSize.label : undefined,
                                    stockQuantity: selectedSize ? selectedSize.stockQuantity : selectedProductForModal.stockQuantity,
                                }, quantity);

                                setAddedIds((prev) => new Set(prev).add(selectedProductForModal.id));
                                const currentId = selectedProductForModal.id;
                                setTimeout(() => {
                                    setAddedIds((prev) => {
                                        const next = new Set(prev);
                                        next.delete(currentId);
                                        return next;
                                    });
                                }, 1500);

                                setSelectedProductForModal(null);
                            }}
                            style={{
                                width: '100%',
                                background: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) ? '#e0e0e0' : '#f5c518',
                                color: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) ? '#888' : '#1a1a1a',
                                border: 'none',
                                borderRadius: '12px',
                                padding: '16px 0',
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '15px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                cursor: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) ? 'not-allowed' : 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                textTransform: 'uppercase',
                                marginTop: '10px',
                            }}
                            onMouseEnter={(e) => {
                                if (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) return;
                                e.currentTarget.style.background = '#e6b800';
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 197, 24, 0.4)';
                            }}
                            onMouseLeave={(e) => {
                                if (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) return;
                                e.currentTarget.style.background = '#f5c518';
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {(selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : selectedProductForModal.inStock === false) ? 'Out of stock' : 'Confirm to cart'}
                        </button>
                    </div>
                    
                    {/* Global Keyframes Animation */}
                    <style dangerouslySetInnerHTML={{ __html: `
                        @keyframes modalSlideIn {
                            from {
                                opacity: 0;
                                transform: translateY(20px) scale(0.95);
                            }
                            to {
                                opacity: 1;
                                transform: translateY(0) scale(1);
                            }
                        }
                    ` }} />
                </div>
            )}
        </section>
    );
}
