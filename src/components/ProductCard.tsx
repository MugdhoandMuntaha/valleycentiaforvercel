'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, Check, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SectionProduct } from '@/data/homeSections';
import type { ProductCard as DbProductCard } from '@/lib/db/queries';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import SizeSelectionModal, { type ProductSize } from '@/components/product/SizeSelectionModal';
import ProductBadge from '@/components/common/ProductBadge';

export interface ProductCardProps {
    product: SectionProduct | DbProductCard;
    index?: number;
    isCarousel?: boolean;
    showWishlist?: boolean;
    className?: string;
    style?: React.CSSProperties;
}

/** Normalize any input product (DB ProductCard or SectionProduct) into unified SectionProduct shape */
function normalizeProduct(raw: any): SectionProduct {
    if (!raw) return raw;
    if (raw.title && raw.image !== undefined) {
        return raw as SectionProduct;
    }
    const badges = raw.badges as { badge: string; label: string | null; color: string | null }[] | null;
    const primaryBadge = badges?.find((b) => b.label) || badges?.[0];
    const badgeText = raw.custom_badge_text || (primaryBadge ? (primaryBadge.label || primaryBadge.badge).replace(/_/g, ' ').toUpperCase() : undefined);
    const formatReviewCount = (count: number) => count >= 1000 ? `${(count / 1000).toFixed(1)}K` : String(count);

    return {
        id: String(raw.id || raw._id),
        slug: raw.slug || '',
        image: raw.primary_image_url || raw.image || '/no-image.svg',
        title: raw.name || raw.title || '',
        description: raw.short_description || raw.description || '',
        price: Math.ceil(Number(raw.base_price ?? raw.price ?? 0)),
        originalPrice: raw.compare_at_price ? Math.ceil(Number(raw.compare_at_price)) : (raw.originalPrice ? Math.ceil(Number(raw.originalPrice)) : undefined),
        discountPercent: raw.discount_percent !== undefined ? Number(raw.discount_percent) : raw.discountPercent,
        rating: Number(raw.rating_avg ?? raw.rating ?? 0),
        reviewCount: typeof raw.review_count === 'number' ? formatReviewCount(raw.review_count) : (raw.reviewCount || '0'),
        badge: badgeText || raw.badge,
        badgeColor: raw.custom_badge_color || primaryBadge?.color || raw.badgeColor,
        inStock: raw.in_stock !== undefined ? raw.in_stock : (raw.inStock !== undefined ? raw.inStock : true),
        stockQuantity: raw.stock_quantity !== undefined ? raw.stock_quantity : (raw.stockQuantity !== undefined ? raw.stockQuantity : 0),
        sizes: raw.sizes || null,
        couponCode: raw.coupon_code || raw.couponCode,
        couponPrice: raw.coupon_price ? Math.ceil(Number(raw.coupon_price)) : (raw.couponPrice ? Math.ceil(Number(raw.couponPrice)) : undefined),
    };
}

