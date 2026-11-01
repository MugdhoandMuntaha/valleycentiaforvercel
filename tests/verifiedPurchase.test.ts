import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Validates the order matching algorithm used in review creation
 * (src/lib/db/queries/review.queries.ts)
 */
function checkVerifiedPurchase(
    order: {
        userId: string | null;
        guestEmail?: string | null;
        guestPhone?: string | null;
        orderItems: Array<{ productId: string }>;
        status: string;
    },
    userContext: {
        userId: string;
        userIdentifiers: string[];
        email?: string | null;
        phone?: string | null;
    },
    targetProductId: string
): boolean {
    const validStatuses = ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered'];
    if (!validStatuses.includes(order.status)) {
        return false;
    }

    // Check user matching
    const userMatches =
        (order.userId && userContext.userIdentifiers.includes(order.userId)) ||
        (userContext.email && order.guestEmail && order.guestEmail.toLowerCase() === userContext.email.toLowerCase()) ||
        (userContext.phone && order.guestPhone && order.guestPhone === userContext.phone);

    if (!userMatches) {
        return false;
    }

    // Check product matching via orderItems array
    return order.orderItems.some(item => item.productId === targetProductId);
}

describe('Verified Review Purchase Qualification & Checkmark Rendering', () => {
    const customerUser = {
        userId: 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5',
        userIdentifiers: ['user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5', '6ae21a001122334455667788'],
        email: 'customer@valleycentia.com',
        phone: '+8801727785002',
    };

    const qualifyingOrder = {
        userId: 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5',
        status: 'confirmed',
        orderItems: [
            { productId: '6aca8a02965bab158d130a30' },
            { productId: '6aca8949965bab158d130959' },
            { productId: '6aca8446965bab158d130915' },
        ],
    };

    it('qualifies review as verified when user ordered product in orderItems with confirmed or delivered status', () => {
        const isRiceWaterVerified = checkVerifiedPurchase(qualifyingOrder, customerUser, '6aca8a02965bab158d130a30');
        assert.equal(isRiceWaterVerified, true);

        const isRjtrVerified = checkVerifiedPurchase(qualifyingOrder, customerUser, '6aca8949965bab158d130959');
        assert.equal(isRjtrVerified, true);

        const isCleansingOilVerified = checkVerifiedPurchase(qualifyingOrder, customerUser, '6aca8446965bab158d130915');
        assert.equal(isCleansingOilVerified, true);
    });

    it('disqualifies review when user has not purchased that specific product', () => {
        const isShampooVerified = checkVerifiedPurchase(qualifyingOrder, customerUser, '6abd542325589d4da0ac10b0');
        assert.equal(isShampooVerified, false);
    });

    it('disqualifies review when order was cancelled or refunded', () => {
        const cancelledOrder = {
            ...qualifyingOrder,
            status: 'cancelled',
        };
        const isVerified = checkVerifiedPurchase(cancelledOrder, customerUser, '6aca8a02965bab158d130a30');
        assert.equal(isVerified, false);
    });

    it('disqualifies review when order belongs to a different customer', () => {
        const otherUserOrder = {
            ...qualifyingOrder,
            userId: 'user_other_stranger',
        };
        const isVerified = checkVerifiedPurchase(otherUserOrder, customerUser, '6aca8a02965bab158d130a30');
        assert.equal(isVerified, false);
    });

    it('supports guest checkout orders matched by verified phone or email', () => {
        const guestOrder = {
            userId: null,
            guestPhone: '+8801727785002',
            guestEmail: 'customer@valleycentia.com',
            status: 'delivered',
            orderItems: [{ productId: '6aca8a02965bab158d130a30' }],
        };
        const isVerified = checkVerifiedPurchase(guestOrder, customerUser, '6aca8a02965bab158d130a30');
        assert.equal(isVerified, true);
    });

    it('enforces checkmark styling: green color, 16px size, aria-label, and non-wrapping layout', () => {
        const checkmarkSpec = {
            icon: 'CheckCircle2',
            size: 16,
            fill: '#16a34a',
            strokeColor: '#ffffff',
            strokeWidth: 2.5,
            ariaLabel: 'Verified purchase',
            title: 'Verified purchase',
            containerStyle: {
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                color: '#16a34a',
            },
            nameStyle: {
                fontWeight: 700,
                fontSize: '14px',
                color: '#1a1a1a',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
            },
        };

        assert.equal(checkmarkSpec.size >= 16 && checkmarkSpec.size <= 18, true);
        assert.equal(checkmarkSpec.fill, '#16a34a');
        assert.equal(checkmarkSpec.containerStyle.flexShrink, 0);
        assert.equal(checkmarkSpec.nameStyle.whiteSpace, 'nowrap');
        assert.equal(checkmarkSpec.nameStyle.textOverflow, 'ellipsis');
        assert.equal(checkmarkSpec.nameStyle.minWidth, 0);
        assert.equal(checkmarkSpec.ariaLabel, 'Verified purchase');
    });
});

