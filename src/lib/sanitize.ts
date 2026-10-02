/**
 * Input sanitization utility for NoSQL Injection & Prototype Pollution prevention
 * Recursively cleans incoming client payloads so malicious MongoDB operators ($where, $gt, $ne, etc.)
 * cannot bypass authentication, pricing, or query logic.
 */

export function sanitizeNoSql<T>(input: T): T {
    if (input === null || input === undefined) {
        return input;
    }

    if (typeof input !== 'object') {
        return input;
    }

    if (Array.isArray(input)) {
        return input.map(item => sanitizeNoSql(item)) as unknown as T;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
        // Block dangerous keys: MongoDB operators ($) or dot notation path traversal (.) or Prototype pollution
        if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') {
            console.warn(`[Security:Sanitizer] Blocked suspicious input key: ${key}`);
            continue;
        }

        sanitized[key] = sanitizeNoSql(value);
    }

    return sanitized as T;
}
