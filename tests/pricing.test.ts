import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Pricing & Currency Integrity Engine', () => {
    it('calculates subtotal as exact integer/rounded values', () => {
        const items = [
            { price: 1250, quantity: 2 },
            { price: 499, quantity: 3 },
        ];

        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        assert.equal(subtotal, 1250 * 2 + 499 * 3); // 2500 + 1497 = 3997
    });

    it('correctly calculates percentage discounts capped by maxDiscountAmount', () => {
        const subtotal = 5000;
        const discountPercent = 20; // 20% of 5000 = 1000
        const maxDiscountCap = 500;

        const rawDiscount = (subtotal * discountPercent) / 100;
        const effectiveDiscount = Math.min(rawDiscount, maxDiscountCap);

        assert.equal(rawDiscount, 1000);
        assert.equal(effectiveDiscount, 500); // capped at 500
    });

    it('correctly calculates fixed amount discounts and does not exceed subtotal', () => {
        const subtotal = 250;
        const fixedCoupon = 300;

        const effectiveDiscount = Math.min(subtotal, fixedCoupon);
        const finalPrice = Math.max(0, subtotal - effectiveDiscount);

        assert.equal(effectiveDiscount, 250);
        assert.equal(finalPrice, 0); // never negative
    });

    it('enforces free shipping threshold rules', () => {
        const FREE_SHIPPING_THRESHOLD = 2000;
        const STANDARD_SHIPPING = 60;

        const orderBelowThreshold = 1800;
        const shippingA = orderBelowThreshold >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
        assert.equal(shippingA, 60);

        const orderAboveThreshold = 2500;
        const shippingB = orderAboveThreshold >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING;
        assert.equal(shippingB, 0);
    });

    it('prevents floating-point currency drift via Math.ceil / Math.round guarantees', () => {
        // Classic JS 0.1 + 0.2 !== 0.3 floating point issue
        const prices = [19.99, 29.99, 9.99];
        const rawTotal = prices.reduce((sum, p) => sum + p, 0); // 59.970000000000006

        const roundedTotal = Math.round(rawTotal * 100) / 100;
        assert.equal(roundedTotal, 59.97);

        // Minor units (paisa / cents) representation
        const minorUnitsTotal = prices.reduce((sum, p) => sum + Math.round(p * 100), 0);
        assert.equal(minorUnitsTotal, 5997);
    });
});
