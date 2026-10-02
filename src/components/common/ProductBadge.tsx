'use strict';
import React from 'react';
import { resolveBadgeStyle } from '@/lib/badgeUtils';

export interface ProductBadgeProps {
    badge?: string | null;
    badgeColor?: string | null;
    variant?: 'card' | 'gallery' | 'pill';
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Unified ProductBadge Component
 * 
 * Renders consistent badge colors, contrast text, and typography
 * across product cards, image galleries, and listings.
 */
export default function ProductBadge({
    badge,
    badgeColor,
    variant = 'card',
    className = '',
    style = {},
}: ProductBadgeProps) {
    if (!badge || !badge.trim()) return null;

    const { label, background, color } = resolveBadgeStyle(badge, badgeColor);

    let variantStyle: React.CSSProperties = {};

    if (variant === 'card') {
        // Fits top-left corner of product card with matching outer radius
        variantStyle = {
            position: 'absolute',
            top: 0,
            left: 0,
            background,
            color,
            fontFamily: "'Inter', sans-serif",
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: '12px 0 6px 0',
            letterSpacing: '0.5px',
            lineHeight: '1.2',
            textTransform: 'uppercase',
            zIndex: 3,
            boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
            whiteSpace: 'nowrap',
        };
    } else if (variant === 'gallery') {
        // Used in PDP ImageGallery floating above the image
        variantStyle = {
            background,
            color,
            fontSize: '11px',
            fontWeight: 700,
            padding: '5px 14px',
            borderRadius: '6px',
            fontFamily: "'Inter', sans-serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.14)',
            letterSpacing: '0.3px',
            lineHeight: '1.2',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            display: 'inline-block',
        };
    } else {
        // Pill variant for inline or compact lists
        variantStyle = {
            background,
            color,
            fontSize: '10px',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '4px',
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.3px',
            lineHeight: '1.2',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            display: 'inline-block',
        };
    }

    return (
        <span
            className={`product-badge ${className}`.trim()}
            style={{ ...variantStyle, ...style }}
        >
            {label}
        </span>
    );
}
