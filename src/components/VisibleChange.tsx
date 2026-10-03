'use client';

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Plus, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export interface TransformationCard {
    id: number | string;
    slug: string;
    beforeImage: string;
    afterImage: string;
    beforeLabel?: string;
    afterLabel?: string;
    productThumb: string;
    productName: string;
    rating: number;
    reviewCount: string;
    price: number;
    originalPrice: number;
    discountPercent: number;
}

interface VisibleChangeProps {
    items?: TransformationCard[];
}

export default function VisibleChange({ items }: VisibleChangeProps) {
    const transformations = items && items.length > 0 ? items : [];
    const { addToCart } = useCart();
    const sectionRef = useRef<HTMLElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(() => (transformations && transformations.length > 2));
    
    // Animation refs for 60fps/120fps hardware-synced smooth transition
    const isAnimatingRef = useRef(false);
    const animFrameRef = useRef<number | null>(null);
    const lastTriggerTimeRef = useRef(0);
    const isUserTouchingRef = useRef(false);

    const checkScroll = () => {
        if (!scrollRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        setCanScrollLeft(scrollLeft > 5);
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
    };

    const cancelAnimation = () => {
        if (animFrameRef.current !== null) {
            cancelAnimationFrame(animFrameRef.current);
            animFrameRef.current = null;
        }
        if (isAnimatingRef.current && scrollRef.current) {
            scrollRef.current.style.scrollSnapType = '';
            isAnimatingRef.current = false;
        }
    };

    const triggerPeekAnimation = () => {
        const el = scrollRef.current;
        if (!el || isAnimatingRef.current || el.scrollLeft > 10 || isUserTouchingRef.current) return;

        const isMobile = window.innerWidth <= 768;
        const peekDistance = isMobile
            ? Math.min(115, Math.max(75, window.innerWidth * 0.28))
            : 160;

        isAnimatingRef.current = true;
        el.style.scrollSnapType = 'none';

        const startTime = performance.now();
        const forwardDuration = 420;
        const holdDuration = 280;
        const returnDuration = 450;
        const totalDuration = forwardDuration + holdDuration + returnDuration;

        const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
        const easeInOutCubic = (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const step = (now: number) => {
            if (!isAnimatingRef.current || !scrollRef.current) return;

            const elapsed = now - startTime;

            if (elapsed < forwardDuration) {
                const p = elapsed / forwardDuration;
                scrollRef.current.scrollLeft = easeOutCubic(p) * peekDistance;
                animFrameRef.current = requestAnimationFrame(step);
            } else if (elapsed < forwardDuration + holdDuration) {
                scrollRef.current.scrollLeft = peekDistance;
                animFrameRef.current = requestAnimationFrame(step);
            } else if (elapsed < totalDuration) {
                const p = (elapsed - (forwardDuration + holdDuration)) / returnDuration;
                scrollRef.current.scrollLeft = (1 - easeInOutCubic(p)) * peekDistance;
                animFrameRef.current = requestAnimationFrame(step);
            } else {
                if (scrollRef.current) {
                    scrollRef.current.scrollLeft = 0;
                    scrollRef.current.style.scrollSnapType = '';
                }
                isAnimatingRef.current = false;
                animFrameRef.current = null;
                checkScroll();
            }
        };

        animFrameRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
        checkScroll();
        const timer = setTimeout(checkScroll, 150);

        window.addEventListener('resize', checkScroll);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', checkScroll);
        };
    }, [transformations]);

    // Automatic peek transition when scrolling through the section
    useEffect(() => {
        const sectionEl = sectionRef.current;
        const scrollEl = scrollRef.current;
        if (!sectionEl || !scrollEl) return;

        const handleTouchStart = () => {
            isUserTouchingRef.current = true;
            cancelAnimation();
        };

        const handleTouchEnd = () => {
            setTimeout(() => {
                isUserTouchingRef.current = false;
            }, 300);
        };

        scrollEl.addEventListener('touchstart', handleTouchStart, { passive: true });
        scrollEl.addEventListener('pointerdown', handleTouchStart, { passive: true });
        scrollEl.addEventListener('touchend', handleTouchEnd, { passive: true });
        scrollEl.addEventListener('pointerup', handleTouchEnd, { passive: true });
        scrollEl.addEventListener('wheel', handleTouchStart, { passive: true });

        let delayTimer: NodeJS.Timeout | null = null;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const now = Date.now();
                        if (now - lastTriggerTimeRef.current > 2500) {
                            lastTriggerTimeRef.current = now;
                            if (delayTimer) clearTimeout(delayTimer);
                            delayTimer = setTimeout(() => {
                                if (scrollRef.current && scrollRef.current.scrollLeft <= 5) {
                                    triggerPeekAnimation();
                                }
                            }, 100);
                        }
                    }
                });
            },
            { threshold: 0.18 }
        );

        observer.observe(sectionEl);

        return () => {
            observer.disconnect();
            cancelAnimation();
            scrollEl.removeEventListener('touchstart', handleTouchStart);
            scrollEl.removeEventListener('pointerdown', handleTouchStart);
            scrollEl.removeEventListener('touchend', handleTouchEnd);
            scrollEl.removeEventListener('pointerup', handleTouchEnd);
            scrollEl.removeEventListener('wheel', handleTouchStart);
            if (delayTimer) clearTimeout(delayTimer);
        };
    }, [transformations]);

    const scroll = (direction: 'left' | 'right') => {
        cancelAnimation();
        if (!scrollRef.current) return;
        const scrollAmount = scrollRef.current.clientWidth * 0.8;
        scrollRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth',
        });
        setTimeout(checkScroll, 350);
    };

    if (transformations.length === 0) return null;

    return (
        <section
            ref={sectionRef}
            className="homepage-section"
            style={{
                background: '#ffffff',
                padding: '32px 0 36px',
                position: 'relative',
            }}
        >
            {/* Header */}
            <div
                className="section-header-row"
                style={{
                    maxWidth: '1540px',
                    margin: '0 auto',
                    padding: '0 80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '28px',
                }}
            >
                <div className="section-title-wrap">
                    <h2
                        style={{
                            fontFamily: "'Outfit', sans-serif",
                            fontSize: '24.5px',
                            fontWeight: 700,
                            color: '#1a1a1a',
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                            margin: 0,
                            lineHeight: 1.25,
                        }}
                    >
                        Visible Change. Real Stories
                    </h2>
                </div>
            </div>

            {/* Scrollable Cards Row */}
            <div style={{ position: 'relative', maxWidth: '1540px', margin: '0 auto' }}>
                {/* Left Arrow */}
                {canScrollLeft && (
                    <button
                        onClick={() => scroll('left')}
                        className="carousel-arrow carousel-arrow-left"
                        aria-label="Scroll left"
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
                        className="carousel-arrow carousel-arrow-right"
                        aria-label="Scroll right"
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
                        className="hide-scrollbar vc-scroll-track"
                    >
                        {transformations.map((item) => (
                            <Link
                                key={item.id}
                                href={`/product/${item.slug}`}
                                className="vc-card"
                                style={{
                                    minWidth: 'calc((100% - 80px) / 4.17)',
                                    maxWidth: 'calc((100% - 80px) / 4.17)',
                                    background: '#ffffff',
                                    borderRadius: '14px',
                                    overflow: 'hidden',
                                    scrollSnapAlign: 'start',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'box-shadow 0.2s ease',
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    color: 'inherit',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {/* Before / After Image Area */}
                                <div
                                    className="vc-image-area"
                                    style={{
                                        position: 'relative',
                                        width: '100%',
                                        height: '160px',
                                        display: 'flex',
                                    }}
                                >
                                    {/* Before */}
                                    <div style={{ position: 'relative', width: '50%', height: '100%' }}>
                                        <Image
                                            src={item.beforeImage}
                                            alt={item.beforeLabel || 'Day 1'}
                                            fill
                                            sizes="15vw"
                                            style={{ objectFit: 'cover' }}
                                        />
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                left: '8px',
                                                background: 'rgba(0,0,0,0.55)',
                                                color: '#ffffff',
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '10px',
                                                zIndex: 2,
                                            }}
                                        >
                                            {item.beforeLabel || 'Day 1'}
                                        </span>
                                    </div>
                                    {/* After */}
                                    <div style={{ position: 'relative', width: '50%', height: '100%' }}>
                                        <Image
                                            src={item.afterImage}
                                            alt={item.afterLabel || 'Day 30'}
                                            fill
                                            sizes="15vw"
                                            style={{ objectFit: 'cover' }}
                                        />
                                        <span
                                            style={{
                                                position: 'absolute',
                                                top: '8px',
                                                right: '8px',
                                                background: 'rgba(0,0,0,0.55)',
                                                color: '#ffffff',
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '10px',
                                                fontWeight: 600,
                                                padding: '3px 8px',
                                                borderRadius: '10px',
                                                zIndex: 2,
                                            }}
                                        >
                                            {item.afterLabel || 'Day 30'}
                                        </span>
                                    </div>
                                </div>

                                {/* Bottom Info Row */}
                                <div
                                    className="vc-info"
                                    style={{
                                        padding: '12px 14px 14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                    }}
                                >
                                    {/* Product Thumbnail */}
                                    <div
                                        className="vc-thumb"
                                        style={{
                                            width: '38px',
                                            height: '38px',
                                            borderRadius: '50%',
                                            overflow: 'hidden',
                                            border: '2px solid #f0f0f0',
                                            flexShrink: 0,
                                            position: 'relative',
                                        }}
                                    >
                                        <Image
                                            src={item.productThumb}
                                            alt={item.productName}
                                            fill
                                            sizes="38px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </div>

                                    {/* Product Details */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p
                                            className="vc-product-name"
                                            style={{
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '11px',
                                                fontWeight: 600,
                                                color: '#1a1a1a',
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                marginBottom: '3px',
                                            }}
                                        >
                                            {item.productName}
                                        </p>
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                marginBottom: '3px',
                                            }}
                                        >
                                            <span
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '2px',
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '11px',
                                                    fontWeight: 700,
                                                    color: '#ffb700',
                                                }}
                                            >
                                                <Star size={10} fill="#ffb700" stroke="#ffb700" />
                                                {item.rating}
                                            </span>
                                            <span
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '10px',
                                                    color: '#999',
                                                }}
                                            >
                                                | {item.reviewCount} Reviews
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                                            <span
                                                className="vc-price"
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '16px',
                                                    fontWeight: 700,
                                                    color: '#1a1a1a',
                                                    lineHeight: 1,
                                                }}
                                            >
                                                ৳{item.price}
                                            </span>
                                            {item.originalPrice > 0 && (
                                                <span
                                                    style={{
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '12px',
                                                        color: '#bbb',
                                                        textDecoration: 'line-through',
                                                        lineHeight: 1,
                                                    }}
                                                >
                                                    ৳{item.originalPrice}
                                                </span>
                                            )}
                                            {item.discountPercent > 0 && (
                                                <span
                                                    style={{
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '10px',
                                                        fontWeight: 700,
                                                        color: '#2e7d32',
                                                    }}
                                                >
                                                    {Math.ceil(item.discountPercent)}% OFF
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Shopping Bag Icon */}
                                    <button
                                        className="vc-cart-btn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addToCart({
                                                id: String(item.id),
                                                slug: item.slug,
                                                name: item.productName,
                                                image: item.productThumb,
                                                price: item.price,
                                                originalPrice: item.originalPrice,
                                            });
                                        }}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            border: '1px solid #e0e0e0',
                                            background: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#f5c518';
                                            e.currentTarget.style.borderColor = '#f5c518';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = '#ffffff';
                                            e.currentTarget.style.borderColor = '#e0e0e0';
                                        }}
                                    >
                                        <Plus size={16} color="#333" />
                                    </button>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
