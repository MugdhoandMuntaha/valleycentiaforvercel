'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/lib/CartContext';

export default function CartIcon() {
    const { totalItems, cartBounce } = useCart();

    return (
        <Link
            href="/cart"
            style={{
                background: 'none',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                transition: 'all 0.15s ease',
                textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = '#ccc';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.background = 'none';
            }}
            aria-label="Cart"
        >
            <ShoppingBag size={20} />
            {totalItems > 0 && (
                <span
                    className={cartBounce ? 'cart-bounce' : ''}
                    key={cartBounce ? 'bounce' : 'idle'}
                    style={{
                        position: 'absolute',
                        top: '2px',
                        right: '2px',
                        width: '15px',
                        height: '15px',
                        background: '#f5c518',
                        borderRadius: '50%',
                        fontSize: '9px',
                        fontWeight: 700,
                        color: '#0a0a0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {totalItems > 9 ? '9+' : totalItems}
                </span>
            )}
        </Link>
    );
}
