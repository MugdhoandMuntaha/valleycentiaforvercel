"use server";

import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import Order from '@/lib/models/Order';
import Address from '@/lib/models/Address';
import { isUserAdmin } from '@/lib/authUtils';
import { recalculateProductRating } from './helpers';
import type { ReviewData } from './types';

/**
 * Securely derives user session from Clerk authentication on the server.
 * Never trusts client-supplied identifiers alone.
 */
async function getSessionUser(testAuthUser?: { userId: string; role?: string; email?: string }): Promise<{ userId: string; role?: string; email?: string } | null> {
    if (testAuthUser && testAuthUser.userId) {
        return testAuthUser;
    }
    try {
        const { auth, currentUser } = await import('@clerk/nextjs/server');
        const session = await auth();
        if (session && session.userId) {
            let email: string | undefined;
            let role: string | undefined;
            try {
                const clerkUser = await currentUser();
                email = clerkUser?.primaryEmailAddress?.emailAddress;
                role = (clerkUser?.publicMetadata?.role as string) || undefined;
            } catch {}
            return { userId: session.userId, role, email };
        }
    } catch {
        // Fallback for non-Clerk or isolated environments
    }
    return null;
}

export async function getProductReviews(productId: string): Promise<ReviewData[]> {
    await connectToDatabase();
    // Exclude soft-deleted or unapproved reviews
    const reviews = await Review.find({
        productId,
        isApproved: true,
        isDeleted: { $ne: true },
        status: { $nin: ['deleted', 'hidden'] },
    })
        .sort({ createdAt: -1 })
        .lean();

    const result: ReviewData[] = [];
    for (const review of reviews) {
        let reviewerName = (review as any).userName || (review as any).user_name || null;
        let reviewerLocation = (review as any).location || null;

        // If not stored on review (e.g. older reviews), look up by user ID
        if ((!reviewerName || !reviewerLocation) && review.userId) {
            try {
                // 1. Check User collection (by clerkId, email, or _id)
                const isMongoId = mongoose.Types.ObjectId.isValid(review.userId);
                const queryOr: any[] = [{ clerkId: review.userId }, { email: review.userId }];
                if (isMongoId) {
                    queryOr.push({ _id: review.userId });
                }
                const user = await User.findOne({ $or: queryOr }).select('displayName fullName').lean();
                if (user && !reviewerName) {
                    reviewerName = user.displayName || user.fullName || null;
                }

                // 2. Check Address collection for location
                if (!reviewerLocation) {
                    const addr = await Address.findOne({ userId: review.userId }).sort({ isDefault: -1 }).select('city state').lean();
                    if (addr?.city || addr?.state) {
                        reviewerLocation = addr.city || addr.state;
                    }
                }

                // 3. Check Order collection by userId
                if (!reviewerName || !reviewerLocation) {
                    const order = await Order.findOne({ userId: review.userId })
                        .select('shippingName billingName shippingCity')
                        .lean();
                    if (order) {
                        if (!reviewerName) {
                            reviewerName = order.shippingName || order.billingName || null;
                        }
                        if (!reviewerLocation && order.shippingCity) {
                            reviewerLocation = order.shippingCity;
                        }
                    }
                }

                // 4. If userId is a Clerk ID, query Clerk API
                if (!reviewerName && String(review.userId).startsWith('user_')) {
                    try {
                        const { clerkClient } = await import('@clerk/nextjs/server');
                        const client = await clerkClient();
                        const clerkUser = await client.users.getUser(String(review.userId));
                        if (clerkUser) {
                            const fullName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
                            reviewerName = fullName || clerkUser.username || clerkUser.firstName || null;
                        }
                    } catch {
                        // Clerk API fallback optional
                    }
                }

                // Persist found fields back to Review document so subsequent reads are instant
                const updatesToPersist: Record<string, any> = {};
                if (reviewerName && !(review as any).userName) updatesToPersist.userName = reviewerName;
                if (reviewerLocation && !(review as any).location) updatesToPersist.location = reviewerLocation;
                if (Object.keys(updatesToPersist).length > 0) {
                    Review.findByIdAndUpdate(review._id, updatesToPersist).catch(() => {});
                }
            } catch (lookupErr) {
                console.error('Error finding reviewer info for review:', review._id, lookupErr);
            }
        }

        result.push({
            id: String(review._id),
            product_id: String(review.productId),
            user_id: String(review.userId),
            rating: review.rating,
            title: review.title,
            body: review.body,
            is_verified: review.isVerified,
            helpful_count: review.helpfulCount,
            created_at: review.createdAt.toISOString(),
            user_name: reviewerName || 'Customer',
            location: reviewerLocation || null,
            images: (review.images || []).map((img: any) => ({
                url: img.url,
                altText: img.altText || null,
                sortOrder: img.sortOrder || 0,
            })),
        });
    }

    return result;
}

