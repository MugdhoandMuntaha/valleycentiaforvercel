'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, ArrowRight, Star, ChevronLeft, ChevronRight, TrendingUp, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { useSearch, type SearchProduct } from '@/hooks/useSearch';
import { useClickOutside } from '@/hooks/useClickOutside';
import { popularChoices } from './constants';

interface SearchBarProps {
    allProducts: SearchProduct[];
}

export default function SearchBar({ allProducts }: SearchBarProps) {
    const [searchFocused, setSearchFocused] = useState(false);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const recScrollRef = useRef<HTMLDivElement>(null);
    const { addToCart } = useCart();

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

    useClickOutside(searchWrapperRef, () => setSearchFocused(false), searchFocused);

    const scrollRec = useCallback((dir: 'left' | 'right') => {
        if (!recScrollRef.current) return;
        const amt = recScrollRef.current.clientWidth * 0.75;
        recScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }, []);

    const matchingChoices = searchQuery.trim()
        ? popularChoices.filter(c => c.label.toLowerCase().includes(searchQuery.toLowerCase().trim()))
        : [];

    const handleSelectProduct = () => {
        setSearchFocused(false);
        resetSearch();
    };

    return (
        <div
            ref={searchWrapperRef}
            className="desktop-nav"
            style={{
                position: 'relative',
                flexShrink: 0,
            }}
        >
            {/* Search Input */}
            <div
                onClick={() => setSearchFocused(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: '#1e1e1e',
                    borderRadius: '6px',
                    border: searchFocused ? '1px solid #555' : '1px solid #333',
                    padding: '0 12px',
                    height: '34px',
                    width: '280px',
                    transition: 'border-color 0.2s ease',
                }}
            >
                <Search size={14} style={{ color: '#888', flexShrink: 0 }} />
                <input
                    type="text"
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        outline: 'none',
                        width: '100%',
                        fontSize: '13px',
                        color: '#ffffff',
                        padding: '0 8px',
                        fontFamily: "'Inter', sans-serif",
                    }}
                />
            </div>

            {/* Search Dropdown */}
            <AnimatePresence>
                {searchFocused && (
                    <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            right: 0,
                            width: '720px',
                            background: '#ffffff',
                            borderRadius: '14px',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.05)',
                            zIndex: 200,
                            overflow: 'hidden',
                        }}
                    >
                        {/* When no query: show default view */}
                        {!hasQuery && (
                            <>
                                {/* Popular Choices */}
                                <div style={{ padding: '20px 24px 0' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                                        <TrendingUp size={18} color="#1a1a1a" strokeWidth={2.5} />
                                        <h3 style={{
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                            margin: 0,
                                        }}>
                                            Popular Choices
                                        </h3>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', paddingBottom: '18px' }}>
                                        {popularChoices.map((choice) => (
                                            <Link
                                                key={choice.label}
                                                href={choice.href}
                                                onClick={() => setSearchFocused(false)}
                                                style={{
                                                    display: 'inline-flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    background: '#1a1a1a',
                                                    color: '#ffffff',
                                                    padding: '8px 16px',
                                                    borderRadius: '20px',
                                                    fontSize: '13px',
                                                    fontWeight: 500,
                                                    fontFamily: "'Inter', sans-serif",
                                                    textDecoration: 'none',
                                                    transition: 'background 0.15s ease',
                                                    whiteSpace: 'nowrap',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                                            >
                                                {choice.label}
                                                <ArrowRight size={14} />
                                            </Link>
                                        ))}
                                    </div>
                                </div>

                                {/* Divider */}
                                <div style={{ height: '1px', background: '#eee', margin: '0 24px' }} />

                                {/* Recommended For You */}
                                <div style={{ padding: '18px 24px 22px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10" />
                                            <path d="M12 6v6l4 2" />
                                        </svg>
                                        <h3 style={{
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                            margin: 0,
                                        }}>
                                            Recommended For You
                                        </h3>
                                    </div>

                                    {/* Scrollable product cards */}
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            ref={recScrollRef}
                                            className="hide-scrollbar"
                                            style={{
                                                display: 'flex',
                                                gap: '14px',
                                                overflowX: 'auto',
                                                scrollSnapType: 'x mandatory',
                                                scrollbarWidth: 'none',
                                                msOverflowStyle: 'none',
                                                paddingBottom: '4px',
                                            }}
                                        >
                                            {allProducts.slice(0, 5).map((product) => (
                                                <Link
                                                    key={product.id}
                                                    href={product.href}
                                                    onClick={() => setSearchFocused(false)}
                                                    style={{
                                                        minWidth: '200px',
                                                        maxWidth: '200px',
                                                        scrollSnapAlign: 'start',
                                                        textDecoration: 'none',
                                                        color: 'inherit',
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        borderRadius: '10px',
                                                        border: '1px solid #eee',
                                                        overflow: 'hidden',
                                                        transition: 'box-shadow 0.2s ease',
                                                        background: '#ffffff',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.boxShadow = 'none';
                                                    }}
                                                >
                                                    {/* Product Image */}
                                                    <div style={{ position: 'relative', width: '100%', height: '200px', background: '#f5f5f0' }}>
                                                        <Image
                                                            src={product.image}
                                                            alt={product.name}
                                                            fill
                                                            sizes="200px"
                                                            style={{ objectFit: 'cover' }}
                                                        />
                                                    </div>

                                                    {/* Product Info */}
                                                    <div style={{ padding: '10px 12px 14px' }}>
                                                        {/* Rating */}
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                                            <span style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                gap: '3px',
                                                                color: '#ffb700',
                                                                fontSize: '13px',
                                                                fontWeight: 700,
                                                                fontFamily: "'Inter', sans-serif",
                                                            }}>
                                                                <Star size={12} fill="#ffb700" stroke="#ffb700" />
                                                                {product.rating}
                                                            </span>
                                                            <span style={{
                                                                color: '#999',
                                                                fontSize: '12px',
                                                                fontFamily: "'Inter', sans-serif",
                                                            }}>
                                                                | {product.reviewCount} Reviews
                                                            </span>
                                                        </div>

                                                        {/* Name */}
                                                        <p style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '13px',
                                                            fontWeight: 600,
                                                            color: '#1a1a1a',
                                                            lineHeight: 1.4,
                                                            marginBottom: '8px',
                                                            display: '-webkit-box',
                                                            WebkitLineClamp: 2,
                                                            WebkitBoxOrient: 'vertical',
                                                            overflow: 'hidden',
                                                            margin: '0 0 8px 0',
                                                        }}>
                                                            {product.name}
                                                        </p>

                                                        {/* Price */}
                                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '10px' }}>
                                                            <span style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '16px',
                                                                fontWeight: 700,
                                                                color: '#1a1a1a',
                                                                lineHeight: 1,
                                                            }}>
                                                                ৳{product.price}
                                                            </span>
                                                            {product.originalPrice > 0 && (
                                                                <span style={{
                                                                    fontFamily: "'Inter', sans-serif",
                                                                    fontSize: '13px',
                                                                    color: '#bbb',
                                                                    textDecoration: 'line-through',
                                                                    lineHeight: 1,
                                                                }}>
                                                                    ৳{product.originalPrice}
                                                                </span>
                                                            )}
                                                            {product.discountPercent > 0 && (
                                                                <span style={{
                                                                    fontFamily: "'Inter', sans-serif",
                                                                    fontSize: '11px',
                                                                    fontWeight: 700,
                                                                    color: '#2e7d32',
                                                                }}>
                                                                    {Math.ceil(product.discountPercent)}% OFF
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* ADD TO CART button */}
                                                        <button
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                addToCart({
                                                                    id: String(product.id),
                                                                    slug: product.href.replace('/product/', ''),
                                                                    name: product.name,
                                                                    image: product.image,
                                                                    price: product.price,
                                                                    originalPrice: product.originalPrice,
                                                                });
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: '8px',
                                                                background: '#f5c518',
                                                                color: '#1a1a1a',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                padding: '10px 0',
                                                                fontSize: '13px',
                                                                fontWeight: 700,
                                                                fontFamily: "'Inter', sans-serif",
                                                                cursor: 'pointer',
                                                                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                                                letterSpacing: '0.5px',
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.background = '#e6b800';
                                                                e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                                                e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 197, 24, 0.4)';
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.background = '#f5c518';
                                                                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                                                e.currentTarget.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            <ShoppingBag size={14} />
                                                            ADD TO CART
                                                        </button>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>

                                        {/* Scroll left button */}
                                        <button
                                            onClick={() => scrollRec('left')}
                                            style={{
                                                position: 'absolute',
                                                left: '-8px',
                                                top: '38%',
                                                transform: 'translateY(-50%)',
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: '#ffffff',
                                                border: '1px solid #ddd',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5,
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                                            }}
                                        >
                                            <ChevronLeft size={18} color="#333" />
                                        </button>

                                        {/* Scroll right button */}
                                        <button
                                            onClick={() => scrollRec('right')}
                                            style={{
                                                position: 'absolute',
                                                right: '-8px',
                                                top: '38%',
                                                transform: 'translateY(-50%)',
                                                width: '36px',
                                                height: '36px',
                                                borderRadius: '50%',
                                                background: '#ffffff',
                                                border: '1px solid #ddd',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                zIndex: 5,
                                                transition: 'all 0.2s ease',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.18)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                                            }}
                                        >
                                            <ChevronRight size={18} color="#333" />
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}

                        {/* When has query: show search results */}
                        {hasQuery && (
                            <div style={{ padding: '20px 24px 22px' }}>
                                {/* Matching category pills */}
                                {matchingChoices.length > 0 && (
                                    <div style={{ marginBottom: '16px' }}>
                                        <p style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            color: '#999',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.8px',
                                            marginBottom: '10px',
                                        }}>
                                            Categories
                                        </p>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {matchingChoices.map((choice) => (
                                                <Link
                                                    key={choice.label}
                                                    href={choice.href}
                                                    onClick={() => { setSearchFocused(false); resetSearch(); }}
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        background: '#1a1a1a',
                                                        color: '#ffffff',
                                                        padding: '7px 14px',
                                                        borderRadius: '20px',
                                                        fontSize: '12px',
                                                        fontWeight: 500,
                                                        fontFamily: "'Inter', sans-serif",
                                                        textDecoration: 'none',
                                                        transition: 'background 0.15s ease',
                                                    }}
                                                    onMouseEnter={(e) => { e.currentTarget.style.background = '#333'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.background = '#1a1a1a'; }}
                                                >
                                                    {choice.label}
                                                    <ArrowRight size={12} />
                                                </Link>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Corrected query notice */}
                                {correctedQuery && aiEnhanced && (
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '12px',
                                        padding: '8px 12px',
                                        background: 'linear-gradient(135deg, #faf5ff, #f0f7ff)',
                                        borderRadius: '8px',
                                        border: '1px solid #e8e0f0',
                                    }}>
                                        <Sparkles size={14} color="#8b5cf6" />
                                        <span style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '12px',
                                            color: '#6b5b8a',
                                        }}>
                                            Showing results for <strong style={{ color: '#1a1a1a' }}>{correctedQuery}</strong>
                                        </span>
                                    </div>
                                )}

                                {/* Search results header */}
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
                                            padding: '3px 10px',
                                            borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
                                            border: '1px solid #e0d8f0',
                                            fontSize: '10px',
                                            fontWeight: 600,
                                            color: '#7c3aed',
                                            fontFamily: "'Inter', sans-serif",
                                            letterSpacing: '0.3px',
                                        }}>
                                            <Sparkles size={10} />
                                            AI Enhanced
                                        </span>
                                    )}
                                </div>

                                {/* AI Loading skeleton */}
                                {aiLoading && clientFilteredProducts.length === 0 && (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0',
                                    }}>
                                        {[1, 2, 3].map((i) => (
                                            <div key={i} style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '14px',
                                                padding: '12px 8px',
                                            }}>
                                                <div className="shimmer" style={{ width: 56, height: 56, borderRadius: 8, flexShrink: 0 }} />
                                                <div style={{ flex: 1 }}>
                                                    <div className="shimmer" style={{ width: '70%', height: 14, borderRadius: 4, marginBottom: 8 }} />
                                                    <div className="shimmer" style={{ width: '40%', height: 12, borderRadius: 4 }} />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Filtered product list */}
                                {(!aiLoading || clientFilteredProducts.length > 0) && filteredProducts.length > 0 ? (
                                    <div style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '0',
                                        maxHeight: '340px',
                                        overflowY: 'auto',
                                        scrollbarWidth: 'thin',
                                    }}>
                                        {filteredProducts.map((product) => (
                                            <Link
                                                key={product.id}
                                                href={product.href}
                                                onClick={handleSelectProduct}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '14px',
                                                    padding: '12px 8px',
                                                    borderRadius: '10px',
                                                    textDecoration: 'none',
                                                    color: 'inherit',
                                                    transition: 'background 0.15s ease',
                                                }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f0'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                                            >
                                                {/* Thumbnail */}
                                                <div style={{
                                                    width: '56px',
                                                    height: '56px',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    flexShrink: 0,
                                                    background: '#f0f0ec',
                                                    position: 'relative',
                                                }}>
                                                    <Image
                                                        src={product.image}
                                                        alt={product.name}
                                                        fill
                                                        sizes="56px"
                                                        style={{ objectFit: 'cover' }}
                                                    />
                                                </div>

                                                {/* Info */}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '13px',
                                                        fontWeight: 600,
                                                        color: '#1a1a1a',
                                                        margin: '0 0 4px 0',
                                                        lineHeight: 1.3,
                                                        whiteSpace: 'nowrap',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}>
                                                        {product.name}
                                                    </p>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <span style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            gap: '3px',
                                                            color: '#ffb700',
                                                            fontSize: '12px',
                                                            fontWeight: 700,
                                                            fontFamily: "'Inter', sans-serif",
                                                        }}>
                                                            <Star size={11} fill="#ffb700" stroke="#ffb700" />
                                                            {product.rating}
                                                        </span>
                                                        <span style={{ color: '#ccc', fontSize: '12px' }}>|</span>
                                                        <span style={{
                                                            fontFamily: "'Inter', sans-serif",
                                                            fontSize: '14px',
                                                            fontWeight: 700,
                                                            color: '#1a1a1a',
                                                            lineHeight: 1,
                                                        }}>
                                                            ৳{product.price}
                                                        </span>
                                                        {product.discountPercent > 0 && (
                                                            <span style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: '#2e7d32',
                                                            }}>
                                                                {Math.ceil(product.discountPercent)}% OFF
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Arrow */}
                                                <ChevronRight size={16} color="#bbb" style={{ flexShrink: 0 }} />
                                            </Link>
                                        ))}
                                    </div>
                                ) : (!aiLoading && (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '30px 20px',
                                    }}>
                                        <Search size={36} color="#ddd" style={{ marginBottom: '12px' }} />
                                        <p style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '14px',
                                            color: '#999',
                                            margin: 0,
                                        }}>
                                            No products found for &ldquo;{searchQuery}&rdquo;
                                        </p>
                                        <p style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '12px',
                                            color: '#bbb',
                                            margin: '6px 0 0',
                                        }}>
                                            Try searching for shampoo, serum, sunscreen...
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
