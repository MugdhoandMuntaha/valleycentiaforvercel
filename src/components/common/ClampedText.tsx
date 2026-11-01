'use client';

import React from 'react';

export type ClampedTextElement = 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'span' | 'div';

export interface ClampedTextProps extends React.HTMLAttributes<HTMLElement> {
    as?: ClampedTextElement;
    lines?: number;
    title?: string;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

/**
 * Reusable ClampedText component:
 * - Single-line (lines=1): single-line with ellipsis, nowrap, anywhere overflow-wrap
 * - Multi-line (lines>1): WebKit line-clamp with cross-browser line-clamp fallback
 * - Desktop hover: Automatic title attribute so users can view the full un-truncated text on hover
 * - Zero layout shift: SSR-compatible CSS properties
 */
export default function ClampedText({
    as: Component = 'p',
    lines = 1,
    title,
    children,
    className = '',
    style = {},
    ...rest
}: ClampedTextProps) {
    const computedTitle = title !== undefined 
        ? title 
        : (typeof children === 'string' || typeof children === 'number') 
            ? String(children).trim() 
            : undefined;

    const baseStyle: React.CSSProperties = lines === 1
        ? {
            display: 'block',
            maxWidth: '100%',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            overflowWrap: 'anywhere',
            ...style,
        }
        : {
            display: '-webkit-box',
            WebkitLineClamp: lines,
            lineClamp: lines,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            overflowWrap: 'anywhere',
            wordBreak: 'break-word',
            ...style,
        };

    const Element = Component as React.ElementType;

    return (
        <Element
            title={computedTitle}
            className={`vc-clamped-text ${className}`.trim()}
            style={baseStyle}
            {...rest}
        >
            {children}
        </Element>
    );
}
