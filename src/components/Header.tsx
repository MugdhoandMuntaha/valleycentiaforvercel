'use client';

import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { getProductCards, getNavLinks, getSiteSetting } from '@/lib/db/queries';
import type { NavLinkItem } from '@/lib/db/queries';
import type { SearchProduct } from '@/hooks/useSearch';
import AnnouncementBar from '@/components/header/AnnouncementBar';
import HeaderLogo from '@/components/header/HeaderLogo';
import CartIcon from '@/components/header/CartIcon';
import ProfileMenu from '@/components/header/ProfileMenu';
import DesktopNav from '@/components/header/DesktopNav';
import SearchBar from '@/components/header/SearchBar';
import MobileSearchBar from '@/components/header/MobileSearchBar';
import MobileMenu from '@/components/header/MobileMenu';
import type { NavLink } from '@/components/header/constants';

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

export default function Header() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [allProducts, setAllProducts] = useState<SearchProduct[]>([]);
    const [navLinks, setNavLinks] = useState<NavLink[]>([]);
    const [headerSettings, setHeaderSettings] = useState<{ show_announcement: boolean; announcement_text: string }>({
        show_announcement: false,
        announcement_text: 'Free shipping on orders above ৳499',
    });

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

        getNavLinks().then(items => {
            setNavLinks(toNavLinks(items));
        });

        getSiteSetting('header_settings').then(val => {
            if (val) setHeaderSettings(val as any);
        });
    }, []);

    return (
        <>
            {/* ===== ROW 1: Announcement Bar ===== */}
            <AnnouncementBar
                show={headerSettings.show_announcement}
                text={headerSettings.announcement_text}
            />

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
                    <HeaderLogo />

                    {/* Spacer */}
                    <div style={{ flex: 1 }} />

                    {/* Desktop Search Bar + Dropdown */}
                    <SearchBar allProducts={allProducts} />

                    {/* Right Icons: Profile + Cart */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <ProfileMenu />
                        <CartIcon />
                    </div>
                </div>

                {/* ===== Mobile Search Bar ===== */}
                <MobileSearchBar allProducts={allProducts} />

                {/* ===== ROW 3: Navigation Bar ===== */}
                <DesktopNav navLinks={navLinks} />
            </header>

            {/* ===== Mobile Menu Drawer ===== */}
            <MobileMenu
                isOpen={mobileMenuOpen}
                onClose={() => setMobileMenuOpen(false)}
                navLinks={navLinks}
                allProducts={allProducts}
            />
        </>
    );
}
