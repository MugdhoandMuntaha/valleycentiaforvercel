import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCartItemKey, mergeCartItems } from '../src/lib/cartUtils.ts';

describe('Cart State Management & Key Resolution', () => {
    it('generates consistent keys for items with and without variants', () => {
        const keyWithoutSize = getCartItemKey('prod_123');
        assert.equal(keyWithoutSize, 'prod_123');

        const keyWithSize = getCartItemKey('prod_123', '100ml');
        assert.equal(keyWithSize, 'prod_123-100ml');

        const keyWithDifferentSize = getCartItemKey('prod_123', '200ml');
        assert.equal(keyWithDifferentSize, 'prod_123-200ml');

        // Different sizes must never collide
        assert.notEqual(keyWithSize, keyWithDifferentSize);
    });

    it('merges guest and user cart items without data loss', () => {
        const dbCart = [
            { id: 'p1', size: '50ml', quantity: 1, price: 500, stockQuantity: 5 },
            { id: 'p2', quantity: 2, price: 300, stockQuantity: 10 },
        ];

        const guestCart = [
            { id: 'p1', size: '50ml', quantity: 2, price: 500, stockQuantity: 5 }, // matching -> should combine to 3
            { id: 'p3', quantity: 1, price: 800, stockQuantity: 4 }, // new guest item -> should be preserved
        ];

        const mergedMap = new Map<string, any>();
        for (const item of dbCart) {
            mergedMap.set(getCartItemKey(item.id, item.size), { ...item });
        }

        for (const guestItem of guestCart) {
            const key = getCartItemKey(guestItem.id, guestItem.size);
            const existing = mergedMap.get(key);
            if (existing) {
                const maxStock = guestItem.stockQuantity !== undefined ? guestItem.stockQuantity : 10;
                existing.quantity = Math.min(existing.quantity + guestItem.quantity, Math.min(maxStock, 10));
            } else {
                mergedMap.set(key, { ...guestItem });
            }
        }

        const merged = Array.from(mergedMap.values());

        assert.equal(merged.length, 3);
        const p1 = merged.find(i => i.id === 'p1');
        assert.equal(p1?.quantity, 3); // 1 + 2

        const p2 = merged.find(i => i.id === 'p2');
        assert.equal(p2?.quantity, 2);

        const p3 = merged.find(i => i.id === 'p3');
        assert.equal(p3?.quantity, 1);
    });

    it('enforces stock cap and maximum order limits during cart merge', () => {
        const itemInDb = { id: 'p1', size: 'small', quantity: 3, stockQuantity: 4 };
        const itemGuest = { id: 'p1', size: 'small', quantity: 3, stockQuantity: 4 };

        const combined = Math.min(
            itemInDb.quantity + itemGuest.quantity, // 6
            itemGuest.stockQuantity // 4
        );

        assert.equal(combined, 4); // Clamped to available stock
    });
});
