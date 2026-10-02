/**
 * Cookie Consent & Privacy Compliance Management
 * Provides GDPR / e-Privacy Directive compliance primitives for privacy management.
 * Zero UI impact: Operates headless and provides utilities for client components.
 */

export interface CookieConsentPreferences {
    essential: boolean;     // Essential session, auth, and cart cookies (always true)
    analytics: boolean;     // Web vitals, aggregated analytics
    marketing: boolean;     // Ad tracking and marketing pixels
    updatedAt: string;      // ISO timestamp of consent timestamp
}

export const COOKIE_CONSENT_KEY = 'valleycentia_cookie_consent';

export const DEFAULT_CONSENT: CookieConsentPreferences = {
    essential: true,
    analytics: true,
    marketing: false,
    updatedAt: new Date().toISOString(),
};

/**
 * Parse consent preferences from a cookie string or localStorage
 */
export function parseConsentString(raw: string | null | undefined): CookieConsentPreferences | null {
    if (!raw) return null;
    try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (typeof parsed === 'object' && parsed !== null && 'essential' in parsed) {
            return {
                essential: true, // Always enforce essential
                analytics: Boolean(parsed.analytics),
                marketing: Boolean(parsed.marketing),
                updatedAt: parsed.updatedAt || new Date().toISOString(),
            };
        }
    } catch {
        // invalid JSON
    }
    return null;
}

/**
 * Serialize consent preferences for cookie/storage persistence
 */
export function serializeConsent(preferences: Partial<CookieConsentPreferences>): string {
    const full: CookieConsentPreferences = {
        essential: true,
        analytics: preferences.analytics ?? false,
        marketing: preferences.marketing ?? false,
        updatedAt: new Date().toISOString(),
    };
    return encodeURIComponent(JSON.stringify(full));
}
