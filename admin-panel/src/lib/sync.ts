/**
 * Cross-App Storefront Revalidation Sync Helper
 * Notifies the Storefront Next.js App Router cache to invalidate tags immediately.
 * Fail-safe: A failure to reach the storefront logs an error and returns failure status,
 * but NEVER throws or breaks the caller mutation.
 */

export interface NotifyStorefrontResult {
  success: boolean;
  error?: string;
  revalidatedTags?: string[];
  revalidatedPaths?: string[];
}

export async function notifyStorefront(
  tags: string[],
  paths: string[] = []
): Promise<NotifyStorefrontResult> {
  const storefrontUrl = (
    process.env.STOREFRONT_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    const msg = '[Sync] REVALIDATE_SECRET is missing in environment variables. Storefront cache was not notified.';
    console.warn(msg);
    return { success: false, error: msg };
  }

  if (tags.length === 0 && paths.length === 0) {
    return { success: true, revalidatedTags: [], revalidatedPaths: [] };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

    const res = await fetch(`${storefrontUrl}/api/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-revalidate-secret': secret,
      },
      body: JSON.stringify({ tags, paths }),
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      const msg = `[Sync] Storefront revalidation responded with ${res.status}: ${errText}`;
      console.warn(msg);
      return { success: false, error: msg };
    }

    const data = await res.json();
    return {
      success: true,
      revalidatedTags: data.revalidatedTags,
      revalidatedPaths: data.revalidatedPaths,
    };
  } catch (err: unknown) {
    const error = err as { name?: string; message?: string };
    const msg = `[Sync] Could not reach storefront at ${storefrontUrl}: ${error.name === 'AbortError' ? 'Request timed out' : (error.message || String(err))}`;
    console.warn(msg);
    return { success: false, error: msg };
  }
}
