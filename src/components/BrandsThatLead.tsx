'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export interface BrandCard {
    id: number | string;
    name: string;
    slug: string;
    tagline: string;
    image: string;
    logo_url?: string | null;
    logoUrl?: string | null;
    background: string;
    textColor?: string;
    nameStyle?: React.CSSProperties;
}

interface BrandsThatLeadProps {
    brands?: BrandCard[];
    background?: string;
}

/**
 * Mobile-only Logo Card
 * Shows ONLY the brand logo centered on a neutral/white card.
 * Gracefully falls back to brand name text if logo is missing or broken.
 */
function MobileBrandLogoCard({
    brand,
    onLinkClick,
}: {
    brand: BrandCard;
    onLinkClick: (e: React.MouseEvent) => void;
}) {
    const [imgError, setImgError] = useState(false);
    const rawLogo = brand.logo_url || brand.logoUrl || (brand.image && !brand.image.includes('no-image') ? brand.image : null);
    const hasValidImage = Boolean(rawLogo && !imgError);

    return (
        <Link
            href={`/shop?brand=${brand.slug}`}
            onClick={onLinkClick}
            className="brand-mobile-card"
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--brand-cell-width, 124px)',
                minWidth: 'var(--brand-cell-width, 124px)',
                height: 'var(--brand-cell-height, 76px)',
                padding: '8px 14px',
                borderRadius: '12px',
                background: '#ffffff',
                border: '1px solid #e8e8e8',
                boxShadow: '0 1px 4px rgba(0, 0, 0, 0.03)',
                boxSizing: 'border-box',
                flexShrink: 0,
                textDecoration: 'none',
                userSelect: 'none',
                WebkitUserSelect: 'none',
            }}
        >
            {hasValidImage ? (
                <img
                    src={rawLogo!}
                    alt={brand.name}
                    draggable={false}
                    onError={() => setImgError(true)}
                    style={{
                        width: '100%',
                        height: '100%',
                        maxWidth: '90%',
                        maxHeight: '75%',
                        objectFit: 'contain',
                        objectPosition: 'center',
                        display: 'block',
                        pointerEvents: 'none',
                    }}
                />
            ) : (
                <span
                    style={{
                        fontFamily: "'Outfit', 'Inter', -apple-system, sans-serif",
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#1a1a1a',
                        textAlign: 'center',
                        lineHeight: 1.15,
                        letterSpacing: '0.02em',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        pointerEvents: 'none',
                    }}
                >
                    {brand.name}
                </span>
            )}
        </Link>
    );
}

