'use client';

import { useEffect, useRef } from 'react';

interface OverlayStackItem {
    id: string;
    onClose: () => void;
    triggerElement: HTMLElement | null;
}

const overlayStack: OverlayStackItem[] = [];
let programmaticBackCount = 0;
let isListenerAttached = false;

function ensurePopstateListener() {
    if (typeof window === 'undefined' || isListenerAttached) return;

    window.addEventListener('popstate', () => {
        if (programmaticBackCount > 0) {
            programmaticBackCount--;
            return;
        }

        if (overlayStack.length > 0) {
            const top = overlayStack.pop();
            if (top) {
                top.onClose();
                if (top.triggerElement && typeof top.triggerElement.focus === 'function') {
                    requestAnimationFrame(() => {
                        try {
                            top.triggerElement?.focus({ preventScroll: true });
                        } catch {}
                    });
                }
            }
        }
    });

    isListenerAttached = true;
}

export interface UseOverlayHistoryOptions {
    overlayId: string;
    isOpen: boolean;
    onClose: () => void;
    enabled?: boolean;
    restoreFocus?: boolean;
}

export function useOverlayHistory({
    overlayId,
    isOpen,
    onClose,
    enabled = true,
    restoreFocus = true,
}: UseOverlayHistoryOptions) {
    const hasPushedRef = useRef(false);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const triggerElementRef = useRef<HTMLElement | null>(null);
    const initialPathnameRef = useRef<string>('');

    useEffect(() => {
        if (typeof window === 'undefined' || !enabled) return;
        ensurePopstateListener();

        if (!initialPathnameRef.current) {
            initialPathnameRef.current = window.location.pathname;
            if (overlayStack.length === 0 && window.history.state?.overlay && !isOpen) {
                try {
                    const cleanState = { ...window.history.state };
                    delete cleanState.overlay;
                    delete cleanState.__overlayDepth;
                    window.history.replaceState(cleanState, '', window.location.href);
                } catch {}
            }
        }

        if (isOpen) {
            if (!hasPushedRef.current) {
                hasPushedRef.current = true;
                if (restoreFocus && typeof document !== 'undefined') {
                    triggerElementRef.current = document.activeElement as HTMLElement | null;
                }

                const state = {
                    ...(window.history.state || {}),
                    overlay: overlayId,
                    __overlayDepth: overlayStack.length + 1,
                };
                window.history.pushState(state, '', window.location.href);

                overlayStack.push({
                    id: overlayId,
                    onClose: () => {
                        hasPushedRef.current = false;
                        onCloseRef.current();
                    },
                    triggerElement: triggerElementRef.current,
                });
            }
        } else {
            if (hasPushedRef.current) {
                hasPushedRef.current = false;
                const idx = overlayStack.map(i => i.id).lastIndexOf(overlayId);
                if (idx !== -1) {
                    const item = overlayStack.splice(idx, 1)[0];
                    programmaticBackCount++;
                    window.history.back();

                    if (restoreFocus && item?.triggerElement && typeof item.triggerElement.focus === 'function') {
                        requestAnimationFrame(() => {
                            try {
                                item.triggerElement?.focus({ preventScroll: true });
                            } catch {}
                        });
                    }
                }
            }
        }
    }, [isOpen, overlayId, enabled, restoreFocus]);

    useEffect(() => {
        return () => {
            if (hasPushedRef.current) {
                hasPushedRef.current = false;
                const idx = overlayStack.map(i => i.id).lastIndexOf(overlayId);
                if (idx !== -1) {
                    const item = overlayStack.splice(idx, 1)[0];
                    const routeChanged = typeof window !== 'undefined' && window.location.pathname !== initialPathnameRef.current;
                    if (!routeChanged) {
                        programmaticBackCount++;
                        try {
                            window.history.back();
                        } catch {}
                    }
                    if (restoreFocus && item?.triggerElement && typeof item.triggerElement.focus === 'function') {
                        requestAnimationFrame(() => {
                            try {
                                item.triggerElement?.focus({ preventScroll: true });
                            } catch {}
                        });
                    }
                }
            }
        };
    }, [overlayId, restoreFocus]);
}
