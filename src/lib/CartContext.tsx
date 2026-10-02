'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useToast } from '@/lib/ToastContext';

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

/* ===== Cart Sync Hook (SRP: DB sync logic extracted) ===== */
function useCartSync(
    items: CartItem[],
    isHydrated: boolean,
    user: { id: string } | null,
    setItems: React.Dispatch<React.SetStateAction<CartItem[]>>,
) {
    const hasSyncedInit = useRef(false);

    // Load/merge from database when user logs in
    useEffect(() => {
        if (!isHydrated) return;

        async function syncCartWithDb() {
            if (user) {
                try {
                    const res = await fetch('/api/cart');
                    if (res.ok) {
                        const data = await res.json();
                        const dbItems = data.items || [];
                        
                        if (dbItems.length > 0 && items.length === 0) {
                            setItems(dbItems);
                        } else if (items.length > 0) {
                            await fetch('/api/cart', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ items }),
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error syncing cart with database:', err);
                } finally {
                    hasSyncedInit.current = true;
                }
            } else {
                hasSyncedInit.current = false;
            }
        }

        syncCartWithDb();
    }, [user, isHydrated]);

    // Upload items to DB when they change (debounced, only after initial sync)
    useEffect(() => {
        if (!isHydrated || !user || !hasSyncedInit.current) return;

        const timeout = setTimeout(async () => {
            try {
                await fetch('/api/cart', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });
            } catch (err) {
                console.error('Failed to sync cart updates to database:', err);
            }
        }, 1000);

        return () => clearTimeout(timeout);
    }, [items, user, isHydrated]);
}

/* ===== Provider ===== */
export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isHydrated, setIsHydrated] = useState(false);
    const [cartBounce, setCartBounce] = useState(false);

    const { user } = useAuth();
    const { showToast } = useToast();

    // Load from localStorage on mount
    useEffect(() => {
        try {
            const stored = localStorage.getItem('valleycentia-cart');
            if (stored) {
                setItems(JSON.parse(stored));
            }
        } catch {
            // ignore parse errors
        }
        setIsHydrated(true);
    }, []);

    // DB sync (extracted into hook for SRP)
    useCartSync(items, isHydrated, user, setItems);

    // Persist to localStorage on change
    useEffect(() => {
        if (isHydrated) {
            localStorage.setItem('valleycentia-cart', JSON.stringify(items));
        }
    }, [items, isHydrated]);

    /** Generate a unique key for cart item (handles size variants) */
    const itemKey = (id: string, size?: string) => size ? `${id}-${size}` : id;

    const addToCart = useCallback((item: Omit<CartItem, 'quantity'>, quantity = 1) => {
        const roundedItem = {
            ...item,
            price: Math.ceil(item.price),
            originalPrice: item.originalPrice ? Math.ceil(item.originalPrice) : undefined,
        };
        setItems((prev) => {
            const key = itemKey(roundedItem.id, roundedItem.size);
            const existing = prev.find(
                (i) => itemKey(i.id, i.size) === key
            );
            const maxStock = item.stockQuantity !== undefined ? item.stockQuantity : 999;
            if (existing) {
                return prev.map((i) =>
                    itemKey(i.id, i.size) === key
                        ? { ...i, quantity: Math.min(i.quantity + quantity, maxStock) }
                        : i
                );
            }
            return [...prev, { ...roundedItem, quantity: Math.min(quantity, maxStock) }];
        });
        setCartBounce(true);
        setTimeout(() => setCartBounce(false), 700);
        showToast(`${item.name.length > 30 ? item.name.substring(0, 30) + '…' : item.name} added to cart`, 'cart');
    }, [showToast]);

    const removeFromCart = useCallback((id: string, size?: string) => {
        setItems((prev) => {
            const key = itemKey(id, size);
            const item = prev.find((i) => itemKey(i.id, i.size) === key);
            if (item) {
                showToast(`${item.name.length > 30 ? item.name.substring(0, 30) + '…' : item.name} removed from cart`, 'info');
            }
            return prev.filter((i) => itemKey(i.id, i.size) !== key);
        });
    }, [showToast]);

    const updateQuantity = useCallback((id: string, quantity: number, size?: string) => {
        if (quantity < 1) return;
        setItems((prev) => {
            const key = itemKey(id, size);
            return prev.map((i) => {
                if (itemKey(i.id, i.size) === key) {
                    const maxStock = i.stockQuantity !== undefined ? i.stockQuantity : 999;
                    return { ...i, quantity: Math.min(quantity, maxStock) };
                }
                return i;
            });
        });
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
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
