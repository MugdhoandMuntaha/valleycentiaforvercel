'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

export interface BrandRibbonItem {
    id: string | number;
    name: string;
    slug: string;
    tagline?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
    accent_color?: string | null;
}

interface BrandScrollingRibbonProps {
    brands: BrandRibbonItem[];
}

const DEFAULT_BRANDS: BrandRibbonItem[] = [
    { id: '1', name: 'Bare Anatomy', slug: 'bare-anatomy', accent_color: '#c9a96e' },
    { id: '2', name: 'Chemist at Play', slug: 'chemist-at-play', accent_color: '#38a386' },
    { id: '3', name: 'Sun Scoop', slug: 'sun-scoop', accent_color: '#f5a623' },
    { id: '4', name: 'The Ordinary', slug: 'the-ordinary', accent_color: '#333333' },
    { id: '5', name: 'CeraVe', slug: 'cerave', accent_color: '#0055b8' },
    { id: '6', name: 'Minimalist', slug: 'minimalist', accent_color: '#1a1a1a' },
];

function RectangularBrandLogo({ brand }: { brand: BrandRibbonItem }) {
    const [imgError, setImgError] = useState(false);
    const rawLogo = brand.logo_url || brand.logoUrl;
    const hasValidImage = Boolean(rawLogo && rawLogo !== '/no-image.svg' && !imgError);

    return (
        <div className="brand-rect-badge">
            {hasValidImage ? (
                <img
                    src={rawLogo!}
                    alt={`${brand.name} logo`}
                    className="brand-rect-logo-image"
                    draggable={false}
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="brand-rect-fallback">
                    <span className="brand-rect-fallback-text">{brand.name}</span>
                </div>
            )}
        </div>
    );
}

