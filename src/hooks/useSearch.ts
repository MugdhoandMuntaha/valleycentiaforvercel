'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

export interface SearchProduct {
    id: string;
    name: string;
    image: string;
    rating: number;
    reviewCount: number;
    price: number;
    originalPrice: number;
    discountPercent: number;
    href: string;
    category: string;
    tags: string[];
}

interface UseSearchResult {
    searchQuery: string;
    setSearchQuery: (q: string) => void;
    filteredProducts: SearchProduct[];
    clientFilteredProducts: SearchProduct[];
    aiLoading: boolean;
    aiEnhanced: boolean;
    correctedQuery: string | null;
    aiIntent: string | null;
    hasQuery: boolean;
    resetSearch: () => void;
}

/**
 * Hook that manages both instant client-side search filtering
 * and debounced AI-powered search.
 */
export function useSearch(allProducts: SearchProduct[]): UseSearchResult {
    const [searchQuery, setSearchQuery] = useState('');

    // AI Search state
    const [aiResults, setAiResults] = useState<SearchProduct[]>([]);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiEnhanced, setAiEnhanced] = useState(false);
    const [correctedQuery, setCorrectedQuery] = useState<string | null>(null);
    const [aiIntent, setAiIntent] = useState<string | null>(null);
    const aiAbortRef = useRef<AbortController | null>(null);
    const aiDebounceRef = useRef<NodeJS.Timeout | null>(null);

    // Client-side instant filtering
    const clientFilteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        const results = allProducts.filter((p) => {
            const nameMatch = p.name.toLowerCase().includes(q);
            const categoryMatch = p.category.toLowerCase().includes(q);
            const tagMatch = p.tags.some((t) => t.toLowerCase().includes(q));
            return nameMatch || categoryMatch || tagMatch;
        });

        return results.sort((a, b) => {
            const aName = a.name.toLowerCase();
            const bName = b.name.toLowerCase();

            if (aName === q && bName !== q) return -1;
            if (bName === q && aName !== q) return 1;

            const aStarts = aName.startsWith(q);
            const bStarts = bName.startsWith(q);
            if (aStarts && !bStarts) return -1;
            if (bStarts && !aStarts) return 1;

            const aIncludes = aName.includes(q);
            const bIncludes = bName.includes(q);
            if (aIncludes && !bIncludes) return -1;
            if (bIncludes && !aIncludes) return 1;

            return 0;
        });
    }, [searchQuery, allProducts]);

    // Use AI results when available and not loading, otherwise use client-side
    const filteredProducts = !aiLoading && aiResults.length > 0 ? aiResults : clientFilteredProducts;

    // Debounced AI search
    useEffect(() => {
        const query = searchQuery.trim();
        if (!query || query.length < 2) {
            setAiResults([]);
            setAiEnhanced(false);
            setCorrectedQuery(null);
            setAiIntent(null);
            setAiLoading(false);
            return;
        }

        if (aiAbortRef.current) aiAbortRef.current.abort();
        if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);

        setAiLoading(true);

        aiDebounceRef.current = setTimeout(async () => {
            const controller = new AbortController();
            aiAbortRef.current = controller;

            try {
                const res = await fetch('/api/ai-search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query }),
                    signal: controller.signal,
                });

                if (!res.ok) throw new Error('Search failed');
                const data = await res.json();

                if (!controller.signal.aborted) {
                    const mapped: SearchProduct[] = (data.products || []).map((p: Record<string, unknown>) => ({
                        id: String(p.id),
                        name: p.name as string,
                        image: (p.primary_image_url as string) || '/no-image.svg',
                        rating: Number(p.rating_avg) || 0,
                        reviewCount: Number(p.review_count) || 0,
                        price: Math.ceil(Number(p.base_price)),
                        originalPrice: Math.ceil(Number(p.compare_at_price) || 0),
                        discountPercent: Number(p.discount_percent) || 0,
                        href: `/product/${p.slug}`,
                        category: (p.category_name as string) || '',
                        tags: [...((p.tags as string[]) || []), ...((p.concerns as string[]) || [])],
                    }));

                    setAiResults(mapped);
                    setAiEnhanced(!!data.aiEnhanced);
                    setCorrectedQuery(data.correctedQuery || null);
                    setAiIntent(data.intent || null);
                    setAiLoading(false);
                }
            } catch (err) {
                if (err instanceof DOMException && err.name === 'AbortError') return;
                console.error('[AI Search] Failed:', err);
                setAiLoading(false);
                setAiEnhanced(false);
            }
        }, 300);

        return () => {
            if (aiDebounceRef.current) clearTimeout(aiDebounceRef.current);
        };
    }, [searchQuery]);

    const resetSearch = useCallback(() => {
        setSearchQuery('');
        setAiResults([]);
        setAiEnhanced(false);
        setCorrectedQuery(null);
        setAiIntent(null);
    }, []);

    const hasQuery = searchQuery.trim().length > 0;

    return {
        searchQuery,
        setSearchQuery,
        filteredProducts,
        clientFilteredProducts,
        aiLoading,
        aiEnhanced,
        correctedQuery,
        aiIntent,
        hasQuery,
        resetSearch,
    };
}
