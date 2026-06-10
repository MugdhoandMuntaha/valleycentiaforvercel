'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertCircle, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CheckoutCancelPage() {
    return (
        <div style={{ minHeight: '80vh', background: '#f8f8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                style={{ textAlign: 'center', maxWidth: 480, padding: '48px 32px' }}
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                    style={{ width: 80, height: 80, borderRadius: '50%', background: 'rgba(245,197,24,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}
                >
                    <AlertCircle size={40} color="#f5c518" />
                </motion.div>

                <h1 style={{ fontFamily: "'Outfit', sans-serif", fontSize: 28, fontWeight: 800, color: '#1a1a1a', marginBottom: 8 }}>
                    Payment Cancelled
                </h1>
                <p style={{ fontSize: 15, color: '#888', lineHeight: 1.6, marginBottom: 28 }}>
                    You cancelled the payment. Your cart items are still saved — you can complete your purchase anytime.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                    <Link href="/cart" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '13px 32px', background: 'linear-gradient(135deg, #f5c518, #e6b800)',
                        color: '#1a1a1a', borderRadius: 28, fontSize: 14, fontWeight: 700,
                        textDecoration: 'none', fontFamily: "'Inter', sans-serif",
                    }}>
                        <ShoppingBag size={16} /> Return to Cart
                    </Link>
                    <Link href="/shop" style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        color: '#999', fontSize: 13, textDecoration: 'none', fontWeight: 500,
                    }}>
                        <ArrowLeft size={14} /> Continue Shopping
                    </Link>
                </div>
            </motion.div>
        </div>
    );
}
