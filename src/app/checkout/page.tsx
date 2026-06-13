'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, MapPin, CreditCard, Loader2, Plus, Shield, Truck, Package,
    Home, Briefcase, Check, X, Lock, Wallet, Edit3, Trash2, Save, Tag, ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useCart } from '@/lib/CartContext';
import { CheckoutPageSkeleton } from '@/components/Skeletons';
import { getUserAddresses, createAddress, updateAddress, deleteAddress, getSiteSetting, getActiveCoupons } from '@/lib/db/queries';
import type { UserAddress, AddressFormData, CouponData } from '@/lib/db/queries';

const emptyAddress: AddressFormData = {
    label: 'Home', full_name: '', phone: '', address_line_1: '',
    address_line_2: '', city: '', state: '', postal_code: '', country: 'Bangladesh',
    landmark: '', is_default: false,
};

export default function CheckoutPage() {
    const { user, loading: authLoading } = useAuth();
    const { items, totalPrice, clearCart, isHydrated, updateQuantity, removeFromCart } = useCart();
    const router = useRouter();

    const [addresses, setAddresses] = useState<UserAddress[]>([]);
    const [selectedAddr, setSelectedAddr] = useState<string | null>(null);
    const [addrLoading, setAddrLoading] = useState(true);
    const [showAddrForm, setShowAddrForm] = useState(false);
    const [editingAddrId, setEditingAddrId] = useState<string | null>(null);
    const [addrForm, setAddrForm] = useState<AddressFormData>(emptyAddress);
    const [addrSaving, setAddrSaving] = useState(false);
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [paying, setPaying] = useState(false);
    const [error, setError] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('cod');
    const navigatingAway = useRef(false);
    const [guestEmail, setGuestEmail] = useState('');
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [detectingLocation, setDetectingLocation] = useState(false);

    const handleDetectLocation = () => {
        if (typeof window !== 'undefined' && !window.isSecureContext) {
            setError('Auto-detect requires a secure (HTTPS) connection on mobile devices. Please enter address details manually or use an HTTPS connection.');
            return;
        }
        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser.');
            return;
        }
        setDetectingLocation(true);
        setError('');

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(`/api/geocode?lat=${latitude}&lon=${longitude}`);
                    const data = await res.json();

                    if (data && data.address) {
                        const addr = data.address;
                        const road = addr.road || addr.street || '';
                        const suburb = addr.suburb || addr.neighbourhood || addr.village || addr.town || '';
                        const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
                        const state = (addr.state_district || addr.county || addr.state || '').replace(/\b(District|Division)\b/gi, '').trim();
                        const postalCode = addr.postcode || '';
                        const country = addr.country || 'Bangladesh';

                        const line1 = [road, suburb].filter(Boolean).join(', ') || city;
                        const line2 = addr.suburb || '';

                        const mapped = {
                            address_line_1: line1,
                            address_line_2: line2,
                            city: city,
                            state: state,
                            postal_code: postalCode,
                            country: country,
                        };

                        setAddrForm(prev => ({
                            ...prev,
                            ...mapped,
                        }));
                    } else {
                        setError('Could not retrieve address details for your coordinates.');
                    }
                } catch (err) {
                    setError('Failed to fetch address. Please enter manually.');
                } finally {
                    setDetectingLocation(false);
                }
            },
            (err) => {
                setError(err.message || 'Geolocation access denied.');
                setDetectingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const addressSectionRef = useRef<HTMLDivElement>(null);
    const [shakeWarning, setShakeWarning] = useState(false);
    const [blinkAddresses, setBlinkAddresses] = useState(false);
    const [showWarning, setShowWarning] = useState(false);
    const [freeShippingThreshold, setFreeShippingThreshold] = useState(999);
    const [shippingFeeDhaka, setShippingFeeDhaka] = useState(80);
    const [shippingFeeOutside, setShippingFeeOutside] = useState(150);
    const [promoCode, setPromoCode] = useState<string | null>(null);
    const [promoDiscount, setPromoDiscount] = useState(0);
    const [availableCoupons, setAvailableCoupons] = useState<CouponData[]>([]);
    const [showCouponSelector, setShowCouponSelector] = useState(false);

    const selectedAddress = addrForm;
    const isDhaka = selectedAddress?.city?.toLowerCase().includes('dhaka') ?? false;
    const shippingFee = isDhaka ? shippingFeeDhaka : shippingFeeOutside;
    const shipping = totalPrice >= freeShippingThreshold ? 0 : shippingFee;
    const grandTotal = Math.ceil(totalPrice - promoDiscount + shipping);

    useEffect(() => {
        Promise.all([
            getSiteSetting('free_shipping_threshold'),
            getSiteSetting('shipping_fee'),
        ]).then(([threshold, fee]) => {
            const t = threshold as { amount?: number } | null;
            const f = fee as { dhaka?: number; outside_dhaka?: number; amount?: number } | null;
            if (t?.amount) setFreeShippingThreshold(t.amount);
            if (f?.dhaka) setShippingFeeDhaka(f.dhaka);
            if (f?.outside_dhaka) setShippingFeeOutside(f.outside_dhaka);
            if (!f?.dhaka && f?.amount) { setShippingFeeDhaka(f.amount); setShippingFeeOutside(f.amount); }
        }).catch(() => { });

        // Fetch coupons
        getActiveCoupons().then(data => {
            setAvailableCoupons(data || []);
        }).catch(() => { });
    }, []);

    useEffect(() => {
        try {
            const raw = sessionStorage.getItem('checkout_coupon');
            if (raw) {
                const couponData = JSON.parse(raw);
                if (couponData.code && couponData.discount > 0) {
                    setPromoCode(couponData.code);
                    setPromoDiscount(couponData.discount);
                }
            }
        } catch { /* ignore */ }
    }, []);

    const handleApplyCoupon = (coupon: CouponData) => {
        let discount = 0;
        if (coupon.discount_type === 'percentage') {
            discount = Math.ceil((totalPrice * coupon.discount_value) / 100);
            if (coupon.max_discount_amount && discount > coupon.max_discount_amount) {
                discount = coupon.max_discount_amount;
            }
        } else {
            discount = coupon.discount_value;
        }

        setPromoCode(coupon.code);
        setPromoDiscount(discount);
        setShowCouponSelector(false);

        try {
            sessionStorage.setItem('checkout_coupon', JSON.stringify({
                code: coupon.code,
                discount: discount
            }));
        } catch { /* ignore */ }
    };

    const handleRemoveCoupon = () => {
        setPromoCode(null);
        setPromoDiscount(0);
        try {
            sessionStorage.removeItem('checkout_coupon');
        } catch { /* ignore */ }
    };

    // Recalculate coupon discount if subtotal (totalPrice) changes
    useEffect(() => {
        if (promoCode && availableCoupons.length > 0) {
            const activeCoupon = availableCoupons.find(c => c.code === promoCode);
            if (activeCoupon) {
                if (totalPrice < activeCoupon.minimum_order_value) {
                    handleRemoveCoupon();
                } else {
                    let discount = 0;
                    if (activeCoupon.discount_type === 'percentage') {
                        discount = Math.ceil((totalPrice * activeCoupon.discount_value) / 100);
                        if (activeCoupon.max_discount_amount && discount > activeCoupon.max_discount_amount) {
                            discount = activeCoupon.max_discount_amount;
                        }
                    } else {
                        discount = activeCoupon.discount_value;
                    }
                    setPromoDiscount(discount);
                    try {
                        sessionStorage.setItem('checkout_coupon', JSON.stringify({
                            code: activeCoupon.code,
                            discount: discount
                        }));
                    } catch { /* ignore */ }
                }
            }
        }
    }, [totalPrice, promoCode, availableCoupons]);

    useEffect(() => {
        if (isHydrated && !authLoading && items.length === 0 && !navigatingAway.current) {
            router.push('/cart');
        }
    }, [items, authLoading, router, isHydrated]);

    const loadAddresses = useCallback(async () => {
        if (!user) return;
        setAddrLoading(true);
        const data = await getUserAddresses(user.id);
        setAddresses(data);
        
        // Auto fill form with default or first address
        const defaultAddr = data.find(a => a.is_default) || data[0];
        if (defaultAddr) {
            setSelectedAddr(defaultAddr.id);
            setAddrForm({
                label: defaultAddr.label || 'Home',
                full_name: defaultAddr.full_name || '',
                phone: defaultAddr.phone || '',
                address_line_1: defaultAddr.address_line_1 || '',
                address_line_2: defaultAddr.address_line_2 || '',
                city: defaultAddr.city || '',
                state: defaultAddr.state || '',
                postal_code: defaultAddr.postal_code || '',
                country: defaultAddr.country || 'Bangladesh',
                landmark: defaultAddr.landmark || '',
                is_default: defaultAddr.is_default || false,
            });
            setEditingAddrId(defaultAddr.id);
        }
        setAddrLoading(false);
    }, [user]);

    useEffect(() => {
        if (user) {
            loadAddresses();
        } else {
            setAddrLoading(false);
        }
    }, [user, loadAddresses]);

    const handleAddrSave = async () => {
        if (!user) return;
        const state = addrForm.state?.trim() || '';
        const postal_code = addrForm.postal_code?.trim() || '1000';
        const country = addrForm.country?.trim() || 'Bangladesh';
        const label = addrForm.label?.trim() || 'Home';

        const updatedAddrForm = {
            ...addrForm,
            state,
            postal_code,
            country,
            label,
        };

        if (!updatedAddrForm.full_name || !updatedAddrForm.phone || !updatedAddrForm.address_line_1 || !updatedAddrForm.city || !updatedAddrForm.state) {
            setError('Please fill all required fields'); return;
        }
        setAddrSaving(true);
        setError('');
        let newAddrId = editingAddrId;
        if (editingAddrId) {
            const res = await updateAddress(editingAddrId, user.id, updatedAddrForm);
            setAddrSaving(false);
            if (res.error) { setError(res.error); return; }
        } else {
            const res = await createAddress(user.id, updatedAddrForm);
            setAddrSaving(false);
            if (res.error) { setError(res.error); return; }
            if (res.id) {
                newAddrId = res.id;
                setSelectedAddr(res.id);
            }
        }
        const data = await getUserAddresses(user.id);
        setAddresses(data);
        if (newAddrId) {
            setEditingAddrId(newAddrId);
            setSelectedAddr(newAddrId);
        }
    };

    const handleAddrDelete = async () => {
        if (!deleteConfirmId) return;
        await deleteAddress(deleteConfirmId);
        if (selectedAddr === deleteConfirmId) {
            setSelectedAddr(null);
            setEditingAddrId(null);
            setAddrForm(emptyAddress);
        }
        setDeleteConfirmId(null);
        await loadAddresses();
    };

    const handlePay = async () => {
        if (!user && !agreedToTerms) {
            setError('You must agree to the Terms of Service and Privacy Policy to place your order.');
            return;
        }
        
        let email = '';
        if (user) {
            email = user.email || '';
        } else {
            if (guestEmail && !guestEmail.includes('@')) {
                setError('Please enter a valid email address');
                return;
            }
            email = guestEmail || 'guest@valleycentia.com';
        }

        const state = addrForm.state?.trim() || '';
        const postal_code = addrForm.postal_code?.trim() || '1000';
        const country = addrForm.country?.trim() || 'Bangladesh';
        const label = addrForm.label?.trim() || 'Home';

        const addr = {
            ...addrForm,
            state,
            postal_code,
            country,
            label,
        };

        if (!addr.full_name || !addr.phone || !addr.address_line_1 || !addr.city || !addr.state) {
            setError('Please fill all required delivery fields');
            return;
        }

        setPaying(true);
        setError('');

        try {
            const orderPayload = {
                userId: user ? user.id : 'guest',
                email: email,
                items: items.map(i => ({ id: i.id, name: i.name, image: i.image, slug: i.slug, size: i.size, quantity: i.quantity, price: i.price })),
                address: {
                    full_name: addr.full_name,
                    phone: addr.phone,
                    address_line_1: addr.address_line_1,
                    address_line_2: addr.address_line_2,
                    city: addr.city,
                    state: addr.state,
                    postal_code: addr.postal_code,
                    country: addr.country,
                },
                subtotal: totalPrice,
                shipping,
                tax: 0,
                total: grandTotal,
            };

            if (paymentMethod === 'cod') {
                const res = await fetch('/api/payment/cod', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload),
                });
                const data = await res.json();
                if (data.success) {
                    sessionStorage.setItem('cod_order', JSON.stringify({
                        orderNumber: data.orderNumber,
                        items: data.items,
                        address: orderPayload.address,
                        subtotal: totalPrice,
                        shipping,
                        total: grandTotal,
                        promoCode: promoCode || undefined,
                        promoDiscount: promoDiscount > 0 ? promoDiscount : undefined,
                    }));
                    navigatingAway.current = true;
                    clearCart();
                    window.location.href = '/checkout/cod-confirmed';
                } else {
                    setError(data.error || 'Failed to place order');
                    setPaying(false);
                }
            } else {
                const res = await fetch('/api/payment/init', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(orderPayload),
                });
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    setError(data.error || 'Payment initiation failed');
                    setPaying(false);
                }
            }
        } catch {
            setError('Network error. Please try again.');
            setPaying(false);
        }
    };

    if (authLoading || !isHydrated) {
        return <CheckoutPageSkeleton />;
    }

    return (
        <div className="co-root">
            {/* ── Header ── */}
            <div className="co-header">
                <div className="co-header-inner">
                    <Link href="/cart" className="co-back-link">
                        <ArrowLeft size={15} /> Back to Cart
                    </Link>
                    <h1 className="co-title" style={{color:'black'}}>Checkout</h1>
                </div>
            </div>

            {/* ── Main Layout ── */}
            <div className="co-layout">
                
                {/* Free Shipping Progress Bar
                {totalPrice > 0 && (
                    <div style={{
                        gridColumn: '1 / -1',
                        background: '#fffbeb',
                        border: '1px solid #fde68a',
                        borderRadius: '12px',
                        padding: '12px 18px',
                        marginBottom: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '13px',
                        color: '#78350f',
                        fontWeight: 600,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Truck size={16} color="#d97706" />
                                {totalPrice >= freeShippingThreshold ? (
                                    <span>🎉 Congratulations! You have qualified for <strong>FREE shipping</strong>!</span>
                                ) : (
                                    <span>
                                        Add <strong>৳{(freeShippingThreshold - totalPrice).toLocaleString()}</strong> more for <strong>FREE shipping!</strong>
                                    </span>
                                )}
                            </div>
                        </div>
                        <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#f3f4f6',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            marginTop: '2px'
                        }}>
                            <div style={{
                                width: `${Math.min((totalPrice / freeShippingThreshold) * 100, 100)}%`,
                                height: '100%',
                                background: '#f5c518',
                                borderRadius: '10px',
                                transition: 'width 0.4s ease-out'
                            }} />
                        </div>
                    </div>
                )} */}
                

                {/* ── Left Column ── */}
                <div className="co-left">
                    {/* Step 1: Address */}
                    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                        <div ref={addressSectionRef} className="co-card">
                            <div className="co-step-header">
                                <div className="co-step-num">1</div>
                                <h2 className="co-step-title">Delivery Address</h2>
                            </div>

                            {addrLoading ? (
                                <div className="co-center-pad">
                                    <Loader2 size={20} color="#f5c518" className="co-spinner" />
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    {/* Select Saved Address Dropdown */}
                                    {user && addresses.length > 0 && (
                                        <div style={{ marginBottom: '6px' }}>
                                            <label className="co-label">Select Saved Address</label>
                                            <select
                                                className="co-input"
                                                value={selectedAddr || ''}
                                                onChange={e => {
                                                    const addrId = e.target.value;
                                                    setSelectedAddr(addrId);
                                                    const selected = addresses.find(a => a.id === addrId);
                                                    if (selected) {
                                                        setAddrForm({
                                                            label: selected.label || 'Home',
                                                            full_name: selected.full_name || '',
                                                            phone: selected.phone || '',
                                                            address_line_1: selected.address_line_1 || '',
                                                            address_line_2: selected.address_line_2 || '',
                                                            city: selected.city || '',
                                                            state: selected.state || '',
                                                            postal_code: selected.postal_code || '',
                                                            country: selected.country || 'Bangladesh',
                                                            landmark: selected.landmark || '',
                                                            is_default: selected.is_default || false,
                                                        });
                                                        setEditingAddrId(selected.id);
                                                    } else {
                                                        setAddrForm(emptyAddress);
                                                        setEditingAddrId(null);
                                                    }
                                                }}
                                            >
                                                <option value="">-- Choose a saved address --</option>
                                                {addresses.map(a => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.label} ({a.full_name} - {a.city})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Auto Detect Location Button */}
                                    <button
                                        type="button"
                                        disabled={detectingLocation}
                                        onClick={handleDetectLocation}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                            width: '100%', padding: '12px', background: '#fafafa', border: '1.5px solid #e0e0e0',
                                            borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: '#1a1a1a',
                                            cursor: detectingLocation ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                            fontFamily: "'Inter', sans-serif", marginBottom: '6px'
                                        }}
                                        onMouseEnter={e => { if (!detectingLocation) { e.currentTarget.style.background = '#f0f0f0'; e.currentTarget.style.borderColor = '#ccc'; } }}
                                        onMouseLeave={e => { if (!detectingLocation) { e.currentTarget.style.background = '#fafafa'; e.currentTarget.style.borderColor = '#e0e0e0'; } }}
                                    >
                                        {detectingLocation ? (
                                            <>
                                                <Loader2 size={16} className="co-spinner" />
                                                Detecting Exact Address...
                                            </>
                                        ) : (
                                            <>
                                                <MapPin size={16} color="#d4a300" />
                                                Auto Detect My Location
                                            </>
                                        )}
                                    </button>

                                    {/* Email Address for Guest Users */}
                                    {!user && (
                                        <div className="co-form-field">
                                            <label className="co-label">Email Address *</label>
                                            <input
                                                type="email"
                                                value={guestEmail}
                                                onChange={e => setGuestEmail(e.target.value)}
                                                placeholder="you@example.com"
                                                className="co-input"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* Form Fields */}
                                    <div className="co-form-field">
                                        <label className="co-label">Full Name *</label>
                                        <input value={addrForm.full_name} onChange={e => setAddrForm(p => ({ ...p, full_name: e.target.value }))} className="co-input" placeholder="Your full name" required />
                                    </div>
                                    <div className="co-form-field">
                                        <label className="co-label">Phone Number *</label>
                                        <input value={addrForm.phone} onChange={e => setAddrForm(p => ({ ...p, phone: e.target.value }))} className="co-input" placeholder="017XXXXXXXX" required />
                                    </div>
                                    <div className="co-form-grid">
                                        <div>
                                            <label className="co-label">District *</label>
                                            <input value={addrForm.state || ''} onChange={e => setAddrForm(p => ({ ...p, state: e.target.value }))} className="co-input" placeholder="District" required />
                                        </div>
                                        <div>
                                            <label className="co-label">City *</label>
                                            <input value={addrForm.city} onChange={e => setAddrForm(p => ({ ...p, city: e.target.value }))} className="co-input" placeholder="City" required />
                                        </div>
                                    </div>
                                    <div className="co-form-field">
                                        <label className="co-label">Full Address *</label>
                                        <input value={addrForm.address_line_1} onChange={e => setAddrForm(p => ({ ...p, address_line_1: e.target.value }))} className="co-input" placeholder="e.g. Village: X, Post: Y, House: Z" required />
                                    </div>

                                    {/* Save & Use Button for Logged-in Users */}
                                    {user && (
                                        <button
                                            onClick={handleAddrSave}
                                            disabled={addrSaving}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                                padding: '10px 18px', background: '#1a1a1a', color: '#f5c518',
                                                border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                                                cursor: addrSaving ? 'not-allowed' : 'pointer', fontFamily: "'Inter', sans-serif",
                                                marginTop: '4px', width: 'fit-content'
                                            }}
                                        >
                                            {addrSaving ? (
                                                <Loader2 size={14} className="co-spinner" />
                                            ) : (
                                                <Check size={14} />
                                            )}
                                            Save & Use
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Interactive Order Items */}
                    <div className="co-checkout-items">
                        {items.map((item) => {
                        const key = item.size ? `${item.id}-${item.size}` : item.id;
                        const discount = item.originalPrice ? Math.ceil(((item.originalPrice - item.price) / item.originalPrice) * 100) : 0;
                        return (
                            <motion.div
                                key={key}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3 }}
                                className="co-card"
                                style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', padding: '20px 24px', marginTop: '14px' }}
                            >
                                <div style={{ width: '84px', height: '84px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #ebebeb', flexShrink: 0, background: '#f9f9f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', margin: '0 0 6px 0', fontFamily: "'Inter', sans-serif", lineHeight: 1.4 }}>
                                                {item.name}
                                            </h3>
                                            {item.size && (
                                                <div style={{ marginBottom: '8px' }}>
                                                    <span style={{ fontSize: '11px', color: '#666', background: '#f0f0f0', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                                                        Size: {item.size}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Price Row */}
                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a1a' }}>
                                                    ৳{item.price.toLocaleString()}
                                                </span>
                                                {item.originalPrice && (
                                                    <>
                                                        <span style={{ fontSize: '13px', color: '#aaa', textDecoration: 'line-through' }}>
                                                            ৳{Math.ceil(item.originalPrice).toLocaleString()}
                                                        </span>
                                                        {discount > 0 && (
                                                            <span style={{ fontSize: '12px', color: '#22c55e', fontWeight: 700 }}>
                                                                {discount}% OFF
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>

                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <span style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a1a' }}>
                                                ৳{(item.price * item.quantity).toLocaleString()}
                                            </span>
                                            {item.quantity > 1 && (
                                                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                                    ৳{item.price.toLocaleString()} × {item.quantity}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Row: Quantity Selector + Remove Button */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden', height: '32px', background: '#fff' }}>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity - 1, item.size)}
                                                disabled={item.quantity <= 1}
                                                style={{ width: '32px', height: '100%', border: 'none', background: 'none', cursor: item.quantity <= 1 ? 'not-allowed' : 'pointer', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.quantity <= 1 ? '#ccc' : '#666', outline: 'none' }}
                                            >
                                                -
                                            </button>
                                            <span style={{ width: '36px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#1a1a1a' }}>
                                                {item.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateQuantity(item.id, item.quantity + 1, item.size)}
                                                disabled={item.quantity >= (item.stockQuantity || 999)}
                                                style={{ width: '32px', height: '100%', border: 'none', background: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', outline: 'none' }}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeFromCart(item.id, item.size)}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', border: 'none', background: 'none', cursor: 'pointer', padding: '4px 8px', fontSize: '12px', fontWeight: 600, color: '#ef4444', borderRadius: '6px', transition: 'background 0.2s' }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            <Trash2 size={13} /> Remove
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                    </div>
                </div>

                {/* ── Right Column: Summary ── */}
                <motion.div
                    className="co-summary-wrap"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                >
                    <div className="co-card">
                        <h3 className="co-summary-title">Order Summary</h3>

                        {/* Coupon Selector */}
                        <div style={{ position: 'relative', marginBottom: '16px', marginTop: '6px' }}>
                            <div
                                onClick={() => setShowCouponSelector(!showCouponSelector)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    background: '#f8fafc',
                                    transition: 'all 0.2s',
                                    userSelect: 'none'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.background = '#f1f5f9';
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.borderColor = '#e2e8f0';
                                    e.currentTarget.style.background = '#f8fafc';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '13px', fontWeight: 500 }}>
                                    <Tag size={15} style={{ color: '#94a3b8' }} />
                                    {promoCode ? (
                                        <span style={{ color: '#0f172a', fontWeight: 700 }}>
                                            {promoCode} Applied
                                        </span>
                                    ) : (
                                        <span>
                                            {availableCoupons.length > 0
                                                ? `${availableCoupons.length} coupons available`
                                                : 'Apply Coupon'
                                            }
                                        </span>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {promoCode && (
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRemoveCoupon();
                                            }}
                                            style={{
                                                border: 'none',
                                                background: 'none',
                                                color: '#ef4444',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                cursor: 'pointer',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                            }}
                                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                                            onMouseLeave={e => e.currentTarget.style.background = 'none'}
                                        >
                                            Remove
                                        </button>
                                    )}
                                    <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
                                        <ChevronDown size={14} style={{ transform: showCouponSelector ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                                    </span>
                                </div>
                            </div>

                            {/* Dropdown list of available coupons */}
                            <AnimatePresence>
                                {showCouponSelector && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: '#fff',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '12px',
                                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                            zIndex: 50,
                                            marginTop: '6px',
                                            maxHeight: '220px',
                                            overflowY: 'auto',
                                            padding: '8px'
                                        }}
                                    >
                                        {availableCoupons.length === 0 ? (
                                            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                                                No coupons available right now
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {availableCoupons.map((coupon) => {
                                                    const isEligible = totalPrice >= coupon.minimum_order_value;
                                                    const isSelected = promoCode === coupon.code;
                                                    return (
                                                        <div
                                                            key={coupon.id}
                                                            onClick={() => {
                                                                if (isEligible) {
                                                                    handleApplyCoupon(coupon);
                                                                }
                                                            }}
                                                            style={{
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                cursor: isEligible ? 'pointer' : 'not-allowed',
                                                                border: isSelected ? '1.5px solid #f5c518' : '1px solid #f1f5f9',
                                                                background: isSelected ? 'rgba(245,197,24,0.03)' : (isEligible ? '#fff' : '#f8fafc'),
                                                                opacity: isEligible ? 1 : 0.6,
                                                                transition: 'all 0.15s'
                                                            }}
                                                            onMouseEnter={e => {
                                                                if (isEligible && !isSelected) {
                                                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                                                    e.currentTarget.style.background = '#f8fafc';
                                                                }
                                                            }}
                                                            onMouseLeave={e => {
                                                                if (isEligible && !isSelected) {
                                                                    e.currentTarget.style.borderColor = '#f1f5f9';
                                                                    e.currentTarget.style.background = '#fff';
                                                                }
                                                            }}
                                                        >
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                                                                <span style={{ fontSize: '13px', fontWeight: 800, color: isEligible ? '#1e293b' : '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                                                    {coupon.code}
                                                                </span>
                                                                <span style={{ fontSize: '12px', fontWeight: 700, color: '#0d6b3d' }}>
                                                                    {coupon.discount_type === 'percentage'
                                                                        ? `${coupon.discount_value}% OFF`
                                                                        : `৳${coupon.discount_value} OFF`
                                                                    }
                                                                </span>
                                                            </div>
                                                            <p style={{ fontSize: '11px', color: '#64748b', margin: '0 0 4px 0', lineHeight: 1.3 }}>
                                                                {coupon.description}
                                                            </p>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#94a3b8' }}>
                                                                <span>Min. spend: ৳{coupon.minimum_order_value}</span>
                                                                {!isEligible && (
                                                                    <span style={{ color: '#ef4444', fontWeight: 600 }}>
                                                                        Needs ৳{(coupon.minimum_order_value - totalPrice).toLocaleString()} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <div className="co-summary-rows">
                            <div className="co-summary-row">
                                <span className="co-summary-label">Subtotal</span>
                                <span className="co-summary-val">৳{totalPrice.toLocaleString()}</span>
                            </div>
                            {promoCode && promoDiscount > 0 && (
                                <div className="co-summary-row">
                                    <span className="co-summary-label co-summary-label--green">
                                        <Tag size={12} /> Coupon ({promoCode})
                                    </span>
                                    <span className="co-summary-val co-summary-val--green">-৳{promoDiscount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="co-summary-row">
                                <span className="co-summary-label">Shipping</span>
                                <span className={`co-summary-val${shipping === 0 ? ' co-summary-val--green' : ''}`}>
                                    {shipping === 0 ? 'FREE' : `৳${shipping}`}
                                </span>
                            </div>
                        </div>

                        <div className="co-total-row">
                            <span className="co-total-label">Total</span>
                            <span className="co-total-val">৳{grandTotal.toLocaleString()}</span>
                        </div>

                        {/* {shipping === 0 && (
                            <div className="co-free-ship">
                                <Truck size={13} /> Free shipping on orders ৳{freeShippingThreshold}+
                            </div>
                        )} */}

                        {/* Payment Method */}
                        <div className="co-pay-section">
                            <div className="co-pay-title">Payment Method</div>
                            <label className={`co-pay-option${paymentMethod === 'online' ? ' co-pay-option--on' : ''}`}>
                                <input type="radio" name="paymentMethod" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} />
                                <CreditCard size={17} color={paymentMethod === 'online' ? '#f5c518' : '#999'} />
                                <div>
                                    <div className="co-pay-name">Online Payment</div>
                                    <div className="co-pay-desc">Cards, bKash, Nagad via SSLCommerz</div>
                                </div>
                            </label>
                            <label className={`co-pay-option${paymentMethod === 'cod' ? ' co-pay-option--on' : ''}`}>
                                <input type="radio" name="paymentMethod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                                <Wallet size={17} color={paymentMethod === 'cod' ? '#f5c518' : '#999'} />
                                <div>
                                    <div className="co-pay-name">Cash on Delivery</div>
                                    <div className="co-pay-desc">Pay when you receive your order</div>
                                </div>
                            </label>
                        </div>

                        {/* Terms & Conditions Checkbox — only for guest users */}
                        {!user && (
                            <div style={{ marginBottom: '14px', marginTop: '10px' }}>
                                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#555', userSelect: 'none' }}>
                                    <input
                                        type="checkbox"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                        style={{ marginTop: '2px', cursor: 'pointer' }}
                                    />
                                    <span>
                                        I agree to the{' '}
                                        <Link href="/terms" target="_blank" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'underline' }}>
                                            Terms of Service
                                        </Link>{' '}
                                        and{' '}
                                        <Link href="/privacy" target="_blank" style={{ color: '#1a1a1a', fontWeight: 600, textDecoration: 'underline' }}>
                                            Privacy Policy
                                        </Link>
                                        .
                                    </span>
                                </label>
                            </div>
                        )}

                        {error && (
                            <motion.div
                                className="co-error"
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{
                                    opacity: 1,
                                    height: 'auto',
                                    marginBottom: 12,
                                    x: (shakeWarning && error.includes('address')) ? [0, -10, 10, -10, 10, -5, 5, 0] : 0,
                                    scale: (shakeWarning && error.includes('address')) ? [1, 1.03, 1.03, 1] : 1,
                                }}
                                transition={{ duration: 0.3 }}
                                style={{ overflow: 'hidden' }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            onClick={handlePay}
                            disabled={paying}
                            className="co-pay-btn"
                        >
                            {paying ? (
                                <><Loader2 size={17} className="co-spinner" /> Processing...</>
                            ) : paymentMethod === 'cod' ? (
                                <><Wallet size={17} /> Place Order (COD)</>
                            ) : (
                                <><CreditCard size={17} /> Pay ৳{grandTotal.toLocaleString()}</>
                            )}
                        </button>

                        <div className="co-secure">
                            <Lock size={11} /> Secured by SSLCommerz
                        </div>

                        <div className="co-trust">
                            <div className="co-trust-item">
                                <Shield size={17} color="#22c55e" />
                                <span>Secure</span>
                            </div>
                            <div className="co-trust-item">
                                <Package size={17} color="#3b82f6" />
                                <span>Returns</span>
                            </div>
                            <div className="co-trust-item">
                                <Truck size={17} color="#f5c518" />
                                <span>Fast Delivery</span>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Delete Confirm Modal */}
            {deleteConfirmId && (
                <div className="co-modal-bg" onClick={() => setDeleteConfirmId(null)}>
                    <div className="co-modal" onClick={e => e.stopPropagation()}>
                        <Trash2 size={30} color="#ef4444" />
                        <h3>Delete Address?</h3>
                        <p>This action cannot be undone.</p>
                        <div className="co-modal-btns">
                            <button onClick={() => setDeleteConfirmId(null)} className="co-modal-cancel">Cancel</button>
                            <button onClick={handleAddrDelete} className="co-modal-delete">Delete</button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                /* ────── Base ────── */
                .co-root {
                    min-height: 100vh;
                    background: #f4f4f0;
                    font-family: 'Inter', sans-serif;
                    overflow-x: hidden;
                    width: 100%;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                .co-spinner { animation: spin 0.9s linear infinite; }
                .co-loading {
                    min-height: 60vh; display: flex;
                    align-items: center; justify-content: center; background: #f4f4f0;
                }

                /* ────── Header ────── */
                .co-header {
                    padding: 4px 0;
                    background: #f4f4f0;
                }
                .co-header-inner {
                    max-width: 1140px;
                    margin: 0 auto;
                    padding: 0 24px;
                }
                .co-back-link {
                    display: inline-flex; align-items: center; gap: 6px;
                    color: #000000ff; font-size: 14px; font-weight: 600; text-decoration: none;
                    margin-bottom: 10px;
                    margin-top:20px;
                }
                .co-back-link:hover { color: #000000ff; }
                .co-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 26px; font-weight: 800; color: #0000; margin: 0;
                }
                .co-subtitle { font-size: 12px; color: rgba(0, 0, 0, 0.45); margin-top: 3px; }

                /* ────── Layout ────── */
                .co-layout {
                    max-width: 1140px;
                    margin: 0 auto;
                    padding: 28px 24px 80px;
                    display: grid;
                    grid-template-columns: 1fr 360px;
                    gap: 24px;
                    align-items: start;
                    box-sizing: border-box;
                }
                .co-left { display: flex; flex-direction: column; gap: 18px; }
                .co-summary-wrap { position: sticky; top: 20px; }

                /* ────── Card ────── */
                .co-card {
                    background: #fff;
                    border-radius: 16px;
                    padding: 22px 24px;
                    border: 1px solid #ebebeb;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.05);
                    box-sizing: border-box;
                    width: 100%;
                }

                /* ────── Step header ────── */
                .co-step-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
                .co-step-num {
                    width: 30px; height: 30px; border-radius: 50%;
                    background: #1a1a1a; color: #f5c518;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 13px; font-weight: 800; flex-shrink: 0;
                }
                .co-step-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0;
                }

                /* ────── Address ────── */
                .co-center-pad { display: flex; justify-content: center; padding: 28px 0; }
                .co-empty-addr {
                    text-align: center; padding: 28px 0;
                    display: flex; flex-direction: column; align-items: center; gap: 10px;
                }
                .co-empty-addr p { color: #888; font-size: 14px; font-weight: 600; margin: 0; }
                .co-addr-list { display: flex; flex-direction: column; gap: 10px; }
                .co-addr-card {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 12px 14px; border-radius: 12px; cursor: pointer;
                    border: 1px solid #ebebeb; background: #fafafa;
                    transition: border-color 0.2s, background 0.2s;
                }
                 .co-addr-card--selected {
                    border: 1.5px solid #f5c518;
                    background: rgba(245,197,24,0.03);
                }
                @keyframes blink-addr {
                    0%, 100% { border-color: #ebebeb; background: #fafafa; }
                    50% { border-color: #f5c518; background: rgba(245,197,24,0.15); box-shadow: 0 0 8px rgba(245,197,24,0.3); }
                }
                .co-addr-card--blink {
                    animation: blink-addr 0.4s ease-in-out 2;
                }
                .co-radio {
                    width: 17px; height: 17px; border-radius: 50%; flex-shrink: 0; margin-top: 3px;
                    border: 2px solid #ccc; background: #fff; transition: border 0.2s;
                }
                .co-radio--on { border: 5px solid #f5c518; }
                .co-addr-body { flex: 1; min-width: 0; }
                .co-addr-top { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap; }
                .co-addr-label { font-size: 13px; font-weight: 700; color: #1a1a1a; }
                .co-default-badge {
                    font-size: 9px; font-weight: 700; color: #f5c518;
                    background: rgba(245,197,24,0.12); padding: 1px 6px; border-radius: 10px;
                }
                .co-addr-name { font-size: 13px; font-weight: 600; color: #333; }
                .co-addr-text { font-size: 11px; color: #888; line-height: 1.5; margin-top: 2px; }
                .co-addr-phone { font-size: 11px; color: #aaa; margin-top: 2px; }
                .co-addr-actions { display: flex; gap: 4px; flex-shrink: 0; margin-top: 2px; }
                .co-icon-btn {
                    background: #fff; border: 1px solid #ebebeb; border-radius: 6px;
                    padding: 6px; cursor: pointer; display: flex; align-items: center;
                    transition: border-color 0.2s;
                }
                .co-icon-btn:hover { border-color: #ddd; }
                .co-accent-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 9px 18px; background: #1a1a1a; color: #f5c518;
                    border: none; border-radius: 8px; font-size: 12px; font-weight: 700;
                    cursor: pointer; font-family: 'Inter', sans-serif;
                }
                .co-add-btn { margin-top: 12px; }

                /* ────── Address Form ────── */
                .co-form-wrap {
                    margin-top: 16px; padding: 18px 16px;
                    background: #fafafa; border-radius: 12px; border: 1px solid #ebebeb;
                }
                .co-form-header {
                    display: flex; justify-content: space-between; align-items: center;
                    margin-bottom: 14px;
                }
                .co-form-header h3 { font-size: 14px; font-weight: 700; margin: 0; color: #1a1a1a; }
                .co-close-btn { background: none; border: none; cursor: pointer; padding: 2px; }
                .co-form-grid {
                    display: grid; grid-template-columns: 1fr 1fr;
                    gap: 10px; margin-bottom: 10px;
                }
                .co-form-field { margin-bottom: 10px; }
                .co-label {
                    display: block; font-size: 10px; font-weight: 600; color: #999;
                    text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;
                }
                .co-input {
                    width: 100%; padding: 9px 11px;
                    background: #fff; border: 1px solid #e0e0e0; border-radius: 7px;
                    font-size: 13px; font-family: 'Inter', sans-serif; outline: none;
                    color: #1a1a1a; box-sizing: border-box;
                }
                .co-input:focus { border-color: #f5c518; }
                .co-save-btn {
                    display: flex; align-items: center; gap: 6px;
                    padding: 10px 18px; background: #1a1a1a; color: #f5c518;
                    border: none; border-radius: 8px; font-size: 13px; font-weight: 700;
                    cursor: pointer; font-family: 'Inter', sans-serif; margin-top: 4px;
                }
                .co-error {
                    background: rgba(239,68,68,0.07); color: #ef4444;
                    border: 1px solid rgba(239,68,68,0.15); border-radius: 8px;
                    padding: 9px 12px; font-size: 12px; font-weight: 600;
                    margin-bottom: 12px;
                }

                /* ────── Order Items ────── */
                .co-items { display: flex; flex-direction: column; }
                .co-item {
                    display: flex; align-items: flex-start; gap: 12px;
                    padding: 12px 0;
                }
                .co-item--border { border-bottom: 1px solid #f0f0f0; }
                .co-item-img {
                    width: 52px; height: 52px; border-radius: 10px;
                    overflow: hidden; flex-shrink: 0;
                    background: #f5f5f0; border: 1px solid #ebebeb;
                }
                .co-item-img img { width: 100%; height: 100%; object-fit: cover; }
                .co-item-info { flex: 1; min-width: 0; }
                .co-item-top-row {
                    display: flex; align-items: flex-start;
                    justify-content: space-between; gap: 8px;
                    margin-bottom: 4px;
                }
                .co-item-name {
                    font-size: 13px; font-weight: 600; color: #1a1a1a;
                    overflow: hidden; text-overflow: ellipsis;
                    display: -webkit-box; -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical; flex: 1; min-width: 0;
                    line-height: 1.35;
                }
                .co-item-price {
                    font-size: 13px; font-weight: 700; color: #1a1a1a;
                    white-space: nowrap; flex-shrink: 0; padding-top: 1px;
                }
                .co-item-meta {
                    display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
                    margin-top: 4px;
                }
                .co-item-size {
                    font-size: 10px; color: #888; background: #f0f0eb;
                    padding: 1px 6px; border-radius: 4px;
                }
                .co-item-qty { font-size: 11px; color: #aaa; }

                /* ────── Summary ────── */
                .co-summary-title {
                    font-family: 'Outfit', sans-serif;
                    font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 0 0 18px;
                }
                .co-summary-rows { display: flex; flex-direction: column; gap: 11px; margin-bottom: 14px; }
                .co-summary-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
                .co-summary-label { color: #888; font-weight: 500; display: flex; align-items: center; gap: 4px; }
                .co-summary-label--green { color: #16a34a; }
                .co-summary-val { font-weight: 600; color: #1a1a1a; }
                .co-summary-val--green { color: #16a34a; }
                .co-total-row {
                    border-top: 2px solid #1a1a1a; padding-top: 13px; margin-bottom: 16px;
                    display: flex; justify-content: space-between; align-items: center;
                }
                .co-total-label { font-size: 15px; font-weight: 800; color: #1a1a1a; }
                .co-total-val {
                    font-size: 22px; font-weight: 800; color: #1a1a1a;
                    font-family: 'Outfit', sans-serif;
                }
                .co-free-ship {
                    display: flex; align-items: center; gap: 7px;
                    padding: 9px 11px; background: rgba(34,197,94,0.07);
                    border-radius: 8px; margin-bottom: 14px;
                    font-size: 12px; color: #16a34a; font-weight: 600;
                }

                /* Payment Method */
                .co-pay-section { margin-bottom: 14px; }
                .co-pay-title { font-size: 12px; font-weight: 700; color: #1a1a1a; margin-bottom: 9px; text-transform: uppercase; letter-spacing: 0.4px; }
                .co-pay-option {
                    display: flex; align-items: center; gap: 10px;
                    padding: 11px 12px; border-radius: 10px; cursor: pointer;
                    border: 1px solid #ebebeb; background: #fafafa;
                    transition: all 0.18s; margin-bottom: 8px;
                }
                .co-pay-option input[type=radio] { accent-color: #f5c518; flex-shrink: 0; }
                .co-pay-option--on { border: 1.5px solid #f5c518; background: rgba(245,197,24,0.04); }
                .co-pay-name { font-size: 13px; font-weight: 600; color: #1a1a1a; }
                .co-pay-desc { font-size: 10px; color: #aaa; margin-top: 1px; }

                /* Addr warning */
                .co-addr-warn {
                    display: flex; align-items: center; gap: 7px;
                    padding: 9px 12px; border-radius: 9px; margin-bottom: 12px;
                    font-size: 12px; font-weight: 600; color: #b8960a;
                    background: rgba(245,197,24,0.09); border: 1px solid rgba(245,197,24,0.22);
                }

                /* Pay button */
                .co-pay-btn {
                    width: 100%; padding: 14px; border: none; border-radius: 12px;
                    font-size: 15px; font-weight: 700; cursor: pointer;
                    display: flex; align-items: center; justify-content: center; gap: 9px;
                    font-family: 'Inter', sans-serif; transition: all 0.18s;
                    background: linear-gradient(135deg, #f5c518, #e6b800);
                    color: #1a1a1a;
                    box-shadow: 0 4px 18px rgba(245,197,24,0.3);
                }
                .co-pay-btn--disabled {
                    background: #e0e0e0 !important; color: #aaa !important;
                    box-shadow: none !important; cursor: not-allowed !important;
                }
                .co-pay-btn:not(.co-pay-btn--disabled):hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 24px rgba(245,197,24,0.4);
                }

                .co-secure {
                    display: flex; align-items: center; justify-content: center; gap: 5px;
                    margin-top: 12px; font-size: 10px; color: #bbb; font-weight: 500;
                }
                .co-trust {
                    display: flex; justify-content: center; gap: 24px;
                    margin-top: 14px; padding-top: 14px; border-top: 1px solid #f0f0f0;
                }
                .co-trust-item {
                    display: flex; flex-direction: column; align-items: center; gap: 4px;
                }
                .co-trust-item span { font-size: 9px; color: #aaa; font-weight: 600; }

                /* ────── Modal ────── */
                .co-modal-bg {
                    position: fixed; inset: 0; background: rgba(0,0,0,0.5);
                    display: flex; align-items: center; justify-content: center;
                    z-index: 200; padding: 20px;
                }
                .co-modal {
                    background: #fff; border-radius: 16px; padding: 28px 24px;
                    max-width: 360px; width: 100%; text-align: center;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.2);
                    display: flex; flex-direction: column; align-items: center; gap: 8px;
                }
                .co-modal h3 { font-size: 17px; font-weight: 700; color: #1a1a1a; margin: 4px 0 0; }
                .co-modal p { color: #888; font-size: 13px; margin: 0 0 12px; }
                .co-modal-btns { display: flex; gap: 10px; width: 100%; }
                .co-modal-cancel {
                    flex: 1; padding: 10px; background: #f5f5f5; color: #555;
                    border: 1px solid #e0e0e0; border-radius: 8px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                }
                .co-modal-delete {
                    flex: 1; padding: 10px; background: #ef4444; color: #fff;
                    border: none; border-radius: 8px;
                    font-size: 13px; font-weight: 600; cursor: pointer;
                }

                /* ────── Tablet (≤1024px) ────── */
                @media (max-width: 1024px) {
                    .co-layout {
                        grid-template-columns: 1fr 320px;
                        padding: 20px 20px 80px;
                        gap: 18px;
                    }
                }

                /* ────── Mobile (≤768px) ────── */
                @media (max-width: 768px) {
                    .co-header { padding: 18px 0; }
                    .co-header-inner { padding: 0 16px; }
                    .co-title { font-size: 22px; }
                    .co-layout {
                        grid-template-columns: 1fr;
                        padding: 16px 16px 72px;
                        gap: 14px;
                    }
                    .co-summary-wrap { position: static; }
                    .co-card { padding: 18px 16px; border-radius: 14px; }
                    .co-form-grid { grid-template-columns: 1fr; }
                    .co-total-val { font-size: 20px; }
                    .co-trust { gap: 16px; }
                    .co-checkout-items { display: none !important; }
                    .co-hide-mobile { display: none !important; }
                }

                /* ────── Small Mobile (≤480px) ────── */
                @media (max-width: 480px) {
                    .co-header-inner { padding: 0 14px; }
                    .co-title { font-size: 20px; }
                    .co-layout { padding: 12px 12px 72px; gap: 12px; }
                    .co-card { padding: 16px 14px; border-radius: 12px; }
                    .co-item-img { width: 46px; height: 46px; border-radius: 8px; }
                    .co-item-name { font-size: 12px; }
                    .co-item-price { font-size: 12px; }
                    .co-pay-btn { padding: 13px; font-size: 14px; }
                    .co-total-val { font-size: 19px; }
                    .co-item { gap: 10px; }
                    .co-summary-title { font-size: 15px; }
                    .co-pay-name { font-size: 12px; }
                    .co-pay-desc { font-size: 10px; }
                    .co-addr-card { padding: 10px 12px; }
                    .co-addr-label { font-size: 12px; }
                    .co-addr-name { font-size: 12px; }
                    .co-addr-text { font-size: 11px; }
                }
            `}</style>
        </div>
    );
}
