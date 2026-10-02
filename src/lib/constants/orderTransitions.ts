/**
 * Order State Machine Matrix
 * Defines the strict, permitted lifecycle status transitions for orders.
 */
export const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
    pending: ['confirmed', 'cancelled', 'failed'],
    confirmed: ['processing', 'cancelled'],
    processing: ['shipped', 'cancelled'],
    shipped: ['in_transit', 'delivered', 'returned'],
    in_transit: ['delivered', 'returned'],
    delivered: ['return_requested'],
    return_requested: ['returned', 'delivered'],
    cancelled: [], // Terminal state
    refunded: [],  // Terminal state
    failed: ['pending', 'cancelled'],
    returned: ['refunded'],
};
