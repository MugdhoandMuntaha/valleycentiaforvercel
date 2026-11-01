'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';
import { getCartItemKey, mergeCartItems, normalizeSize } from '@/lib/cartUtils';

export { getCartItemKey, normalizeSize, mergeCartItems };

/* ===== Cart Types ===== */
export interface CartItem {
    id: string;
    slug: string;
    name: string;
    image: string;
    price: number;
    originalPrice?: number;
    size?: string;
    quantity: number;
    stockQuantity?: number;
}

interface CartContextType {
    items: CartItem[];
    addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    removeFromCart: (id: string, size?: string) => void;
    updateQuantity: (id: string, quantity: number, size?: string) => void;
    clearCart: () => void;
    totalItems: number;
    totalPrice: number;
    cartBounce: boolean;
    /** @deprecated Use useToast().showToast instead — kept for backward compat */
    showToast: (message: string, type?: 'success' | 'info' | 'error' | 'cart') => void;
    isHydrated: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'valleycentia-cart';
const GUEST_CART_FLAG = 'valleycentia-guest-cart';
const PENDING_CART_INTENT_KEY = 'valleycentia-pending-cart-intent';

/* ===== Provider ===== */
export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);
    const [cartBounce, setCartBounce] = useState(false);

    const { user, loading: authLoading } = useAuth();
    const { showToast } = useToast();

    // Tracking refs
    const hasInitialLoaded = useRef(false);
    const lastUserRef = useRef<string | null>(null);
    const isUserMutationRef = useRef(false);
    const lastAddRef = useRef<{ key: string; time: number }>({ key: '', time: 0 });

    // Step 1: Hydrate from localStorage on initial client mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem(CART_STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    // Sanitize and normalize all keys/sizes from previous storage
                    const cleanItems: CartItem[] = parsed.map((item: any) => ({
                        ...item,
                        id: String(item.id),
                        size: normalizeSize(item.size),
                        quantity: Math.max(1, Math.min(Number(item.quantity) || 1, 10)),
                        price: Math.ceil(Number(item.price) || 0),
                        originalPrice: item.originalPrice ? Math.ceil(Number(item.originalPrice)) : undefined,
                    }));
                    setItems(cleanItems);
                }
            }
        } catch {
            // ignore parse errors
        }
        setIsHydrated(true);
    }, []);

    // Step 2: Auth resolution & Cart Loading / Merge Lifecycle
    useEffect(() => {
        if (!isHydrated || authLoading) return;

        const currentUserId = user ? user.id : null;
        const previousUserId = lastUserRef.current;

        // Detect user logout: clear cart data
        if (previousUserId && !currentUserId) {
            lastUserRef.current = null;
            hasInitialLoaded.current = true;
            isUserMutationRef.current = false;
            setItems([]);
            try {
                localStorage.removeItem(CART_STORAGE_KEY);
                localStorage.removeItem(GUEST_CART_FLAG);
            } catch {}
            return;
        }

        // Guest session (not logged in)
        if (!currentUserId) {
            lastUserRef.current = null;
            hasInitialLoaded.current = true;
            return;
        }

        // Logged-in session initialization or user switch
        const isUserTransition = previousUserId !== currentUserId;
        lastUserRef.current = currentUserId;

        async function initUserCart() {
            try {
                const isGuestCartPending = typeof window !== 'undefined' && localStorage.getItem(GUEST_CART_FLAG) === 'true';

                const res = await fetch('/api/cart');
                const data = res.ok ? await res.json() : { items: [] };
                const dbItems: CartItem[] = (data.items || []).map((i: any) => ({
                    ...i,
                    id: String(i.id),
                    size: normalizeSize(i.size),
                }));

                if (isGuestCartPending && items.length > 0) {
                    // Exactly-once guest-to-user merge transition
                    const merged = mergeCartItems(dbItems, items);
                    isUserMutationRef.current = false;
                    setItems(merged);
                    try {
                        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(merged));
                        localStorage.removeItem(GUEST_CART_FLAG);
                    } catch {}

                    // Save merged cart to server
                    await fetch('/api/cart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ items: merged }),
                    });
                } else {
                    // PURE READ on page load / refresh: DB is single source of truth
                    // Never merge, never double, never write to DB
                    isUserMutationRef.current = false;
                    setItems(dbItems);
                    try {
                        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dbItems));
                        localStorage.removeItem(GUEST_CART_FLAG);
                    } catch {}
                }
            } catch (err) {
                console.error('Failed to initialize user cart:', err);
            } finally {
                hasInitialLoaded.current = true;
            }
        }

        if (isUserTransition || !hasInitialLoaded.current) {
            initUserCart();
        }
    }, [isHydrated, authLoading, user, items]);

    // Step 3: Execute pending "Add to Cart" intent once and clear it
    useEffect(() => {
        if (!isHydrated || !hasInitialLoaded.current) return;

        try {
            const rawIntent = sessionStorage.getItem(PENDING_CART_INTENT_KEY);
            if (rawIntent) {
                sessionStorage.removeItem(PENDING_CART_INTENT_KEY);
                const intent = JSON.parse(rawIntent);
                if (intent && intent.id) {
                    addToCart(intent, intent.quantity || 1);
                }
            }
        } catch {
            sessionStorage.removeItem(PENDING_CART_INTENT_KEY);
        }
    }, [isHydrated, hasInitialLoaded.current]);

    // Step 4: Cross-tab synchronization via storage event
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === CART_STORAGE_KEY && e.newValue) {
                try {
                    const parsed = JSON.parse(e.newValue);
                    if (Array.isArray(parsed)) {
                        const cleanItems = parsed.map((item: any) => ({
                            ...item,
                            id: String(item.id),
                            size: normalizeSize(item.size),
                        }));
                        isUserMutationRef.current = false;
                        setItems(cleanItems);
                    }
                } catch {
                    // ignore parse error
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    // Step 5: Focus refetch for logged-in users (multi-tab consistency)
    useEffect(() => {
        const handleFocus = async () => {
            if (user && hasInitialLoaded.current) {
                try {
                    const res = await fetch('/api/cart');
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data.items)) {
                            const dbItems = data.items.map((i: any) => ({
                                ...i,
                                id: String(i.id),
                                size: normalizeSize(i.size),
                            }));
                            isUserMutationRef.current = false;
                            setItems(dbItems);
                            try {
                                localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(dbItems));
                            } catch {}
                        }
                    }
                } catch {
                    // ignore focus fetch errors
                }
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [user]);

    // Step 6: Persist mutations to DB & localStorage (debounced, only on actual user mutations)
    useEffect(() => {
        if (!isHydrated || !hasInitialLoaded.current) return;

        // Persist to localStorage immediately
        try {
            localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
            if (!user && items.length > 0) {
                localStorage.setItem(GUEST_CART_FLAG, 'true');
            } else if (!user && items.length === 0) {
                localStorage.removeItem(GUEST_CART_FLAG);
            }
        } catch {}

        // Only sync to server if this update came from an actual user mutation
        if (!user || !isUserMutationRef.current) return;

        const timeout = setTimeout(async () => {
            try {
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });
                isUserMutationRef.current = false;
            } catch (err) {
                console.error('Failed to sync cart updates to server:', err);
            }
        }, 600);

        return () => clearTimeout(timeout);
    }, [items, user, isHydrated]);

    // Action: Add to Cart with rapid multi-tap / double-submit throttling
    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
        const normSize = normalizeSize(item.size);
        const key = getCartItemKey(item.id, normSize);

        // Accidental double-tap / double-submit throttle (350ms window)
        const now = Date.now();
        if (lastAddRef.current.key === key && now - lastAddRef.current.time < 350) {
            return;
        }
        lastAddRef.current = { key, time: now };
        isUserMutationRef.current = true;

        const roundedItem: Omit<CartItem, 'quantity'> = {
            ...item,
            id: String(item.id),
            size: normSize,
            price: Math.ceil(item.price),
            originalPrice: item.originalPrice ? Math.ceil(item.originalPrice) : undefined,
        };

        setItems((prev) => {
            const existingIndex = prev.findIndex((i) => getCartItemKey(i.id, i.size) === key);
            const maxStock = item.stockQuantity !== undefined ? item.stockQuantity : 10;
            const limit = Math.min(maxStock, 10);

            if (existingIndex > -1) {
                const updated = [...prev];
                const existing = updated[existingIndex];
                updated[existingIndex] = {
                    ...existing,
                    ...roundedItem,
                    quantity: Math.max(1, Math.min(existing.quantity + quantity, limit)),
                };
                return updated;
            }

            return [...prev, { ...roundedItem, quantity: Math.max(1, Math.min(quantity, limit)) }];
        });

        setCartBounce(true);
        setTimeout(() => setCartBounce(false), 700);
        showToast(`${item.name.length > 30 ? item.name.substring(0, 30) + '…' : item.name} added to cart`, 'cart');
    }, [showToast]);

    // Action: Remove from Cart
    const removeFromCart = useCallback((id: string, size?: string) => {
        const normSize = normalizeSize(size);
        const key = getCartItemKey(id, normSize);
        isUserMutationRef.current = true;

        setItems((prev) => {
            const item = prev.find((i) => getCartItemKey(i.id, i.size) === key);
            if (item) {
                showToast(`${item.name.length > 30 ? item.name.substring(0, 30) + '…' : item.name} removed from cart`, 'info');
            }
            return prev.filter((i) => getCartItemKey(i.id, i.size) !== key);
        });
    }, [showToast]);

    // Action: Update Quantity
    const updateQuantity = useCallback((id: string, quantity: number, size?: string) => {
        if (quantity < 1) return;
        const normSize = normalizeSize(size);
        const key = getCartItemKey(id, normSize);
        isUserMutationRef.current = true;

        setItems((prev) => {
            return prev.map((i) => {
                if (getCartItemKey(i.id, i.size) === key) {
                    const maxStock = i.stockQuantity !== undefined ? i.stockQuantity : 10;
                    return { ...i, quantity: Math.max(1, Math.min(quantity, Math.min(maxStock, 10))) };
                }
                return i;
            });
        });
    }, []);

    // Action: Clear Cart
    const clearCart = useCallback(() => {
        isUserMutationRef.current = true;
        setItems([]);
        try {
            localStorage.removeItem(CART_STORAGE_KEY);
            localStorage.removeItem(GUEST_CART_FLAG);
        } catch {}

        if (user) {
            fetch('/api/cart', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ items: [] }),
                keepalive: true,
            }).catch(err => console.error('Error clearing cart in DB:', err));
        }
    }, [user]);

    const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    return (
        <CartContext.Provider
            value={{ items, addToCart, removeFromCart, updateQuantity, clearCart, totalItems, totalPrice, cartBounce, showToast, isHydrated }}
        >
            {children}
        </CartContext.Provider>
    );
}

/* ===== Hook ===== */
export function useCart() {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
}
