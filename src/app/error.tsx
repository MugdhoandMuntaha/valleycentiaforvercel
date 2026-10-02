'use client';

import React, { useEffect } from 'react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * Root Error Boundary
 * Gracefully isolates unexpected runtime exceptions and provides retry capability
 * without breaking user navigation or causing white-screen crashes.
 */
export default function GlobalError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error('[GlobalErrorBoundary:Captured]', error);
    }, [error]);

    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            textAlign: 'center',
            fontFamily: 'var(--font-inter, sans-serif)',
        }}>
            <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: '#111',
                marginBottom: '12px',
            }}>
                Something went wrong
            </h2>
            <p style={{
                fontSize: '15px',
                color: '#666',
                maxWidth: '440px',
                lineHeight: 1.5,
                marginBottom: '24px',
            }}>
                An unexpected error occurred while loading this page. Our team has been notified.
            </p>
            <button
                onClick={() => reset()}
                style={{
                    backgroundColor: '#000000',
                    color: '#ffffff',
                    padding: '12px 28px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
                Try Again
            </button>
        </div>
    );
}
