'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { getSafeCallbackUrl } from '@/lib/auth-helpers';
import { Loader2 } from 'lucide-react';

function AuthContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            const rawCallback = searchParams.get('callbackUrl') || searchParams.get('redirect_url');
            if (user) {
                // If already logged in, redirect to callbackUrl or default to profile
                const safeUrl = getSafeCallbackUrl(rawCallback, '/profile');
                router.push(safeUrl);
            } else {
                // Forward callbackUrl to the sign-in page
                const safeUrl = getSafeCallbackUrl(rawCallback, '');
                const target = safeUrl
                    ? `/auth/sign-in?callbackUrl=${encodeURIComponent(safeUrl)}`
                    : '/auth/sign-in';
                router.push(target);
            }
        }
    }, [user, loading, router, searchParams]);

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#fafaf8',
        }}>
            <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
    );
}

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#fafaf8',
            }}>
                <Loader2 size={24} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <AuthContent />
        </Suspense>
    );
}
