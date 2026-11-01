'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, useId } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { sanitizeHtml } from '@/lib/sanitizeHtml';

export { sanitizeHtml };

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Reusable ExpandableText component:
 * - Clamps text / rich-text to specified lines (default: 3)
 * - Toggles when clicked anywhere inside the box (when truncated or expanded)
 * - Renders an accessible "See more" / "See less" button when content overflows
 * - Automatically recalculates on window resize, font loading, orientation change, and tab activation
 * - Prevents layout dislocation on collapse: keeps the box top in view below the sticky header
 * - Preserves child interactions (links, buttons, inputs) and filters out scroll/swipe gestures (> 8px)
 * - Server-renders collapsed state by default to prevent layout shift
 * - Accessible: real <button> remains the single keyboard/screen-reader control (aria-expanded, aria-controls)
 */
export interface ExpandableTextProps {
    content?: string;
    children?: React.ReactNode;
    lines?: number;
    moreLabel?: string;
    lessLabel?: string;
    asHtml?: boolean;
    id?: string;
    className?: string;
    style?: React.CSSProperties;
    buttonStyle?: React.CSSProperties;
}

export default function ExpandableText({
    content,
    children,
    lines = 3,
    moreLabel = 'See more',
    lessLabel = 'See less',
    asHtml,
    id,
    className = '',
    style = {},
    buttonStyle = {},
}: ExpandableTextProps) {
    const rawContent = content !== undefined ? content : (typeof children === 'string' ? children : '');
    const isHtmlContent = asHtml ?? (typeof rawContent === 'string' && /<[a-z][\s\S]*>/i.test(rawContent));
    
    const [isExpanded, setIsExpanded] = useState(false);
    const [canTruncate, setCanTruncate] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
    const wasExpandedRef = useRef(false);

    const generatedId = useId();
    const contentId = id || `expandable-text-${generatedId}`;

    // Reset expand state whenever content changes (e.g. navigating to different product or tab)
    const [prevContent, setPrevContent] = useState(rawContent);
    if (rawContent !== prevContent) {
        setPrevContent(rawContent);
        setIsExpanded(false);
    }

    // Truncation measurement logic
    const checkTruncation = useCallback(() => {
        const el = contentRef.current;
        if (!el) return;

        // Hidden tab / zero height element: postpone check until visible
        if (el.clientHeight === 0 && el.scrollHeight === 0) {
            return;
        }

        const computed = window.getComputedStyle(el);
        const parsedLh = parseFloat(computed.lineHeight);
        const parsedFs = parseFloat(computed.fontSize) || 15;
        const lineHeight = !isNaN(parsedLh) && parsedLh > 0 ? parsedLh : parsedFs * 1.6;
        const maxCollapsedHeight = lineHeight * lines + 2;

        if (!isExpanded) {
            // In collapsed state: scrollHeight > clientHeight + 1 indicates overflow
            const overflows = el.scrollHeight > el.clientHeight + 1;
            setCanTruncate(overflows);
        } else {
            // In expanded state: compare unconstrained scrollHeight against threshold
            const overflows = el.scrollHeight > maxCollapsedHeight;
            setCanTruncate(overflows);
        }
    }, [lines, isExpanded]);

    // Observe size changes via ResizeObserver + window resize + font loading
    useEffect(() => {
        const el = contentRef.current;
        if (!el) return;

        checkTruncation();

        // Check again after fonts load (prevents font swap metric shifts)
        if (typeof document !== 'undefined' && 'fonts' in document) {
            document.fonts.ready.then(() => {
                checkTruncation();
            }).catch(() => {});
        }

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== 'undefined') {
            resizeObserver = new ResizeObserver(() => {
                checkTruncation();
            });
            resizeObserver.observe(el);
        }

        const handleResize = () => checkTruncation();
        window.addEventListener('resize', handleResize);
        window.addEventListener('orientationchange', handleResize);

        return () => {
            if (resizeObserver) resizeObserver.disconnect();
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('orientationchange', handleResize);
        };
    }, [checkTruncation, rawContent]);

    // In-view collapse repositioning: runs synchronously before browser paint
    useIsomorphicLayoutEffect(() => {
        if (wasExpandedRef.current && !isExpanded) {
            // Box just collapsed from expanded state
            if (containerRef.current && typeof window !== 'undefined') {
                const rect = containerRef.current.getBoundingClientRect();
                
                // Measure sticky site header height + 16px safety padding
                let headerOffset = 140;
                const headerEl = document.querySelector<HTMLElement>('.site-header');
                if (headerEl) {
                    headerOffset = headerEl.offsetHeight + 16;
                }

                // If the top edge is above the visible area or hidden under the sticky header
                if (rect.top < headerOffset) {
                    const targetScrollY = Math.max(0, window.scrollY + rect.top - headerOffset);
                    window.scrollTo({
                        top: targetScrollY,
                        left: 0,
                        behavior: 'instant' as ScrollBehavior,
                    });
                }
            }
        }
        wasExpandedRef.current = isExpanded;
    }, [isExpanded]);

    const toggleExpand = useCallback(() => {
        setIsExpanded((prev) => !prev);
    }, []);

    // Pointer event tracking for gesture/swipe discrimination
    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0) return; // Ignore non-primary mouse clicks
        pointerStartRef.current = { x: e.clientX, y: e.clientY };
    };

    // Click anywhere inside box toggles it (unless short text or clicked interactive child)
    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const isClickable = canTruncate || isExpanded;
        if (!isClickable) return;

        // Do not toggle if the user clicked an interactive child (link, button, input, etc.)
        const target = e.target as HTMLElement | null;
        if (target?.closest('a, button, input, select, textarea, label, [role="button"], [contenteditable="true"]')) {
            return;
        }

        // Ignore if user was swiping or scrolling (> 8px movement tolerance)
        if (pointerStartRef.current) {
            const dx = e.clientX - pointerStartRef.current.x;
            const dy = e.clientY - pointerStartRef.current.y;
            pointerStartRef.current = null;
            if (Math.hypot(dx, dy) > 8) {
                return;
            }
        }

        toggleExpand();
    };

    const isClickable = canTruncate || isExpanded;

    const collapsedStyle: React.CSSProperties = {
        display: '-webkit-box',
        WebkitLineClamp: lines,
        lineClamp: lines,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        whiteSpace: isHtmlContent ? 'normal' : 'pre-line',
        transition: 'max-height 0.25s ease',
    };

    const expandedStyle: React.CSSProperties = {
        display: 'block',
        overflowWrap: 'anywhere',
        wordBreak: 'break-word',
        whiteSpace: isHtmlContent ? 'normal' : 'pre-line',
        transition: 'max-height 0.25s ease',
    };

    return (
        <div
            ref={containerRef}
            onClick={handleContainerClick}
            onPointerDown={handlePointerDown}
            className={`vc-expandable-text-wrapper ${isClickable ? 'is-clickable' : ''} ${className}`.trim()}
            style={{
                width: '100%',
                cursor: isClickable ? 'pointer' : 'default',
                overflowAnchor: 'none',
                borderRadius: '8px',
                transition: 'background-color 0.15s ease',
                ...style,
            }}
        >
            <div
                id={contentId}
                ref={contentRef}
                className="vc-expandable-content"
                style={isExpanded ? expandedStyle : collapsedStyle}
            >
                {isHtmlContent ? (
                    <div
                        dangerouslySetInnerHTML={{ __html: sanitizeHtml(rawContent) }}
                        style={{ display: 'contents' }}
                    />
                ) : (
                    children || rawContent
                )}
            </div>

            {canTruncate && (
                <button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-controls={contentId}
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand();
                    }}
                    className="vc-expand-btn"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        border: 'none',
                        background: 'none',
                        padding: '6px 0',
                        marginTop: '6px',
                        cursor: 'pointer',
                        fontFamily: "'Inter', sans-serif",
                        fontSize: '13px',
                        fontWeight: 600,
                        color: '#2e7d32',
                        minHeight: '36px',
                        touchAction: 'manipulation',
                        outline: 'none',
                        transition: 'color 0.15s ease',
                        ...buttonStyle,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#1b5e20')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = (buttonStyle.color as string) || '#2e7d32')}
                >
                    <span>{isExpanded ? lessLabel : moreLabel}</span>
                    {isExpanded ? (
                        <ChevronUp size={14} strokeWidth={2.5} aria-hidden="true" />
                    ) : (
                        <ChevronDown size={14} strokeWidth={2.5} aria-hidden="true" />
                    )}
                </button>
            )}
        </div>
    );
}
