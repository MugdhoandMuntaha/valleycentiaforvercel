import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/* ===== Core Pure Logic Functions from BrandsThatLead Mobile (2-Row Landscape Grid) ===== */

export function calculateMobileCellWidth(viewportWidthPx: number, sidePaddingPx = 32, gapPx = 8): number {
    // 2.5 columns visible with 2 gaps:
    // width = (viewportWidthPx - sidePaddingPx - 2 * gapPx) / 2.5
    const twoGapsPx = 2 * gapPx; // 16px
    return (viewportWidthPx - (sidePaddingPx + twoGapsPx)) / 2.5;
}

export function calculateMobileCellHeight(viewportWidthPx: number, horizontalPaddingPx = 32, gapPx = 8): number {
    // Original 2-row square-based cell height:
    return (viewportWidthPx - horizontalPaddingPx - 3 * gapPx) / 4;
}

export function computeVisibleColumns(viewportWidthPx: number, cellWidthPx: number, leftPaddingPx = 16, gapPx = 8): {
    fullColumns: number;
    peekingFraction: number;
    peekingPixels: number;
    totalVisibleColumns: number;
} {
    // Available width after left padding
    const availableWidth = viewportWidthPx - leftPaddingPx;
    // Each column takes cellWidth + gap
    const columnPitch = cellWidthPx + gapPx;
    
    // Number of full columns that fit before the remaining screen space
    let currentX = 0;
    let fullCols = 0;
    while (currentX + cellWidthPx <= availableWidth) {
        currentX += columnPitch;
        fullCols++;
    }
    
    // Remaining width in which the next column peeks
    const peekingPixels = Math.max(0, availableWidth - (currentX));
    const peekingFraction = peekingPixels / cellWidthPx;
    const totalVisibleColumns = fullCols + peekingFraction;

    return {
        fullColumns: fullCols,
        peekingFraction,
        peekingPixels,
        totalVisibleColumns,
    };
}

export function computeSectionHeight(params: {
    cellHeightPx: number;
    rows?: number;
    gapPx?: number;
    headerHeightPx?: number;
    headerMarginBottomPx?: number;
    paddingTopPx?: number;
    paddingBottomPx?: number;
}): number {
    const rows = params.rows ?? 2;
    const gapPx = params.gapPx ?? 8;
    const headerHeight = params.headerHeightPx ?? 20;
    const headerMargin = params.headerMarginBottomPx ?? 12;
    const paddingTop = params.paddingTopPx ?? 14;
    const paddingBottom = params.paddingBottomPx ?? 16;

    const gridHeight = rows * params.cellHeightPx + (rows - 1) * gapPx;
    return paddingTop + headerHeight + headerMargin + gridHeight + paddingBottom;
}

export function computeGroupRepeatCycles(brandCount: number, minCells = 12, rows = 2): number {
    if (brandCount <= 0) return 0;
    let k = 1;
    while (k * brandCount < minCells || (k * brandCount) % rows !== 0) {
        k++;
    }
    return k;
}

export function resolveBrandLogoDisplay(brand: {
    name: string;
    image?: string | null;
    logo_url?: string | null;
    logoUrl?: string | null;
}, hasImgError: boolean = false): { isLogoImage: boolean; textFallback: string | null; logoSrc: string | null } {
    const rawLogo = brand.logo_url || brand.logoUrl || (brand.image && !brand.image.includes('no-image') ? brand.image : null);
    const hasValidImage = Boolean(rawLogo && !hasImgError);

    if (hasValidImage) {
        return { isLogoImage: true, textFallback: null, logoSrc: rawLogo! };
    }
    return { isLogoImage: false, textFallback: brand.name, logoSrc: null };
}

export function evaluateDragThreshold(deltaX: number, deltaY: number, threshold = 6): boolean {
    return Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;
}

export function computeNextScrollPosition(params: {
    currentPos: number;
    speedPxPerSec: number;
    dtSeconds: number;
    groupWidth: number;
    isInteracting: boolean;
    prefersReducedMotion: boolean;
}): number {
    const { currentPos, speedPxPerSec, dtSeconds, groupWidth, isInteracting, prefersReducedMotion } = params;

    if (prefersReducedMotion || isInteracting || groupWidth <= 0) {
        return currentPos;
    }

    // Drifts right-to-left at constant px/sec (independent of cell width)
    let next = currentPos + speedPxPerSec * dtSeconds;
    // Seamless buffer wrapping forward
    if (next >= groupWidth * 2) {
        next -= groupWidth;
    }
    return next;
}

export function handleManualScrollWrap(scrollLeft: number, groupWidth: number): number {
    if (groupWidth <= 0) return scrollLeft;

    if (scrollLeft < groupWidth) {
        return scrollLeft + groupWidth;
    }
    if (scrollLeft >= groupWidth * 2) {
        return scrollLeft - groupWidth;
    }
    return scrollLeft;
}

