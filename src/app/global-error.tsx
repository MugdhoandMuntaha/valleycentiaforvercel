'use client';

import React, { useEffect } from 'react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

/**
 * Root Layout Global Error Boundary
 * Catches uncaught runtime exceptions in the root layout and provides full recovery.
 * Must include <html> and <body> tags per Next.js requirements.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
    useEffect(() => {
        console.error('[RootLayoutError:Captured]', error);
    }, [error]);

    return (
        <html lang="en">
            <body style={{
                margin: 0,
                padding: 0,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                backgroundColor: '#ffffff',
                color: '#111111',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
            }}>
                <div style={{
                    maxWidth: '480px',
                    padding: '32px',
                    textAlign: 'center',
                }}>
                    <h1 style={{
                        fontSize: '28px',
                        fontWeight: 700,
                        marginBottom: '12px',
                        letterSpacing: '-0.5px',
                    }}>
                        Application Error
                    </h1>
                    <p style={{
                        fontSize: '15px',
                        color: '#666666',
                        lineHeight: 1.5,
                        marginBottom: '28px',
                    }}>
                        We encountered an unexpected application error. You can try refreshing the page or attempting to reload.
                    </p>
                    <button
                        type="button"
                        onClick={() => reset()}
                        style={{
                            backgroundColor: '#111111',
                            color: '#ffffff',
                            padding: '12px 28px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                        }}
                    >
                        Reload Application
                    </button>
                </div>
            </body>
        </html>
    );
}
