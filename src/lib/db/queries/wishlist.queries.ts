"use server";

import connectToDatabase from '@/lib/mongodb';
import WishlistItem from '@/lib/models/WishlistItem';
import Product from '@/lib/models/Product';
import { attachCouponsToCards, mapProductsToCards } from './helpers';
import type { ProductCard } from './types';

export async function getWishlist(userId: string): Promise<string[]> {
    await connectToDatabase();
    const items = await WishlistItem.find({ userId }).lean();
    return items.map(item => String(item.productId));
}

export async function addToWishlist(userId: string, productId: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await WishlistItem.findOneAndUpdate(
            { userId, productId },
            { userId, productId },
            { upsert: true }
        );
        return { error: null };
    } catch (err) {
        console.error('Error adding to wishlist:', err);
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function removeFromWishlist(userId: string, productId: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await WishlistItem.deleteOne({ userId, productId });
        return { error: null };
    } catch (err) {
        console.error('Error removing from wishlist:', err);
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function getWishlistProducts(userId: string): Promise<ProductCard[]> {
    await connectToDatabase();
    const wishlistItems = await WishlistItem.find({ userId }).lean();
    if (!wishlistItems.length) return [];

    const productIds = wishlistItems.map(w => w.productId);
    const products = await Product.find({ _id: { $in: productIds } })
        .populate('brandId', 'name slug')
        .populate('categoryId', 'name slug')
        .lean();

    return attachCouponsToCards(mapProductsToCards(products as unknown as Record<string, unknown>[]));
}