export default function BrandsThatLead({ brands = [], background = '#ffffff' }: BrandsThatLeadProps) {
    if (!brands || brands.length === 0) {
        return null;
    }

    // Mobile Auto-scroll & Touch Interaction Refs
    const viewportRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const groupWidthRef = useRef<number>(0);
    const posRef = useRef<number>(0);

    const isInteractingRef = useRef(false);
    const hasMovedRef = useRef(false);
    const startXRef = useRef(0);
    const startYRef = useRef(0);
    const pauseTimerRef = useRef<NodeJS.Timeout | null>(null);

    const lastTimeRef = useRef<number | null>(null);
    const animFrameRef = useRef<number | null>(null);

    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Detect user reduced motion preference
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mq.matches);

        const handleMotionChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
        if (mq.addEventListener) {
            mq.addEventListener('change', handleMotionChange);
            return () => mq.removeEventListener('change', handleMotionChange);
        } else if ('addListener' in mq) {
            (mq as any).addListener(handleMotionChange);
            return () => (mq as any).removeListener(handleMotionChange);
        }
    }, []);

    // Measure single group width & initialize centered buffer into Group 1
    useEffect(() => {
        const measure = () => {
            if (groupRef.current && viewportRef.current) {
                const gw = groupRef.current.offsetWidth;
                if (gw > 0 && gw !== groupWidthRef.current) {
                    groupWidthRef.current = gw;
                    // If initial uninitialized position (0), center into Group 1
                    if (viewportRef.current.scrollLeft === 0) {
                        viewportRef.current.scrollLeft = gw;
                        posRef.current = gw;
                    }
                }
            }
        };

        measure();

        let ro: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined' && groupRef.current) {
            ro = new ResizeObserver(measure);
            ro.observe(groupRef.current);
        }

        window.addEventListener('resize', measure);
        return () => {
            if (ro) ro.disconnect();
            window.removeEventListener('resize', measure);
        };
    }, [brands]);

    // Continuous 24px/sec auto-scroll loop (pauses while touching, resumes ~2s after release)
    useEffect(() => {
        if (prefersReducedMotion) return;

        const SPEED = 24; // 24px/sec (within 20-30px/sec required)

        const step = (now: number) => {
            if (lastTimeRef.current === null) {
                lastTimeRef.current = now;
            }
            const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
            lastTimeRef.current = now;

            const el = viewportRef.current;
            const gw = groupWidthRef.current;

            if (!isInteractingRef.current && el && gw > 0) {
                posRef.current += SPEED * dt;

                // Seamless buffer wrapping forward
                if (posRef.current >= gw * 2) {
                    posRef.current -= gw;
                }

                el.scrollLeft = posRef.current;
            }

            animFrameRef.current = requestAnimationFrame(step);
        };

        animFrameRef.current = requestAnimationFrame(step);

        return () => {
            if (animFrameRef.current !== null) {
                cancelAnimationFrame(animFrameRef.current);
            }
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };
    }, [prefersReducedMotion]);

    // Handle scroll wrapping on manual drag/swipe and keep posRef in sync
    const handleScroll = useCallback(() => {
        const el = viewportRef.current;
        const gw = groupWidthRef.current;
        if (!el || gw <= 0) return;

        const currentLeft = el.scrollLeft;

        // Wrap backwards if user scrolled left before Group 1
        if (currentLeft < gw) {
            el.scrollLeft += gw;
            posRef.current = el.scrollLeft;
        }
        // Wrap forwards if scrolled past Group 2
        else if (currentLeft >= gw * 2) {
            el.scrollLeft -= gw;
            posRef.current = el.scrollLeft;
        } else {
            posRef.current = currentLeft;
        }
    }, []);

    // Touch handlers for mobile devices
    const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
        }
        isInteractingRef.current = true;
        hasMovedRef.current = false;
        startXRef.current = e.touches[0].clientX;
        startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
        const touch = e.touches[0];
        const dx = Math.abs(touch.clientX - startXRef.current);
        const dy = Math.abs(touch.clientY - startYRef.current);
        if (dx > 6 || dy > 6) {
            hasMovedRef.current = true;
        }
    };

    const handleTouchEnd = () => {
        if (viewportRef.current) {
            posRef.current = viewportRef.current.scrollLeft;
        }
        // Auto-scroll pauses while the user touches/drags and resumes ~2s after release
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
            if (viewportRef.current) {
                posRef.current = viewportRef.current.scrollLeft;
            }
            isInteractingRef.current = false;
            lastTimeRef.current = null;
        }, 2000);
    };

    // Pointer handlers for desktop mouse emulation
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
            pauseTimerRef.current = null;
        }
        isInteractingRef.current = true;
        hasMovedRef.current = false;
        startXRef.current = e.clientX;
        startYRef.current = e.clientY;
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        const dx = Math.abs(e.clientX - startXRef.current);
        const dy = Math.abs(e.clientY - startYRef.current);
        if (dx > 6 || dy > 6) {
            hasMovedRef.current = true;
        }
    };

    const handlePointerUp = () => {
        if (viewportRef.current) {
            posRef.current = viewportRef.current.scrollLeft;
        }
        if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
        pauseTimerRef.current = setTimeout(() => {
            if (viewportRef.current) {
                posRef.current = viewportRef.current.scrollLeft;
            }
            isInteractingRef.current = false;
            lastTimeRef.current = null;
        }, 2000);
    };

    // Prevent navigation when user dragged/swiped the ribbon
    const handleLinkClick = (e: React.MouseEvent) => {
        if (hasMovedRef.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    // Ensure single group forms complete 2-row columns and is wider than 4 visible columns (min 12 items / 6 columns)
    let repeatTimes = 1;
    while (repeatTimes * brands.length < 12 || (repeatTimes * brands.length) % 2 !== 0) {
        repeatTimes++;
    }
    const singleGroupList: BrandCard[] = [];
    for (let i = 0; i < repeatTimes; i++) {
        singleGroupList.push(...brands);
    }

    return (
        <section
            className="brands-that-lead-section"
            style={{
                background,
                padding: '32px 0 36px',
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
                        Brands That Lead
                    </h2>
                </div>
            </div>

            {/* Desktop Brand Cards Grid (≥ 769px) — completely untouched */}
            <div className="brands-desktop-view">
                <div
                    className="brands-grid"
                    style={{
                        maxWidth: '1540px',
                        margin: '0 auto',
                        padding: '0 80px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, 1fr)',
                        gap: '20px',
                    }}
                >
                    {brands.map((brand) => (
                        <Link
                            key={brand.id}
                            href={`/shop?brand=${brand.slug}`}
                            className="brand-card"
                            style={{
                                position: 'relative',
                                display: 'block',
                                borderRadius: '14px',
                                overflow: 'hidden',
                                background: brand.background,
                                height: '200px',
                                textDecoration: 'none',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-3px)';
                                e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                            }}
                        >
                            {/* Model/Product Image - Left Side */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: 0,
                                    top: 0,
                                    width: '50%',
                                    height: '100%',
                                }}
                            >
                                <Image
                                    src={brand.image}
                                    alt={brand.name}
                                    fill
                                    sizes="25vw"
                                    style={{
                                        objectFit: 'cover',
                                        objectPosition: 'center top',
                                    }}
                                />
                            </div>

                            {/* Brand Info - Right Side */}
                            <div
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '44%',
                                    transform: 'translateY(-50%)',
                                    width: '50%',
                                    textAlign: 'center',
                                    padding: '0 12px',
                                }}
                            >
                                <h3
                                    className="brand-name"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '16px',
                                        fontWeight: 700,
                                        color: brand.textColor || '#1a1512',
                                        marginBottom: '4px',
                                        lineHeight: 1.2,
                                        ...brand.nameStyle,
                                    }}
                                >
                                    {brand.name}
                                </h3>
                                <p
                                    className="brand-tagline"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '11px',
                                        color: brand.textColor || '#4a3f35',
                                        opacity: brand.textColor ? 0.75 : 1,
                                        fontWeight: 400,
                                        lineHeight: 1.3,
                                    }}
                                >
                                    {brand.tagline}
                                </p>
                            </div>

                            {/* Products Link */}
                            <div
                                className="brand-products-pill"
                                style={{
                                    position: 'absolute',
                                    bottom: '14px',
                                    left: '75%',
                                    transform: 'translateX(-50%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    background: 'rgba(255,255,255,0.85)',
                                    backdropFilter: 'blur(4px)',
                                    padding: '6px 14px',
                                    borderRadius: '20px',
                                    transition: 'background 0.2s ease, transform 0.2s ease',
                                }}
                            >
                                <span
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '12px',
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                    }}
                                >
                                    Products
                                </span>
                                <span style={{ fontSize: '12px', color: '#1a1a1a' }}>↗</span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Mobile Brand Logos Single Row Auto-Scroller (< 768px) */}
            <div className="brands-mobile-view">
                <div
                    ref={viewportRef}
                    className="brands-mobile-viewport"
                    onScroll={handleScroll}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onTouchCancel={handleTouchEnd}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    style={{
                        display: 'flex',
                        overflowX: 'auto',
                        overflowY: 'hidden',
                        WebkitOverflowScrolling: 'touch',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none',
                        width: '100%',
                        cursor: 'grab',
                    }}
                >
                    {/* Group 0 (Buffer) */}
                    <div
                        className="brands-mobile-group"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(2, var(--brand-cell-height, 76px))',
                            gridAutoFlow: 'column',
                            gridAutoColumns: 'var(--brand-cell-width, 124px)',
                            gap: 'var(--brand-gap, 8px)',
                            paddingRight: 'var(--brand-gap, 8px)',
                            flexShrink: 0,
                        }}
                    >
                        {singleGroupList.map((brand, idx) => (
                            <MobileBrandLogoCard key={`g0-${brand.id}-${idx}`} brand={brand} onLinkClick={handleLinkClick} />
                        ))}
                    </div>

                    {/* Group 1 (Primary / Measured) */}
                    <div
                        ref={groupRef}
                        className="brands-mobile-group"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(2, var(--brand-cell-height, 76px))',
                            gridAutoFlow: 'column',
                            gridAutoColumns: 'var(--brand-cell-width, 124px)',
                            gap: 'var(--brand-gap, 8px)',
                            paddingRight: 'var(--brand-gap, 8px)',
                            flexShrink: 0,
                        }}
                    >
                        {singleGroupList.map((brand, idx) => (
                            <MobileBrandLogoCard key={`g1-${brand.id}-${idx}`} brand={brand} onLinkClick={handleLinkClick} />
                        ))}
                    </div>

                    {/* Group 2 (Buffer) */}
                    <div
                        className="brands-mobile-group"
                        style={{
                            display: 'grid',
                            gridTemplateRows: 'repeat(2, var(--brand-cell-height, 76px))',
                            gridAutoFlow: 'column',
                            gridAutoColumns: 'var(--brand-cell-width, 124px)',
                            gap: 'var(--brand-gap, 8px)',
                            paddingRight: 'var(--brand-gap, 8px)',
                            flexShrink: 0,
                        }}
                    >
                        {singleGroupList.map((brand, idx) => (
                            <MobileBrandLogoCard key={`g2-${brand.id}-${idx}`} brand={brand} onLinkClick={handleLinkClick} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
