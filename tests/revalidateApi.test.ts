import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server.js';
import { POST } from '../src/app/api/revalidate/route.ts';
import { notifyStorefront } from '../admin-panel/src/lib/sync.ts';

describe('Cross-App Revalidate API (/api/revalidate)', () => {
    const TEST_SECRET = 'test-revalidate-secret-32-chars-long';

    beforeEach(() => {
        process.env.REVALIDATE_SECRET = TEST_SECRET;
        process.env.STOREFRONT_URL = 'http://localhost:3000';
    });

    it('rejects unauthenticated requests missing secret header with 401', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tags: ['brands'] }),
        });

        const res = await POST(req);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.ok(data.error.includes('Unauthorized'));
    });

    it('rejects requests with an incorrect secret header with 401', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': 'wrong-secret-token',
            },
            body: JSON.stringify({ tags: ['brands'] }),
        });

        const res = await POST(req);
        assert.equal(res.status, 401);
        const data = await res.json();
        assert.ok(data.error.includes('Unauthorized'));
    });

    it('accepts authorization Bearer token header matching the secret', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'authorization': `Bearer ${TEST_SECRET}`,
            },
            body: JSON.stringify({ tags: ['brands', 'products'] }),
        });

        const res = await POST(req);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.deepEqual(data.revalidatedTags, ['brands', 'products']);
    });

    it('revalidates both tags and paths when provided with valid secret', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': TEST_SECRET,
            },
            body: JSON.stringify({
                tags: ['hero', 'site-settings'],
                paths: ['/shop'],
            }),
        });

        const res = await POST(req);
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.success, true);
        assert.deepEqual(data.revalidatedTags, ['hero', 'site-settings']);
        assert.deepEqual(data.revalidatedPaths, ['/shop']);
    });

    it('rejects request with empty tags and empty paths with 400', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': TEST_SECRET,
            },
            body: JSON.stringify({ tags: [], paths: [] }),
        });

        const res = await POST(req);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.error);
    });

    it('rejects malformed non-JSON body with 400', async () => {
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': TEST_SECRET,
            },
            body: 'this-is-not-json',
        });

        const res = await POST(req);
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.error.includes('JSON'));
    });

    it('returns 500 when REVALIDATE_SECRET is missing from server env', async () => {
        delete process.env.REVALIDATE_SECRET;
        const req = new NextRequest('http://localhost:3000/api/revalidate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-revalidate-secret': TEST_SECRET,
            },
            body: JSON.stringify({ tags: ['brands'] }),
        });

        const res = await POST(req);
        assert.equal(res.status, 500);
        const data = await res.json();
        assert.ok(data.error.includes('REVALIDATE_SECRET not set'));
    });
});

describe('notifyStorefront Helper Resilience', () => {
    it('returns warning failure without throwing if REVALIDATE_SECRET is missing', async () => {
        delete process.env.REVALIDATE_SECRET;
        const result = await notifyStorefront(['brands']);
        assert.equal(result.success, false);
        assert.ok(result.error?.includes('missing'));
    });

    it('handles connection error gracefully without throwing when storefront is unreachable', async () => {
        process.env.REVALIDATE_SECRET = 'secret';
        process.env.STOREFRONT_URL = 'http://127.0.0.1:54321'; // unreachable port
        const result = await notifyStorefront(['brands']);
        assert.equal(result.success, false);
        assert.ok(result.error);
    });

    it('returns success immediately if no tags or paths are passed', async () => {
        process.env.REVALIDATE_SECRET = 'secret';
        const result = await notifyStorefront([]);
        assert.equal(result.success, true);
    });
});