export default function BrandScrollingRibbon({ brands }: BrandScrollingRibbonProps) {
    const viewportRef = useRef<HTMLDivElement>(null);
    const groupRef = useRef<HTMLDivElement>(null);
    const groupWidthRef = useRef<number>(0);
    const posRef = useRef<number>(0);

    // Runs immediately with zero entrance delay
    const isRunningRef = useRef(true);
    const isInteractingRef = useRef(false);
    const isDraggingRef = useRef(false);
    const hasMovedRef = useRef(false);
    const startXRef = useRef(0);
    const startScrollLeftRef = useRef(0);

    const lastTimeRef = useRef<number | null>(null);
    const animFrameRef = useRef<number | null>(null);
    const wheelTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Measure group width & set initial centered buffer
    useEffect(() => {
        const measure = () => {
            if (groupRef.current && viewportRef.current) {
                const gw = groupRef.current.offsetWidth;
                if (gw > 0 && gw !== groupWidthRef.current) {
                    groupWidthRef.current = gw;
                    // If at 0 (initial uninitialized state), center into group 1
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
    }, []);

    // 60/120fps hardware-synced requestAnimationFrame loop for auto-scrolling
    useEffect(() => {
        const step = (now: number) => {
            if (lastTimeRef.current === null) {
                lastTimeRef.current = now;
            }
            const dt = Math.min((now - lastTimeRef.current) / 1000, 0.1);
            lastTimeRef.current = now;

            const el = viewportRef.current;
            const gw = groupWidthRef.current;

            if (isRunningRef.current && !isInteractingRef.current && el && gw > 0) {
                // Continuous speed: traverses 1 full group in 36 seconds
                const speed = gw / 36;
                posRef.current += speed * dt;

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
            if (wheelTimerRef.current) {
                clearTimeout(wheelTimerRef.current);
            }
        };
    }, []);

    // Unified scroll handler: handles seamless wrap and keeps posRef synced
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

    // Touch handlers for mobile - zero delay on release
    const handleTouchStart = () => {
        isInteractingRef.current = true;
    };

    const handleTouchEnd = () => {
        if (viewportRef.current) {
            posRef.current = viewportRef.current.scrollLeft;
        }
        isInteractingRef.current = false;
        lastTimeRef.current = null;
    };

    // Wheel handler for trackpad or mouse wheel
    const handleWheel = () => {
        isInteractingRef.current = true;
        if (viewportRef.current) {
            posRef.current = viewportRef.current.scrollLeft;
        }
        if (wheelTimerRef.current) clearTimeout(wheelTimerRef.current);
        wheelTimerRef.current = setTimeout(() => {
            if (viewportRef.current) {
                posRef.current = viewportRef.current.scrollLeft;
            }
            isInteractingRef.current = false;
            lastTimeRef.current = null;
        }, 80);
    };

    // Pointer drag handlers for desktop mouse click-and-drag - zero delay on release
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return; // left click only
        isDraggingRef.current = true;
        isInteractingRef.current = true;
        hasMovedRef.current = false;
        startXRef.current = e.clientX;
        startScrollLeftRef.current = viewportRef.current?.scrollLeft || 0;
    };

    useEffect(() => {
        const handleGlobalPointerMove = (e: PointerEvent) => {
            if (!isDraggingRef.current || !viewportRef.current) return;
            const deltaX = e.clientX - startXRef.current;
            if (Math.abs(deltaX) > 4) {
                hasMovedRef.current = true;
            }
            viewportRef.current.scrollLeft = startScrollLeftRef.current - deltaX;
            posRef.current = viewportRef.current.scrollLeft;
        };

        const handleGlobalPointerUp = () => {
            if (isDraggingRef.current) {
                if (viewportRef.current) {
                    posRef.current = viewportRef.current.scrollLeft;
                }
                isDraggingRef.current = false;
                isInteractingRef.current = false;
                lastTimeRef.current = null;
            }
        };

        window.addEventListener('pointermove', handleGlobalPointerMove);
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);

        return () => {
            window.removeEventListener('pointermove', handleGlobalPointerMove);
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        };
    }, []);

    // Prevent navigation when user dragged/swiped the ribbon
    const handleLinkClick = (e: React.MouseEvent) => {
        if (hasMovedRef.current) {
            e.preventDefault();
            e.stopPropagation();
        }
    };

    const rawList = brands && brands.length > 0 ? brands : DEFAULT_BRANDS;

    // Ensure we have enough items in one group to comfortably exceed 4K ultra-wide viewport widths
    const repeatTimes = Math.max(3, Math.ceil(14 / rawList.length));
    const listForGroup: BrandRibbonItem[] = [];
    for (let i = 0; i < repeatTimes; i++) {
        listForGroup.push(...rawList);
    }

    return (
        <section
            className="brand-ribbon-container"
            aria-label="Partner Brands"
        >
            <div
                ref={viewportRef}
                className="brand-ribbon-viewport"
                onScroll={handleScroll}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
            >
                <div className="brand-ribbon-track">
                    {/* ── Group 0 (Left buffer for seamless backward scroll) ── */}
                    <div className="brand-ribbon-group" ref={groupRef} aria-hidden="true">
                        {listForGroup.map((brand, idx) => (
                            <Link
                                key={`logo-g0-${brand.slug}-${idx}`}
                                href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                                className="brand-logo-item"
                                onClick={handleLinkClick}
                                draggable={false}
                                tabIndex={-1}
                                title={`Shop ${brand.name}`}
                                aria-label={brand.name}
                            >
                                <RectangularBrandLogo brand={brand} />
                            </Link>
                        ))}
                    </div>

                    {/* ── Group 1 (Active primary view) ── */}
                    <div className="brand-ribbon-group">
                        {listForGroup.map((brand, idx) => (
                            <Link
                                key={`logo-g1-${brand.slug}-${idx}`}
                                href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                                className="brand-logo-item"
                                onClick={handleLinkClick}
                                draggable={false}
                                title={`Shop ${brand.name}`}
                                aria-label={brand.name}
                            >
                                <RectangularBrandLogo brand={brand} />
                            </Link>
                        ))}
                    </div>

                    {/* ── Group 2 (Forward view & seamless loop boundary) ── */}
                    <div className="brand-ribbon-group" aria-hidden="true">
                        {listForGroup.map((brand, idx) => (
                            <Link
                                key={`logo-g2-${brand.slug}-${idx}`}
                                href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                                className="brand-logo-item"
                                onClick={handleLinkClick}
                                draggable={false}
                                tabIndex={-1}
                                title={`Shop ${brand.name}`}
                                aria-label={brand.name}
                            >
                                <RectangularBrandLogo brand={brand} />
                            </Link>
                        ))}
                    </div>

                    {/* ── Group 3 (Right buffer for fast forward swipe) ── */}
                    <div className="brand-ribbon-group" aria-hidden="true">
                        {listForGroup.map((brand, idx) => (
                            <Link
                                key={`logo-g3-${brand.slug}-${idx}`}
                                href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                                className="brand-logo-item"
                                onClick={handleLinkClick}
                                draggable={false}
                                tabIndex={-1}
                                title={`Shop ${brand.name}`}
                                aria-label={brand.name}
                            >
                                <RectangularBrandLogo brand={brand} />
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
