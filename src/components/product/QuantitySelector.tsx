'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
    quantity: number;
    onChange: (quantity: number) => void;
    min?: number;
}

export default function QuantitySelector({ quantity, onChange, min = 1 }: QuantitySelectorProps) {
    return (
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
                    type="button"
                    onClick={() => onChange(Math.max(min, quantity - 1))}
                    disabled={quantity <= min}
                    style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: quantity <= min ? 'not-allowed' : 'pointer',
                        color: quantity <= min ? '#bbb' : '#1a1a1a',
                        transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) => {
                        if (quantity > min) e.currentTarget.style.background = '#e5e5e5';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                    }}
                    aria-label="Decrease quantity"
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
                    type="button"
                    onClick={() => onChange(quantity + 1)}
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
                    aria-label="Increase quantity"
                >
                    <Plus size={16} />
                </button>
            </div>
        </div>
    );
}
