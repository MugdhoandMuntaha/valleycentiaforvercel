'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';
import { getSafeCallbackUrl } from '@/lib/auth-helpers';

function SignUpContent() {
    const searchParams = useSearchParams();
    const rawCallback = searchParams.get('callbackUrl') || searchParams.get('redirect_url');
    const safeCallback = getSafeCallbackUrl(rawCallback, '');

    // Forward callback destination to Sign In if user switches back to sign-in
    const signInUrl = safeCallback
        ? `/auth/sign-in?callbackUrl=${encodeURIComponent(safeCallback)}`
        : '/auth/sign-in';

    return (
        <SignUp
            routing="path"
            path="/auth/sign-up"
            signInUrl={signInUrl}
            fallbackRedirectUrl={safeCallback || '/'}
            forceRedirectUrl={safeCallback || undefined}
            appearance={{
                elements: {
                    rootBox: {
                        width: '100%',
                        maxWidth: '440px',
                    },
                    card: {
                        borderRadius: '20px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.06)',
                        border: '1px solid #f0f0f0',
                    },
                    headerTitle: {
                        fontFamily: "'Outfit', sans-serif",
                        fontWeight: 700,
                    },
                    headerSubtitle: {
                        fontFamily: "'Inter', sans-serif",
                    },
                    formButtonPrimary: {
                        background: '#f5c518',
                        color: '#1a1a1a',
                        fontWeight: 700,
                        textTransform: 'uppercase' as const,
                        letterSpacing: '0.5px',
                        borderRadius: '12px',
                        fontSize: '15px',
                    },
                    formFieldInput: {
                        borderRadius: '10px',
                        fontFamily: "'Inter', sans-serif",
                    },
                    footerActionLink: {
                        color: '#1a1a1a',
                        fontWeight: 700,
                    },
                },
            }}
        />
    );
}

export default function SignUpPage() {
    return (
        <div style={{
            minHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8f8f5',
            padding: '48px 24px',
        }}>
            <Suspense fallback={null}>
                <SignUpContent />
            </Suspense>
        </div>
    );
}
