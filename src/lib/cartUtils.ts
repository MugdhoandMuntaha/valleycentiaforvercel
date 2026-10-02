/**
 * Pure cart utility functions
 * Decoupled from React runtime for performance, testability, and cross-tab consistency.
 */

export interface BaseCartItem {
    id: string;
    size?: string;
    quantity: number;
    price?: number;
    stockQuantity?: number;
}

/**
 * Generate a unique, deterministic key for a cart item (handles size variants)
 */
export function getCartItemKey(id: string, size?: string): string {
    return size ? `${id}-${size}` : id;
}

/**
 * Intelligently merge database cart with local guest cart
 * - Shared items sum their quantities up to available stock and max limit (10)
 * - Unique items from both sides are preserved
 */
export function mergeCartItems<T extends BaseCartItem>(dbItems: T[], guestItems: T[]): T[] {
    const mergedMap = new Map<string, T>();

    for (const item of dbItems) {
        mergedMap.set(getCartItemKey(item.id, item.size), { ...item });
    }

    for (const guestItem of guestItems) {
        const key = getCartItemKey(guestItem.id, guestItem.size);
        const existing = mergedMap.get(key);

        if (existing) {
            const maxStock = guestItem.stockQuantity !== undefined ? guestItem.stockQuantity : 10;
            const combinedQty = existing.quantity + guestItem.quantity;
            existing.quantity = Math.max(1, Math.min(combinedQty, Math.min(maxStock, 10)));
            if (guestItem.price) {
                existing.price = guestItem.price;
            }
        } else {
            mergedMap.set(key, { ...guestItem });
        }
    }

    return Array.from(mergedMap.values());
}
