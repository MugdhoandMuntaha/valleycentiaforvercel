'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('[AdminRootLayoutError]', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{
                margin: 0,
                padding: '40px',
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                backgroundColor: '#0a0a0b',
                color: '#fafafa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}>
                <div style={{
                    maxWidth: '480px',
                    textAlign: 'center',
                }}>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '24px' }}>
                        {error?.message || 'An unexpected error occurred in the admin layout.'}
                    </p>
                    <button
                        onClick={() => reset()}
                        style={{
                            padding: '10px 20px',
                            background: '#c9a96e',
                            color: '#000000',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
