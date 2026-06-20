'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, ShoppingBag, User, Menu, X, ChevronDown, ChevronLeft, ArrowRight, Star, ChevronRight, TrendingUp, Sparkles, LogOut } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { getProductCards, getNavLinks, getSiteSetting } from '@/lib/db/queries';
import type { NavLinkItem } from '@/lib/db/queries';

interface NavLink {
    name: string;
    href: string;
    hasDropdown: boolean;
    highlight?: boolean;
    dropdownItems?: { name: string; href: string }[];
}

/** Convert DB nav links to the NavLink shape used by the header */
function toNavLinks(items: NavLinkItem[]): NavLink[] {
    return items.map(item => ({
        name: item.label,
        href: item.href,
        hasDropdown: item.children.length > 0,
        highlight: item.highlight,
        dropdownItems: item.children.length > 0
            ? item.children.map(c => ({ name: c.label, href: c.href }))
            : undefined,
    }));
}

interface SearchProduct {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    price: number;
    originalPrice: number;
    discountPercent: number;
    href: string;
    category: string;
    tags: string[];
}

const popularChoices = [
    { label: 'Shampoo', href: '/shop?type=shampoo' },
    { label: 'Hair Mask', href: '/shop?type=hair-mask' },
    { label: 'Roll On', href: '/shop?type=roll-on' },
    { label: 'Sunscreen', href: '/shop?type=sunscreen' },
    { label: 'Face Wash', href: '/shop?type=face-wash' },
    { label: 'Hair Oil', href: '/shop?type=hair-oil' },
];

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchFocused, setSearchFocused] = useState(false);
    const { totalItems, addToCart, cartBounce } = useCart();
    const { user, signOut } = useAuth();
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    // Close profile dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setProfileDropdownOpen(false);
        };
        if (profileDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [profileDropdownOpen]);

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (mobileMenuOpen) {
            document.body.style.overflow = 'hidden';
            document.body.style.height = '100%';
            document.documentElement.style.overflow = 'hidden';
            document.documentElement.style.height = '100%';
        } else {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        }
        return () => {
            document.body.style.overflow = '';
            document.body.style.height = '';
            document.documentElement.style.overflow = '';
            document.documentElement.style.height = '';
        };
    }, [mobileMenuOpen]);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchWrapperRef = useRef<HTMLDivElement>(null);
    const recScrollRef = useRef<HTMLDivElement>(null);
    const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
    const [navLinks, setNavLinks] = useState<NavLink[]>([]);
    const [headerSettings, setHeaderSettings] = useState<{ show_announcement: boolean; announcement_text: string }>({
        show_announcement: false,
        announcement_text: 'Free shipping on orders above ৳499',
    });

    // ── AI Search state ──
    const [aiResults, setAiResults] = useState<SearchProduct[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiEnhanced, setAiEnhanced] = useState(false);
    const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
    const [aiIntent, setAiIntent] = useState<string | null>(null);
    const aiAbortRef = useRef<AbortController | null>(null);
    const aiDebounceRef = useRef<NodeJS.Timeout | null>(null);


    useEffect(() => {
        getProductCards().then(cards => {
            setAllProducts(cards.map(p => ({
                id: String(p.id),
                name: p.name,
                image: p.primary_image_url || '/no-image.svg',
                rating: Number(p.rating_avg) || 0,
                reviewCount: p.review_count || 0,
                price: Math.ceil(Number(p.base_price)),
                originalPrice: Math.ceil(Number(p.compare_at_price) || 0),
                discountPercent: Number(p.discount_percent) || 0,
                href: `/product/${p.slug}`,
                category: p.category_name || '',
                tags: [...(p.tags || []), ...(p.concerns || [])],
            })));
        });
        // Fetch nav links from DB
        getNavLinks().then(items => {
            setNavLinks(toNavLinks(items));
        });
        // Fetch header settings
        getSiteSetting('header_settings').then(val => {
            if (val) setHeaderSettings(val as any);
        });
    }, []);

    // Close search on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
                setSearchFocused(false);
            }
        };
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSearchFocused(false);
        };
        if (searchFocused) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [searchFocused]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const scrollRec = useCallback((dir: 'left' | 'right') => {
        if (!recScrollRef.current) return;
        const amt = recScrollRef.current.clientWidth * 0.75;
        recScrollRef.current.scrollBy({ left: dir === 'left' ? -amt : amt, behavior: 'smooth' });
    }, []);

    // Search filtering (instant client-side)
    const clientFilteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        const results = allProducts.filter((p) => {
            const nameMatch = p.name.toLowerCase().includes(q);
            const categoryMatch = p.category.toLowerCase().includes(q);
            const tagMatch = p.tags.some((t) => t.toLowerCase().includes(q));
            return nameMatch || categoryMatch || tagMatch;
        });

        return results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();
            
            // 1. Exact match
            if (aName === q && bName !== q) return -1;
            if (bName === q && aName !== q) return 1;

            // 2. Starts with
            const aStarts = aName.startsWith(q);
            const bStarts = bName.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            // 3. Name match vs just category/tag match
            const aIncludes = aName.includes(q);
            const bIncludes = bName.includes(q);
            if (aIncludes && !bIncludes) return -1;
            if (bIncludes && !aIncludes) return 1;

            return 0;
        });
    }, [searchQuery, allProducts]);

    // Use AI/Server results if we have them and we are not currently loading. 
    // While loading, show instant client-side filter results.
    const filteredProducts = !aiLoading && aiResults.length > 0 ? aiResults : clientFilteredProducts;

    // Debounced AI search
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query || query.length < 2) {
            setAiResults([]);
            setAiEnhanced(false);
            setCorrectedQuery(null);
            setAiIntent(null);
            setAiLoading(false);
            return;
        }

        // Cancel previous requests
        if (aiAbortRef.current) aiAbortRef.current.abort();
        if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

        setAiLoading(true);

        aiDebounceRef.current = setTimeout(async () => {
            const controller = new AbortController();
            aiAbortRef.current = controller;

            try {
                const res = await fetch('/api/ai-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();

                if (!controller.signal.aborted) {
                    const mapped: SearchProduct[] = (data.products || []).map((p: Record<string, unknown>) => ({
                        id: String(p.id),
                        name: p.name as string,
                        image: (p.primary_image_url as string) || '/no-image.svg',
                        rating: Number(p.rating_avg) || 0,
                        reviewCount: Number(p.review_count) || 0,
                        price: Math.ceil(Number(p.base_price)),
                        originalPrice: Math.ceil(Number(p.compare_at_price) || 0),
                        discountPercent: Number(p.discount_percent) || 0,
                        href: `/product/${p.slug}`,
                        category: (p.category_name as string) || '',
                        tags: [...((p.tags as string[]) || []), ...((p.concerns as string[]) || [])],
                    }));

                    setAiResults(mapped);
                    setAiEnhanced(!!data.aiEnhanced);
                    setCorrectedQuery(data.correctedQuery || null);
                    setAiIntent(data.intent || null);
                    setAiLoading(false);
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('[AI Search] Failed:', err);
                setAiLoading(false);
                setAiEnhanced(false);
            }
        }, 300);

        return () => {
            if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
        };
    }, [searchQuery]);

    const matchingChoices = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        return popularChoices.filter((c) => c.label.toLowerCase().includes(q));
    }, [searchQuery]);

    const hasQuery = searchQuery.trim().length > 0;

    const handleMouseEnter = (linkName: string | null) => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
        setActiveDropdown(linkName);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setActiveDropdown(null);
            timeoutRef.current = null;
        }, 200);
    };

    return (
        <>
            {/* ===== ROW 1: Announcement Bar ===== */}
            {headerSettings.show_announcement && (
                <div
                    style={{
                        background: '#1a1a1a',
                        padding: '7px 0',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 500,
                        color: 'white',
                        letterSpacing: '0.3px',
                        borderBottom: '1px solid #2a2a2a',
                        fontFamily: "'Inter', sans-serif",
                    }}
                >
                    {headerSettings.announcement_text}
                </div>
            )}

            {/* ===== ROW 2: Main Header ===== */}
            <header
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 1000,
                    background: 'black',
                    borderBottom: '1px solid #2a2a2a',
                }}
            >
                <div
                    className="header-inner"
                    style={{
                        maxWidth: '1400px',
                        margin: '0 auto',
                        padding: '0 32px',
                        display: 'flex',
                        alignItems: 'center',
                        height: '56px',
                        gap: '24px',
                    }}
                >
                    {/* Mobile Hamburger — left side */}
                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="mobile-menu-btn"
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#ffffff',
                            cursor: 'pointer',
                            padding: '8px',
                            display: 'none',
                            flexShrink: 0,
                        }}
                        aria-label="Menu"
                    >
                        {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    {/* Logo */}
                    <Link
                        href="/"
                        className="header-logo"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            flexShrink: 0,
                            textDecoration: 'none',
                        }}
                    >
                        <Image 
                            src="/logo69.png" 
                            alt="ValleyCentia Logo" 
                            width={229} 
                            height={70} 
                            priority
                            unoptimized
                            style={{ height: '55px', width: 'auto', objectFit: 'fill' }}
                        />
                    </Link>
                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Search Bar + Dropdown */}
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
                                                                onClick={() => { setSearchFocused(false); setSearchQuery(''); }}
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
                                                            onClick={() => { setSearchFocused(false); setSearchQuery(''); setAiResults([]); setAiEnhanced(false); setCorrectedQuery(null); }}
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

                    {/* Right Icons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {/* Profile */}
                        {/* Profile */}
                        {user ? (
                            <div style={{ position: 'relative' }} ref={profileMenuRef}>
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
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
                                    {profileDropdownOpen && (
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
                                                onClick={() => setProfileDropdownOpen(false)}
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
                                                    onClick={() => setProfileDropdownOpen(false)}
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
                                                    setProfileDropdownOpen(false);
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
                        ) : (
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
                        )}
                        {/* Cart */}
                        <Link
                            href="/cart"
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
                                position: 'relative',
                                transition: 'all 0.15s ease',
                                textDecoration: 'none',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.color = '#ccc';
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.color = '#ffffff';
                                e.currentTarget.style.background = 'none';
                            }}
                            aria-label="Cart"
                        >
                            <ShoppingBag size={20} />
                            {totalItems > 0 && (
                                <span
                                    className={cartBounce ? 'cart-bounce' : ''}
                                    key={cartBounce ? 'bounce' : 'idle'}
                                    style={{
                                        position: 'absolute',
                                        top: '2px',
                                        right: '2px',
                                        width: '15px',
                                        height: '15px',
                                        background: '#f5c518',
                                        borderRadius: '50%',
                                        fontSize: '9px',
                                        fontWeight: 700,
                                        color: '#0a0a0b',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    {totalItems > 9 ? '9+' : totalItems}
                                </span>
                            )}
                        </Link>


                    </div>
                </div>

                {/* ===== Mobile Search Bar ===== */}
                <div
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
                                                        onClick={() => { setSearchFocused(false); setSearchQuery(''); setAiResults([]); setAiEnhanced(false); setCorrectedQuery(null); }}
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

                {/* ===== ROW 3: Navigation Bar ===== */}
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
            </header>

            {/* ===== Mobile Menu Overlay ===== */}
            <AnimatePresence>
                {mobileMenuOpen && (
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
                        onClick={() => setMobileMenuOpen(false)}
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
                                borderBottom: '1px solid rgba(0, 0, 0, 0.05)'
                            }}>
                                <Link href="/" onClick={() => setMobileMenuOpen(false)}>
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
                                    onClick={() => setMobileMenuOpen(false)}
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
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.08)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
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
                                                    onClick={() => { setMobileMenuOpen(false); setSearchQuery(''); }}
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

                            {navLinks.map((link) => (
                                <MobileNavItem
                                    key={link.name}
                                    link={link}
                                    onClose={() => setMobileMenuOpen(false)}
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
                                            gap: '12px'
                                        }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #1a1a1a, #333333)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '12px', fontWeight: 800, color: '#ffffff',
                                                fontFamily: "'Outfit', sans-serif",
                                                flexShrink: 0
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
                                            onClick={() => setMobileMenuOpen(false)}
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
                                                onClick={() => setMobileMenuOpen(false)}
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
                                                setMobileMenuOpen(false);
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
                                        onClick={() => setMobileMenuOpen(false)}
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
        </>
    );
}

/* ===== Helper Components ===== */

function IconButton({ icon, label }: { icon: React.ReactNode; label: string }) {
    return (
        <button
            style={{
                background: 'none',
                border: 'none',
                color: '#aaa',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fff';
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.color = '#aaa';
                e.currentTarget.style.background = 'none';
            }}
            aria-label={label}
        >
            {icon}
        </button>
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
