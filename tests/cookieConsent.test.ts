import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseConsentString, serializeConsent, DEFAULT_CONSENT } from '../src/lib/cookieConsent.ts';

describe('Cookie Consent & Privacy Compliance Management', () => {
    it('provides sound default consent configuration with essential cookies enabled', () => {
        assert.strictEqual(DEFAULT_CONSENT.essential, true);
        assert.strictEqual(DEFAULT_CONSENT.marketing, false);
    });

    it('serializes and parses consent preferences accurately', () => {
        const serialized = serializeConsent({ analytics: true, marketing: false });
        const parsed = parseConsentString(serialized);

        assert.ok(parsed);
        assert.strictEqual(parsed?.essential, true);
        assert.strictEqual(parsed?.analytics, true);
        assert.strictEqual(parsed?.marketing, false);
        assert.ok(parsed?.updatedAt);
    });

    it('enforces essential cookies to true even if client attempts to disable them', () => {
        const maliciousPayload = encodeURIComponent(JSON.stringify({
            essential: false,
            analytics: true,
            marketing: true,
        }));

        const parsed = parseConsentString(maliciousPayload);
        assert.ok(parsed);
        assert.strictEqual(parsed?.essential, true, 'Essential cookies must always remain strictly true');
    });

    it('gracefully handles malformed or null consent strings without crashing', () => {
        assert.strictEqual(parseConsentString(null), null);
        assert.strictEqual(parseConsentString(''), null);
        assert.strictEqual(parseConsentString('invalid-json{{{'), null);
    });
});
