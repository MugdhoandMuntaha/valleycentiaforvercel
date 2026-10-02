"use server";

import connectToDatabase from '@/lib/mongodb';
import Review from '@/lib/models/Review';
import User from '@/lib/models/User';
import { recalculateProductRating } from './helpers';
import type { ReviewData } from './types';

export async function getProductReviews(productId: string): Promise<ReviewData[]> {
    await connectToDatabase();
    const reviews = await Review.find({ productId, isApproved: true })
        .sort({ createdAt: -1 })
        .lean();

    const result: ReviewData[] = [];
    for (const review of reviews) {
        const user = await User.findOne({ clerkId: review.userId }).select('displayName fullName').lean();
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
            user_name: user?.displayName || user?.fullName || 'Anonymous',
            images: review.images ? review.images.map((img: any) => ({
                url: img.url,
                altText: img.altText || null,
                sortOrder: img.sortOrder || 0,
            })) : [],
        });
    }
    return result;
}

export async function submitReview(data: {
    product_id: string;
    user_id: string;
    rating: number;
    title: string;
    body: string;
    images?: { url: string; altText?: string | null; sortOrder?: number }[];
}): Promise<{ error: string | null; reviewId?: string }> {
    await connectToDatabase();
    try {
        const createdReview = await Review.create({
            productId: data.product_id,
            userId: data.user_id,
            rating: data.rating,
            title: data.title || null,
            body: data.body || null,
            isVerified: false,
            isApproved: true,
            images: data.images || [],
        });

        // Use centralized rating recalculation (OCP fix)
        await recalculateProductRating(data.product_id);

        return { error: null, reviewId: String(createdReview._id) };
    } catch (err) {
        console.error('Error submitting review:', err);
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteReview({
    reviewId,
    userId,
}: {
    reviewId: string;
    userId: string;
}): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        const review = await Review.findById(reviewId);
        if (!review) {
            return { error: 'Review not found' };
        }
        if (review.userId !== userId) {
            return { error: 'Unauthorized' };
        }

        const productId = review.productId;
        await Review.findByIdAndDelete(reviewId);

        // Use centralized rating recalculation (OCP fix)
        await recalculateProductRating(String(productId));

        return { error: null };
    } catch (err) {
        console.error('Error deleting review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to delete review' };
    }
}

export async function updateReview(data: {
    reviewId: string;
    userId: string;
    rating: number;
    title: string;
    body: string;
}): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        const review = await Review.findById(data.reviewId);
        if (!review) {
            return { error: 'Review not found' };
        }
        if (review.userId !== data.userId) {
            return { error: 'Unauthorized' };
        }

        review.rating = data.rating;
        review.title = data.title || null;
        review.body = data.body || null;
        await review.save();

        // Use centralized rating recalculation (OCP fix)
        await recalculateProductRating(String(review.productId));

        return { error: null };
    } catch (err) {
        console.error('Error updating review:', err);
        return { error: err instanceof Error ? err.message : 'Failed to update review' };
    }
}
