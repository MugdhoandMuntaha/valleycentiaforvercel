import { test, describe } from 'node:test';
import assert from 'node:assert';

describe('Sticky Action Bar Visibility & Intersection Logic (earlier 280px top trigger offset)', () => {
    const STICKY_TRIGGER_OFFSET = 280;

    function calculateStickyVisibility(
        isMobile: boolean,
        entry: { isIntersecting: boolean; boundingClientRect: { top: number; bottom: number } },
        offset = STICKY_TRIGGER_OFFSET
    ): boolean {
        if (!isMobile) return false;
        return !entry.isIntersecting && entry.boundingClientRect.top <= offset;
    }

    test('at the top of the page on mobile when original buttons are below the fold, sticky bar is hidden', () => {
        const isMobile = true;
        const entry = {
            isIntersecting: false,
            boundingClientRect: { top: 720, bottom: 780 },
        };
        const isVisible = calculateStickyVisibility(isMobile, entry);
        assert.strictEqual(isVisible, false);
    });

    test('when original buttons are in the lower/mid viewport (> 280px), sticky bar is hidden', () => {
        const isMobile = true;
        const entry = {
            isIntersecting: true,
            boundingClientRect: { top: 350, bottom: 410 },
        };
        const isVisible = calculateStickyVisibility(isMobile, entry);
        assert.strictEqual(isVisible, false);
    });

    test('when original buttons reach the upper screen area (<= 280px), sticky bar appears noticeably earlier', () => {
        const isMobile = true;
        // Non-intersecting relative to rootMargin (-280px) and top <= 280px
        const entry = {
            isIntersecting: false,
            boundingClientRect: { top: 270, bottom: 330 },
        };
        const isVisible = calculateStickyVisibility(isMobile, entry);
        assert.strictEqual(isVisible, true);
    });

    test('when user scrolls down further past original buttons, sticky bar remains visible', () => {
        const isMobile = true;
        const entry = {
            isIntersecting: false,
            boundingClientRect: { top: -120, bottom: -60 },
        };
        const isVisible = calculateStickyVisibility(isMobile, entry);
        assert.strictEqual(isVisible, true);
    });

    test('when user scrolls back up and original buttons re-enter the viewport (> 280px), sticky bar hides', () => {
        const isMobile = true;
        const entry = {
            isIntersecting: true,
            boundingClientRect: { top: 320, bottom: 380 },
        };
        const isVisible = calculateStickyVisibility(isMobile, entry);
        assert.strictEqual(isVisible, false);
    });

    test('on tablet or desktop (>= 768px), sticky bar never renders or appears regardless of scroll position', () => {
        const isMobile = false; // >= 768px
        const entryScrolledPast = {
            isIntersecting: false,
            boundingClientRect: { top: -400, bottom: -340 },
        };
        assert.strictEqual(calculateStickyVisibility(isMobile, entryScrolledPast), false);

        const entryInView = {
            isIntersecting: true,
            boundingClientRect: { top: 300, bottom: 360 },
        };
        assert.strictEqual(calculateStickyVisibility(isMobile, entryInView), false);
    });
});
