import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VALID_ORDER_TRANSITIONS } from '../src/lib/constants/orderTransitions.ts';

describe('Order State Machine', () => {
    it('allows valid progressive lifecycle transitions', () => {
        // Pending to Confirmed
        assert.ok(VALID_ORDER_TRANSITIONS['pending']?.includes('confirmed'));

        // Confirmed to Processing
        assert.ok(VALID_ORDER_TRANSITIONS['confirmed']?.includes('processing'));

        // Processing to Shipped
        assert.ok(VALID_ORDER_TRANSITIONS['processing']?.includes('shipped'));

        // Shipped to In Transit or Delivered
        assert.ok(VALID_ORDER_TRANSITIONS['shipped']?.includes('in_transit'));
        assert.ok(VALID_ORDER_TRANSITIONS['shipped']?.includes('delivered'));

        // In Transit to Delivered
        assert.ok(VALID_ORDER_TRANSITIONS['in_transit']?.includes('delivered'));
    });

    it('allows timely cancellation from early stages', () => {
        assert.ok(VALID_ORDER_TRANSITIONS['pending']?.includes('cancelled'));
        assert.ok(VALID_ORDER_TRANSITIONS['confirmed']?.includes('cancelled'));
        assert.ok(VALID_ORDER_TRANSITIONS['processing']?.includes('cancelled'));
    });

    it('prohibits illegal or backward transitions', () => {
        // Cannot un-deliver an order back to pending or processing
        assert.equal(VALID_ORDER_TRANSITIONS['delivered']?.includes('pending'), false);
        assert.equal(VALID_ORDER_TRANSITIONS['delivered']?.includes('processing'), false);

        // Cannot revive a cancelled order directly to shipped
        assert.equal(VALID_ORDER_TRANSITIONS['cancelled']?.includes('shipped'), false);
        assert.equal(VALID_ORDER_TRANSITIONS['cancelled']?.includes('confirmed'), false);

        // Cannot ship a refunded order
        assert.equal(VALID_ORDER_TRANSITIONS['refunded']?.includes('shipped'), false);
    });

    it('treats cancelled and refunded as terminal states', () => {
        assert.equal(VALID_ORDER_TRANSITIONS['cancelled']?.length, 0);
        assert.equal(VALID_ORDER_TRANSITIONS['refunded']?.length, 0);
    });
});
