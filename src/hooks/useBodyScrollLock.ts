'use client';

import { useEffect } from 'react';

/**
 * Lock body scroll when `locked` is true.
 * Useful for modals, mobile menus, and overlays.
 */
export function useBodyScrollLock(locked: boolean) {
    useEffect(() => {
        if (locked) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100%';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.height = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        };
    }, [locked]);
}
