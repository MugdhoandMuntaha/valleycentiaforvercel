/**
 * Pure HTML sanitizer utility
 * Strips script tags, iframes, embedded objects, javascript: links, and inline DOM event handlers
 * while preserving safe formatting tags (p, br, strong, em, b, i, ul, ol, li, span, h1-h6).
 */
export function sanitizeHtml(html: string): string {
    if (!html) return '';
    return html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
        .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
        .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
        .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
        .replace(/javascript\s*:/gi, '');
}

