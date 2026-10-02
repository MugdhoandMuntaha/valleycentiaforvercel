'use client';

import { useEffect, useRef } from 'react';

/**
 * Lock body scroll when `locked` is true without altering scroll position.
 * Preserves window.scrollY so opening modals or mobile drawers never resets the scroll offset.
 */
export function useBodyScrollLock(locked: boolean) {
    const scrollPosRef = useRef(0);

    useEffect(() => {
        if (!locked) return;

        // Capture scroll position at the moment of locking
        const scrollY = window.scrollY;
        scrollPosRef.current = scrollY;

        // Calculate scrollbar width to prevent horizontal layout shift
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        const originalBodyOverflow = document.body.style.overflow;
        const originalBodyPaddingRight = document.body.style.paddingRight;

        // Lock scroll on body only without restricting height or touching documentElement
        document.body.style.overflow = 'hidden';
        if (scrollbarWidth > 0) {
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
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
        };
    }, [locked]);
}

