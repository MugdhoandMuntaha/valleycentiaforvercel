'use client';

import React, { Suspense } from 'react';
import { useScrollRestoration } from '@/hooks/useScrollRestoration';

function ScrollRestorationInner() {
    useScrollRestoration();
    return null;
}

/**
 * Universal scroll restoration manager mounted in the root layout.
 * Wrapped in Suspense so Next.js static generation bails out cleanly.
 */
export default function ScrollToTop() {
    return (
        <Suspense fallback={null}>
            <ScrollRestorationInner />
        </Suspense>
    );
}
