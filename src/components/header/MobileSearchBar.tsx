'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearch, type SearchProduct } from '@/hooks/useSearch';
import { useClickOutside } from '@/hooks/useClickOutside';
import { popularChoices } from './constants';

interface MobileSearchBarProps {
    allProducts: SearchProduct[];
}

export default function MobileSearchBar({ allProducts }: MobileSearchBarProps) {
    const [searchFocused, setSearchFocused] = useState(false);
    const mobileSearchRef = useRef<HTMLDivElement>(null);

    const {
        searchQuery,
        setSearchQuery,
        filteredProducts,
        clientFilteredProducts,
        aiLoading,
        aiEnhanced,
        correctedQuery,
        hasQuery,
        resetSearch,
    } = useSearch(allProducts);

    useClickOutside(mobileSearchRef, () => setSearchFocused(false), searchFocused);

    const handleSelectProduct = () => {
        setSearchFocused(false);
        resetSearch();
    };

    return (
        <div
            ref={mobileSearchRef}
            className="mobile-search-bar"
            style={{
                display: 'none',
                padding: '8px 12px 12px',
                background: 'black',
                position: 'relative',
                zIndex: 900,
            }}
        >
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1e1e1e',
                    borderRadius: '8px',
                    border: searchFocused ? '1px solid #555' : '1px solid #333',
                    padding: '0 12px',
                    height: '40px',
                    width: '100%',
                    transition: 'border-color 0.2s ease',
                }}
            >
                <Search size={16} style={{ color: '#888', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '14px',
                        color: '#ffffff',
                        padding: '0 10px',
                        fontFamily: "'Inter', sans-serif",
                    }}
                />
            </div>

            {/* Mobile Search Dropdown */}
            <AnimatePresence>
                {searchFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '12px',
                            right: '12px',
                            background: '#ffffff',
                            borderRadius: '10px',
                            boxShadow: '0 10px 40px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,0,0,0.05)',
                            zIndex: 1000,
                            overflow: 'hidden',
                            maxHeight: '400px',
                            overflowY: 'auto',
                        }}
                    >
                        {!hasQuery ? (
                            <div style={{ padding: '16px' }}>
                                <p style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    color: '#999',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.8px',
                                    marginBottom: '12px',
                                }}>
                                    Popular Searches
                                </p>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {popularChoices.map((choice) => (
                                        <Link
                                            key={choice.label}
                                            href={choice.href}
                                            onClick={() => setSearchFocused(false)}
                                            style={{
                                                background: '#f0f0f0',
                                                color: '#333',
                                                padding: '6px 12px',
                                                borderRadius: '16px',
                                                fontSize: '12px',
                                                textDecoration: 'none',
                                                fontFamily: "'Inter', sans-serif",
                                            }}
                                        >
                                            {choice.label}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div style={{ padding: '16px' }}>
                                {/* Mobile AI search header */}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                }}>
                                    <p style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        color: '#999',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.8px',
                                        margin: 0,
                                    }}>
                                        {aiLoading
                                            ? 'Searching...'
                                            : filteredProducts.length > 0
                                                ? `${filteredProducts.length} Result${filteredProducts.length > 1 ? 's' : ''}`
                                                : 'No results found'}
                                    </p>
                                    {aiEnhanced && !aiLoading && (
                                        <span style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            padding: '3px 8px',
                                            borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                                            border: '1px solid #e0d8f0',
                                            fontSize: '9px',
                                            fontWeight: 600,
                                            color: '#7c3aed',
                                            fontFamily: "'Inter', sans-serif",
                                        }}>
                                            <Sparkles size={9} />
                                            AI
                                        </span>
                                    )}
                                </div>

                                {/* Mobile corrected query */}
                                {correctedQuery && aiEnhanced && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '12px',
                                        padding: '6px 10px',
                                        background: '#faf5ff',
                                        borderRadius: '6px',
                                        border: '1px solid #e8e0f0',
                                    }}>
                                        <Sparkles size={12} color="#8b5cf6" />
                                        <span style={{ fontSize: '11px', color: '#6b5b8a', fontFamily: "'Inter', sans-serif" }}>
                                            Results for <strong style={{ color: '#1a1a1a' }}>{correctedQuery}</strong>
                                        </span>
                                    </div>
                                )}

                                {/* Mobile AI Loading skeleton */}
                                {aiLoading && clientFilteredProducts.length === 0 && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
                                                <div className="shimmer" style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div className="shimmer" style={{ width: '65%', height: 13, borderRadius: 4, marginBottom: 6 }} />
                                                    <div className="shimmer" style={{ width: '35%', height: 11, borderRadius: 4 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {(!aiLoading || clientFilteredProducts.length > 0) && filteredProducts.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {filteredProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                href={product.href}
                                                onClick={handleSelectProduct}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px',
                                                    padding: '8px',
                                                    borderRadius: '8px',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f0'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <div style={{
                                                    width: '48px',
                                                    height: '48px',
                                                    borderRadius: '6px',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    background: '#f0f0ec',
                                                    position: 'relative',
                                                }}>
                                                    <Image src={product.image} alt={product.name} fill sizes="48px" style={{ objectFit: 'cover' }} />
                                                </div>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#1a1a1a',
                                                        margin: '0 0 4px 0',
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {product.name}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                        <span style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '13px',
                                                            fontWeight: 700,
                                                            color: '#1a1a1a',
                                                        }}>
                                                            ৳{product.price}
                                                        </span>
                                                        {product.originalPrice > 0 && (
                                                            <span style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '11px',
                                                                color: '#bbb',
                                                                textDecoration: 'line-through',
                                                            }}>
                                                                ৳{product.originalPrice}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (!aiLoading && (
                                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: '13px', color: '#999', margin: 0 }}>
                                            No products found for &ldquo;{searchQuery}&rdquo;
                                        </p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