export default function ProductCard({
    product,
    index = 0,
    isCarousel = false,
    showWishlist = false,
    className = '',
    style,
}: ProductCardProps) {
    const item = normalizeProduct(product);
    const { addToCart } = useCart();
    const { isWishlisted, toggleWishlist } = useWishlist();

    const wishlisted = isWishlisted(String(item.id));

    // Image fallback state
    const [imgSrc, setImgSrc] = useState(item.image || '/no-image.svg');

    useEffect(() => {
        setImgSrc(item.image || '/no-image.svg');
    }, [item.image]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Added feedback state
    const [isAdded, setIsAdded] = useState(false);

    // Unified card classes for homepage, shop, PDP, and cart
    const cardClassName = `product-card carousel-card ${isCarousel ? 'is-carousel' : 'grid-card shop-product-card'} ${className}`.trim();

    // Width/Height logic for Carousel vs Grid
    const cardStyle: React.CSSProperties = isCarousel
        ? {
              minWidth: 'calc((100% - 80px) / 4.17)',
              maxWidth: 'calc((100% - 80px) / 4.17)',
              height: '532px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              position: 'relative',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              ...style,
          }
        : {
              width: '100%',
              height: '532px',
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #f0f0f0',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              position: 'relative',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              ...style,
          };

    // Calculate discount percent
    const discount = item.discountPercent || (item.originalPrice
        ? Math.ceil(((item.originalPrice - item.price) / item.originalPrice) * 100)
        : 0);

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (item.inStock === false) return;

        // Reset state for modal
        const defaultSize = item.sizes?.find(s => s.is_default && (s.stockQuantity === undefined || s.stockQuantity > 0))
            || item.sizes?.find(s => s.stockQuantity === undefined || s.stockQuantity > 0)
            || item.sizes?.find(s => s.is_default)
            || item.sizes?.[0]
            || null;

        setSelectedSize(defaultSize);
        setQuantity(1);
        setIsModalOpen(true);
    };

    const handleConfirmAddToCart = () => {
        const finalPrice = selectedSize ? selectedSize.price : item.price;
        const finalOriginalPrice = selectedSize
            ? (item.discountPercent ? Math.ceil(selectedSize.price / (1 - item.discountPercent / 100)) : selectedSize.price)
            : item.originalPrice;

        addToCart({
            id: String(item.id),
            slug: item.slug,
            name: item.title,
            image: item.image,
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            size: selectedSize ? selectedSize.label : 'Default',
            stockQuantity: selectedSize ? selectedSize.stockQuantity : item.stockQuantity,
        }, quantity);

        setIsAdded(true);
        setTimeout(() => {
            setIsAdded(false);
        }, 1500);

        setIsModalOpen(false);
    };

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                style={{ display: 'contents' }}
            >
                <div
                    style={cardStyle}
                    className={cardClassName}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.04)';
                    }}
                >
                    {/* Top-left Badge */}
                    {item.badge && (
                        <ProductBadge
                            badge={item.badge}
                            badgeColor={item.badgeColor}
                            variant="card"
                        />
                    )}

                    {/* Wishlist Heart (Optional) */}
                    {showWishlist && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleWishlist(String(item.id));
                            }}
                            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: wishlisted ? '#fef2f2' : 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(4px)',
                                border: wishlisted ? '1.5px solid #ef4444' : '1px solid #e0e0e0',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s ease',
                                zIndex: 3,
                                boxShadow: '0 1px 6px rgba(0,0,0,0.08)',
                            }}
                        >
                            <Heart
                                size={16}
                                fill={wishlisted ? '#ef4444' : 'none'}
                                color={wishlisted ? '#ef4444' : '#888'}
                                strokeWidth={2}
                            />
                        </button>
                    )}

                    {/* Image Area */}
                    <Link
                        href={`/product/${item.slug}`}
                        className="card-image-area"
                        style={{
                            display: 'block',
                            position: 'relative',
                            height: '50%',
                            overflow: 'hidden',
                            background: '#f8f6f3',
                        }}
                    >
                        <Image
                            src={imgSrc}
                            alt={item.title}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            style={{
                                objectFit: 'cover',
                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            className="product-image"
                            onError={() => setImgSrc('/no-image.svg')}
                        />
                    </Link>

                    {/* Card Content */}
                    <div
                        className="card-content"
                        style={{
                            padding: '14px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                        }}
                    >
                        {/* Title */}
                        <Link href={`/product/${item.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h3
                                className="card-title"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '18px',
                                    fontWeight: 600,
                                    color: '#1a1a1a',
                                    lineHeight: 1.4,
                                    marginBottom: '4px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.title}
                            </h3>
                        </Link>

                        {/* Description */}
                        {item.description && (
                            <p
                                className="card-desc"
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    color: '#888',
                                    lineHeight: 1.4,
                                    marginBottom: '12px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    lineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {item.description}
                            </p>
                        )}

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* Price & Action Area (Stacked on PC, side-by-side on mobile via CSS) */}
                        <div
                            className="card-bottom-area"
                            style={{
                                marginTop: 'auto',
                            }}
                        >
                            {/* Price Section */}
                            <div
                                className="card-price-section"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '3px',
                                    marginBottom: '10px',
                                }}
                            >
                                {/* Current Price */}
                                <span
                                    className="card-price"
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '20px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                        lineHeight: 1,
                                    }}
                                >
                                    ৳{item.price}
                                </span>

                                {/* Strikethrough Original Price & Discount Row */}
                                {((item.originalPrice != null && item.originalPrice > item.price) || discount > 0) && (
                                    <div
                                        className="card-discount-row"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {item.originalPrice != null && item.originalPrice > item.price && (
                                            <span
                                                className="card-original-price"
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '13px',
                                                    color: '#9ca3af',
                                                    textDecoration: 'line-through',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                ৳{item.originalPrice}
                                            </span>
                                        )}
                                        {discount > 0 && (
                                            <span
                                                className="card-discount-pct"
                                                style={{
                                                    fontFamily: "'Inter', sans-serif",
                                                    fontSize: '13px',
                                                    fontWeight: 700,
                                                    color: '#4caf50',
                                                    letterSpacing: '0.2px',
                                                }}
                                            >
                                                {Math.ceil(discount)}% OFF
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Add to Cart Button */}
                            <button
                                type="button"
                                className="card-add-btn"
                                disabled={item.inStock === false}
                                onClick={handleAddToCartClick}
                                aria-label={item.inStock === false ? 'Out of stock' : 'Add to cart'}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: item.inStock === false ? '#e0e0e0' : (isAdded ? '#1a1a1a' : '#f5c518'),
                                    color: item.inStock === false ? '#888' : (isAdded ? '#ffffff' : '#1a1a1a'),
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '11px 0',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    cursor: item.inStock === false ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textTransform: 'uppercase',
                                }}
                                onMouseEnter={(e) => {
                                    if (item.inStock === false) return;
                                    if (!isAdded) {
                                        e.currentTarget.style.background = '#e6b800';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 197, 24, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (item.inStock === false) return;
                                    if (!isAdded) {
                                        e.currentTarget.style.background = '#f5c518';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                {item.inStock === false ? (
                                    <span className="card-btn-text">OUT OF STOCK</span>
                                ) : isAdded ? (
                                    <>
                                        <Check size={16} className="cart-added-check" />
                                        <span className="card-btn-text">ADDED!</span>
                                    </>
                                ) : (
                                    <>
                                        <ShoppingBag size={17} className="card-btn-icon" />
                                        <span className="card-btn-text">ADD TO CART</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Size Selection Modal */}
            <SizeSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={item}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onConfirm={handleConfirmAddToCart}
            />
        </>
    );
}
