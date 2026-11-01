'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

export interface SavedScrollState {
    x: number;
    y: number;
    scrollHeight: number;
    containers?: Record<string, { top: number; left: number }>;
    timestamp: number;
}

const STORAGE_PREFIX = 'vc_scroll_';
const PATH_STORAGE_PREFIX = 'vc_scroll_path_';

/**
 * Returns a unique key for the current browser history state entry.
 * Attaches a stable `__vc_key` so history entries with the same URL
 * (e.g. revisiting a page multiple times in history) each keep their own distinct scroll state.
 */
export function getHistoryKey(): string {
    if (typeof window === 'undefined') return 'root';
    try {
        const state = window.history.state;
        if (state && typeof state === 'object' && state.__vc_key) {
            return state.__vc_key;
        }
        const newKey = `vc_h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const updatedState = state && typeof state === 'object' ? { ...state, __vc_key: newKey } : { __vc_key: newKey };
        window.history.replaceState(updatedState, '', window.location.href);
        return newKey;
    } catch {
        return 'fallback_root';
    }
}

/**
 * Saves the current scroll position and any registered inner scroll containers to sessionStorage.
 */
export function saveScrollPosition(): void {
    if (typeof window === 'undefined') return;

    try {
        const key = getHistoryKey();
        const containers: Record<string, { top: number; left: number }> = {};

        const scrollElements = document.querySelectorAll<HTMLElement>('[data-preserve-scroll], .reviews-scroll-area');
        scrollElements.forEach((el) => {
            const preserveId = el.getAttribute('data-preserve-scroll') || (el.classList.contains('reviews-scroll-area') ? 'reviews-scroll-area' : '');
            if (preserveId && (el.scrollTop > 0 || el.scrollLeft > 0)) {
                containers[preserveId] = { top: el.scrollTop, left: el.scrollLeft };
            }
        });

        const state: SavedScrollState = {
            x: window.scrollX,
            y: window.scrollY,
            scrollHeight: document.documentElement.scrollHeight,
            containers,
            timestamp: Date.now(),
        };

        sessionStorage.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(state));
        sessionStorage.setItem(`${PATH_STORAGE_PREFIX}${window.location.pathname}${window.location.search}`, JSON.stringify(state));
    } catch {
        // Ignore sessionStorage write errors (e.g. quota or security sandbox)
    }
}

/**
 * Retrieves the saved scroll position for a history key with pathname fallback.
 */
export function getSavedScrollPosition(historyKey?: string): SavedScrollState | null {
    if (typeof window === 'undefined') return null;

    try {
        const key = historyKey || getHistoryKey();
        const data = sessionStorage.getItem(`${STORAGE_PREFIX}${key}`);
        if (data) {
            return JSON.parse(data) as SavedScrollState;
        }

        const pathData = sessionStorage.getItem(`${PATH_STORAGE_PREFIX}${window.location.pathname}${window.location.search}`);
        if (pathData) {
            return JSON.parse(pathData) as SavedScrollState;
        }
    } catch {
        // Ignore parse errors
    }
    return null;
}

/**
 * Restores inner scroll containers matching saved scroll offsets.
 */
export function restoreInnerContainers(containers?: Record<string, { top: number; left: number }>): void {
    if (!containers || typeof document === 'undefined') return;

    Object.entries(containers).forEach(([key, { top, left }]) => {
        const el = document.querySelector<HTMLElement>(`[data-preserve-scroll="${key}"], .${key}`);
        if (el) {
            if (typeof top === 'number' && top > 0) el.scrollTop = top;
            if (typeof left === 'number' && left > 0) el.scrollLeft = left;
        }
    });
}

/**
 * Sitewide hook to govern all scroll behavior:
 * 1. Forces history.scrollRestoration = 'manual' to prevent uncoordinated browser jumps.
 * 2. On browser back/forward navigation (popstate / bfcache), restores the exact saved position
 *    instantly without smooth animation or flashing the top.
 * 3. Handles async content loading via ResizeObserver retry, never fighting manual user scrolling.
 * 4. On forward page navigation, starts at the top (0, 0) instantly with no animated glide.
 * 5. On hash navigation, scrolls instantly to the targeted anchor with sticky header offset.
 * 6. Preserves scroll positions of inner scroll containers (e.g. reviews area).
 */
export function useScrollRestoration() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const prevPathnameRef = useRef<string>(pathname);
    const prevSearchRef = useRef<string>(searchParams?.toString() || '');
    const isPopStateRef = useRef<boolean>(false);
    const isRestoringRef = useRef<boolean>(false);
    const cancelRestorationRef = useRef<(() => void) | null>(null);

    // Initial setup: ensure manual scroll restoration and listen to navigation signals
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // Disarm native automatic scroll jumps
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }

        // Tag initial history state
        getHistoryKey();

        // Throttled scroll listener to keep sessionStorage current
        let scrollRaf: number | null = null;
        const handleScroll = () => {
            if (isRestoringRef.current) return;
            if (scrollRaf === null) {
                scrollRaf = requestAnimationFrame(() => {
                    scrollRaf = null;
                    saveScrollPosition();
                });
            }
        };

        const handlePopState = () => {
            isPopStateRef.current = true;
        };

        const handlePageShow = (e: PageTransitionEvent) => {
            if (e.persisted) {
                // Restored from bfcache on iOS Safari / Chrome
                isPopStateRef.current = true;
                const saved = getSavedScrollPosition();
                if (saved) {
                    window.scrollTo({
                        top: saved.y,
                        left: saved.x,
                        behavior: 'instant' as ScrollBehavior,
                    });
                    restoreInnerContainers(saved.containers);
                }
            }
        };

        const handlePageHide = () => {
            saveScrollPosition();
        };

        // User gestures that cancel ongoing async restoration
        const cancelUserRestoration = () => {
            if (cancelRestorationRef.current) {
                cancelRestorationRef.current();
                cancelRestorationRef.current = null;
            }
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        window.addEventListener('popstate', handlePopState);
        window.addEventListener('pageshow', handlePageShow);
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('beforeunload', handlePageHide);
        window.addEventListener('wheel', cancelUserRestoration, { passive: true });
        window.addEventListener('touchstart', cancelUserRestoration, { passive: true });
        window.addEventListener('touchmove', cancelUserRestoration, { passive: true });
        window.addEventListener('pointerdown', cancelUserRestoration, { passive: true });

        return () => {
            if (scrollRaf !== null) cancelAnimationFrame(scrollRaf);
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('popstate', handlePopState);
            window.removeEventListener('pageshow', handlePageShow);
            window.removeEventListener('pagehide', handlePageHide);
            window.removeEventListener('beforeunload', handlePageHide);
            window.removeEventListener('wheel', cancelUserRestoration);
            window.removeEventListener('touchstart', cancelUserRestoration);
            window.removeEventListener('touchmove', cancelUserRestoration);
            window.removeEventListener('pointerdown', cancelUserRestoration);
        };
    }, []);

    // Main navigation and route change effect
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const currentPath = pathname;
        const currentSearch = searchParams?.toString() || '';
        const isPathChange = currentPath !== prevPathnameRef.current;
        const isSearchChange = currentSearch !== prevSearchRef.current;
        const isPopState = isPopStateRef.current;

        // Reset flags for subsequent navigation
        isPopStateRef.current = false;
        prevPathnameRef.current = currentPath;
        prevSearchRef.current = currentSearch;

        // Cancel any lingering restoration from previous route
        if (cancelRestorationRef.current) {
            cancelRestorationRef.current();
            cancelRestorationRef.current = null;
        }

        // CASE 1: Browser Back/Forward navigation
        if (isPopState) {
            const savedState = getSavedScrollPosition();
            if (savedState) {
                const targetY = savedState.y;
                const targetX = savedState.x;

                // If saved position is top, restore instantly
                if (targetY === 0) {
                    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
                    restoreInnerContainers(savedState.containers);
                    return;
                }

                isRestoringRef.current = true;

                // Function to apply instant restore
                const applyRestore = () => {
                    window.scrollTo({
                        top: targetY,
                        left: targetX,
                        behavior: 'instant' as ScrollBehavior,
                    });
                    restoreInnerContainers(savedState.containers);
                };

                // Check if page is already tall enough
                const currentHeight = document.documentElement.scrollHeight;
                if (currentHeight >= targetY + window.innerHeight - 50) {
                    applyRestore();
                    isRestoringRef.current = false;
                    return;
                }

                // If page is not tall enough yet (async content loading), wait and retry
                let stopped = false;
                let timeoutId: NodeJS.Timeout | null = null;
                let resizeObserver: ResizeObserver | null = null;

                const cleanup = () => {
                    stopped = true;
                    isRestoringRef.current = false;
                    if (timeoutId) clearTimeout(timeoutId);
                    if (resizeObserver) resizeObserver.disconnect();
                };

                cancelRestorationRef.current = cleanup;

                // Observer to fire immediately when content expands the page height
                if (typeof ResizeObserver !== 'undefined' && document.body) {
                    resizeObserver = new ResizeObserver(() => {
                        if (stopped) return;
                        if (document.documentElement.scrollHeight >= targetY + 20) {
                            applyRestore();
                            cleanup();
                        }
                    });
                    resizeObserver.observe(document.body);
                }

                // Safety timeout: restore whatever is available after at most 1200ms
                timeoutId = setTimeout(() => {
                    if (!stopped) {
                        applyRestore();
                        cleanup();
                    }
                }, 1200);

                return;
            }
        }

        // CASE 2: Forward navigation with #hash anchor (e.g. #reviews)
        const hash = window.location.hash;
        if (hash) {
            const targetId = hash.replace(/^#/, '');
            const targetEl = document.getElementById(targetId);
            if (targetEl) {
                targetEl.scrollIntoView({
                    behavior: 'instant' as ScrollBehavior,
                    block: 'start',
                });
                return;
            } else {
                // Element may render asynchronously: retry briefly
                let attempts = 0;
                const hashTimer = setInterval(() => {
                    attempts++;
                    const el = document.getElementById(targetId);
                    if (el) {
                        clearInterval(hashTimer);
                        el.scrollIntoView({
                            behavior: 'instant' as ScrollBehavior,
                            block: 'start',
                        });
                    } else if (attempts >= 20) {
                        clearInterval(hashTimer);
                    }
                }, 50);
                return;
            }
        }

        // CASE 3: Forward navigation to a new path -> instant scroll to top
        if (isPathChange) {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'instant' as ScrollBehavior,
            });
            return;
        }

        // CASE 4: Same page, query params only (e.g. filters, tab switches)
        if (isSearchChange) {
            const params = new URLSearchParams(currentSearch);
            // If explicit pagination parameter changed, scroll to the top of the product listing
            if (params.has('page')) {
                const listEl = document.querySelector<HTMLElement>('[data-product-grid], #products-grid, .product-grid');
                if (listEl) {
                    listEl.scrollIntoView({
                        behavior: 'instant' as ScrollBehavior,
                        block: 'start',
                    });
                    return;
                }
            }
            // Other query param updates (filters, sort) stay exactly where they are: no scroll!
        }
    }, [pathname, searchParams]);
}

