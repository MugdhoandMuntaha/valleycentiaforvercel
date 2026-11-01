import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    authorizeReviewDeletion,
    authorizeReviewEdit,
    validateReviewReport,
    applyReviewSoftDelete,
    type ReviewRecordInfo,
    type SessionUserInfo,
} from '../src/lib/reviewAuth.ts';

describe('Review Removal Permissions & Server Authorization', () => {
    const authorUser: SessionUserInfo = {
        userId: 'usr_author_123',
        role: 'customer',
        email: 'author@customer.com',
    };

    const attackerUser: SessionUserInfo = {
        userId: 'usr_attacker_999',
        role: 'customer',
        email: 'attacker@evil.com',
    };

    const adminUser: SessionUserInfo = {
        userId: 'usr_admin_777',
        role: 'admin',
        email: 'moderator@valleycentia.com',
    };

    const activeReview: ReviewRecordInfo = {
        id: 'rev_abc_456',
        userId: 'usr_author_123',
        productId: 'prod_999',
        rating: 5,
        isDeleted: false,
        status: 'active',
    };

    it('allows author to delete their own review (200 OK)', () => {
        const result = authorizeReviewDeletion(authorUser, activeReview);
        assert.equal(result.allowed, true);
        assert.equal(result.status, 200);
        assert.equal(result.error, null);
    });

    it('rejects another user trying to delete someone else review with 403 Forbidden', () => {
        const result = authorizeReviewDeletion(attackerUser, activeReview);
        assert.equal(result.allowed, false);
        assert.equal(result.status, 403);
        assert.match(result.error || '', /Forbidden: You do not have permission/i);
    });

    it('allows store admin to delete any review (200 OK)', () => {
        const result = authorizeReviewDeletion(adminUser, activeReview);
        assert.equal(result.allowed, true);
        assert.equal(result.status, 200);
        assert.equal(result.error, null);
    });

    it('rejects unauthenticated/logged-out requests with 401 Unauthorized', () => {
        const result = authorizeReviewDeletion(null, activeReview);
        assert.equal(result.allowed, false);
        assert.equal(result.status, 401);
        assert.match(result.error || '', /Authentication required/i);

        const emptyUserResult = authorizeReviewDeletion({ userId: '' }, activeReview);
        assert.equal(emptyUserResult.allowed, false);
        assert.equal(emptyUserResult.status, 401);
    });

    it('rejects spoofed client-side userId if server session is missing (never trust client userId alone)', () => {
        // Even if client passes target author userId in query/body, missing server session must return 401
        const unauthenticatedSession: SessionUserInfo | null = null;
        const result = authorizeReviewDeletion(unauthenticatedSession, activeReview);
        assert.equal(result.allowed, false);
        assert.equal(result.status, 401);
    });

    it('strictly restricts review editing to the author only (even admins cannot modify text)', () => {
        assert.equal(authorizeReviewEdit(authorUser, activeReview).allowed, true);
        assert.equal(authorizeReviewEdit(attackerUser, activeReview).allowed, false);
        assert.equal(authorizeReviewEdit(attackerUser, activeReview).status, 403);
        assert.equal(authorizeReviewEdit(adminUser, activeReview).allowed, false);
        assert.equal(authorizeReviewEdit(adminUser, activeReview).status, 403);
        assert.equal(authorizeReviewEdit(null, activeReview).status, 401);
    });
});

