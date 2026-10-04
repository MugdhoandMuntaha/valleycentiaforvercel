'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Star, Heart, Check, ShoppingBag } from 'lucide-react';
import { motion } from 'framer-motion';
import type { SectionProduct } from '@/data/homeSections';
import { useCart } from '@/lib/CartContext';
import { useWishlist } from '@/lib/WishlistContext';
import SizeSelectionModal, { type ProductSize } from '@/components/product/SizeSelectionModal';
import ProductBadge from '@/components/common/ProductBadge';

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

    // Image fallback state
    const [imgSrc, setImgSrc] = useState(product.image || '/no-image.svg');

    useEffect(() => {
        setImgSrc(product.image || '/no-image.svg');
    }, [product.image]);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
    const [quantity, setQuantity] = useState<number>(1);

    // Added feedback state
    const [isAdded, setIsAdded] = useState(false);

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
                    {product.badge && (
                        <ProductBadge
                            badge={product.badge}
                            badgeColor={product.badgeColor}
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
                                toggleWishlist(String(product.id));
                            }}
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
                            src={imgSrc}
                            alt={product.title}
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
                        className={isCarousel ? 'card-content' : 'shop-card-content'}
                        style={{
                            padding: '14px 14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            flex: 1,
                        }}
                    >
                        {/* Rating/Review */}
                        {!isCarousel && product.rating !== undefined && product.rating > 0 && (
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
                                        color: '#4caf50',
                                    }}
                                >
                                    <Star size={13} fill="#4caf50" stroke="#4caf50" />
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
                                    WebkitLineClamp: 2,
                                    lineClamp: 2,
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
                                    ৳{product.price}
                                </span>

                                {/* Strikethrough Original Price & Discount Row */}
                                {((product.originalPrice != null && product.originalPrice > product.price) || discount > 0) && (
                                    <div
                                        className="card-discount-row"
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            lineHeight: 1.2,
                                        }}
                                    >
                                        {product.originalPrice != null && product.originalPrice > product.price && (
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
                                                ৳{product.originalPrice}
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
                                disabled={product.inStock === false}
                                onClick={handleAddToCartClick}
                                aria-label={product.inStock === false ? 'Out of stock' : 'Add to cart'}
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

            {/* Size Selection Modal (Extracted component - SRP) */}
            <SizeSelectionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                product={product}
                selectedSize={selectedSize}
                onSelectSize={setSelectedSize}
                quantity={quantity}
                onQuantityChange={setQuantity}
                onConfirm={handleConfirmAddToCart}
            />
        </>
    );
}
