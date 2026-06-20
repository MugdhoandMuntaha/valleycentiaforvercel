'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { SectionProduct } from '@/data/homeSections';
import ProductCard from './ProductCard';

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
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

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
