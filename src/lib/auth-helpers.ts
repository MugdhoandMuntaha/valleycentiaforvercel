/**
 * Authentication and redirect safety helpers.
 */

/**
 * Validates and sanitizes a callback URL to prevent open redirects.
 * 
 * Rules:
 * 1. Rejects null, undefined, and non-string inputs (returns fallback).
 * 2. Accepts relative paths that begin with a single "/" (e.g. "/product/xyz#reviews").
 *    Rejects protocol-relative paths such as "//evil.com" or "/\\evil.com".
 * 3. Accepts absolute URLs ONLY if their origin matches the application's origin
 *    (window.location.origin or NEXT_PUBLIC_BASE_URL or local dev origins),
 *    normalizing them to safe relative paths.
 * 4. Rejects any other external origin, javascript:, data:, or malformed URLs.
 * 5. Returns `fallback` (defaults to '/') if the callback URL is not safe.
 */
export function getSafeCallbackUrl(
    rawUrl: string | null | undefined,
    fallback: string = '/'
): string {
    if (!rawUrl || typeof rawUrl !== 'string') {
        return fallback;
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return fallback;
    }

    // Reject protocol-relative URLs (e.g. //evil.com, /\evil.com, \/evil.com)
    if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\/')) {
        return fallback;
    }

    // Relative path starting with a single '/'
    if (trimmed.startsWith('/')) {
        // Double check second character is not another slash or backslash
        if (trimmed.length > 1 && (trimmed[1] === '/' || trimmed[1] === '\\')) {
            return fallback;
        }

        try {
            // Verify using URL constructor against dummy origin to ensure valid syntax
            const dummy = new URL(trimmed, 'http://localhost');
            if (dummy.origin !== 'http://localhost') {
                return fallback;
            }
            return trimmed;
        } catch {
            return fallback;
        }
    }

    // Absolute URL: allow only same-origin URLs
    try {
        const parsed = new URL(trimmed);

        const allowedOrigins: string[] = [];

        if (typeof window !== 'undefined' && window.location?.origin) {
            allowedOrigins.push(window.location.origin.toLowerCase());
        }

        if (process.env.NEXT_PUBLIC_BASE_URL) {
            try {
                allowedOrigins.push(new URL(process.env.NEXT_PUBLIC_BASE_URL).origin.toLowerCase());
            } catch {}
        }

        // Local development origins
        allowedOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');

        const parsedOrigin = parsed.origin.toLowerCase();
        if (allowedOrigins.includes(parsedOrigin)) {
            return `${parsed.pathname}${parsed.search}${parsed.hash}` || '/';
        }
    } catch {
        // Invalid URL format
    }

    return fallback;
}
