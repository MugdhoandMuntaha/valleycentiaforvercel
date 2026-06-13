'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
    const router = useRouter();
    const { user, loading } = useAuth();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.push('/profile');
            } else {
                router.push('/auth/sign-in');
            }
        }
    }, [user, loading, router]);

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