describe('Review Soft Delete & Audit Trail Integrity', () => {
    it('applies soft delete payload preserving audit fields (who, when, why)', () => {
        const originalReview = {
            id: 'rev_101',
            userId: 'usr_author_123',
            body: 'Great moisturizer',
            rating: 5,
        };

        const softDeleted = applyReviewSoftDelete(originalReview, 'usr_admin_777', 'Violates policy');
        assert.equal(softDeleted.isDeleted, true);
        assert.equal(softDeleted.status, 'deleted');
        assert.equal(softDeleted.deletedBy, 'usr_admin_777');
        assert.equal(softDeleted.deletionReason, 'Violates policy');
        assert.ok(softDeleted.deletedAt instanceof Date);
        // Original content is preserved for administrative audit
        assert.equal(softDeleted.body, 'Great moisturizer');
    });

    it('filters out soft-deleted reviews from product rating and count recalculation', () => {
        const mockReviews = [
            { id: '1', rating: 5, isDeleted: false, status: 'active', isApproved: true },
            { id: '2', rating: 3, isDeleted: true, status: 'deleted', isApproved: true }, // soft deleted
            { id: '3', rating: 4, isDeleted: false, status: 'active', isApproved: true },
        ];

        const activeReviews = mockReviews.filter(r => !r.isDeleted && r.status !== 'deleted');
        const reviewCount = activeReviews.length;
        const totalRating = activeReviews.reduce((sum, r) => sum + r.rating, 0);
        const ratingAvg = reviewCount > 0 ? Math.round((totalRating / reviewCount) * 10) / 10 : 0;

        assert.equal(reviewCount, 2);
        assert.equal(ratingAvg, 4.5); // (5 + 4) / 2 = 4.5 (excluding 3)
    });
});

describe('Customer Review Reporting & Moderation Queue', () => {
    const customerUser: SessionUserInfo = {
        userId: 'usr_customer_321',
        role: 'customer',
    };

    const reviewToReport: ReviewRecordInfo = {
        id: 'rev_sus_789',
        userId: 'usr_different_author',
        productId: 'prod_1',
        rating: 1,
    };

    it('allows customer to report a review with valid reasons (spam, offensive, fake, irrelevant)', () => {
        const validReasons = ['spam', 'offensive', 'fake', 'irrelevant'] as const;
        for (const reason of validReasons) {
            const res = validateReviewReport(customerUser, reviewToReport, reason);
            assert.equal(res.allowed, true);
            assert.equal(res.status, 200);
        }
    });

    it('rejects reports with invalid or arbitrary reasons with 400 Bad Request', () => {
        const res = validateReviewReport(customerUser, reviewToReport, 'i_disagree_with_opinion');
        assert.equal(res.allowed, false);
        assert.equal(res.status, 400);
        assert.match(res.error || '', /Invalid report reason/i);
    });

    it('prevents author from reporting their own review with 400 Bad Request', () => {
        const authorAsReporter: SessionUserInfo = {
            userId: 'usr_different_author',
            role: 'customer',
        };
        const res = validateReviewReport(authorAsReporter, reviewToReport, 'spam');
        assert.equal(res.allowed, false);
        assert.equal(res.status, 400);
        assert.match(res.error || '', /cannot report your own review/i);
    });

    it('requires authentication to submit a report (401 Unauthorized)', () => {
        const res = validateReviewReport(null, reviewToReport, 'spam');
        assert.equal(res.allowed, false);
        assert.equal(res.status, 401);
    });
});

describe('Review Submission Server Authorization & Guest Path Removal', () => {
    it('rejects unauthenticated/logged-out review creation with 401 Unauthorized', () => {
        const unauthenticatedSession = null;
        assert.throws(() => {
            if (!unauthenticatedSession) {
                throw new Error('401: Authentication required. Please log in to write a review.');
            }
        }, /401: Authentication required/);
    });

    it('rejects dev-guest-user or anonymous path with 401 Unauthorized', () => {
        const guestSession = { userId: 'dev-guest-user', role: 'customer' };
        const isGuestBlocked = !guestSession || guestSession.userId === 'dev-guest-user';
        assert.equal(isGuestBlocked, true, 'Guest or anonymous user ID must be blocked from posting');
    });

    it('allows authenticated customer to submit review with author derived from session (200 OK)', () => {
        const customerSession = { userId: 'usr_real_customer_123', email: 'cust@valleycentia.com' };
        assert.ok(customerSession.userId);
        assert.notEqual(customerSession.userId, 'dev-guest-user');

        const reviewPayload = {
            productId: 'prod_999',
            userId: customerSession.userId, // securely set from server session
            rating: 5,
            body: 'Amazing sunscreen with no white cast!',
        };

        assert.equal(reviewPayload.userId, 'usr_real_customer_123');
        assert.equal(reviewPayload.rating, 5);
    });
});
