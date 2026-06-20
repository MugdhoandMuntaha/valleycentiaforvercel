'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Minus,
    Plus,
    Trash2,
    ShoppingBag,
    ArrowLeft,
    ShieldCheck,
    Truck,
    Tag,
    ChevronRight,
    Star,
    ChevronDown,
    X,
    Check,
} from 'lucide-react';
import { useCart } from '@/lib/CartContext';
import { CartPageSkeleton } from '@/components/Skeletons';
import { getProductCards, getSiteSetting, getActiveCoupons, type ProductCard as ProductCardType, type Coupon } from '@/lib/db/queries';
import ProductCard from '@/components/ProductCard';
import type { SectionProduct } from '@/data/homeSections';

function toSectionProduct(p: ProductCardType): SectionProduct {
    const badges = p.badges as { badge: string; label: string | null; color: string | null }[] | null;
    const primaryBadge = badges?.find((b) => b.label) || badges?.[0];
    const badgeText = primaryBadge ? (primaryBadge.label || primaryBadge.badge).replace(/_/g, ' ').toUpperCase() : undefined;
    const isPremium = badgeText?.toLowerCase() === 'premium';
    const formatReviewCount = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);

    return {
        id: p.id,
        slug: p.slug,
        image: p.primary_image_url || '/no-image.svg',
        title: p.name,
        description: p.short_description || '',
        price: Math.ceil(Number(p.base_price)),
        originalPrice: p.compare_at_price ? Math.ceil(Number(p.compare_at_price)) : undefined,
        discountPercent: p.discount_percent ? Number(p.discount_percent) : undefined,
        rating: Number(p.rating_avg),
        reviewCount: formatReviewCount(Number(p.review_count) || 0),
        badge: badgeText,
        badgeColor: isPremium ? '#f0c14b' : (primaryBadge?.color || undefined),
        inStock: p.in_stock !== undefined ? p.in_stock : true,
        stockQuantity: p.stock_quantity !== undefined ? p.stock_quantity : 0,
        sizes: p.sizes || null,
        couponCode: p.coupon_code || undefined,
        couponPrice: p.coupon_price ? Math.ceil(Number(p.coupon_price)) : undefined,
    };
}

