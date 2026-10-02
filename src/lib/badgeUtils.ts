/**
 * Centralized Badge Configuration & Utility
 * 
 * Provides unified color schemes, contrast calculation, and label formatting
 * for all product badges across the entire website.
 * Badges are standardized to sleek, premium black (#000000) with white text (#ffffff).
 */

export interface BadgeStyle {
    label: string;
    background: string;
    color: string;
}

/**
 * Standard brand palette for canonical badge types.
 * Unified to premium black (#000000) across all badge categories.
 */
export const CANONICAL_BADGE_CONFIG: Record<string, { bg: string; label: string }> = {
    best_seller: { bg: '#000000', label: 'BEST SELLER' },
    'best seller': { bg: '#000000', label: 'BEST SELLER' },
    bestseller: { bg: '#000000', label: 'BEST SELLER' },

    new_launch: { bg: '#000000', label: 'NEW LAUNCH' },
    'new launch': { bg: '#000000', label: 'NEW LAUNCH' },
    new: { bg: '#000000', label: 'NEW LAUNCH' },

    trending: { bg: '#000000', label: 'TRENDING' },
    hot: { bg: '#000000', label: 'TRENDING' },

    selling_fast: { bg: '#000000', label: 'SELLING FAST' },
    'selling fast': { bg: '#000000', label: 'SELLING FAST' },

    premium: { bg: '#000000', label: 'PREMIUM' },

    sale: { bg: '#000000', label: 'SALE' },

    limited_edition: { bg: '#000000', label: 'LIMITED EDITION' },
    'limited edition': { bg: '#000000', label: 'LIMITED EDITION' },
};

/**
 * Calculate contrasting text color (dark charcoal or pure white)
 * based on background color luminance.
 */
export function getContrastTextColor(bgColor: string): string {
    if (!bgColor) return '#ffffff';
    const clean = bgColor.trim().replace('#', '');
    
    let r = 255, g = 255, b = 255;
    if (clean.length === 3) {
        r = parseInt(clean[0] + clean[0], 16);
        g = parseInt(clean[1] + clean[1], 16);
        b = parseInt(clean[2] + clean[2], 16);
    } else if (clean.length === 6) {
        r = parseInt(clean.substring(0, 2), 16);
        g = parseInt(clean.substring(2, 4), 16);
        b = parseInt(clean.substring(4, 6), 16);
    }

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '#ffffff';

    // Standard ITU-R BT.601 relative luminance formula
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    return luminance > 165 ? '#1a1a1a' : '#ffffff';
}

/**
 * Get default canonical color for a known badge type key (e.g. 'best_seller')
 */
export function getDefaultBadgeColor(badgeType?: string): string {
    if (!badgeType) return '#000000';
    const key = badgeType.trim().toLowerCase();
    return CANONICAL_BADGE_CONFIG[key]?.bg || CANONICAL_BADGE_CONFIG[key.replace(/\s+/g, '_')]?.bg || '#000000';
}

/**
 * Get default display label for a badge type key
 */
export function getDefaultBadgeLabel(badgeType: string): string {
    if (!badgeType) return '';
    const key = badgeType.trim().toLowerCase();
    const config = CANONICAL_BADGE_CONFIG[key] || CANONICAL_BADGE_CONFIG[key.replace(/\s+/g, '_')];
    if (config?.label) return config.label;
    return badgeType.replace(/_/g, ' ').toUpperCase();
}

/**
 * Resolves the final display styling (label, background color, text color)
 * for any badge across the website.
 * 
 * Rules:
 * 1. Formats display label to uppercase with underscores converted to spaces.
 * 2. Defaults to unified solid black (#000000) with pure white text (#ffffff).
 * 3. Normalizes legacy green (#2e7d32), yellow (#f0c14b), blue (#1e88e5), orange (#e67e22)
 *    and teal (#00897b) from database records to unified black (#000000).
 */
export function resolveBadgeStyle(badgeText?: string | null, customColor?: string | null): BadgeStyle {
    if (!badgeText || !badgeText.trim()) {
        return { label: '', background: '#000000', color: '#ffffff' };
    }

    const cleanText = badgeText.trim().replace(/_/g, ' ');
    const normalizedKey = cleanText.toLowerCase();

    // Canonical lookup
    const canonical = CANONICAL_BADGE_CONFIG[normalizedKey]
        || CANONICAL_BADGE_CONFIG[normalizedKey.replace(/\s+/g, '_')];

    // Standard unified badge color is black (#000000)
    // Legacy database colors that should be normalized to black
    const legacyColors = ['#2e7d32', '#f0c14b', '#1e88e5', '#e67e22', '#00897b', '#6c3483', '#8e44ad'];
    const normalizedCustom = customColor?.trim().toLowerCase();
    const isLegacy = !normalizedCustom || legacyColors.includes(normalizedCustom);

    let background = '#000000';

    if (normalizedCustom && !isLegacy && /^#([0-9A-Fa-f]{3}){1,2}$/.test(normalizedCustom)) {
        background = customColor!.trim();
    }

    const textColor = getContrastTextColor(background);

    return {
        label: canonical?.label || cleanText.toUpperCase(),
        background,
        color: textColor,
    };
}
