import { NextRequest, NextResponse } from 'next/server';
import { aiSearchProducts } from '@/lib/db/queries';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// ── In-memory LRU cache ──────────────────────────────────────────────────
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE = 200;

function getCached(key: string) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key: string, data: unknown) {
    if (cache.size >= MAX_CACHE) {
        // Delete oldest entry
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
    }
    cache.set(key, { data, ts: Date.now() });
}

// ── AI provider configuration ─────────────────────────────────────────────
const apiKey = process.env.AI_API_KEY;
const apiBaseUrl = process.env.AI_API_BASE_URL || 'https://api.siliconflow.cn/v1';
const apiModelName = process.env.AI_MODEL_NAME || 'Qwen/Qwen2.5-7B-Instruct';

const SYSTEM_PROMPT = `You are a search query expansion engine for a beauty & skincare e-commerce store called ValleyCentia. The store sells hair care (shampoo, conditioner, hair oil, hair serum, hair mask), skin care (face wash, moisturizer, serum, toner, face mask), and sun care (sunscreen, after-sun, SPF moisturizer, lip SPF, roll-on) products.

Given a user search query, your job is to return a JSON object that expands the query to maximize relevant product matches. Consider:

1. **Synonyms**: e.g. "moisturizer" → "cream", "lotion", "hydrating"
2. **Related terms**: e.g. "acne" → "pimple", "blemish", "breakout", "anti-acne"
3. **Intent**: What type of product are they looking for? e.g. "dry hair" → hair mask, conditioner, hair oil
4. **Typo correction**: Fix common misspellings
5. **Bangla terms**: Map common Bangla beauty terms to English equivalents
6. **Category mapping**: If the query maps to a product category, include it

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "corrected_query": "the corrected/normalized search term",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "categories": ["category-slug-if-applicable"],
  "concerns": ["concern-slug-if-applicable"],
  "intent": "brief description of what user wants"
}

Rules:
- keywords should be an array of 3-10 English search terms that should be used to find products
- categories should use these slugs: shampoo, conditioner, hair-oil, hair-serum, hair-mask, face-wash, moisturizer, serum, toner, face-mask, sunscreen, after-sun, spf-moisturizer, lip-spf, roll-on
- concerns should use these slugs: hair-fall, dandruff, acne, dark-spots, sun-protection, anti-aging, dryness, oily-skin, frizz
- Always include the original query (corrected if misspelled) in keywords
- Be aggressive with synonyms — better to return more terms than fewer`;

interface AIExpansion {
    corrected_query: string;
    keywords: string[];
    categories: string[];
    concerns: string[];
    intent: string;
}

async function expandQueryWithAI(query: string): Promise<AIExpansion | null> {
    if (!apiKey) {
        return null;
    }

    try {
        const endpoint = `${apiBaseUrl.replace(/\/$/, '')}/chat/completions`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: apiModelName,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: query },
                ],
                temperature: 0.3,
                max_tokens: 500,
                response_format: { type: 'json_object' },
            }),
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content?.trim();
        if (!text) return null;

        // Strip markdown code blocks if present
        const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(cleaned) as AIExpansion;

        // Validate structure
        if (!parsed.keywords || !Array.isArray(parsed.keywords)) return null;

        return parsed;
    } catch (err) {
        console.error('[AI Search] AI expansion failed:', err);
        return null;
    }
}

// ── API Route ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
    try {
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`ai_${clientIp}`, 30, 60000);
        if (!rateCheck.success) {
            return NextResponse.json(
                { error: 'Rate limit exceeded. Please wait a minute before making more AI search queries.', products: [], aiEnhanced: false },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateCheck.reset - Date.now()) / 1000)),
                    },
                }
            );
        }

        const body = await req.json();
        const query = (body.query as string || '').trim();

        if (!query || query.length < 2) {
            return NextResponse.json({ products: [], aiEnhanced: false });
        }

        // Check cache
        const cacheKey = query.toLowerCase();
        const cached = getCached(cacheKey);
        if (cached) {
            return NextResponse.json(cached);
        }

        // Try AI expansion
        const expansion = await expandQueryWithAI(query);

        if (expansion) {
            const products = await aiSearchProducts({
                keywords: expansion.keywords,
                categories: expansion.categories,
                concerns: expansion.concerns,
                originalQuery: expansion.corrected_query || query,
            });

            const result = {
                products,
                aiEnhanced: true,
                intent: expansion.intent,
                correctedQuery: expansion.corrected_query !== query.toLowerCase()
                    ? expansion.corrected_query
                    : null,
            };

            setCache(cacheKey, result);
            return NextResponse.json(result);
        }

        // Fallback: basic search without AI — split query into words for better coverage
        const words = query.split(/\s+/).filter(w => w.length >= 2);
        const keywords = [query, ...words];
        // Try to map common terms to concerns
        const concernMap: Record<string, string> = {
            'sun': 'sun-protection', 'sunburn': 'sun-protection', 'uv': 'sun-protection', 'spf': 'sun-protection',
            'acne': 'acne', 'pimple': 'acne', 'breakout': 'acne',
            'hair': 'hair-fall', 'hairfall': 'hair-fall', 'balding': 'hair-fall',
            'dandruff': 'dandruff', 'flaky': 'dandruff',
            'dark': 'dark-spots', 'pigmentation': 'dark-spots', 'spots': 'dark-spots',
            'aging': 'anti-aging', 'wrinkle': 'anti-aging', 'wrinkles': 'anti-aging',
            'dry': 'dryness', 'dryness': 'dryness', 'moisturize': 'dryness',
            'oily': 'oily-skin', 'oil': 'oily-skin',
            'frizz': 'frizz', 'frizzy': 'frizz',
        };
        // Map common terms to categories
        const categoryMap: Record<string, string> = {
            'sunscreen': 'sunscreen', 'sunblock': 'sunscreen', 'spf': 'sunscreen',
            'shampoo': 'shampoo', 'shampo': 'shampoo',
            'conditioner': 'conditioner',
            'serum': 'serum', 'face-wash': 'face-wash', 'facewash': 'face-wash',
            'moisturizer': 'moisturizer', 'cream': 'moisturizer', 'lotion': 'moisturizer',
            'toner': 'toner', 'mask': 'face-mask', 'hair-oil': 'hair-oil',
            'hair-mask': 'hair-mask', 'hair-serum': 'hair-serum',
            'roll-on': 'roll-on', 'rollon': 'roll-on',
        };
        const concerns: string[] = [];
        const categories: string[] = [];
        for (const w of words.map(w => w.toLowerCase())) {
            if (concernMap[w] && !concerns.includes(concernMap[w])) concerns.push(concernMap[w]);
            if (categoryMap[w] && !categories.includes(categoryMap[w])) categories.push(categoryMap[w]);
        }

        const products = await aiSearchProducts({
            keywords,
            categories,
            concerns,
            originalQuery: query,
        });

        const result = { products, aiEnhanced: false };
        setCache(cacheKey, result);
        return NextResponse.json(result);

    } catch (err) {
        console.error('[AI Search] Error:', err);
        return NextResponse.json(
            { error: 'Search failed', products: [], aiEnhanced: false },
            { status: 500 }
        );
    }
}
