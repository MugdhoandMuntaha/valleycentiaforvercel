'use client';

import { useEffect, useRef } from 'react';

/**
 * Lock body scroll when `locked` is true without altering scroll position.
 * Preserves window.scrollY so opening modals or mobile drawers never resets the scroll offset.
 * Fully compatible with iOS Safari (avoids bounce/jump) and desktop browsers.
 */
export function useBodyScrollLock(locked: boolean) {
    const scrollPosRef = useRef(0);

    useEffect(() => {
        if (!locked || typeof window === 'undefined') return;

        // Capture scroll position at the moment of locking
        const scrollY = window.scrollY || window.pageYOffset || 0;
        scrollPosRef.current = scrollY;

        // Calculate scrollbar width to prevent horizontal layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyPaddingRight = document.body.style.paddingRight;
        const originalBodyPosition = document.body.style.position;
        const originalBodyTop = document.body.style.top;
        const originalBodyWidth = document.body.style.width;

        const isIOS = typeof navigator !== 'undefined' && (
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
        );

        if (isIOS) {
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Lock scroll on body only without restricting height or touching documentElement
            document.body.style.overflow = 'hidden';
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
        }

        return () => {
            if (isIOS) {
                document.body.style.position = originalBodyPosition;
                document.body.style.top = originalBodyTop;
                document.body.style.width = originalBodyWidth;
                document.body.style.overflow = originalBodyOverflow;
                window.scrollTo({
                    top: scrollY,
                    left: 0,
                    behavior: 'instant' as ScrollBehavior,
                });
            } else {
                document.body.style.overflow = originalBodyOverflow;
                document.body.style.paddingRight = originalBodyPaddingRight;

                // In case the browser adjusted scroll during layout calculation, restore exact position
                if (window.scrollY !== scrollY) {
                    window.scrollTo({
                        top: scrollY,
                        left: 0,
                        behavior: 'instant' as ScrollBehavior,
                    });
                }
            }
        };
    }, [locked]);
}
