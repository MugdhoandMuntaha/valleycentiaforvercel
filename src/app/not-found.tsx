import React from 'react';
import Link from 'next/link';

export default function NotFound() {
    return (
        <div style={{
            minHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            textAlign: 'center',
            background: '#ffffff',
        }}>
            <span style={{
                fontSize: '72px',
                fontWeight: 800,
                color: '#111111',
                lineHeight: 1,
                marginBottom: '16px',
                letterSpacing: '-1px',
                fontFamily: 'var(--font-outfit, sans-serif)',
            }}>
                404
            </span>
            <h1 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#111111',
                marginBottom: '12px',
                fontFamily: 'var(--font-outfit, sans-serif)',
            }}>
                Page Not Found
            </h1>
            <p style={{
                fontSize: '15px',
                color: '#666666',
                maxWidth: '460px',
                lineHeight: 1.6,
                marginBottom: '32px',
                fontFamily: 'var(--font-inter, sans-serif)',
            }}>
                The page you are looking for might have been moved, renamed, or is temporarily unavailable. Explore our premium collections below.
            </p>
            <div style={{
                display: 'flex',
                gap: '12px',
                flexWrap: 'wrap',
                justifyContent: 'center',
            }}>
                <Link
                    href="/shop"
                    style={{
                        backgroundColor: '#111111',
                        color: '#ffffff',
                        padding: '12px 28px',
                        borderRadius: '24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'opacity 0.2s',
                        fontFamily: 'var(--font-inter, sans-serif)',
                    }}
                >
                    Browse Collections
                </Link>
                <Link
                    href="/"
                    style={{
                        backgroundColor: '#f5f5f5',
                        color: '#111111',
                        padding: '12px 28px',
                        borderRadius: '24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        textDecoration: 'none',
                        transition: 'background-color 0.2s',
                        fontFamily: 'var(--font-inter, sans-serif)',
                    }}
                >
                    Return to Homepage
                </Link>
            </div>
        </div>
    );
}