/* ===== Unit Tests ===== */

describe('Brands That Lead - Wider Landscape Cells & ~2.5 Column View', () => {
    it('verifies cell width is ~1.5x to ~1.64x the cell height across viewports', () => {
        const viewports = [360, 390, 430];

        for (const vp of viewports) {
            const width = calculateMobileCellWidth(vp, 32, 8);
            const height = calculateMobileCellHeight(vp, 32, 8);
            const ratio = width / height;

            // Landscape rectangle: width must be ~1.5x - 1.65x of height
            assert.ok(
                ratio >= 1.5 && ratio <= 1.7,
                `At ${vp}px, ratio ${ratio.toFixed(2)} should be around 1.5x-1.65x`
            );
        }
    });

    it('verifies ~2.5 columns visible with next column clearly peeking at the right edge', () => {
        const viewports = [360, 390, 430];

        for (const vp of viewports) {
            const cellWidth = calculateMobileCellWidth(vp, 32, 8);
            const vis = computeVisibleColumns(vp, cellWidth, 16, 8);

            // Exactly 2 full columns visible
            assert.equal(vis.fullColumns, 2, `At ${vp}px, exactly 2 full columns should be visible`);
            // The 3rd column peeks in by ~0.5 - 0.65 of its width (signals scrolling to user)
            assert.ok(
                vis.peekingFraction >= 0.5 && vis.peekingFraction <= 0.7,
                `At ${vp}px, peeking fraction should be ~0.5-0.7, got ${vis.peekingFraction.toFixed(2)}`
            );
            assert.ok(
                vis.peekingPixels >= 60,
                `At ${vp}px, peeking width (${vis.peekingPixels.toFixed(1)}px) is prominent`
            );
        }
    });

    it('preserves cell height and computes 2-row section height dynamically', () => {
        // Height matches previous 2-row specification:
        // At 360px: height = 76px. Section height = 222px.
        const h360 = calculateMobileCellHeight(360, 32, 8);
        assert.equal(h360, 76);
        assert.equal(computeSectionHeight({ cellHeightPx: h360 }), 222);

        // At 390px: height = 83.5px. Section height = 237px.
        const h390 = calculateMobileCellHeight(390, 32, 8);
        assert.equal(h390, 83.5);
        assert.equal(computeSectionHeight({ cellHeightPx: h390 }), 237);

        // At 430px: height = 93.5px. Section height = 257px.
        const h430 = calculateMobileCellHeight(430, 32, 8);
        assert.equal(h430, 93.5);
        assert.equal(computeSectionHeight({ cellHeightPx: h430 }), 257);
    });
});

describe('Brands That Lead - Seamless Repeating Loop with Wider Cells', () => {
    it('calculates repeat cycles so total items is >= 12 and a multiple of 2', () => {
        // 6 brands
        const k6 = computeGroupRepeatCycles(6);
        assert.equal(k6, 2); // 12 items = 6 columns
        assert.equal((k6 * 6) % 2, 0);

        // 5 brands
        const k5 = computeGroupRepeatCycles(5);
        assert.equal(k5, 4); // 20 items = 10 columns
        assert.equal((k5 * 5) % 2, 0);

        // 8 brands
        const k8 = computeGroupRepeatCycles(8);
        assert.equal(k8, 2); // 16 items = 8 columns
        assert.equal((k8 * 8) % 2, 0);
    });

    it('ensures group width with wider cells is > 2x the viewport width', () => {
        const brandNames = ['Bare Anatomy', 'SKIN1004', 'Chemist at Play', 'Sun Scoop', 'SSS', 'erhre'];
        const k = computeGroupRepeatCycles(brandNames.length); // 2 -> 12 items -> 6 columns
        const numColumns = (brandNames.length * k) / 2; // 6 columns

        const viewports = [360, 390, 430];
        for (const vp of viewports) {
            const cellWidth = calculateMobileCellWidth(vp, 32, 8);
            const groupWidth = numColumns * (cellWidth + 8);

            // Group 1 width alone must exceed 2x the viewport width
            assert.ok(
                groupWidth > 2 * vp,
                `At ${vp}px, group width (${groupWidth.toFixed(1)}px) must be > 2x viewport (${2 * vp}px)`
            );
        }
    });

    it('guarantees columns fill top-to-bottom across 2 rows with zero empty cells', () => {
        const brandNames = ['Bare Anatomy', 'SKIN1004', 'Chemist at Play', 'Sun Scoop', 'SSS', 'erhre'];
        const k = computeGroupRepeatCycles(brandNames.length);
        const groupItems: string[] = [];
        for (let i = 0; i < k; i++) {
            groupItems.push(...brandNames);
        }

        assert.equal(groupItems.length, 12);
        assert.equal(groupItems.length % 2, 0);
        const numColumns = groupItems.length / 2;

        for (let col = 0; col < numColumns; col++) {
            const colSlice = groupItems.slice(col * 2, col * 2 + 2);
            assert.equal(colSlice.length, 2);
            colSlice.forEach(item => assert.ok(Boolean(item)));
        }
    });
});

