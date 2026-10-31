import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for Active-Only & sortOrder Filtering Logic across Synchronized Entities
 */

describe('Entity Query Active-Only & sortOrder Filtering Semantics', () => {
    it('filters out inactive brands and sorts by sortOrder ascending', () => {
        const rawBrands = [
            { id: '1', name: 'Brand B', isActive: true, sortOrder: 2 },
            { id: '2', name: 'Brand Hidden', isActive: false, sortOrder: 0 },
            { id: '3', name: 'Brand A', isActive: true, sortOrder: 1 },
            { id: '4', name: 'Brand C', isActive: true, sortOrder: 3 },
        ];

        const activeSorted = rawBrands
            .filter(b => b.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        assert.equal(activeSorted.length, 3);
        assert.equal(activeSorted[0].name, 'Brand A');
        assert.equal(activeSorted[1].name, 'Brand B');
        assert.equal(activeSorted[2].name, 'Brand C');
        assert.ok(!activeSorted.some(b => b.name === 'Brand Hidden'));
    });

    it('filters out inactive and expired hero slides and respects sortOrder', () => {
        const now = new Date('2026-10-30T12:00:00Z');
        const rawSlides = [
            { id: '1', title: 'Slide 2', isActive: true, sortOrder: 2, expiresAt: null },
            { id: '2', title: 'Inactive Slide', isActive: false, sortOrder: 1, expiresAt: null },
            { id: '3', title: 'Expired Slide', isActive: true, sortOrder: 1, expiresAt: new Date('2026-10-29T12:00:00Z') },
            { id: '4', title: 'Slide 1', isActive: true, sortOrder: 1, expiresAt: new Date('2026-11-01T12:00:00Z') },
        ];

        const activeSlides = rawSlides
            .filter(s => s.isActive && (!s.expiresAt || s.expiresAt > now))
            .sort((a, b) => a.sortOrder - b.sortOrder);

        assert.equal(activeSlides.length, 2);
        assert.equal(activeSlides[0].title, 'Slide 1');
        assert.equal(activeSlides[1].title, 'Slide 2');
    });

    it('filters out inactive homepage sections and maintains sortOrder', () => {
        const rawSections = [
            { id: 's2', title: 'Section Two', isActive: true, sortOrder: 2 },
            { id: 's1', title: 'Section One', isActive: true, sortOrder: 1 },
            { id: 's3', title: 'Draft Section', isActive: false, sortOrder: 0 },
        ];

        const activeSections = rawSections
            .filter(s => s.isActive)
            .sort((a, b) => a.sortOrder - b.sortOrder);

        assert.equal(activeSections.length, 2);
        assert.equal(activeSections[0].title, 'Section One');
        assert.equal(activeSections[1].title, 'Section Two');
        assert.ok(!activeSections.some(s => s.title === 'Draft Section'));
    });

    it('filters out soft-deleted products and preserves active-only stock', () => {
        const rawProducts = [
            { id: 'p1', name: 'Live Cream', isActive: true, isDeleted: false, inStock: true, stockQuantity: 15 },
            { id: 'p2', name: 'Deleted Serum', isActive: true, isDeleted: true, inStock: true, stockQuantity: 20 },
            { id: 'p3', name: 'Inactive Lotion', isActive: false, isDeleted: false, inStock: true, stockQuantity: 5 },
        ];

        const visibleProducts = rawProducts.filter(p => p.isActive && !p.isDeleted);
        assert.equal(visibleProducts.length, 1);
        assert.equal(visibleProducts[0].name, 'Live Cream');
    });

    it('filters out inactive or expired coupons from active listing', () => {
        const now = new Date('2026-10-30T12:00:00Z');
        const rawCoupons = [
            { code: 'VALID10', isActive: true, expiresAt: new Date('2026-11-30T12:00:00Z') },
            { code: 'INACTIVE20', isActive: false, expiresAt: null },
            { code: 'EXPIRED30', isActive: true, expiresAt: new Date('2026-10-01T12:00:00Z') },
            { code: 'PERMANENT', isActive: true, expiresAt: null },
        ];

        const activeCoupons = rawCoupons.filter(
            c => c.isActive && (!c.expiresAt || c.expiresAt > now)
        );

        assert.equal(activeCoupons.length, 2);
        assert.ok(activeCoupons.some(c => c.code === 'VALID10'));
        assert.ok(activeCoupons.some(c => c.code === 'PERMANENT'));
    });
});

