import { unstable_cache } from 'next/cache';

/**
 * Universal safe cache wrapper for Next.js App Router.
 * Uses unstable_cache with specific cache tags and revalidation TTL when running
 * in the Next.js server runtime, but gracefully falls back to direct execution
 * if incrementalCache is not initialized (e.g. during standalone node tests and CLI migrations).
 */
export function safeCache<T extends (...args: readonly unknown[]) => Promise<unknown>>(
  fetcher: T,
  keyParts?: string[],
  options?: { tags?: string[]; revalidate?: number | false }
): T {
  let cachedFetcher: T;
  try {
    cachedFetcher = unstable_cache(fetcher, keyParts, options);
  } catch {
    return fetcher;
  }

  return (async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> => {
    try {
      return (await cachedFetcher(...args)) as Awaited<ReturnType<T>>;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('incrementalCache missing')) {
        return (await fetcher(...args)) as Awaited<ReturnType<T>>;
      }
      throw err;
    }
  }) as T;
}
