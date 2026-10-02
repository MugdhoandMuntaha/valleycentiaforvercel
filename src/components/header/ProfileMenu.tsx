'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { User, LogOut, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useClickOutside } from '@/hooks/useClickOutside';

export default function ProfileMenu() {
    const { user, signOut } = useAuth();
    const [open, setOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useClickOutside(menuRef, () => setOpen(false), open);

    if (!user) {
        return (
            <Link
                href="/auth"
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    textDecoration: 'none',
                    position: 'relative',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ccc';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'none';
                }}
                aria-label="Profile"
            >
                <User size={20} />
            </Link>
        );
    }

    return (
        <div style={{ position: 'relative' }} ref={menuRef}>
            <button
                onClick={() => setOpen(!open)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: '#ffffff',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ccc';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'none';
                }}
                aria-label="Profile Menu"
            >
                <span style={{
                    width: '22px', height: '22px', borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f5c518, #e6b800)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '10px', fontWeight: 800, color: '#1a1a1a',
                    fontFamily: "'Inter', sans-serif",
                }}>
                    {(user.fullName || user.name || user.email || 'U').charAt(0).toUpperCase()}
                </span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '8px',
                            width: '180px',
                            background: '#1a1a1a',
                            border: '1px solid #333',
                            borderRadius: '8px',
                            padding: '8px 0',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                            zIndex: 1000,
                        }}
                    >
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #2a2a2a', marginBottom: '4px' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#888', fontWeight: 500 }}>Signed in as</p>
                            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {user.email}
                            </p>
                        </div>
                        <Link
                            href="/profile"
                            onClick={() => setOpen(false)}
                            style={{
                                padding: '8px 16px',
                                fontSize: '13px',
                                color: '#aaa',
                                textDecoration: 'none',
                                display: 'block',
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#2a2a2a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'none'; }}
                        >
                            My Profile
                        </Link>
                        {user.role === 'admin' && (
                            <Link
                                href="/admin"
                                onClick={() => setOpen(false)}
                                style={{
                                    padding: '8px 16px',
                                    fontSize: '13px',
                                    color: '#aaa',
                                    textDecoration: 'none',
                                    display: 'block',
                                    textAlign: 'left',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = '#2a2a2a'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.color = '#aaa'; e.currentTarget.style.background = 'none'; }}
                            >
                                Admin Panel
                            </Link>
                        )}
                        <button
                            onClick={async () => {
                                setOpen(false);
                                await signOut();
                            }}
                            style={{
                                width: '100%',
                                padding: '8px 16px',
                                fontSize: '13px',
                                color: '#ef4444',
                                textDecoration: 'none',
                                display: 'block',
                                textAlign: 'left',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: "'Inter', sans-serif",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#2a2a2a'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                        >
                            Sign Out
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
