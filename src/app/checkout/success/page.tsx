'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Package, ArrowRight, Home } from 'lucide-react';
import { Suspense, useEffect } from 'react';
import { useCart } from '@/lib/CartContext';

function SuccessContent() {
    const params = useSearchParams();
    const orderNumber = params.get('order') || '';
    const { clearCart } = useCart();

    // Clear the cart on successful payment
    useEffect(() => {
        clearCart();
    }, [clearCart]);

    return (
        <div style={{ minHeight: '80vh', background: '#f8f8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{ textAlign: 'center', maxWidth: 480, padding: '48px 32px' }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
                >
                    <CheckCircle size={40} color="#22c55e" />
                </motion.div>

                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>
                    Payment Successful!
                </h1>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 24 }}>
                    Your order has been placed successfully. We&apos;ll send you updates on your order status.
                </p>

                {orderNumber && (
                    <div style={{
                        background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12,
                        padding: '16px 24px', marginBottom: 24, display: 'inline-block',
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: 1 }}>Order Number</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a1a', fontFamily: "'Outfit', sans-serif", marginTop: 4 }}>{orderNumber}</div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    <Link href="/shop" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '13px 32px', background: 'linear-gradient(135deg, #f5c518, #e6b800)',
                        color: '#1a1a1a', borderRadius: 28, fontSize: 14, fontWeight: 700,
                        textDecoration: 'none', fontFamily: "'Inter', sans-serif",
                    }}>
                        <Package size={16} /> Continue Shopping <ArrowRight size={14} />
                    </Link>
                    <Link href="/" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: '#999', fontSize: 13, textDecoration: 'none', fontWeight: 500,
                    }}>
                        <Home size={14} /> Back to Home
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}

export default function CheckoutSuccessPage() {
    return (
        <Suspense fallback={<div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading...</div>}>
            <SuccessContent />
        </Suspense>
    );
}