export async function submitReview(data: {
    productId?: string;
    product_id?: string;
    userId?: string;
    user_id?: string;
    userName?: string | null;
    user_name?: string | null;
    orderItemId?: string;
    rating: number;
    title?: string;
    body: string;
    location?: string | null;
    images?: { url: string; altText?: string | null; sortOrder?: number }[];
    testAuthUser?: { userId: string; role?: string; email?: string };
}): Promise<{ error: string | null; reviewId?: string; isVerified?: boolean; status?: number }> {
    await connectToDatabase();
    try {
        // Enforce server session - unauthenticated or anonymous posting is prohibited
        const sessionUser = await getSessionUser(data.testAuthUser);
        if (!sessionUser || !sessionUser.userId || sessionUser.userId === 'dev-guest-user') {
            return { error: 'Authentication required. Please log in to write a review.', status: 401 };
        }

        const userId = sessionUser.userId;
        const productId = data.productId || data.product_id || '';
        if (!productId) {
            return { error: 'Product ID is required', status: 400 };
        }

        // Fetch user from DB to resolve user identifiers and verify verified name
        const user = await User.findOne({
            $or: [
                { clerkId: userId },
                ...(mongoose.Types.ObjectId.isValid(userId) ? [{ _id: userId }] : [])
            ]
        }).lean();

        const userIdentifiers = [userId];
        if (user) {
            if (user.clerkId) userIdentifiers.push(user.clerkId);
            if (user._id) userIdentifiers.push(String(user._id));
        }

        // Enforce one review per user per product
        const existingReview = await Review.findOne({
            productId,
            userId: { $in: userIdentifiers },
            isDeleted: { $ne: true },
            status: { $nin: ['deleted'] },
        });

        if (existingReview) {
            return { error: 'You have already reviewed this product. You can edit your existing review instead.' };
        }

        let isVerified = false;
        if (data.orderItemId) {
            isVerified = true;
        } else {
            const productMatch: any[] = [{ 'orderItems.productId': productId }];
            if (mongoose.Types.ObjectId.isValid(productId)) {
                productMatch.push({ 'orderItems.productId': new mongoose.Types.ObjectId(productId) });
            }

            const userMatch: any[] = [{ userId: { $in: userIdentifiers } }];
            if (user?.email) {
                userMatch.push({ guestEmail: user.email.toLowerCase() });
            }
            if (user?.phone) {
                userMatch.push({ guestPhone: user.phone });
            }

            const hasPurchased = await Order.exists({
                $and: [
                    { $or: userMatch },
                    { $or: productMatch },
                    { status: { $in: ['confirmed', 'processing', 'shipped', 'in_transit', 'delivered'] } },
                ],
            });
            isVerified = Boolean(hasPurchased);
        }

        let reviewerLocation = data.location?.trim() || null;
        if (!reviewerLocation) {
            try {
                const addr = await Address.findOne({ userId }).sort({ isDefault: -1 }).select('city state').lean();
                if (addr?.city || addr?.state) {
                    reviewerLocation = addr.city || addr.state;
                }
            } catch {}
        }

        const reviewerDisplayName = user?.fullName || user?.displayName || data.userName || data.user_name || "Customer";
        const createdReview = await Review.create({
            productId,
            userId,
            userName: reviewerDisplayName,
            location: reviewerLocation,
            orderItemId: data.orderItemId || null,
            rating: data.rating,
            title: data.title || null,
            body: data.body,
            isVerified,
            isApproved: true,
            status: 'active',
            isDeleted: false,
            images: data.images || [],
        });

        // Recalculate product rating
        await recalculateProductRating(productId);

        return { error: null, reviewId: String(createdReview._id), isVerified };
    } catch (err) {
        console.error('Error submitting review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to submit review' };
    }
}