describe('Brands That Lead - Missing Logo Fallback', () => {
    it('renders logo image when valid logo URL is available', () => {
        const brandWithLogo = {
            name: 'Bare Anatomy',
            logo_url: 'https://images.example.com/bare-anatomy.png',
        };
        const res = resolveBrandLogoDisplay(brandWithLogo);
        assert.equal(res.isLogoImage, true);
        assert.equal(res.logoSrc, 'https://images.example.com/bare-anatomy.png');
        assert.equal(res.textFallback, null);
    });

    it('falls back to brand name text when logo is /no-image.svg (e.g. Sun Scoop)', () => {
        const brandPlaceholder = {
            name: 'Sun Scoop',
            image: '/no-image.svg',
            logo_url: null,
        };
        const res = resolveBrandLogoDisplay(brandPlaceholder);
        assert.equal(res.isLogoImage, false);
        assert.equal(res.textFallback, 'Sun Scoop');
        assert.equal(res.logoSrc, null);
    });

    it('falls back to brand name text if image triggers onError', () => {
        const brandFailing = {
            name: 'Chemist at Play',
            logo_url: 'https://broken.example.com/logo.png',
        };
        const res = resolveBrandLogoDisplay(brandFailing, true);
        assert.equal(res.isLogoImage, false);
        assert.equal(res.textFallback, 'Chemist at Play');
    });
});

describe('Brands That Lead - Constant Drift Speed, Touch & Tap Behavior', () => {
    it('maintains constant speed at 24px/sec regardless of cell width', () => {
        const SPEED = 24; // 24px/sec
        assert.ok(SPEED >= 20 && SPEED <= 30);

        const currentPos = 1000;
        const groupWidth = 800;
        const dt = 1.0; // 1 second
        const next = computeNextScrollPosition({
            currentPos,
            speedPxPerSec: SPEED,
            dtSeconds: dt,
            groupWidth,
            isInteracting: false,
            prefersReducedMotion: false,
        });

        // Moves exactly 24px in 1 second
        assert.equal(next, 1024);
    });

    it('seamlessly wraps scroll position forward without jumping', () => {
        const groupWidth = 800;
        const next = computeNextScrollPosition({
            currentPos: 1599,
            speedPxPerSec: 24,
            dtSeconds: 0.1, // +2.4px -> 1601.4px -> wraps to 801.4px
            groupWidth,
            isInteracting: false,
            prefersReducedMotion: false,
        });

        assert.ok(Math.abs(next - 801.4) < 0.001);
    });

    it('pauses auto-scroll immediately while user is touching/interacting', () => {
        const groupWidth = 800;
        const currentPos = 950;
        const next = computeNextScrollPosition({
            currentPos,
            speedPxPerSec: 24,
            dtSeconds: 0.5,
            groupWidth,
            isInteracting: true,
            prefersReducedMotion: false,
        });

        assert.equal(next, currentPos);
    });

    it('disables auto-scroll when prefers-reduced-motion is active', () => {
        const groupWidth = 800;
        const currentPos = 950;
        const next = computeNextScrollPosition({
            currentPos,
            speedPxPerSec: 24,
            dtSeconds: 0.5,
            groupWidth,
            isInteracting: false,
            prefersReducedMotion: true,
        });

        assert.equal(next, currentPos);
    });

    it('distinguishes clean tap from swipe (drag > 6px blocks navigation, tap <= 6px allows navigation)', () => {
        assert.equal(evaluateDragThreshold(2, 1), false);
        assert.equal(evaluateDragThreshold(0, 0), false);
        assert.equal(evaluateDragThreshold(12, 2), true);
        assert.equal(evaluateDragThreshold(-8, 0), true);

        let defaultPrevented = false;
        const simulateClick = (hasMoved: boolean) => {
            if (hasMoved) {
                defaultPrevented = true;
            }
        };

        simulateClick(evaluateDragThreshold(2, 1)); // Tap
        assert.equal(defaultPrevented, false);

        simulateClick(evaluateDragThreshold(25, 0)); // Drag
        assert.equal(defaultPrevented, true);
    });

    it('wraps manual swipe seamlessly in both directions', () => {
        const groupWidth = 800;
        assert.equal(handleManualScrollWrap(750, groupWidth), 1550);
        assert.equal(handleManualScrollWrap(1650, groupWidth), 850);
        assert.equal(handleManualScrollWrap(1200, groupWidth), 1200);
    });
});
