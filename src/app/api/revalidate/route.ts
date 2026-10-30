import { NextRequest, NextResponse } from 'next/server.js';
import { revalidateTag, revalidatePath } from 'next/cache.js';
import crypto from 'crypto';
import { checkRateLimit } from '../../../lib/rateLimit.ts';

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeCompare(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf-8');
  const bufB = Buffer.from(b, 'utf-8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  try {
    // 1. Rate limiting by IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1';
    const rateLimit = checkRateLimit(`revalidate:${ip}`, 120, 60000); // 120 requests/minute
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    // 2. Secret authentication
    const configuredSecret = process.env.REVALIDATE_SECRET;
    if (!configuredSecret) {
      console.error('[Revalidate] REVALIDATE_SECRET is not configured on storefront');
      return NextResponse.json(
        { error: 'Server misconfiguration: REVALIDATE_SECRET not set' },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get('authorization') || '';
    const secretHeader = req.headers.get('x-revalidate-secret') || '';
    const bearerSecret = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const providedSecret = secretHeader.trim() || bearerSecret;

    if (!providedSecret || !timingSafeCompare(providedSecret, configuredSecret)) {
      return NextResponse.json({ error: 'Unauthorized: Invalid revalidation secret' }, { status: 401 });
    }

    // 3. Body validation
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Request body must be an object' }, { status: 400 });
    }

    const tags: string[] = Array.isArray(body.tags) ? body.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0) : [];
    const rawPaths = Array.isArray(body.paths) ? body.paths : (typeof body.path === 'string' ? [body.path] : []);
    const paths: string[] = rawPaths.filter((p: unknown): p is string => typeof p === 'string' && p.trim().length > 0);

    if (tags.length === 0 && paths.length === 0) {
      return NextResponse.json(
        { error: 'Either "tags" (array of strings) or "paths" (array of strings) must be provided' },
        { status: 400 }
      );
    }

    // 4. Invalidation execution
    const revalidatedTags: string[] = [];
    for (const tag of tags) {
      const cleanTag = tag.trim();
      try {
        (revalidateTag as any)(cleanTag, 'max');
      } catch (err: any) {
        if (!err?.message?.includes('static generation store missing')) {
          throw err;
        }
      }
      revalidatedTags.push(cleanTag);
    }

    const revalidatedPaths: string[] = [];
    for (const p of paths) {
      const cleanPath = p.trim();
      try {
        revalidatePath(cleanPath);
      } catch (err: any) {
        if (!err?.message?.includes('static generation store missing')) {
          throw err;
        }
      }
      revalidatedPaths.push(cleanPath);
    }

    return NextResponse.json({
      success: true,
      revalidatedTags,
      revalidatedPaths,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Revalidate] Unexpected error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
