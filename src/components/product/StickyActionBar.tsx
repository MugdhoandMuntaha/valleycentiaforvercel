'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Check, Heart } from 'lucide-react';

export interface StickyActionBarProps {
    isVisible?: boolean;
    isMobile: boolean;
    isCurrentSizeInStock: boolean;
    isProductInStock: boolean;
    showAdded: boolean;
    onAddToCart: () => void;
    onBuyNow: (e: React.MouseEvent<HTMLButtonElement>) => void;
    wishlisted?: boolean;
    onToggleWishlist?: () => void;
    productTitle: string;
}

export default function StickyActionBar({
    isVisible = true,
    isMobile,
    isCurrentSizeInStock,
    isProductInStock,
    showAdded,
    onAddToCart,
    onBuyNow,
    wishlisted = false,
    onToggleWishlist,
    productTitle,
}: StickyActionBarProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Never render on desktop/tablet (768px and above) or before mounting
    if (!mounted || !isMobile || typeof document === 'undefined') {
        return null;
    }

    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key="pdp-sticky-action-bar"
                    initial={{ y: '100%', opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: '100%', opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="pdp-sticky-bar"
                    role="region"
                    aria-label="Sticky product actions"
                    aria-hidden={!isVisible}
                    inert={!isVisible ? true : undefined}
                    style={{
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        width: '100%',
                        zIndex: 100,
                        background: 'rgba(255, 255, 255, 0.96)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.07), 0 -1px 3px rgba(0, 0, 0, 0.04)',
                        paddingTop: '10px',
                        paddingLeft: '16px',
                        paddingRight: '16px',
                        paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        boxSizing: 'border-box',
                        fontFamily: "'Inter', sans-serif",
                    }}
                >
                    {isCurrentSizeInStock ? (
                        <>
                            {/* Add to Cart */}
                            <button
                                type="button"
                                onClick={onAddToCart}
                                aria-label={showAdded ? 'Added to cart' : `Add ${productTitle} to cart`}
                                className="pdp-sticky-btn-cart"
                                style={{
                                    flex: '1 1 0px',
                                    minWidth: 0,
                                    minHeight: '48px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '7px',
                                    background: showAdded ? '#2e7d32' : '#f5c518',
                                    color: showAdded ? '#ffffff' : '#1a1a1a',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.25s ease, transform 0.15s ease, box-shadow 0.25s ease',
                                    textTransform: 'uppercase',
                                    fontFamily: "'Inter', sans-serif",
                                    boxShadow: showAdded
                                        ? '0 3px 10px rgba(46, 125, 50, 0.28)'
                                        : '0 3px 10px rgba(245, 197, 24, 0.3)',
                                }}
                            >
                                {showAdded ? (
                                    <>
                                        <Check size={17} strokeWidth={2.6} />
                                        <span>✓ ADDED</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag size={17} strokeWidth={2.2} />
                                        <span>ADD TO CART</span>
                                    </>
                                )}
                            </button>

                            {/* Buy Now */}
                            <button
                                type="button"
                                onClick={onBuyNow}
                                aria-label={`Buy ${productTitle} now`}
                                className="pdp-sticky-btn-buy"
                                style={{
                                    flex: '1 1 0px',
                                    minWidth: 0,
                                    minHeight: '48px',
                                    padding: '10px 14px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: '#1a1a1a',
                                    color: '#ffffff',
                                    border: '2px solid #1a1a1a',
                                    borderRadius: '12px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    textTransform: 'uppercase',
                                    fontFamily: "'Inter', sans-serif",
                                    boxShadow: '0 3px 10px rgba(0, 0, 0, 0.18)',
                                }}
                            >
                                BUY NOW
                            </button>
                        </>
                    ) : !isProductInStock ? (
                        /* Wishlist Button if product entirely out of stock */
                        <button
                            type="button"
                            onClick={onToggleWishlist}
                            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            className="pdp-sticky-btn-wishlist"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                minHeight: '48px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                background: wishlisted ? '#fef2f2' : '#f5c518',
                                color: wishlisted ? '#ef4444' : '#1a1a1a',
                                border: wishlisted ? '2px solid #ef4444' : 'none',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                cursor: 'pointer',
                                transition: 'all 0.25s ease',
                                textTransform: 'uppercase',
                                fontFamily: "'Inter', sans-serif",
                                boxShadow: '0 3px 10px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <Heart size={17} fill={wishlisted ? '#ef4444' : 'none'} color={wishlisted ? '#ef4444' : '#1a1a1a'} />
                            <span>{wishlisted ? 'REMOVE FROM WISHLIST' : 'ADD TO WISHLIST'}</span>
                        </button>
                    ) : (
                        /* Size Out of Stock Button */
                        <button
                            type="button"
                            disabled
                            aria-label="Size out of stock"
                            className="pdp-sticky-btn-disabled"
                            style={{
                                flex: 1,
                                minWidth: 0,
                                minHeight: '48px',
                                padding: '10px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#e5e7eb',
                                color: '#9ca3af',
                                border: 'none',
                                borderRadius: '12px',
                                fontSize: '13px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                cursor: 'not-allowed',
                                textTransform: 'uppercase',
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            OUT OF STOCK (THIS SIZE)
                        </button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
