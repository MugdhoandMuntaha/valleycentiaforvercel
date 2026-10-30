import { isUserAdmin } from './authUtils.ts';

export interface SessionUserInfo {
    userId: string;
    role?: string | null;
    email?: string | null;
}

export interface ReviewRecordInfo {
    id: string;
    userId: string;
    productId: string;
    rating: number;
    isDeleted?: boolean;
    status?: string;
}

export type ReportReason = 'spam' | 'offensive' | 'fake' | 'irrelevant';

export const VALID_REPORT_REASONS: ReportReason[] = ['spam', 'offensive', 'fake', 'irrelevant'];

/**
 * Authorize review deletion.
 *
 * Enforces:
 * - 401: Unauthenticated request
 * - 404: Review not found or already deleted
 * - 200: Author deletes own review OR Admin removes review
 * - 403: Customer trying to remove another customer's review
 */
export function authorizeReviewDeletion(
    sessionUser: SessionUserInfo | null | undefined,
    review: ReviewRecordInfo | null | undefined
): { allowed: boolean; status: number; error: string | null } {
    if (!sessionUser || !sessionUser.userId) {
        return {
            allowed: false,
            status: 401,
            error: 'Authentication required. Please sign in to remove a review.',
        };
    }

    if (!review) {
        return {
            allowed: false,
            status: 404,
            error: 'Review not found.',
        };
    }

    if (review.isDeleted || review.status === 'deleted') {
        return {
            allowed: false,
            status: 404,
            error: 'Review not found or has already been removed.',
        };
    }

    const isAuthor = review.userId === sessionUser.userId;
    const isAdmin = Boolean(
        sessionUser.role === 'admin' ||
        sessionUser.role === 'superadmin' ||
        isUserAdmin({
            userId: sessionUser.userId,
            email: sessionUser.email,
            role: sessionUser.role,
        })
    );

    if (isAuthor || isAdmin) {
        return { allowed: true, status: 200, error: null };
    }

    return {
        allowed: false,
        status: 403,
        error: 'Forbidden: You do not have permission to delete this review.',
    };
}

/**
 * Authorize review editing (strictly author only).
 */
export function authorizeReviewEdit(
    sessionUser: SessionUserInfo | null | undefined,
    review: ReviewRecordInfo | null | undefined
): { allowed: boolean; status: number; error: string | null } {
    if (!sessionUser || !sessionUser.userId) {
        return {
            allowed: false,
            status: 401,
            error: 'Authentication required. Please sign in to edit your review.',
        };
    }

    if (!review || review.isDeleted || review.status === 'deleted') {
        return {
            allowed: false,
            status: 404,
            error: 'Review not found.',
        };
    }

    if (review.userId !== sessionUser.userId) {
        return {
            allowed: false,
            status: 403,
            error: 'Forbidden: You can only edit your own review.',
        };
    }

    return { allowed: true, status: 200, error: null };
}

/**
 * Validate customer review report submission.
 */
export function validateReviewReport(
    sessionUser: SessionUserInfo | null | undefined,
    review: ReviewRecordInfo | null | undefined,
    reason: unknown
): { allowed: boolean; status: number; error: string | null } {
    if (!sessionUser || !sessionUser.userId) {
        return {
            allowed: false,
            status: 401,
            error: 'Authentication required to report a review.',
        };
    }

    if (!review || review.isDeleted || review.status === 'deleted') {
        return {
            allowed: false,
            status: 404,
            error: 'Review not found.',
        };
    }

    if (review.userId === sessionUser.userId) {
        return {
            allowed: false,
            status: 400,
            error: 'You cannot report your own review.',
        };
    }

    if (typeof reason !== 'string' || !VALID_REPORT_REASONS.includes(reason as ReportReason)) {
        return {
            allowed: false,
            status: 400,
            error: 'Invalid report reason. Must be one of: spam, offensive, fake, irrelevant.',
        };
    }

    return { allowed: true, status: 200, error: null };
}

/**
 * Soft delete payload applier.
 */
export function applyReviewSoftDelete<T extends Record<string, any>>(
    review: T,
    deletedBy: string,
    reason?: string
): T & {
    isDeleted: boolean;
    status: 'deleted';
    deletedAt: Date;
    deletedBy: string;
    deletionReason: string;
} {
    return {
        ...review,
        isDeleted: true,
        status: 'deleted' as const,
        deletedAt: new Date(),
        deletedBy,
        deletionReason: reason || 'Removed by user',
    };
}
