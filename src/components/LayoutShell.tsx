'use client';

import { usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { ToastProvider } from '@/lib/ToastContext';
import { CartProvider } from '@/lib/CartContext';
import { AuthProvider } from '@/lib/AuthContext';
import { WishlistProvider } from '@/lib/WishlistContext';

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isAdmin = pathname.startsWith('/admin');

    if (isAdmin) {
        return (
            <AuthProvider>
                <ToastProvider>
                    {children}
                </ToastProvider>
            </AuthProvider>
        );
    }

    return (
        <AuthProvider>
            <ToastProvider>
                <CartProvider>
                    <WishlistProvider>
                        <Header />
                        <main style={{ minHeight: '100vh' }}>{children}</main>
                        <Footer />
                    </WishlistProvider>
                </CartProvider>
            </ToastProvider>
        </AuthProvider>
    );
}
