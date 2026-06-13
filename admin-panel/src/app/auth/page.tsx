'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function AuthPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg, #0a0a0b)' }}>
                <Loader2 size={24} style={{ color: 'var(--color-accent, #c9a96e)', animation: 'spin 1s linear infinite' }} />
            </div>
        }>
            <AuthPageContent />
        </Suspense>
    );
}

function AuthPageContent() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { user, signIn } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectTo = searchParams.get('redirect') || '/admin';

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            router.push(redirectTo);
        }
    }, [user, router, redirectTo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        const { error: signInError } = await signIn(email, password);
        if (signInError) {
            setError(signInError.message);
        } else {
            router.push(redirectTo);
        }
        setSubmitting(false);
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--color-bg, #0a0a0b)',
            fontFamily: "'Inter', sans-serif",
            padding: '48px 24px',
            position: 'relative',
            overflow: 'hidden',
        }}>
            {/* Ambient Background Glows */}
            <div style={{
                position: 'absolute',
                top: '20%',
                left: '30%',
                width: '400px',
                height: '400px',
                background: 'radial-gradient(circle, var(--color-accent-glow, rgba(201, 169, 110, 0.15)) 0%, transparent 70%)',
                zIndex: 1,
                pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute',
                bottom: '20%',
                right: '30%',
                width: '450px',
                height: '450px',
                background: 'radial-gradient(circle, rgba(245, 197, 24, 0.05) 0%, transparent 70%)',
                zIndex: 1,
                pointerEvents: 'none',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: 'var(--color-bg-secondary, #111113)',
                    borderRadius: 'var(--radius-lg, 16px)',
                    padding: '40px 36px',
                    boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0, 0, 0, 0.5)), var(--shadow-glow, 0 0 30px rgba(201, 169, 110, 0.05))',
                    border: '1px solid var(--color-border, #27272a)',
                    zIndex: 2,
                    position: 'relative',
                    backdropFilter: 'blur(20px)',
                }}
            >
                {/* Back Link */}
                <a 
                    href={process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'} 
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        color: 'var(--color-text-muted, #71717a)',
                        fontSize: '13px',
                        fontWeight: 500,
                        textDecoration: 'none',
                        marginBottom: '28px',
                        transition: 'color 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-text-primary, #fafafa)'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-muted, #71717a)'}
                >
                    <ArrowLeft size={14} />
                    Back to store
                </a>

                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Shield size={20} style={{ color: 'var(--color-accent, #c9a96e)' }} />
                    <span style={{
                        fontSize: '11px',
                        color: 'var(--color-accent, #c9a96e)',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        fontWeight: 700,
                    }}>
                        ValleyCentia
                    </span>
                </div>
                
                <h1 style={{
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: 'var(--color-text-primary, #fafafa)',
                    marginBottom: '8px',
                }}>
                    Admin Sign In
                </h1>
                <p style={{ 
                    fontSize: '14px', 
                    color: 'var(--color-text-secondary, #a1a1aa)', 
                    marginBottom: '32px' 
                }}>
                    Access the admin panel control system.
                </p>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Email */}
                    <div>
                        <label style={{ 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            color: 'var(--color-text-secondary, #a1a1aa)', 
                            marginBottom: '8px', 
                            display: 'block' 
                        }}>
                            Email Address
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1.5px solid var(--color-border, #27272a)',
                            borderRadius: 'var(--radius-md, 10px)',
                            padding: '0 16px',
                            transition: 'border-color 0.2s',
                            background: 'var(--color-bg-tertiary, #1a1a1d)',
                        }}
                        onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-accent, #c9a96e)'}
                        onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-border, #27272a)'}
                        >
                            <Mail size={16} color="var(--color-text-muted, #71717a)" />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="admin@valleycentia.com"
                                required
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    padding: '14px 0',
                                    fontSize: '14px',
                                    fontFamily: "'Inter', sans-serif",
                                    background: 'transparent',
                                    color: 'var(--color-text-primary, #fafafa)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label style={{ 
                            fontSize: '13px', 
                            fontWeight: 600, 
                            color: 'var(--color-text-secondary, #a1a1aa)', 
                            marginBottom: '8px', 
                            display: 'block' 
                        }}>
                            Password
                        </label>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            border: '1.5px solid var(--color-border, #27272a)',
                            borderRadius: 'var(--radius-md, 10px)',
                            padding: '0 16px',
                            transition: 'border-color 0.2s',
                            background: 'var(--color-bg-tertiary, #1a1a1d)',
                        }}
                        onFocusCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-accent, #c9a96e)'}
                        onBlurCapture={(e) => e.currentTarget.style.borderColor = 'var(--color-border, #27272a)'}
                        >
                            <Lock size={16} color="var(--color-text-muted, #71717a)" />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    flex: 1,
                                    border: 'none',
                                    outline: 'none',
                                    padding: '14px 0',
                                    fontSize: '14px',
                                    fontFamily: "'Inter', sans-serif",
                                    background: 'transparent',
                                    color: 'var(--color-text-primary, #fafafa)',
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    color: 'var(--color-text-muted, #71717a)',
                                }}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                    </div>

                    {/* Error message */}
                    {error && (
                        <motion.p 
                            initial={{ opacity: 0, y: -8 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            style={{
                                fontSize: '13px',
                                color: 'var(--color-error, #ef4444)',
                                fontWeight: 500,
                                margin: 0,
                                background: 'rgba(239, 68, 68, 0.1)',
                                padding: '10px 14px',
                                borderRadius: 'var(--radius-sm, 6px)',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}
                        >
                            {error}
                        </motion.p>
                    )}

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: 'var(--gradient-accent, linear-gradient(135deg, #c9a96e 0%, #e2c992 50%, #c9a96e 100%))',
                            color: '#0a0a0b',
                            border: 'none',
                            borderRadius: 'var(--radius-md, 10px)',
                            fontSize: '14px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s ease',
                            textTransform: 'uppercase',
                            fontFamily: "'Inter', sans-serif",
                            marginTop: '8px',
                            opacity: submitting ? 0.7 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            boxShadow: '0 4px 12px rgba(201, 169, 110, 0.2)',
                        }}
                        onMouseEnter={(e) => { 
                            if (!submitting) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(201, 169, 110, 0.3)';
                            }
                        }}
                        onMouseLeave={(e) => { 
                            if (!submitting) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(201, 169, 110, 0.2)';
                            }
                        }}
                    >
                        {submitting && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                        Sign In
                    </button>
                </form>
            </motion.div>
            <style>{`
                @keyframes spin { 
                    from { transform: rotate(0deg); } 
                    to { transform: rotate(360deg); } 
                }
            `}</style>
        </div>
    );
}