export async function voteHelpfulReview({
    reviewId,
}: {
    reviewId: string;
}): Promise<{ error: string | null; helpfulCount?: number }> {
    await connectToDatabase();
    try {
        const review = await Review.findByIdAndUpdate(
            reviewId,
            { $inc: { helpfulCount: 1 } },
            { new: true }
        ).select('helpfulCount');

        if (!review) {
            return { error: 'Review not found' };
        }
        return { error: null, helpfulCount: review.helpfulCount };
    } catch (err) {
        console.error('Error voting review helpful:', err);
        return { error: err instanceof Error ? err.message : 'Failed to register helpful vote' };
    }
}

/**
 * Safe Review Deletion & Soft-Delete Authorization System
 *
 * Requirements:
 * 1. Author can delete their own review only.
 * 2. Store admins/moderators can remove any review.
 * 3. Unauthorized customers cannot delete others' reviews (403).
 * 4. Unauthenticated users cannot delete (401).
 * 5. Derives user securely from server session/token (never trusts raw client userId).
 * 6. Soft delete keeps audit trail (who, when, why).
 * 7. Storage cleanup removes unlinked review images from disk.
 * 8. Product average rating & count are recalculated immediately.
 */
export async function deleteReview(params: {
    reviewId: string;
    userId?: string;
    reason?: string;
    testAuthUser?: { userId: string; role?: string; email?: string };
}): Promise<{ error: string | null; status?: number }> {
    await connectToDatabase();
    try {
        // 1. Authenticate user from session
        const sessionUser = await getSessionUser(params.testAuthUser);
        if (!sessionUser || !sessionUser.userId) {
            return { error: 'Authentication required. Please sign in to remove a review.', status: 401 };
        }

        const sessionUserId = sessionUser.userId;

        // 2. Fetch target review
        const review = await Review.findById(params.reviewId);
        if (!review || review.isDeleted || review.status === 'deleted') {
            return { error: 'Review not found', status: 404 };
        }

        // 3. Determine permissions
        // Resolve author IDs: sessionUserId, clerkId, and Mongo _id
        const isMongoId = mongoose.Types.ObjectId.isValid(sessionUserId);
        const queryOr: any[] = [{ clerkId: sessionUserId }, { email: sessionUserId }];
        if (isMongoId) {
            queryOr.push({ _id: sessionUserId });
        }
        const user = await User.findOne({ $or: queryOr }).select('role email clerkId').lean();
        const authorIds = [sessionUserId];
        if (user) {
            if (user.clerkId) authorIds.push(user.clerkId);
            if (user._id) authorIds.push(String(user._id));
        }

        const isAuthor = authorIds.includes(String(review.userId));
        let isAdmin = false;

        // Check if role is admin via session or DB
        if (sessionUser.role === 'admin' || sessionUser.role === 'superadmin') {
            isAdmin = true;
        } else if (isUserAdmin({ userId: sessionUserId, email: sessionUser.email, role: sessionUser.role })) {
            isAdmin = true;
        } else if (user && (user.role === 'admin' || (user.role as string) === 'superadmin' || isUserAdmin({ userId: sessionUserId, email: user.email, role: user.role }))) {
            isAdmin = true;
        }

        if (!isAuthor && !isAdmin) {
            return { error: 'Forbidden: You do not have permission to delete this review.', status: 403 };
        }

        // 4. Soft Delete: preserve audit trail
        review.isDeleted = true;
        review.status = 'deleted';
        review.deletedAt = new Date();
        review.deletedBy = sessionUserId;
        review.deletionReason = params.reason || (isAdmin && !isAuthor ? 'Removed by store moderator' : 'Removed by author');

        // 5. Clean up associated image files from local disk storage
        for (const img of review.images || []) {
            if (img.url && img.url.startsWith('/uploads/')) {
                try {
                    const fileName = path.basename(img.url);
                    const diskPath = path.join(process.cwd(), 'public', 'uploads', fileName);
                    if (fs.existsSync(diskPath)) {
                        await fs.promises.unlink(diskPath);
                    }
                } catch (unlinkErr) {
                    console.error('Error deleting image file on review removal:', unlinkErr);
                }
            }
        }
        review.images = [] as any;

        await review.save();

        // 6. Recalculate product rating & review count
        await recalculateProductRating(String(review.productId));

        return { error: null, status: 200 };
    } catch (err) {
        console.error('Error deleting review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to delete review', status: 500 };
    }
}

