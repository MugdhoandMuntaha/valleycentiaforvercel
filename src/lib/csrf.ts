import { NextRequest } from 'next/server';

/**
 * Validates request Origin/Referer to prevent Cross-Site Request Forgery (CSRF).
 * Checks incoming requests on state-changing endpoints (POST, DELETE, PATCH, PUT).
 */
export function validateCsrfOrigin(req: NextRequest): boolean {
    const origin = req.headers.get('origin');
    const referer = req.headers.get('referer');
    const host = req.headers.get('host');

    // Reject explicit cross-site fetch metadata
    const secFetchSite = req.headers.get('sec-fetch-site');
    if (secFetchSite === 'cross-site') {
        return false;
    }

    // If neither origin nor referer is provided (e.g. server-to-server or test), allow if not cross-site
    if (!origin && !referer) {
        return true;
    }

    const checkUrl = origin || referer;
    if (checkUrl) {
        try {
            const parsed = new URL(checkUrl);
            const reqHost = (host || '').toLowerCase();

            // Same host match
            if (reqHost && parsed.host.toLowerCase() === reqHost) {
                return true;
            }

            // Configured app base URL match
            if (process.env.NEXT_PUBLIC_BASE_URL) {
                try {
                    const baseHost = new URL(process.env.NEXT_PUBLIC_BASE_URL).host.toLowerCase();
                    if (parsed.host.toLowerCase() === baseHost) {
                        return true;
                    }
                } catch {}
            }

            // Local development hosts
            if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
                return true;
            }
        } catch {
            return false;
        }
    }

    return false;
}
