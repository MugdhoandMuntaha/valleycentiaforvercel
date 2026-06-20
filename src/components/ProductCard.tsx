'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Tag, Heart, Check, Minus, Plus, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { SectionProduct } from '@/data/homeSections';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';

interface ProductCardProps {
    product: SectionProduct;
    index?: number;
    isCarousel?: boolean;
    showWishlist?: boolean;
}

export default function ProductCard({
    product,
    index = 0,
    isCarousel = false,
    showWishlist = false,
}: ProductCardProps) {
    const { addToCart } = useCart();
    const { isWishlisted, toggleWishlist } = useWishlist();

    const wishlisted = isWishlisted(String(product.id));

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState<{ id: string; label: string; ml: string | null; price: number; is_default: boolean; stockQuantity?: number } | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Added feedback state
    const [isAdded, setIsAdded] = useState(false);

    // Portal Mount State
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isModalOpen]);

    // Handle standard layout widths
    const cardClassName = isCarousel ? 'carousel-card' : 'shop-product-card';

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
              scrollSnapAlign: 'start',
              display: 'flex',
              flexDirection: 'column',
              transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              cursor: 'pointer',
              textDecoration: 'none',
              color: 'inherit',
              position: 'relative',
              boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          }
        : {
              height: 'var(--card-height, 532px)',
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
          };

    // Calculate discount percent
    const discount = product.discountPercent || (product.originalPrice
        ? Math.ceil(((product.originalPrice - product.price) / product.originalPrice) * 100)
        : 0);

    const handleAddToCartClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (product.inStock === false) return;

        // Reset state for modal
        const defaultSize = product.sizes?.find(s => s.is_default && (s.stockQuantity === undefined || s.stockQuantity > 0))
            || product.sizes?.find(s => s.stockQuantity === undefined || s.stockQuantity > 0)
            || product.sizes?.find(s => s.is_default)
            || product.sizes?.[0]
            || null;
        
        setSelectedSize(defaultSize);
        setQuantity(1);
        setIsModalOpen(true);
    };

    const handleConfirmAddToCart = () => {
        const finalPrice = selectedSize ? selectedSize.price : product.price;
        const finalOriginalPrice = selectedSize
            ? (product.discountPercent ? Math.ceil(selectedSize.price / (1 - product.discountPercent / 100)) : selectedSize.price)
            : product.originalPrice;

        addToCart({
            id: String(product.id),
            slug: product.slug,
            name: product.title,
            image: product.image,
            price: finalPrice,
            originalPrice: finalOriginalPrice,
            size: selectedSize ? selectedSize.label : 'Default',
            stockQuantity: selectedSize ? selectedSize.stockQuantity : product.stockQuantity,
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
                style={isCarousel ? { display: 'contents' } : undefined}
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
                    {product.badge && (() => {
                        const bg = product.badgeColor || '#f0c14b';
                        const ch = bg.replace('#', '');
                        const isLight = ch.length >= 6 && (0.299 * parseInt(ch.substring(0, 2), 16) + 0.587 * parseInt(ch.substring(2, 4), 16) + 0.114 * parseInt(ch.substring(4, 6), 16)) / 255 > 0.55;
                        return (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: '10px',
                                    left: '10px',
                                    background: bg,
                                    color: isLight ? '#1a1a1a' : '#ffffff',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '5px 14px',
                                    borderRadius: '6px',
                                    letterSpacing: '0.3px',
                                    lineHeight: '1',
                                    textTransform: 'uppercase',
                                    zIndex: 3,
                                }}
                            >
                                {product.badge.replace(/_/g, ' ')}
                            </span>
                        );
                    })()}

                    {/* Top-right Circular Extra Badge */}
                    {product.extraBadge && (
                        <span
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: product.badgeColor === '#2e7d32'
                                    ? '#e91e63'
                                    : 'rgba(46,125,50,0.9)',
                                color: '#ffffff',
                                fontFamily: "'Outfit', sans-serif",
                                fontSize: product.badgeColor ? '11px' : '9px',
                                fontWeight: product.badgeColor ? 800 : 700,
                                padding: '6px',
                                borderRadius: '50%',
                                width: product.badgeColor ? '52px' : '56px',
                                height: product.badgeColor ? '52px' : '56px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                lineHeight: 1.15,
                                zIndex: 3,
                                whiteSpace: 'pre-line',
                            }}
                        >
                            {product.extraBadge}
                        </span>
                    )}

                    {/* Wishlist Heart (Optional) */}
                    {showWishlist && (
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleWishlist(String(product.id));
                            }}
                            style={{
                                position: 'absolute',
                                top: product.extraBadge ? '72px' : '10px',
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
                        href={`/product/${product.slug}`}
                        className={isCarousel ? 'card-image-area' : 'shop-card-image-area'}
                        style={{
                            display: 'block',
                            position: 'relative',
                            height: '50%',
                            overflow: 'hidden',
                            background: '#f8f6f3',
                        }}
                    >
                        <Image
                            src={product.image}
                            alt={product.title}
                            fill
                            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            style={{
                                objectFit: 'cover',
                                transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                            }}
                            className="product-image"
                        />
                    </Link>

                    {/* Card Content */}
                    <div
                        className={isCarousel ? 'card-content' : 'shop-card-content'}
                        style={{
                            padding: '14px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                        }}
                    >
                        {/* Rating/Review */}
                        {product.rating !== undefined && product.rating > 0 && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    marginBottom: '6px',
                                }}
                            >
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#ffb700',
                                    }}
                                >
                                    <Star size={13} fill="#ffb700" stroke="#ffb700" />
                                    {product.rating}
                                </span>
                                {product.reviewCount && (
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '12px',
                                            color: '#999',
                                        }}
                                    >
                                        | {product.reviewCount} Reviews
                                    </span>
                                )}
                            </div>
                        )}

                        {/* Title */}
                        <Link href={`/product/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <h3
                                className={isCarousel ? 'card-title' : 'shop-card-title'}
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '17px',
                                    fontWeight: 700,
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
                                {product.title}
                            </h3>
                        </Link>

                        {/* Description */}
                        {product.description && (
                            <p
                                className={isCarousel ? 'card-desc' : 'shop-card-desc'}
                                style={{
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    color: '#888',
                                    lineHeight: 1.4,
                                    marginBottom: '12px',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 1,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                }}
                            >
                                {product.description}
                            </p>
                        )}

                        {/* Spacer */}
                        <div style={{ flex: 1 }} />

                        {/* Price Row */}
                        <div style={{ marginTop: 'auto' }}>
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    justifyContent: 'space-between',
                                    gap: '8px',
                                    marginBottom: '8px',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
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
                                        ৳{product.price}
                                    </span>
                                    {product.originalPrice != null && product.originalPrice > 0 && (
                                        <span
                                            className="card-original-price"
                                            style={{
                                                fontFamily: "'Inter', sans-serif",
                                                fontSize: '14px',
                                                color: '#bbb',
                                                textDecoration: 'line-through',
                                                lineHeight: 1,
                                            }}
                                        >
                                            ৳{product.originalPrice}
                                        </span>
                                    )}
                                </div>
                                {discount > 0 && (
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#0d6b3d',
                                            background: '#e8f5e9',
                                            padding: '3px 8px',
                                            borderRadius: '6px',
                                            lineHeight: 1.1,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.3px',
                                        }}
                                    >
                                        {Math.ceil(discount)}% OFF
                                    </span>
                                )}
                            </div>



                            {/* Add to Cart */}
                            <button
                                className="card-add-btn"
                                disabled={product.inStock === false}
                                onClick={handleAddToCartClick}
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    background: product.inStock === false ? '#e0e0e0' : (isAdded ? '#1a1a1a' : '#f5c518'),
                                    color: product.inStock === false ? '#888' : (isAdded ? '#ffffff' : '#1a1a1a'),
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '11px 0',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    cursor: product.inStock === false ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textTransform: 'uppercase',
                                }}
                                onMouseEnter={(e) => {
                                    if (product.inStock === false) return;
                                    if (!isAdded) {
                                        e.currentTarget.style.background = '#e6b800';
                                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                                        e.currentTarget.style.boxShadow = '0 4px 14px rgba(245, 197, 24, 0.4)';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (product.inStock === false) return;
                                    if (!isAdded) {
                                        e.currentTarget.style.background = '#f5c518';
                                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                                        e.currentTarget.style.boxShadow = 'none';
                                    }
                                }}
                            >
                                {product.inStock === false ? (
                                    'OUT OF STOCK'
                                ) : isAdded ? (
                                    <><Check size={15} className="cart-added-check" /> ADDED!</>
                                ) : (
                                    'ADD TO CART'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Portal Size Selection Modal */}
            {mounted && isModalOpen && createPortal(
                <AnimatePresence>
                    <div
                        className="cart-modal-overlay"
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            width: '100vw',
                            height: '100vh',
                            background: 'rgba(0, 0, 0, 0.65)',
                            backdropFilter: 'blur(8px)',
                            WebkitBackdropFilter: 'blur(8px)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 99999,
                            padding: '16px',
                        }}
                        onClick={() => setIsModalOpen(false)}
                    >
                        <div
                            className="cart-modal-container"
                            style={{
                                width: '100%',
                                maxWidth: '560px',
                                background: '#ffffff',
                                borderRadius: '24px',
                                border: '1px solid rgba(0, 0, 0, 0.08)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                                position: 'relative',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                animation: 'modalSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                maxHeight: '90vh',
                                overflowY: 'auto',
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Close Button */}
                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    position: 'absolute',
                                    top: '16px',
                                    right: '16px',
                                    background: '#f5f5f5',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '36px',
                                    height: '36px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    color: '#666',
                                    zIndex: 10,
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#e5e5e5';
                                    e.currentTarget.style.color = '#1a1a1a';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = '#f5f5f5';
                                    e.currentTarget.style.color = '#666';
                                }}
                            >
                                <X size={18} />
                            </button>

                            {/* Top Section: Image & Info */}
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                <div
                                    style={{
                                        width: '120px',
                                        height: '120px',
                                        position: 'relative',
                                        background: '#f8f6f3',
                                        borderRadius: '16px',
                                        overflow: 'hidden',
                                        flexShrink: 0,
                                        border: '1px solid #f0f0f0',
                                    }}
                                >
                                    <Image
                                        src={product.image}
                                        alt={product.title}
                                        fill
                                        style={{ objectFit: 'cover' }}
                                    />
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '24px' }}>
                                    <h3
                                        style={{
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '20px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                            lineHeight: 1.25,
                                        }}
                                    >
                                        {product.title}
                                    </h3>
                                    <p
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '13px',
                                            color: '#666',
                                            lineHeight: 1.4,
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    >
                                        {product.description}
                                    </p>
                                    
                                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                                        <span
                                            style={{
                                                fontFamily: "'Outfit', sans-serif",
                                                fontSize: '22px',
                                                fontWeight: 700,
                                                color: '#1a1a1a',
                                            }}
                                        >
                                            ৳{(selectedSize ? selectedSize.price : product.price) * quantity}
                                        </span>
                                        {(() => {
                                            const currentPrice = selectedSize ? selectedSize.price : product.price;
                                            const discountPercent = product.discountPercent || 0;
                                            if (discountPercent > 0) {
                                                const origPrice = Math.ceil(currentPrice / (1 - discountPercent / 100));
                                                return (
                                                    <>
                                                        <span
                                                            style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '14px',
                                                                color: '#bbb',
                                                                textDecoration: 'line-through',
                                                            }}
                                                        >
                                                            ৳{origPrice * quantity}
                                                        </span>
                                                        <span
                                                            style={{
                                                                fontFamily: "'Inter', sans-serif",
                                                                fontSize: '11px',
                                                                fontWeight: 700,
                                                                color: '#2e7d32',
                                                                background: '#e8f5e9',
                                                                padding: '2px 6px',
                                                                borderRadius: '4px',
                                                            }}
                                                        >
                                                            {Math.ceil(discountPercent)}% OFF
                                                        </span>
                                                    </>
                                                );
                                            }
                                            return null;
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Size Selector */}
                            {product.sizes && product.sizes.length > 0 && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <span
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            fontSize: '13px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px',
                                        }}
                                    >
                                        Size
                                    </span>
                                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                        {product.sizes.map((sz) => {
                                            const isSelected = selectedSize?.id === sz.id;
                                            const isSizeOutOfStock = sz.stockQuantity !== undefined && sz.stockQuantity <= 0;
                                            return (
                                                <button
                                                    key={sz.id}
                                                    onClick={() => setSelectedSize(sz)}
                                                    style={{
                                                        padding: '10px 18px',
                                                        borderRadius: '12px',
                                                        fontFamily: "'Inter', sans-serif",
                                                        fontSize: '14px',
                                                        fontWeight: 600,
                                                        border: isSelected 
                                                            ? '2px solid #1a1a1a' 
                                                            : (isSizeOutOfStock ? '1px dashed #ddd' : '1px solid #e0e0e0'),
                                                        background: isSelected 
                                                            ? '#1a1a1a' 
                                                            : (isSizeOutOfStock ? '#f5f5f5' : '#ffffff'),
                                                        color: isSelected 
                                                            ? '#ffffff' 
                                                            : (isSizeOutOfStock ? '#bbb' : '#444444'),
                                                        cursor: 'pointer',
                                                        transition: 'all 0.15s ease',
                                                        display: 'flex',
                                                        alignItems: 'baseline',
                                                        gap: '4px',
                                                        opacity: isSizeOutOfStock ? 0.6 : 1,
                                                        textDecoration: isSizeOutOfStock ? 'line-through' : 'none',
                                                    }}
                                                >
                                                    <span>{sz.label}</span>
                                                    {sz.ml && (
                                                        <span
                                                            style={{
                                                                fontSize: '11px',
                                                                opacity: 0.8,
                                                                fontWeight: 400,
                                                            }}
                                                        >
                                                            ({sz.ml})
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Quantity Selector */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <span
                                    style={{
                                        fontFamily: "'Inter', sans-serif",
                                        fontSize: '13px',
                                        fontWeight: 700,
                                        color: '#1a1a1a',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                    }}
                                >
                                    Quantity
                                </span>
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        background: '#f5f5f5',
                                        borderRadius: '12px',
                                        padding: '4px',
                                        width: 'fit-content',
                                    }}
                                >
                                    <button
                                        onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                        disabled={quantity <= 1}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: quantity <= 1 ? 'not-allowed' : 'pointer',
                                            color: quantity <= 1 ? '#bbb' : '#1a1a1a',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            if (quantity > 1) e.currentTarget.style.background = '#e5e5e5';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <Minus size={16} />
                                    </button>
                                    <span
                                        style={{
                                            width: '40px',
                                            textAlign: 'center',
                                            fontFamily: "'Outfit', sans-serif",
                                            fontSize: '16px',
                                            fontWeight: 700,
                                            color: '#1a1a1a',
                                        }}
                                    >
                                        {quantity}
                                    </span>
                                    <button
                                        onClick={() => setQuantity(q => q + 1)}
                                        style={{
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '8px',
                                            border: 'none',
                                            background: 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            cursor: 'pointer',
                                            color: '#1a1a1a',
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#e5e5e5';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                        }}
                                    >
                                        <Plus size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Button */}
                            <button
                                disabled={selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false}
                                onClick={handleConfirmAddToCart}
                                style={{
                                    width: '100%',
                                    background: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) ? '#e0e0e0' : '#f5c518',
                                    color: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) ? '#888' : '#1a1a1a',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '16px 0',
                                    fontFamily: "'Inter', sans-serif",
                                    fontSize: '15px',
                                    fontWeight: 700,
                                    letterSpacing: '0.5px',
                                    cursor: (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                                    textTransform: 'uppercase',
                                    marginTop: '10px',
                                }}
                                onMouseEnter={(e) => {
                                    if (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) return;
                                    e.currentTarget.style.background = '#e6b800';
                                    e.currentTarget.style.transform = 'translateY(-2px)';
                                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 197, 24, 0.4)';
                                }}
                                onMouseLeave={(e) => {
                                    if (selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) return;
                                    e.currentTarget.style.background = '#f5c518';
                                    e.currentTarget.style.transform = 'translateY(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                {(selectedSize ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0) : product.inStock === false) ? 'Out of stock' : 'Confirm to cart'}
                            </button>
                        </div>
                        
                        {/* Global Keyframes Animation */}
                        <style dangerouslySetInnerHTML={{ __html: `
                            @keyframes modalSlideIn {
                                from {
                                    opacity: 0;
                                    transform: translateY(20px) scale(0.95);
                                }
                                to {
                                    opacity: 1;
                                    transform: translateY(0) scale(1);
                                }
                            }
                        ` }} />
                    </div>
                </AnimatePresence>,
                document.body
            )}
        </>
    );
}