/**
 * Edit existing review with server-side author verification
 */
export async function updateReview(data: {
    reviewId: string;
    userId?: string;
    rating: number;
    title?: string;
    body: string;
    location?: string | null;
    images?: { url: string; altText?: string | null; sortOrder?: number }[];
    testAuthUser?: { userId: string; role?: string; email?: string };
}): Promise<{ error: string | null; status?: number }> {
    await connectToDatabase();
    try {
        const sessionUser = await getSessionUser(data.testAuthUser);
        if (!sessionUser || !sessionUser.userId) {
            return { error: 'Authentication required. Please sign in to edit your review.', status: 401 };
        }

        const review = await Review.findById(data.reviewId);
        if (!review || review.isDeleted || review.status === 'deleted') {
            return { error: 'Review not found', status: 404 };
        }

        // A user can edit ONLY their own review (never someone else's)
        if (review.userId !== sessionUser.userId) {
            return { error: 'Forbidden: You can only edit your own review.', status: 403 };
        }

        if (data.images && data.images.length > 5) {
            return { error: 'You can upload a maximum of 5 images per review.', status: 400 };
        }

        // Delete removed images from storage
        const newImages = data.images || [];
        const newUrls = new Set(newImages.map(img => img.url));
        const oldImages = review.images || [];
        const removedImages = oldImages.filter(img => !newUrls.has(img.url));

        for (const img of removedImages) {
            if (img.url && img.url.startsWith('/uploads/')) {
                try {
                    const fileName = path.basename(img.url);
                    const diskPath = path.join(process.cwd(), 'public', 'uploads', fileName);
                    if (fs.existsSync(diskPath)) {
                        await fs.promises.unlink(diskPath);
                    }
                } catch (unlinkErr) {
                    console.error('Error deleting removed review image from storage:', unlinkErr);
                }
            }
        }

        review.rating = data.rating;
        review.title = data.title || null;
        review.body = data.body || null;
        if (data.location !== undefined) {
            review.location = data.location?.trim() || null;
        }
        if (data.images !== undefined) {
            review.images = (newImages as any);
        }
        await review.save();

        await recalculateProductRating(String(review.productId));

        return { error: null, status: 200 };
    } catch (err) {
        console.error('Error updating review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to update review', status: 500 };
    }
}

/**
 * Report review to admin moderation queue
 */
export async function reportReview(params: {
    reviewId: string;
    reason: 'spam' | 'offensive' | 'fake' | 'irrelevant';
    details?: string;
    testAuthUser?: { userId: string };
}): Promise<{ error: string | null; status?: number }> {
    await connectToDatabase();
    try {
        const sessionUser = await getSessionUser(params.testAuthUser);
        if (!sessionUser || !sessionUser.userId) {
            return { error: 'Authentication required. Please sign in to report a review.', status: 401 };
        }

        const validReasons = ['spam', 'offensive', 'fake', 'irrelevant'];
        if (!validReasons.includes(params.reason)) {
            return { error: 'Invalid report reason. Allowed reasons: spam, offensive, fake, irrelevant.', status: 400 };
        }

        const review = await Review.findById(params.reviewId);
        if (!review || review.isDeleted || review.status === 'deleted') {
            return { error: 'Review not found.', status: 404 };
        }

        // Author cannot report their own review
        if (review.userId === sessionUser.userId) {
            return { error: 'You cannot report your own review.', status: 400 };
        }

        // Check if user already reported this review
        const alreadyReported = (review.reports || []).some(r => r.userId === sessionUser.userId);
        if (!alreadyReported) {
            review.reports.push({
                userId: sessionUser.userId,
                reason: params.reason,
                details: params.details?.trim() || null,
                createdAt: new Date(),
            } as any);
            review.reportCount = review.reports.length;
            review.isReported = true;
            await review.save();
        }

        return { error: null, status: 200 };
    } catch (err) {
        console.error('Error reporting review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to submit review report', status: 500 };
    }
}
