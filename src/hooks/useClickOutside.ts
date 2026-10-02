'use client';

import { useEffect, type RefObject } from 'react';

/**
 * Call `onClose` when clicking outside `ref` or pressing Escape.
 * Only active when `active` is true.
 */
export function useClickOutside(
    ref: RefObject<HTMLElement | null>,
    onClose: () => void,
    active: boolean
) {
    useEffect(() => {
        if (!active) return;

        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [ref, onClose, active]);
}
