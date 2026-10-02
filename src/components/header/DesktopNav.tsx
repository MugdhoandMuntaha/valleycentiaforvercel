'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

import type { NavLink } from './constants';

interface DesktopNavProps {
    navLinks: NavLink[];
}

export default function DesktopNav({ navLinks }: DesktopNavProps) {
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = useCallback((linkName: string | null) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setActiveDropdown(linkName);
    }, []);

    const handleMouseLeave = useCallback(() => {
        timeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
            timeoutRef.current = null;
        }, 200);
    }, []);

    return (
        <nav
            className="desktop-nav"
            style={{
                background: '#1a1a1a',
                borderTop: '1px solid #222',
                display: 'flex',
                justifyContent: 'center',
            }}
        >
            <div
                style={{
                    maxWidth: '1400px',
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0px',
                    padding: '0 32px',
                }}
            >
                {navLinks.map((link) => (
                    <div
                        key={link.name}
                        style={{ position: 'relative' }}
                        onMouseEnter={() => handleMouseEnter(link.hasDropdown ? link.name : null)}
                        onMouseLeave={handleMouseLeave}
                    >
                        <Link
                            href={link.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '13px',
                                fontWeight: 500,
                                color: '#ffffffff',
                                padding: '10px 16px',
                                transition: 'color 0.15s ease, background 0.15s ease',
                                whiteSpace: 'nowrap',
                                fontFamily: "'Inter', sans-serif",
                                textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ccc';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.background = 'none';
                            }}
                        >
                            {link.name}
                            {link.hasDropdown && (
                                <ChevronDown
                                    size={12}
                                    style={{
                                        opacity: 0.6,
                                        transition: 'transform 0.2s ease',
                                        transform: activeDropdown === link.name ? 'rotate(180deg)' : 'rotate(0deg)',
                                    }}
                                />
                            )}
                        </Link>

                        {/* Dropdown Menu */}
                        <AnimatePresence>
                            {link.hasDropdown && activeDropdown === link.name && link.dropdownItems && (
                                <motion.div
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -4 }}
                                    transition={{ duration: 0.15, ease: 'easeOut' }}
                                    style={{
                                        position: 'absolute',
                                        top: '100%',
                                        left: '0',
                                        minWidth: '210px',
                                        background: '#1d1d1d',
                                        border: '1px solid #333',
                                        borderRadius: '8px',
                                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                        zIndex: 100,
                                        paddingTop: '4px',
                                        paddingBottom: '4px',
                                    }}
                                >
                                    {link.dropdownItems.map((item, idx) => (
                                        <Link
                                            key={idx}
                                            href={item.href}
                                            style={{
                                                display: 'block',
                                                padding: '10px 18px',
                                                fontSize: '13px',
                                                fontWeight: 400,
                                                color: '#ffffffff',
                                                textDecoration: 'none',
                                                transition: 'all 0.12s ease',
                                                fontFamily: "'Inter', sans-serif",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.color = '#ccc';
                                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                                e.currentTarget.style.paddingLeft = '22px';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.color = '#ffffff';
                                                e.currentTarget.style.background = 'none';
                                                e.currentTarget.style.paddingLeft = '18px';
                                            }}
                                        >
                                            {item.name}
                                        </Link>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </nav>
    );
}
