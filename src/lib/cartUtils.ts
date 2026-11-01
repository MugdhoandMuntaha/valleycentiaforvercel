/**
 * Pure cart utility functions
 * Decoupled from React runtime for performance, testability, and cross-tab consistency.
 */

export interface BaseCartItem {
    id: string;
    size?: string | null;
    quantity: number;
    price?: number;
    originalPrice?: number;
    stockQuantity?: number;
}

/**
 * Normalizes size strings:
 * - Empty string, null, undefined, or "Default" (case-insensitive) are normalized to undefined.
 * - Non-default size variants (e.g. "50ml", "100ml", "Large") are trimmed and preserved.
 */
export function normalizeSize(size?: string | null): string | undefined {
    if (!size) return undefined;
    const trimmed = String(size).trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'default') {
        return undefined;
    }
    return trimmed;
}

/**
 * Generate a unique, deterministic key for a cart item (handles normalized size variants).
 * Items without a variant or with a 'Default' size resolve to the bare product ID.
 */
export function getCartItemKey(id: string, size?: string | null): string {
    const norm = normalizeSize(size);
    return norm ? `${id}-${norm}` : String(id);
}

/**
 * Intelligently merge database cart with local guest cart
 * - Shared items sum their quantities up to available stock and max limit (10)
 * - Unique items from both sides are preserved
 * - Normalizes size keys so that "Default" and undefined never create duplicate lines
 */
export function mergeCartItems<T extends BaseCartItem>(dbItems: T[], guestItems: T[]): T[] {
    const mergedMap = new Map<string, T>();

    for (const item of dbItems) {
        const normSize = normalizeSize(item.size);
        const key = getCartItemKey(item.id, normSize);
        const existing = mergedMap.get(key);
        if (existing) {
            const maxStock = existing.stockQuantity !== undefined ? existing.stockQuantity : 10;
            existing.quantity = Math.max(1, Math.min(existing.quantity + item.quantity, Math.min(maxStock, 10)));
        } else {
            mergedMap.set(key, { ...item, size: normSize });
        }
    }

    for (const guestItem of guestItems) {
        const normSize = normalizeSize(guestItem.size);
        const key = getCartItemKey(guestItem.id, normSize);
        const existing = mergedMap.get(key);

        if (existing) {
            const maxStock = guestItem.stockQuantity !== undefined ? guestItem.stockQuantity : 10;
            const combinedQty = existing.quantity + guestItem.quantity;
            existing.quantity = Math.max(1, Math.min(combinedQty, Math.min(maxStock, 10)));
            if (guestItem.price) {
                existing.price = guestItem.price;
            }
            if (guestItem.originalPrice !== undefined) {
                existing.originalPrice = guestItem.originalPrice;
            }
        } else {
            mergedMap.set(key, { ...guestItem, size: normSize });
        }
    }

    return Array.from(mergedMap.values());
}
