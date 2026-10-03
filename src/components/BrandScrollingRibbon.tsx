'use client';

import React, { useState } from 'react';
import Link from 'next/link';

export interface BrandRibbonItem {
    id: string | number;
    name: string;
    slug: string;
    tagline?: string | null;
    logo_url?: string | null;
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

function getBrandInitials(name: string): string {
    const cleaned = name.trim().replace(/[^a-zA-Z0-9\s]/g, '');
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'VC';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    const significant = parts.filter(p => !['at', 'of', 'and', 'the', 'in'].includes(p.toLowerCase()));
    if (significant.length >= 2) {
        return (significant[0][0] + significant[1][0]).toUpperCase();
    }
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}

function RectangularBrandLogo({ brand }: { brand: BrandRibbonItem }) {
    const [imgError, setImgError] = useState(false);
    const rawLogo = brand.logo_url || (brand as Record<string, unknown>).logoUrl as string | null | undefined;
    const hasValidImage = Boolean(rawLogo && rawLogo !== '/no-image.svg' && !imgError);
    const accent = brand.accent_color || '#c9a96e';

    return (
        <div className="brand-rect-badge">
            {hasValidImage ? (
                <img
                    src={rawLogo!}
                    alt={`${brand.name} logo`}
                    className="brand-rect-logo-image"
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
    const rawList = brands && brands.length > 0 ? brands : DEFAULT_BRANDS;

    // Ensure we have enough items in one half to comfortably exceed 4K ultra-wide viewport widths
    const repeatTimes = Math.max(3, Math.ceil(14 / rawList.length));
    const listForHalf: BrandRibbonItem[] = [];
    for (let i = 0; i < repeatTimes; i++) {
        listForHalf.push(...rawList);
    }

    return (
        <section
            className="brand-ribbon-container"
            aria-label="Partner Brands"
        >
            <div className="brand-ribbon-track">
                {/* ── First Half ── */}
                <div className="brand-ribbon-group">
                    {listForHalf.map((brand, idx) => (
                        <Link
                            key={`logo-h1-${brand.slug}-${idx}`}
                            href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                            className="brand-logo-item"
                            title={`Shop ${brand.name}`}
                            aria-label={brand.name}
                        >
                            <RectangularBrandLogo brand={brand} />
                        </Link>
                    ))}
                </div>

                {/* ── Second Half (Exact clone for seamless 0-jump infinite marquee) ── */}
                <div className="brand-ribbon-group" aria-hidden="true">
                    {listForHalf.map((brand, idx) => (
                        <Link
                            key={`logo-h2-${brand.slug}-${idx}`}
                            href={`/shop?brand=${encodeURIComponent(brand.slug)}`}
                            className="brand-logo-item"
                            tabIndex={-1}
                            title={`Shop ${brand.name}`}
                            aria-label={brand.name}
                        >
                            <RectangularBrandLogo brand={brand} />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
