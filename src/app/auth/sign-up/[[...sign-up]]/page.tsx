'use client';

import { SignUp } from '@clerk/nextjs';

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
            <SignUp
                routing="path"
                path="/auth/sign-up"
                signInUrl="/auth/sign-in"
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
        </div>
    );
}