export default function CartPage() {
    const { items, updateQuantity, removeFromCart, clearCart, totalItems, totalPrice, addToCart, isHydrated } = useCart();
    const [recommended, setRecommended] = useState<ProductCardType[]>([]);
    const [showStickyBtn, setShowStickyBtn] = useState(false);
    const checkoutBtnRef = useRef<HTMLAnchorElement>(null);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState(499);
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
    const [couponDropdownOpen, setCouponDropdownOpen] = useState(false);
    const [shippingFeeMin, setShippingFeeMin] = useState<number | null>(null);

    // Delete Confirmation State
    const [confirmDeleteState, setConfirmDeleteState] = useState<{ isOpen: boolean; itemId: string; itemSize?: string; itemName: string } | null>(null);

    const handleRemoveClick = (itemId: string, itemSize: string | undefined, itemName: string) => {
        setConfirmDeleteState({ isOpen: true, itemId, itemSize, itemName });
    };

    const confirmDelete = () => {
        if (confirmDeleteState) {
            removeFromCart(confirmDeleteState.itemId, confirmDeleteState.itemSize);
            setConfirmDeleteState(null);
        }
    };

    useEffect(() => {
        getProductCards().then((data) => {
            // Shuffle and pick 4 random products that aren't already in cart
            const cartIds = new Set(items.map(i => i.id));
            const filtered = data.filter(p => !cartIds.has(p.id));
            const shuffled = filtered.sort(() => Math.random() - 0.5).slice(0, 4);
            setRecommended(shuffled);
        }).catch(() => { });

        getSiteSetting('free_shipping_threshold').then((val) => {
            const v = val as { amount?: number } | null;
            if (v?.amount) setFreeShippingThreshold(v.amount);
        }).catch(() => { });

        getSiteSetting('shipping_fee').then((val) => {
            const v = val as { dhaka?: number; outside_dhaka?: number; amount?: number } | null;
            if (v?.dhaka && v?.outside_dhaka) {
                setShippingFeeMin(Math.min(v.dhaka, v.outside_dhaka));
            } else if (v?.amount) {
                setShippingFeeMin(v.amount);
            }
        }).catch(() => { });

        getActiveCoupons().then(setCoupons).catch(() => { });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                setShowStickyBtn(!entry.isIntersecting);
            },
            { threshold: 0.1 }
        );
        const currentBtn = checkoutBtnRef.current;
        if (currentBtn) {
            observer.observe(currentBtn);
        }
        return () => {
            if (currentBtn) {
                observer.unobserve(currentBtn);
            }
        };
    }, [items]);

    // Calculate coupon discount
    const couponDiscount = selectedCoupon ? (() => {
        if (totalPrice < selectedCoupon.minimum_order_value) return 0;
        if (selectedCoupon.discount_type === 'percentage') {
            let disc = Math.ceil(totalPrice * selectedCoupon.discount_value / 100);
            if (selectedCoupon.max_discount_amount) disc = Math.min(disc, selectedCoupon.max_discount_amount);
            return disc;
        }
        return selectedCoupon.discount_value;
    })() : 0;

    const savings = items.reduce((sum, item) => {
        if (item.originalPrice && item.originalPrice > item.price) {
            return sum + (item.originalPrice - item.price) * item.quantity;
        }
        return sum;
    }, 0);

    const shippingFree = totalPrice >= freeShippingThreshold;
    const amountToFreeShipping = Math.ceil(Math.max(0, freeShippingThreshold - totalPrice));

    // Prevent rendering before hydration to avoid flashing the empty state
    if (!isHydrated) {
        return <CartPageSkeleton />;
    }

    /* ===== Empty Cart ===== */
    if (items.length === 0) {
        return (
            <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                minHeight: '65vh', background: '#ffffff', fontFamily: "'Inter', sans-serif",
                padding: '48px 24px',
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ textAlign: 'center' }}
                >
                    <div style={{
                        width: '100px', height: '100px', borderRadius: '50%',
                        background: '#f8f8f5', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 24px',
                    }}>
                        <ShoppingBag size={40} color="#ccc" />
                    </div>
                    <h1 style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700,
                        color: '#1a1a1a', marginBottom: '8px',
                    }}>
                        Your cart is empty
                    </h1>
                    <p style={{ fontSize: '15px', color: '#888', marginBottom: '28px', maxWidth: '400px' }}>
                        Looks like you haven&apos;t added anything to your cart yet. Explore our products and find something you love!
                    </p>
                    <Link href="/" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '8px',
                        padding: '14px 36px', background: '#f5c518', color: '#1a1a1a', borderRadius: '12px',
                        fontWeight: 700, fontSize: '14px', textDecoration: 'none', textTransform: 'uppercase',
                        letterSpacing: '0.5px', transition: 'all 0.2s',
                    }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#e6b800'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#f5c518'; e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                        <ArrowLeft size={16} />
                        Continue Shopping
                    </Link>
                </motion.div>
            </div>
        );
    }

    /* ===== Cart with Items ===== */
    return (
        <div style={{ background: '#f8f8f5', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            {/* Breadcrumb */}
            <nav className="cart-breadcrumb" style={{
                maxWidth: '1400px', margin: '0 auto', padding: '20px 48px',
                display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#999',
            }}>
                <Link href="/" style={{ color: '#999', textDecoration: 'none', transition: 'color 0.2s' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#999'}>
                    Home
                </Link>
                <ChevronRight size={14} style={{ color: '#ccc' }} />
                <span style={{ color: '#1a1a1a', fontWeight: 500 }}>Shopping Cart</span>
            </nav>

            <div className="cart-container" style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 48px 72px' }}>
                {/* Title */}
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    marginBottom: '28px',
                }}>
                    <h1 style={{
                        fontFamily: "'Outfit', sans-serif", fontSize: '28px', fontWeight: 700,
                        color: '#1a1a1a',
                    }}>
                        Shopping Cart <span style={{ fontSize: '16px', fontWeight: 400, color: '#888' }}>
                            ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                        </span>
                    </h1>
                    <button
                        onClick={clearCart}
                        style={{
                            background: 'none', border: 'none', color: '#ef4444', fontSize: '13px',
                            fontWeight: 600, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                            transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                        onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                        Clear Cart
                    </button>
                </div>

                {/* Free Shipping Bar */}
                {!shippingFree && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: '#fff8e1', borderRadius: '12px', padding: '14px 20px',
                            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px',
                            border: '1px solid #ffd54f',
                        }}
                    >
                        <Truck size={20} color="#f59e0b" />
                        <div style={{ flex: 1 }}>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>
                                Add ৳{amountToFreeShipping.toFixed(0)} more for <strong>FREE shipping!</strong>
                            </p>
                            <div style={{
                                width: '100%', height: '4px', background: '#fde68a', borderRadius: '2px',
                                marginTop: '6px', overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${Math.min((totalPrice / freeShippingThreshold) * 100, 100)}%`,
                                    height: '100%', background: '#f59e0b', borderRadius: '2px',
                                    transition: 'width 0.4s ease',
                                }} />
                            </div>
                        </div>
                    </motion.div>
                )}
                {shippingFree && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            background: '#e8f5e9', borderRadius: '12px', padding: '14px 20px',
                            marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px',
                            border: '1px solid #a5d6a7',
                        }}
                    >
                        <Truck size={20} color="#2e7d32" />
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#2e7d32', margin: 0 }}>
                            🎉 You&apos;ve unlocked <strong>FREE shipping!</strong>
                        </p>
                    </motion.div>
                )}

                {/* Cart Grid */}
                <div className="cart-grid" style={{
                    display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start',
                }}>
                    {/* Left — Cart Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <AnimatePresence>
                            {items.map((item) => (
                                <motion.div
                                    key={`${item.id}-${item.size || ''}`}
                                    layout
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="cart-item-card"
                                    style={{
                                        background: '#ffffff', borderRadius: '16px', padding: '20px',
                                        display: 'flex', gap: '20px', border: '1px solid #f0f0f0',
                                        transition: 'box-shadow 0.2s',
                                        alignItems: 'stretch',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.05)'}
                                    onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'}
                                >
                                    {/* Image */}
                                    <Link href={`/product/${item.slug}`} className="cart-item-image" style={{
                                        position: 'relative', width: '120px', height: '120px',
                                        borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                                        background: '#f8f6f3',
                                    }}>
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            fill
                                            sizes="120px"
                                            style={{ objectFit: 'cover' }}
                                        />
                                    </Link>

                                    {/* Details */}
                                    <div className="cart-item-details" style={{ flex: 1, minWidth: 0 }}>
                                        <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none' }}>
                                            <h3 style={{
                                                fontSize: '14px', fontWeight: 600, color: '#1a1a1a',
                                                lineHeight: 1.4, marginBottom: '4px',
                                                display: '-webkit-box', WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                            }}>
                                                {item.name}
                                            </h3>
                                        </Link>
                                        {item.size && (
                                            <p style={{ fontSize: '12px', color: '#888', marginBottom: 0 }}>
                                                Size: {item.size}
                                            </p>
                                        )}
                                    </div>

                                    {/* Item Total & Actions */}
                                    <div className="cart-item-total" style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-end',
                                        textAlign: 'right',
                                        flexShrink: 0,
                                    }}>
                                        <div>
                                            <p style={{
                                                fontSize: '18px', fontWeight: 800, color: '#1a1a1a', margin: 0,
                                                fontFamily: "'Outfit', sans-serif",
                                            }}>
                                                ৳{(item.price * item.quantity).toLocaleString('en-IN')}
                                            </p>
                                            {item.quantity > 1 && (
                                                <p style={{ fontSize: '12px', color: '#999', margin: '2px 0 0' }}>
                                                    ৳{item.price} × {item.quantity}
                                                </p>
                                            )}
                                        </div>

                                        <div style={{ marginTop: '12px' }}>
                                            {/* Quantity Selector */}
                                            <div style={{
                                                display: 'flex', alignItems: 'center',
                                                border: '1.5px solid #e0e0e0', borderRadius: '10px', overflow: 'hidden',
                                                background: '#ffffff',
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        if (item.quantity <= 1) {
                                                            handleRemoveClick(item.id, item.size, item.name);
                                                        } else {
                                                            updateQuantity(item.id, item.quantity - 1, item.size);
                                                        }
                                                    }}
                                                    style={{
                                                        width: '28px', height: '28px', border: 'none', background: '#fafafa',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fafafa'}
                                                >
                                                    <Minus size={12} color="#555" />
                                                </button>
                                                <span style={{
                                                    width: '32px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '13px', fontWeight: 700, color: '#1a1a1a', background: '#fff',
                                                }}>
                                                    {item.quantity}
                                                </span>
                                                <button
                                                    onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                                                    style={{
                                                        width: '28px', height: '28px', border: 'none', background: '#fafafa',
                                                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        transition: 'background 0.15s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f0f0'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = '#fafafa'}
                                                >
                                                    <Plus size={12} color="#555" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>

                        {/* Continue Shopping Link */}
                        <Link href="/" style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            color: '#555', fontSize: '14px', fontWeight: 500, textDecoration: 'none',
                            marginTop: '8px', transition: 'color 0.2s',
                        }}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#1a1a1a'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#555'}
                        >
                            <ArrowLeft size={16} />
                            Continue Shopping
                        </Link>
                    </div>

                    {/* Right — Order Summary */}
                    <div className="cart-summary" style={{
                        background: '#ffffff', borderRadius: '16px', padding: '28px',
                        border: '1px solid #f0f0f0', position: 'sticky', top: '100px',
                    }}>
                        <h2 style={{
                            fontFamily: "'Outfit', sans-serif", fontSize: '20px', fontWeight: 700,
                            color: '#1a1a1a', marginBottom: '20px',
                        }}>
                            Order Summary
                        </h2>

                        {/* Coupon Selector */}
                        <div style={{ marginBottom: '20px', position: 'relative' }}>
                            {selectedCoupon ? (
                                /* Applied coupon display */
                                <div style={{
                                    border: '1.5px solid #2e7d32', borderRadius: '10px',
                                    padding: '12px 14px', background: 'rgba(46,125,50,0.04)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <Check size={16} color="#2e7d32" />
                                            <span style={{
                                                fontWeight: 700, fontSize: '14px', color: '#2e7d32',
                                                fontFamily: "'Outfit', sans-serif", letterSpacing: '0.5px',
                                            }}>
                                                {selectedCoupon.code}
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => setSelectedCoupon(null)}
                                            style={{
                                                background: 'none', border: 'none', cursor: 'pointer',
                                                color: '#999', padding: '2px',
                                                display: 'flex', alignItems: 'center',
                                            }}
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#2e7d32', marginTop: '4px', fontWeight: 500 }}>
                                        {selectedCoupon.discount_type === 'percentage'
                                            ? `${selectedCoupon.discount_value}% off`
                                            : `৳${selectedCoupon.discount_value} off`
                                        }
                                        {selectedCoupon.minimum_order_value > 0 && ` on orders above ৳${selectedCoupon.minimum_order_value}`}
                                        {couponDiscount > 0 && ` — You save ৳${couponDiscount}`}
                                    </div>
                                    {couponDiscount === 0 && totalPrice < selectedCoupon.minimum_order_value && (
                                        <div style={{ fontSize: '11px', color: '#d32f2f', marginTop: '4px', fontWeight: 500 }}>
                                            Add ৳{selectedCoupon.minimum_order_value - totalPrice} more to use this coupon
                                        </div>
                                    )}
                                </div>
                            ) : (
                                /* Dropdown selector */
                                <div>
                                    <button
                                        onClick={() => setCouponDropdownOpen(!couponDropdownOpen)}
                                        style={{
                                            display: 'flex', alignItems: 'center', width: '100%',
                                            gap: '0', border: '1.5px solid #e0e0e0', borderRadius: '10px',
                                            overflow: 'hidden', background: '#fff', cursor: 'pointer',
                                            padding: 0, textAlign: 'left',
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            padding: '0 14px', background: '#fafafa',
                                            borderRight: '1px solid #e0e0e0', alignSelf: 'stretch',
                                        }}>
                                            <Tag size={16} color="#888" />
                                        </div>
                                        <span style={{
                                            flex: 1, padding: '12px 14px', fontSize: '13px',
                                            fontFamily: "'Inter', sans-serif",
                                            color: '#888',
                                        }}>
                                            {coupons.length > 0 ? `${coupons.length} coupons available` : 'No coupons available'}
                                        </span>
                                        <div style={{ padding: '0 14px' }}>
                                            <ChevronDown
                                                size={16}
                                                color="#888"
                                                style={{
                                                    transition: 'transform 0.2s',
                                                    transform: couponDropdownOpen ? 'rotate(180deg)' : 'rotate(0)',
                                                }}
                                            />
                                        </div>
                                    </button>

                                    {/* Dropdown List */}
                                    {couponDropdownOpen && coupons.length > 0 && (
                                        <div style={{
                                            position: 'absolute', left: 0, right: 0, top: '100%',
                                            marginTop: '4px', background: '#fff',
                                            border: '1.5px solid #e0e0e0', borderRadius: '10px',
                                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
                                            zIndex: 20, maxHeight: '240px', overflowY: 'auto',
                                        }}>
                                            {coupons.map((coupon) => {
                                                const meetsMin = totalPrice >= coupon.minimum_order_value;
                                                return (
                                                    <button
                                                        key={coupon.id}
                                                        onClick={() => {
                                                            setSelectedCoupon(coupon);
                                                            setCouponDropdownOpen(false);
                                                        }}
                                                        style={{
                                                            display: 'flex', alignItems: 'center', gap: '12px',
                                                            width: '100%', padding: '12px 16px',
                                                            border: 'none', background: 'transparent',
                                                            cursor: 'pointer', textAlign: 'left',
                                                            borderBottom: '1px solid #f5f5f5',
                                                            transition: 'background 0.15s',
                                                            opacity: meetsMin ? 1 : 0.55,
                                                        }}
                                                        onMouseEnter={e => e.currentTarget.style.background = '#fafafa'}
                                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                                    >
                                                        <div style={{
                                                            width: '40px', height: '40px', borderRadius: '8px',
                                                            background: 'linear-gradient(135deg, #f5c518, #e6b800)',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0,
                                                        }}>
                                                            <Tag size={16} color="#1a1a1a" />
                                                        </div>
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{
                                                                fontWeight: 700, fontSize: '13px', color: '#1a1a1a',
                                                                fontFamily: "'Outfit', sans-serif",
                                                                letterSpacing: '0.5px',
                                                            }}>
                                                                {coupon.code}
                                                            </div>
                                                            <div style={{
                                                                fontSize: '11px', color: '#888', marginTop: '2px',
                                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                            }}>
                                                                {coupon.description || (
                                                                    coupon.discount_type === 'percentage'
                                                                        ? `${coupon.discount_value}% off`
                                                                        : `৳${coupon.discount_value} off`
                                                                )}
                                                                {coupon.minimum_order_value > 0 && ` • Min ৳${coupon.minimum_order_value}`}
                                                            </div>
                                                            {!meetsMin && (
                                                                <div style={{ fontSize: '10px', color: '#d32f2f', marginTop: '2px', fontWeight: 500 }}>
                                                                    Need ৳{coupon.minimum_order_value - totalPrice} more
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div style={{
                                                            fontWeight: 800, fontSize: '14px',
                                                            color: meetsMin ? '#2e7d32' : '#999',
                                                            fontFamily: "'Outfit', sans-serif",
                                                            whiteSpace: 'nowrap',
                                                        }}>
                                                            {coupon.discount_type === 'percentage'
                                                                ? `${coupon.discount_value}%`
                                                                : `৳${coupon.discount_value}`
                                                            }
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Price Breakdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>Subtotal ({totalItems} items)</span>
                                <span style={{ fontWeight: 600, color: '#1a1a1a' }}>৳{totalPrice.toLocaleString('en-IN')}</span>
                            </div>
                            {savings > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#2e7d32' }}>You Save</span>
                                    <span style={{ fontWeight: 600, color: '#2e7d32' }}>-৳{savings.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            {couponDiscount > 0 && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                    <span style={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Tag size={13} /> Coupon ({selectedCoupon?.code})
                                    </span>
                                    <span style={{ fontWeight: 600, color: '#2e7d32' }}>-৳{couponDiscount.toLocaleString('en-IN')}</span>
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                                <span style={{ color: '#666' }}>Shipping</span>
                                <span style={{ fontWeight: 600, color: shippingFree ? '#2e7d32' : '#1a1a1a' }}>
                                    {shippingFree ? 'FREE' : (shippingFeeMin ? `From ৳${shippingFeeMin}` : 'Calculated at checkout')}
                                </span>
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '16px' }} />

                        {/* Total */}
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                            marginBottom: '24px',
                        }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>Total</span>
                            <span style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a1a' }}>
                                ৳{(totalPrice - couponDiscount).toLocaleString('en-IN')}
                            </span>
                        </div>

                        {/* Checkout Button */}
                        <Link ref={checkoutBtnRef} href="/checkout" className="cart-checkout-btn" style={{
                            display: 'block', width: '100%', padding: '16px', background: '#f5c518', color: '#1a1a1a',
                            border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
                            letterSpacing: '0.5px', cursor: 'pointer', transition: 'all 0.2s ease',
                            textTransform: 'uppercase', fontFamily: "'Inter', sans-serif", marginBottom: '12px',
                            textDecoration: 'none', textAlign: 'center',
                        }}
                            onClick={() => {
                                // Save coupon info for checkout page
                                if (selectedCoupon && couponDiscount > 0) {
                                    sessionStorage.setItem('checkout_coupon', JSON.stringify({
                                        code: selectedCoupon.code,
                                        discount: couponDiscount,
                                    }));
                                } else {
                                    sessionStorage.removeItem('checkout_coupon');
                                }
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#e6b800'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#f5c518'; e.currentTarget.style.transform = 'translateY(0)'; }}
                        >
                            Proceed to Checkout
                        </Link>

                        {/* Trust Icons */}
                        <div style={{
                            display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '16px',
                            paddingTop: '16px', borderTop: '1px solid #f0f0f0',
                        }}>
                            {[
                                { icon: ShieldCheck, label: '100% Genuine' },
                                { icon: Truck, label: 'Free Shipping' },
                            ].map((item, i) => (
                                <div key={i} style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                }}>
                                    <item.icon size={16} color="#2e7d32" />
                                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#888' }}>
                                        {item.label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ===== Recommended For You ===== */}
                {recommended.length > 0 && (
                    <div style={{ marginTop: '48px' }}>
                        <h2 style={{
                            fontFamily: "'Outfit', sans-serif", fontSize: '22px', fontWeight: 700,
                            color: '#1a1a1a', marginBottom: '20px',
                        }}>
                            Complete your basket
                        </h2>
                        <div className="cart-recommended-grid" style={{
                            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px',
                        }}>
                            {recommended.map((product, index) => (
                                <ProductCard
                                    key={product.id}
                                    product={toSectionProduct(product)}
                                    index={index}
                                    isCarousel={false}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {confirmDeleteState && confirmDeleteState.isOpen && (
                    <div
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0, 0, 0, 0.6)',
                            backdropFilter: 'blur(4px)',
                            WebkitBackdropFilter: 'blur(4px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: '16px',
                        }}
                        onClick={() => setConfirmDeleteState(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{
                                width: '100%',
                                maxWidth: '400px',
                                background: '#ffffff',
                                borderRadius: '20px',
                                padding: '24px',
                                boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                textAlign: 'center',
                                border: '1px solid #f0f0f0',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 style={{
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: '20px',
                                fontWeight: 700,
                                color: '#1a1a1a',
                                margin: 0,
                            }}>
                                Remove Item?
                            </h3>
                            <p style={{
                                fontFamily: "'Inter', sans-serif",
                                fontSize: '14px',
                                color: '#666',
                                lineHeight: 1.5,
                                margin: 0,
                            }}>
                                Are you sure you want to remove <strong>{confirmDeleteState.itemName}</strong> from your cart?
                            </p>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={() => setConfirmDeleteState(null)}
                                    style={{
                                        flex: 1,
                                        padding: '12px 0',
                                        border: '1.5px solid #e0e0e0',
                                        borderRadius: '12px',
                                        background: 'transparent',
                                        color: '#666',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#fcfcfc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    style={{
                                        flex: 1,
                                        padding: '12px 0',
                                        border: 'none',
                                        borderRadius: '12px',
                                        background: '#1a1a1a',
                                        color: '#ffffff',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        transition: 'background 0.2s',
                                        fontFamily: "'Inter', sans-serif",
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#333333'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = '#1a1a1a'}
                                >
                                    Remove
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {showStickyBtn && (
                <Link
                    href="/checkout"
                    className="cart-sticky-checkout-btn"
                    style={{
                        background: '#f5c518',
                        color: '#1a1a1a',
                        fontSize: '15px',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        fontFamily: "'Inter', sans-serif",
                        textDecoration: 'none',
                        textAlign: 'center',
                    }}
                    onClick={() => {
                        if (selectedCoupon && couponDiscount > 0) {
                            sessionStorage.setItem('checkout_coupon', JSON.stringify({
                                code: selectedCoupon.code,
                                discount: couponDiscount,
                            }));
                        } else {
                            sessionStorage.removeItem('checkout_coupon');
                        }
                    }}
                >
                    Proceed to Checkout (৳{(totalPrice - couponDiscount).toLocaleString('en-IN')})
                </Link>
            )}
        </div>
    );
}
