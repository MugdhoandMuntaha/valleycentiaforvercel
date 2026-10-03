'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SectionProduct } from '@/data/homeSections';
import ProductCard from './ProductCard';

/* ─── Props ─── */
interface ProductCarouselSectionProps {
    title: string;
    subtitle?: string;
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
    const sectionRef = useRef<HTMLElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(() => (products && products.length > 2));
    
    // Animation refs for 60fps/120fps hardware-synced smooth transition
    const isAnimatingRef = useRef(false);
    const animFrameRef = useRef<number | null>(null);
    const lastTriggerTimeRef = useRef(0);
    const isUserTouchingRef = useRef(false);

    /* guards */
    if (!products || products.length === 0) return null;

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
        const forwardDuration = 420;  // 420ms forward glide
        const holdDuration = 280;     // 280ms hold at peak
        const returnDuration = 450;   // 450ms smooth return glide
        const totalDuration = forwardDuration + holdDuration + returnDuration; // 1150ms

        // Smooth cubic easing curves
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
    }, [products]);

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
                        // Triggers whenever scrolling through the section into view (2.5s cooldown)
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
    }, [products]);

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

    return (
        <section
            ref={sectionRef}
            className="homepage-section"
            style={{
                background,
                padding: '32px 0 36px',
                position: 'relative',
            }}
        >
            {/* ── Header Row ── */}
            <div
                className={`section-header-row ${showViewAll ? 'has-view-all' : ''}`}
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
                        {title}
                    </h2>
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
                        className="hide-scrollbar carousel-scroll-track"
                    >
                        {products.map((product, index) => (
                            <ProductCard
                                key={product.id}
                                product={product}
                                index={index}
                                isCarousel={true}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
