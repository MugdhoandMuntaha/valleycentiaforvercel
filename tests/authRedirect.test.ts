import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getSafeCallbackUrl } from '../src/lib/auth-helpers.ts';

describe('Post-Authentication Safe Callback URL & Open Redirect Defense', () => {
    it('accepts safe relative return URLs with hash anchors', () => {
        const input = '/product/snail-mucin-serum#reviews';
        const result = getSafeCallbackUrl(input);
        assert.equal(result, '/product/snail-mucin-serum#reviews');
    });

    it('accepts safe relative URLs with section query parameter and hash anchor', () => {
        const input = '/product/snail-mucin-serum?section=reviews#reviews';
        const result = getSafeCallbackUrl(input);
        assert.equal(result, '/product/snail-mucin-serum?section=reviews#reviews');
    });

    it('rejects protocol-relative open redirect attacks (//evil.com)', () => {
        assert.equal(getSafeCallbackUrl('//evil.com'), '/');
        assert.equal(getSafeCallbackUrl('//evil.com/phishing'), '/');
        assert.equal(getSafeCallbackUrl('///evil.com'), '/');
    });

    it('rejects backslash protocol-relative redirect attacks (/\\evil.com or \\/evil.com)', () => {
        assert.equal(getSafeCallbackUrl('/\\evil.com'), '/');
        assert.equal(getSafeCallbackUrl('\\/evil.com'), '/');
        assert.equal(getSafeCallbackUrl('/\\/evil.com'), '/');
    });

    it('rejects absolute external URLs to malicious sites', () => {
        assert.equal(getSafeCallbackUrl('https://evil.com'), '/');
        assert.equal(getSafeCallbackUrl('https://evil.com/product/snail-mucin#reviews'), '/');
        assert.equal(getSafeCallbackUrl('http://attacker.org/login'), '/');
    });

    it('rejects javascript: and data: pseudo-protocols', () => {
        assert.equal(getSafeCallbackUrl('javascript:alert(1)'), '/');
        assert.equal(getSafeCallbackUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='), '/');
    });

    it('falls back to default "/" or custom fallback when callback is missing or empty', () => {
        assert.equal(getSafeCallbackUrl(null), '/');
        assert.equal(getSafeCallbackUrl(undefined), '/');
        assert.equal(getSafeCallbackUrl(''), '/');
        assert.equal(getSafeCallbackUrl('   '), '/');
        assert.equal(getSafeCallbackUrl(null, '/profile'), '/profile');
        assert.equal(getSafeCallbackUrl('https://evil.com', '/profile'), '/profile');
    });

    it('allows same-origin URLs and converts them to safe relative paths', () => {
        const sameOriginUrl = 'http://localhost:3000/product/glow-serum?section=reviews#reviews';
        const result = getSafeCallbackUrl(sameOriginUrl);
        assert.equal(result, '/product/glow-serum?section=reviews#reviews');
    });
});

describe('Sign-In & Sign-Up Switcher Callback URL Carryover', () => {
    it('constructs signUpUrl carrying over valid callbackUrl', () => {
        const rawCallback = '/product/glow-serum?section=reviews#reviews';
        const safeCallback = getSafeCallbackUrl(rawCallback, '');
        assert.ok(safeCallback);

        const signUpUrl = safeCallback
            ? `/auth/sign-up?callbackUrl=${encodeURIComponent(safeCallback)}`
            : '/auth/sign-up';

        assert.equal(
            signUpUrl,
            '/auth/sign-up?callbackUrl=%2Fproduct%2Fglow-serum%3Fsection%3Dreviews%23reviews'
        );
    });

    it('constructs signInUrl carrying over valid callbackUrl when switching from Sign Up', () => {
        const rawCallback = '/product/glow-serum?section=reviews#reviews';
        const safeCallback = getSafeCallbackUrl(rawCallback, '');
        assert.ok(safeCallback);

        const signInUrl = safeCallback
            ? `/auth/sign-in?callbackUrl=${encodeURIComponent(safeCallback)}`
            : '/auth/sign-in';

        assert.equal(
            signInUrl,
            '/auth/sign-in?callbackUrl=%2Fproduct%2Fglow-serum%3Fsection%3Dreviews%23reviews'
        );
    });

    it('does not propagate malicious callbackUrl between auth views', () => {
        const maliciousCallback = 'https://phishing.com/steal-creds';
        const safeCallback = getSafeCallbackUrl(maliciousCallback, '');
        assert.equal(safeCallback, '');

        const signUpUrl = safeCallback
            ? `/auth/sign-up?callbackUrl=${encodeURIComponent(safeCallback)}`
            : '/auth/sign-up';

        const signInUrl = safeCallback
            ? `/auth/sign-in?callbackUrl=${encodeURIComponent(safeCallback)}`
            : '/auth/sign-in';

        assert.equal(signUpUrl, '/auth/sign-up');
        assert.equal(signInUrl, '/auth/sign-in');
    });
});

describe('Review State Preservation & Destination Serialization', () => {
    it('builds canonical review return destination with both section query and hash anchor', () => {
        const slug = 'vitamin-c-moisturizer';
        const reviewReturnUrl = `/product/${slug}?openReviewForm=true#reviews`;
        const encoded = encodeURIComponent(reviewReturnUrl);
        const signInLink = `/auth/sign-in?redirect_url=${encoded}&callbackUrl=${encoded}`;

        assert.equal(
            signInLink,
            '/auth/sign-in?redirect_url=%2Fproduct%2Fvitamin-c-moisturizer%3FopenReviewForm%3Dtrue%23reviews&callbackUrl=%2Fproduct%2Fvitamin-c-moisturizer%3FopenReviewForm%3Dtrue%23reviews'
        );

        // When retrieved from searchParams and validated:
        const decoded = decodeURIComponent(encoded);
        const safeDestination = getSafeCallbackUrl(decoded);
        assert.equal(safeDestination, '/product/vitamin-c-moisturizer?openReviewForm=true#reviews');
    });

    it('serializes and deserializes pending review draft without loss of rating or text', () => {
        const draft = {
            rating: 4,
            title: 'Fantastic hydration',
            body: 'My skin felt refreshed and glowing within 3 days.',
        };

        const serialized = JSON.stringify(draft);
        const parsed = JSON.parse(serialized);

        assert.deepEqual(parsed, draft);
        assert.equal(parsed.rating, 4);
        assert.equal(parsed.title, 'Fantastic hydration');
        assert.equal(parsed.body, 'My skin felt refreshed and glowing within 3 days.');
    });
});
