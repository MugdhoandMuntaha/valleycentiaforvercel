'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, User, X, ChevronDown, Sparkles, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useSearch, type SearchProduct } from '@/hooks/useSearch';
import type { NavLink } from './constants';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    navLinks: NavLink[];
    allProducts: SearchProduct[];
}

export default function MobileMenu({ isOpen, onClose, navLinks, allProducts }: MobileMenuProps) {
    const { user, signOut } = useAuth();
    useBodyScrollLock(isOpen);

    const {
        searchQuery,
        setSearchQuery,
        filteredProducts,
        hasQuery,
        resetSearch,
    } = useSearch(allProducts);

    const handleSelectSearchProduct = () => {
        onClose();
        resetSearch();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 1100,
                        background: 'rgba(0, 0, 0, 0.4)',
                        backdropFilter: 'blur(6px)',
                    }}
                    onClick={onClose}
                >
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'tween', ease: [0.16, 1, 0.3, 1], duration: 0.4 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '290px',
                            background: 'linear-gradient(to bottom, #ffffff, #fafafa)',
                            padding: '20px 20px 32px',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            boxShadow: '8px 0 32px rgba(0, 0, 0, 0.1)',
                            borderTopRightRadius: '16px',
                            borderBottomRightRadius: '16px',
                        }}
                    >
                        {/* Drawer Header */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '20px',
                            paddingBottom: '12px',
                            borderBottom: '1px solid rgba(0, 0, 0, 0.05)',
                        }}>
                            <Link href="/" onClick={onClose}>
                                <Image
                                    src="/logo69.png"
                                    alt="ValleyCentia Logo"
                                    width={140}
                                    height={42}
                                    priority
                                    unoptimized
                                    style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                                />
                            </Link>
                            <button
                                onClick={onClose}
                                style={{
                                    background: 'rgba(0,0,0,0.04)',
                                    border: 'none',
                                    color: '#1a1a1a',
                                    cursor: 'pointer',
                                    padding: '8px',
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'background 0.2s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                                aria-label="Close menu"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Mobile Search */}
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#f5f5f7',
                                borderRadius: '20px',
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                padding: '0 16px',
                                height: '40px',
                                marginBottom: '20px',
                                transition: 'all 0.2s ease',
                            }}
                        >
                            <Search size={15} style={{ color: '#888', flexShrink: 0 }} />
                            <input
                                type="text"
                                placeholder="Search..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    outline: 'none',
                                    width: '100%',
                                    fontSize: '14px',
                                    color: '#1a1a1a',
                                    padding: '0 10px',
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            />
                        </div>

                        {/* Mobile Menu Search Results */}
                        {hasQuery && (
                            <div style={{ background: '#f5f5f7', border: '1px solid rgba(0, 0, 0, 0.08)', borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
                                {filteredProducts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                                        {filteredProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                href={product.href}
                                                onClick={handleSelectSearchProduct}
                                                style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#1a1a1a' }}
                                            >
                                                <div style={{ width: '40px', height: '40px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
                                                    <Image src={product.image} alt={product.name} fill sizes="40px" style={{ objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ margin: '0 0 2px 0', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: "'Inter', sans-serif", color: '#1a1a1a' }}>
                                                        {product.name}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#1a1a1a', fontFamily: "'Inter', sans-serif" }}>
                                                        ৳{product.price}
                                                    </p>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: 0, fontSize: '13px', color: '#888', textAlign: 'center', fontFamily: "'Inter', sans-serif" }}>
                                        No results found
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Navigation Links */}
                        {navLinks.map((link) => (
                            <MobileNavItem
                                key={link.name}
                                link={link}
                                onClose={onClose}
                            />
                        ))}

                        {/* Mobile User Actions */}
                        <div style={{ marginTop: 'auto', paddingTop: '24px', borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
                            {user ? (
                                <>
                                    <div style={{
                                        padding: '12px 16px',
                                        background: '#f8f9fa',
                                        borderRadius: '12px',
                                        border: '1px solid rgba(0, 0, 0, 0.04)',
                                        marginBottom: '16px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}>
                                        <div style={{
                                            width: '32px', height: '32px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #1a1a1a, #333333)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px', fontWeight: 800, color: '#ffffff',
                                            fontFamily: "'Outfit', sans-serif",
                                            flexShrink: 0,
                                        }}>
                                            {(user.fullName || user.name || user.email || 'U').charAt(0).toUpperCase()}
                                        </div>
                                        <div style={{ minWidth: 0, flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: '10px', color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Signed in as</p>
                                            <p style={{ margin: '1px 0 0 0', fontSize: '13px', color: '#1a1a1a', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: "'Inter', sans-serif" }}>
                                                {user.email}
                                            </p>
                                        </div>
                                    </div>
                                    <Link
                                        href="/profile"
                                        onClick={onClose}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#1a1a1a',
                                            padding: '12px 8px',
                                            textDecoration: 'none',
                                            fontFamily: "'Outfit', sans-serif",
                                        }}
                                    >
                                        <User size={16} />
                                        My Profile
                                    </Link>
                                    {user.role === 'admin' && (
                                        <Link
                                            href="/admin"
                                            onClick={onClose}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                fontSize: '14px',
                                                fontWeight: 600,
                                                color: '#1a1a1a',
                                                padding: '12px 8px',
                                                textDecoration: 'none',
                                                fontFamily: "'Outfit', sans-serif",
                                            }}
                                        >
                                            <Sparkles size={16} />
                                            Admin Panel
                                        </Link>
                                    )}
                                    <button
                                        onClick={async () => {
                                            onClose();
                                            await signOut();
                                        }}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            width: '100%',
                                            textAlign: 'left',
                                            fontSize: '14px',
                                            fontWeight: 600,
                                            color: '#ef4444',
                                            padding: '12px 8px',
                                            textDecoration: 'none',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            fontFamily: "'Outfit', sans-serif",
                                        }}
                                    >
                                        <LogOut size={16} />
                                        Sign Out
                                    </button>
                                </>
                            ) : (
                                <Link
                                    href="/auth"
                                    onClick={onClose}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        fontSize: '14px',
                                        fontWeight: 600,
                                        color: '#1a1a1a',
                                        padding: '12px 8px',
                                        textDecoration: 'none',
                                        fontFamily: "'Outfit', sans-serif",
                                    }}
                                >
                                    <User size={16} />
                                    Sign In / Register
                                </Link>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

function MobileNavItem({ link, onClose }: { link: NavLink; onClose: () => void }) {
    const [open, setOpen] = useState(false);
    const dropdownItems = link.dropdownItems;

    return (
        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)' }}>
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <Link
                    href={link.href}
                    onClick={onClose}
                    style={{
                        flex: 1,
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#1a1a1a',
                        padding: '14px 8px',
                        textDecoration: 'none',
                        letterSpacing: '0.2px',
                        fontFamily: "'Outfit', sans-serif",
                    }}
                >
                    {link.name}
                </Link>
                {link.hasDropdown && (
                    <button
                        onClick={() => setOpen(!open)}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#1a1a1a',
                            padding: '14px 12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                        }}
                    >
                        <ChevronDown
                            size={16}
                            style={{
                                transition: 'transform 0.2s ease',
                                transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                                color: '#1a1a1a',
                            }}
                        />
                    </button>
                )}
            </div>

            <AnimatePresence>
                {open && dropdownItems && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{ overflow: 'hidden', background: '#f8f9fa', borderRadius: '8px', marginBottom: '12px' }}
                    >
                        {dropdownItems.map((item, idx) => (
                            <Link
                                key={idx}
                                href={item.href}
                                onClick={onClose}
                                style={{
                                    display: 'block',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#555',
                                    padding: '10px 16px',
                                    textDecoration: 'none',
                                    fontFamily: "'Inter', sans-serif",
                                    borderBottom: idx < dropdownItems.length - 1 ? '1px solid rgba(0,0,0,0.03)' : 'none',
                                }}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
