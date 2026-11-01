'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';
import styles from './ReviewImageGalleryModal.module.css';

export interface ReviewImageGalleryModalProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    loop?: boolean;
}

export default function ReviewImageGalleryModal({
    images = [],
    initialIndex = 0,
    isOpen,
    onClose,
    title = 'Customer Review Image',
    loop = false,
}: ReviewImageGalleryModalProps) {
    const [mounted, setMounted] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    // Refs for focus management and DOM nodes
    const modalRef = useRef<HTMLDivElement | null>(null);
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const stageRef = useRef<HTMLDivElement | null>(null);
    const thumbnailsRef = useRef<HTMLDivElement | null>(null);
    const previousActiveElementRef = useRef<HTMLElement | null>(null);

    // Synchronous state refs for touch & key events
    const currentIndexRef = useRef(currentIndex);
    currentIndexRef.current = currentIndex;

    const imagesRef = useRef(images);
    imagesRef.current = images;

    const loopRef = useRef(loop);
    loopRef.current = loop;

    const isDraggingRef = useRef(false);
    const touchStartXRef = useRef(0);
    const touchStartYRef = useRef(0);
    const touchStartTimeRef = useRef(0);
    const isSwipingHorizontalRef = useRef<boolean | null>(null);
    const isMultiTouchRef = useRef(false);

    const totalImages = images.length;
    const isMulti = totalImages > 1;

    // Detect SSR hydration
    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    // Detect user reduced motion preference
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mql.matches);

        const handleMotionChange = (e: MediaQueryListEvent) => {
            setPrefersReducedMotion(e.matches);
        };

        if (mql.addEventListener) {
            mql.addEventListener('change', handleMotionChange);
            return () => mql.removeEventListener('change', handleMotionChange);
        } else if ('addListener' in mql) {
            // Safari legacy support
            (mql as any).addListener(handleMotionChange);
            return () => (mql as any).removeListener(handleMotionChange);
        }
    }, []);

    // Sync active index whenever initialIndex or isOpen changes
    useEffect(() => {
        if (isOpen) {
            const safeIdx = Math.max(0, Math.min(initialIndex, totalImages - 1));
            setCurrentIndex(safeIdx);
            setDragOffset(0);
            setIsDragging(false);
        }
    }, [isOpen, initialIndex, totalImages]);

    // Body scroll lock prevents background scrolling and eliminates layout shift
    useBodyScrollLock(isOpen);

    // Coordinate with browser history so back button/gesture closes lightbox instead of leaving page
    useOverlayHistory({
        overlayId: 'review-image-lightbox',
        isOpen,
        onClose,
    });

    // Accessibility: Focus movement into modal on open and restoration on close
    useEffect(() => {
        if (!isOpen) return;

        // Remember previously focused trigger element
        previousActiveElementRef.current = document.activeElement as HTMLElement | null;

        // Move focus into the viewer
        const timer = requestAnimationFrame(() => {
            if (closeButtonRef.current) {
                closeButtonRef.current.focus({ preventScroll: true });
            } else if (modalRef.current) {
                modalRef.current.focus({ preventScroll: true });
            }
        });

        return () => {
            cancelAnimationFrame(timer);
            // Restore focus back to the trigger on close
            if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
                previousActiveElementRef.current.focus({ preventScroll: true });
            }
        };
    }, [isOpen]);

    // Navigation callbacks
    const handleNext = useCallback(() => {
        if (!isMulti) return;
        const curr = currentIndexRef.current;
        const count = imagesRef.current.length;
        if (loopRef.current) {
            setCurrentIndex((curr + 1) % count);
        } else if (curr < count - 1) {
            setCurrentIndex(curr + 1);
        }
    }, [isMulti]);

    const handlePrev = useCallback(() => {
        if (!isMulti) return;
        const curr = currentIndexRef.current;
        const count = imagesRef.current.length;
        if (loopRef.current) {
            setCurrentIndex((curr - 1 + count) % count);
        } else if (curr > 0) {
            setCurrentIndex(curr - 1);
        }
    }, [isMulti]);

    // Preload adjacent images for instant responsive navigation
    useEffect(() => {
        if (!isOpen || !isMulti || typeof window === 'undefined') return;

        const imgs = imagesRef.current;
        const len = imgs.length;

        // Next image preloading
        let nextIndex = currentIndex + 1;
        if (nextIndex >= len && loop) nextIndex = 0;
        if (nextIndex < len && imgs[nextIndex]) {
            const preloadNext = new window.Image();
            preloadNext.src = imgs[nextIndex];
        }

        // Previous image preloading
        let prevIndex = currentIndex - 1;
        if (prevIndex < 0 && loop) prevIndex = len - 1;
        if (prevIndex >= 0 && imgs[prevIndex]) {
            const preloadPrev = new window.Image();
            preloadPrev.src = imgs[prevIndex];
        }
    }, [isOpen, currentIndex, isMulti, loop]);

    // Auto-scroll active thumbnail into center view smoothly
    useEffect(() => {
        if (!isOpen || !isMulti || !thumbnailsRef.current) return;
        const container = thumbnailsRef.current;
        const activeThumb = container.children[currentIndex] as HTMLElement | undefined;
        if (activeThumb && typeof activeThumb.scrollIntoView === 'function') {
            activeThumb.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }, [currentIndex, isOpen, isMulti, prefersReducedMotion]);

    // Desktop keyboard listeners and focus trap
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
                return;
            }

            if (isMulti) {
                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    handleNext();
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    handlePrev();
                    return;
                }
            }

            // Accessible focus trap within the dialog
            if (e.key === 'Tab' && modalRef.current) {
                const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]):not([aria-disabled="true"]), [tabindex]:not([tabindex="-1"])'
                );

                if (focusableElements.length === 0) return;

                const firstEl = focusableElements[0];
                const lastEl = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstEl) {
                        e.preventDefault();
                        lastEl.focus({ preventScroll: true });
                    }
                } else {
                    if (document.activeElement === lastEl) {
                        e.preventDefault();
                        firstEl.focus({ preventScroll: true });
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, isMulti, handleNext, handlePrev, onClose]);

    // Touch and swipe gesture handling
    useEffect(() => {
        const stage = stageRef.current;
        if (!isOpen || !isMulti || !stage) return;

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length > 1) {
                // Multi-touch / pinch gesture detected: cancel swipe tracking
                isMultiTouchRef.current = true;
                isDraggingRef.current = false;
                isSwipingHorizontalRef.current = null;
                setIsDragging(false);
                setDragOffset(0);
                return;
            }

            isMultiTouchRef.current = false;
            const touch = e.touches[0];
            touchStartXRef.current = touch.clientX;
            touchStartYRef.current = touch.clientY;
            touchStartTimeRef.current = Date.now();
            isDraggingRef.current = true;
            isSwipingHorizontalRef.current = null;
            setIsDragging(true);
            setDragOffset(0);
        };

        const onTouchMove = (e: TouchEvent) => {
            if (isMultiTouchRef.current || e.touches.length > 1) {
                if (isDraggingRef.current) {
                    isDraggingRef.current = false;
                    setIsDragging(false);
                    setDragOffset(0);
                }
                return;
            }

            if (!isDraggingRef.current) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartXRef.current;
            const deltaY = touch.clientY - touchStartYRef.current;

            // Classify gesture direction once movement exceeds deadzone (8px)
            if (isSwipingHorizontalRef.current === null) {
                const absX = Math.abs(deltaX);
                const absY = Math.abs(deltaY);

                if (absX > 8 || absY > 8) {
                    if (absX > absY) {
                        isSwipingHorizontalRef.current = true;
                    } else {
                        // Vertical movement is greater: Do NOT hijack vertical scrolling!
                        isSwipingHorizontalRef.current = false;
                        isDraggingRef.current = false;
                        setIsDragging(false);
                        setDragOffset(0);
                        return;
                    }
                } else {
                    return;
                }
            }

            if (isSwipingHorizontalRef.current === true) {
                // Prevent browser page bounce during horizontal image drag
                if (e.cancelable) {
                    e.preventDefault();
                }

                let currentOffset = deltaX;
                const curr = currentIndexRef.current;
                const count = imagesRef.current.length;

                // Rubber-band damping at boundaries if not looping
                if (!loopRef.current) {
                    if ((curr === 0 && deltaX > 0) || (curr === count - 1 && deltaX < 0)) {
                        currentOffset = deltaX * 0.25;
                    }
                }

                setDragOffset(currentOffset);
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (!isDraggingRef.current || isSwipingHorizontalRef.current !== true) {
                isDraggingRef.current = false;
                setIsDragging(false);
                isSwipingHorizontalRef.current = null;
                setDragOffset(0);
                return;
            }

            const changedTouch = e.changedTouches[0];
            const deltaX = changedTouch ? (changedTouch.clientX - touchStartXRef.current) : 0;
            const elapsed = Math.max(1, Date.now() - touchStartTimeRef.current);
            const velocity = deltaX / elapsed; // px per ms

            const containerWidth = stage.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 360);
            const threshold = Math.max(50, containerWidth * 0.2); // 50px or 20% width
            const isFlick = Math.abs(velocity) > 0.35 && Math.abs(deltaX) > 20;

            isDraggingRef.current = false;
            setIsDragging(false);
            isSwipingHorizontalRef.current = null;

            if (deltaX < -threshold || (isFlick && deltaX < 0)) {
                // Swiped left -> Next
                handleNext();
            } else if (deltaX > threshold || (isFlick && deltaX > 0)) {
                // Swiped right -> Previous
                handlePrev();
            }

            // Snap back smoothly
            setDragOffset(0);
        };

        // Attach listeners with passive: false on touchmove to allow preventDefault during horizontal drag
        stage.addEventListener('touchstart', onTouchStart, { passive: true });
        stage.addEventListener('touchmove', onTouchMove, { passive: false });
        stage.addEventListener('touchend', onTouchEnd, { passive: true });
        stage.addEventListener('touchcancel', onTouchEnd, { passive: true });

        return () => {
            stage.removeEventListener('touchstart', onTouchStart);
            stage.removeEventListener('touchmove', onTouchMove);
            stage.removeEventListener('touchend', onTouchEnd);
            stage.removeEventListener('touchcancel', onTouchEnd);
        };
    }, [isOpen, isMulti, handleNext, handlePrev]);

    if (!mounted || !isOpen || totalImages === 0) {
        return null;
    }

    const isFirst = currentIndex === 0;
    const isLast = currentIndex === totalImages - 1;
    const isPrevDisabled = !loop && isFirst;
    const isNextDisabled = !loop && isLast;

    // Track transform calculation: moves entire strip with current image + drag offset
    const trackTransform = `translateX(calc(-${currentIndex * 100}% + ${dragOffset}px))`;
    const trackTransition = isDragging || prefersReducedMotion
        ? 'none'
        : 'transform 260ms cubic-bezier(0.25, 1, 0.5, 1)';

    return createPortal(
        <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Review image gallery"
            tabIndex={-1}
            className={styles.overlay}
            onClick={(e) => {
                // Backdrop click closes viewer
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            {/* Top Bar: Counter & Close button */}
            <div className={styles.header}>
                {isMulti ? (
                    <div className={styles.counter} aria-live="polite">
                        {currentIndex + 1} / {totalImages}
                    </div>
                ) : <div />}

                <button
                    ref={closeButtonRef}
                    type="button"
                    className={styles.closeButton}
                    onClick={onClose}
                    aria-label="Close review gallery"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Main Stage: Touch Viewport & Image Track */}
            <div
                ref={stageRef}
                className={`${styles.stage} ${isDragging ? styles.stageDragging : ''}`}
                onClick={(e) => {
                    // Click outside active image closes viewer
                    if (e.target === e.currentTarget) {
                        onClose();
                    }
                }}
            >
                {/* Previous Image Arrow Button */}
                {isMulti && (
                    <button
                        type="button"
                        className={`${styles.navButton} ${styles.prevButton} ${isPrevDisabled ? styles.navButtonDisabled : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePrev();
                        }}
                        disabled={isPrevDisabled}
                        aria-disabled={isPrevDisabled}
                        aria-label="Previous review image"
                    >
                        <ChevronLeft size={24} />
                    </button>
                )}

                {/* Sliding Image Track */}
                <div
                    className={styles.track}
                    style={{
                        transform: trackTransform,
                        transition: trackTransition,
                    }}
                >
                    {images.map((imgSrc, idx) => (
                        <div key={idx} className={styles.slide}>
                            <img
                                src={imgSrc}
                                alt={`${title} - Photo ${idx + 1} of ${totalImages}`}
                                className={styles.slideImage}
                                draggable={false}
                                loading={Math.abs(idx - currentIndex) <= 1 ? 'eager' : 'lazy'}
                            />
                        </div>
                    ))}
                </div>

                {/* Next Image Arrow Button */}
                {isMulti && (
                    <button
                        type="button"
                        className={`${styles.navButton} ${styles.nextButton} ${isNextDisabled ? styles.navButtonDisabled : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleNext();
                        }}
                        disabled={isNextDisabled}
                        aria-disabled={isNextDisabled}
                        aria-label="Next review image"
                    >
                        <ChevronRight size={24} />
                    </button>
                )}
            </div>

            {/* Bottom Bar: Dots and Thumbnails */}
            {isMulti && (
                <div className={styles.footer} onClick={(e) => e.stopPropagation()}>
                    {/* Dot Indicators */}
                    <div className={styles.dots} role="tablist" aria-label="Review image dots">
                        {images.map((_, idx) => (
                            <button
                                key={idx}
                                type="button"
                                role="tab"
                                aria-selected={idx === currentIndex}
                                aria-label={`Go to review photo ${idx + 1}`}
                                className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ''}`}
                                onClick={() => setCurrentIndex(idx)}
                            />
                        ))}
                    </div>

                    {/* Thumbnail Strip */}
                    <div
                        ref={thumbnailsRef}
                        className={styles.thumbnails}
                        role="tablist"
                        aria-label="Review image thumbnails"
                    >
                        {images.map((thumbUrl, idx) => (
                            <button
                                key={idx}
                                type="button"
                                role="tab"
                                aria-selected={idx === currentIndex}
                                aria-label={`View review photo ${idx + 1}`}
                                className={`${styles.thumbButton} ${idx === currentIndex ? styles.thumbButtonActive : ''}`}
                                onClick={() => setCurrentIndex(idx)}
                            >
                                <img
                                    src={thumbUrl}
                                    alt={`Thumbnail ${idx + 1}`}
                                    className={styles.thumbImage}
                                    draggable={false}
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
}

