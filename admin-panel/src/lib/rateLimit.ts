import { NextRequest } from 'next/server';

interface RateLimitRecord {
    timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

let cleanupInterval: NodeJS.Timeout | null = null;

function ensureCleanup() {
    if (!cleanupInterval) {
        cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [key, record] of rateLimitStore.entries()) {
                record.timestamps = record.timestamps.filter(ts => now - ts < 600000);
                if (record.timestamps.length === 0) {
                    rateLimitStore.delete(key);
                }
            }
        }, 60000);
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

export function checkRateLimit(
    identifier: string,
    maxRequests: number = 60,
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

    record.timestamps = record.timestamps.filter(ts => ts > windowStart);

    if (record.timestamps.length >= maxRequests) {
        const oldestTimestamp = record.timestamps[0];
        const reset = oldestTimestamp + windowMs;
        return {
            success: false,
            limit: maxRequests,
            remaining: 0,
            reset,
        };
    }

    record.timestamps.push(now);

    return {
        success: true,
        limit: maxRequests,
        remaining: maxRequests - record.timestamps.length,
        reset: now + windowMs,
    };
}

export function getClientIp(req: NextRequest | Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers.get('x-real-ip');
    if (realIp) {
        return realIp.trim();
    }
    return '127.0.0.1';
}
