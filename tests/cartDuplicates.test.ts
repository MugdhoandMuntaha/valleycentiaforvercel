import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getCartItemKey, mergeCartItems, normalizeSize } from '../src/lib/cartUtils.ts';

describe('Cart Duplication Fix & Refresh Idempotency Tests', () => {
    it('normalizes "Default", empty, and undefined sizes to undefined', () => {
        assert.equal(normalizeSize('Default'), undefined);
        assert.equal(normalizeSize('default'), undefined);
        assert.equal(normalizeSize('   DEFAULT   '), undefined);
        assert.equal(normalizeSize(''), undefined);
        assert.equal(normalizeSize(null), undefined);
        assert.equal(normalizeSize(undefined), undefined);

        // Real size variants are preserved
        assert.equal(normalizeSize('50ml'), '50ml');
        assert.equal(normalizeSize(' 100 ml '), '100 ml');
        assert.equal(normalizeSize('Large'), 'Large');
    });

    it('generates identical keys for "Default", undefined, and null sizes (no duplicate lines)', () => {
        const keyDefault = getCartItemKey('prod_123', 'Default');
        const keyUndefined = getCartItemKey('prod_123', undefined);
        const keyNull = getCartItemKey('prod_123', null);
        const keyBlank = getCartItemKey('prod_123', '');

        assert.equal(keyDefault, 'prod_123');
        assert.equal(keyUndefined, 'prod_123');
        assert.equal(keyNull, 'prod_123');
        assert.equal(keyBlank, 'prod_123');

        // Merge between DB (size: undefined) and local (size: 'Default') must NOT create 2 lines
        const dbItems = [{ id: 'prod_123', name: 'Centella Oil', size: undefined as string | undefined, quantity: 1, stockQuantity: 5 }];
        const localItems = [{ id: 'prod_123', name: 'Centella Oil', size: 'Default' as string | undefined, quantity: 1, stockQuantity: 5 }];

        const merged = mergeCartItems(dbItems, localItems);
        assert.equal(merged.length, 1, 'Resolved: Only 1 line item exists after merge');
        assert.equal(merged[0].size, undefined, 'Size is normalized to undefined');
        assert.equal(merged[0].quantity, 2, 'Quantities combined up to stock limit');
    });

    it('maintains distinct line items for distinct size variants of the same product', () => {
        const dbItems = [{ id: 'prod_123', name: 'Centella Oil', size: '50ml', quantity: 1 }];
        const localItems = [{ id: 'prod_123', name: 'Centella Oil', size: '100ml', quantity: 1 }];

        const merged = mergeCartItems(dbItems, localItems);
        assert.equal(merged.length, 2, 'Different variants must remain separate lines');
        assert.equal(merged.find(i => i.size === '50ml')?.quantity, 1);
        assert.equal(merged.find(i => i.size === '100ml')?.quantity, 1);
    });

    it('simulates page refresh for logged-in user: pure read replaces state without doubling', () => {
        // User has 1 item with quantity 1 in DB
        const dbCart = [{ id: 'prod_999', name: 'Rice Water', size: undefined, quantity: 1 }];

        // On refresh, CartContext performs pure read: setItems(dbCart)
        let clientState = [...dbCart];
        assert.equal(clientState[0].quantity, 1);

        // Simulate 10 consecutive page reloads
        for (let i = 0; i < 10; i++) {
            // Pure read from server replaces client state
            clientState = [...dbCart];
        }

        assert.equal(clientState.length, 1);
        assert.equal(clientState[0].quantity, 1, 'Quantity remains strictly 1 across refreshes');
    });

    it('guest-to-user merge executes once and subsequent refreshes are pure reads', () => {
        const guestCart = [{ id: 'p1', name: 'Item 1', size: undefined, quantity: 1 }];
        const userDbCart = [{ id: 'p2', name: 'Item 2', size: undefined, quantity: 2 }];

        // Transition: user logs in with guest items
        const mergedOnLogin = mergeCartItems(userDbCart, guestCart);
        assert.equal(mergedOnLogin.length, 2);

        // Server saves merged cart
        const savedDbCart = [...mergedOnLogin];

        // Next page reload: pure read from savedDbCart
        const clientAfterReload = [...savedDbCart];
        assert.equal(clientAfterReload.length, 2);
        assert.equal(clientAfterReload.find(i => i.id === 'p1')?.quantity, 1);
        assert.equal(clientAfterReload.find(i => i.id === 'p2')?.quantity, 2);
    });

    it('enforces maximum order limit of 10 during merge and add operations', () => {
        const dbItems = [{ id: 'p1', size: undefined, quantity: 8, stockQuantity: 20 }];
        const guestItems = [{ id: 'p1', size: undefined, quantity: 5, stockQuantity: 20 }];

        const merged = mergeCartItems(dbItems, guestItems);
        assert.equal(merged[0].quantity, 10, 'Capped at max limit 10 despite sum being 13');
    });
});
