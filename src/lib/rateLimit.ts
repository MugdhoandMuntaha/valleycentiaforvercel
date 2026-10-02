/**
 * Lightweight, zero-dependency in-memory sliding window rate limiter
 * Protects critical API endpoints (checkout, payment initiation, AI search)
 * against automated abuse, brute force, and DDoS attacks.
 */

interface RateLimitRecord {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodic cleanup of stale entries every 60 seconds
let cleanupInterval: NodeJS.Timeout | null = null;

function ensureCleanup() {
    if (!cleanupInterval) {
        cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, record] of rateLimitStore.entries()) {
                // Keep only timestamps from the last 10 minutes
                record.timestamps = record.timestamps.filter(ts => now - ts < 600000);
                if (record.timestamps.length === 0) {
                    rateLimitStore.delete(key);
                }
            }
        }, 60000);
        // Do not block Node event loop from exiting
        if (cleanupInterval.unref) {
            cleanupInterval.unref();
        }
    }
}

export interface RateLimitResult {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
}

/**
 * Check and record a rate limit hit for an identifier
 * @param identifier Client IP or token
 * @param maxRequests Maximum allowed requests within the time window
 * @param windowMs Time window in milliseconds (default: 60,000ms = 1 minute)
 */
export function checkRateLimit(
    identifier: string,
    maxRequests: number = 20,
    windowMs: number = 60000
): RateLimitResult {
    ensureCleanup();

    const now = Date.now();
    const windowStart = now - windowMs;

    let record = rateLimitStore.get(identifier);
    if (!record) {
        record = { timestamps: [] };
        rateLimitStore.set(identifier, record);
    }

    // Filter out timestamps outside the active sliding window
    record.timestamps = record.timestamps.filter(ts => ts > windowStart);

    const reset = record.timestamps.length > 0
        ? record.timestamps[0] + windowMs
        : now + windowMs;

    if (record.timestamps.length >= maxRequests) {
        return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset,
        };
    }

    // Record this request
    record.timestamps.push(now);

    return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - record.timestamps.length,
        reset,
    };
}

/**
 * Helper to extract client IP address from Next.js request headers
 */
export function getClientIp(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    const cfIp = req.headers.get('cf-connecting-ip');
    if (cfIp) {
        return cfIp.trim();
    }
    return '127.0.0.1';
}
