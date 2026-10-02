'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import type { SectionProduct } from '@/data/homeSections';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import QuantitySelector from './QuantitySelector';

export type ProductSize = NonNullable<SectionProduct['sizes']>[number];

interface SizeSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: SectionProduct;
    selectedSize: ProductSize | null;
    onSelectSize: (size: ProductSize | null) => void;
    quantity: number;
    onQuantityChange: (quantity: number) => void;
    onConfirm: () => void;
}

export default function SizeSelectionModal({
    isOpen,
    onClose,
    product,
    selectedSize,
    onSelectSize,
    quantity,
    onQuantityChange,
    onConfirm,
}: SizeSelectionModalProps) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    useBodyScrollLock(isOpen);

    if (!mounted || !isOpen) return null;

    const currentPrice = selectedSize ? selectedSize.price : product.price;
    const discountPercent = product.discountPercent || 0;
    const origPrice = discountPercent > 0 ? Math.ceil(currentPrice / (1 - discountPercent / 100)) : 0;
    const isOutOfStock = selectedSize
        ? (selectedSize.stockQuantity !== undefined && selectedSize.stockQuantity <= 0)
        : product.inStock === false;

    return createPortal(
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
                onClick={onClose}
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
                        onClick={onClose}
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
                        aria-label="Close modal"
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
                                    margin: 0,
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
                                    margin: 0,
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
                                    ৳{currentPrice * quantity}
                                </span>
                                {discountPercent > 0 && (
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
                                )}
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
                                            onClick={() => onSelectSize(sz)}
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
                    <QuantitySelector
                        quantity={quantity}
                        onChange={onQuantityChange}
                    />

                    {/* Confirm Button */}
                    <button
                        disabled={isOutOfStock}
                        onClick={onConfirm}
                        style={{
                            width: '100%',
                            background: isOutOfStock ? '#e0e0e0' : '#f5c518',
                            color: isOutOfStock ? '#888' : '#1a1a1a',
                            border: 'none',
                            borderRadius: '12px',
                            padding: '16px 0',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: '15px',
                            fontWeight: 700,
                            letterSpacing: '0.5px',
                            cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                            textTransform: 'uppercase',
                            marginTop: '10px',
                        }}
                        onMouseEnter={(e) => {
                            if (isOutOfStock) return;
                            e.currentTarget.style.background = '#e6b800';
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 20px rgba(245, 197, 24, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                            if (isOutOfStock) return;
                            e.currentTarget.style.background = '#f5c518';
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isOutOfStock ? 'Out of stock' : 'Confirm to cart'}
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
    );
}
