import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber, isValidPhoneNumber, maskPhoneNumber } from '../src/lib/phone.ts';

describe('Bangladesh and E.164 Phone Normalization & Validation', () => {
    it('normalizes local 11-digit BD formats into E.164 (+880...) seamlessly', () => {
        // Standard formats
        assert.equal(normalizePhoneNumber('01712345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('01712-345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('01712 345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('01712.345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('(01712) 345678'), '+8801712345678');

        // Other BD operators (013, 014, 015, 016, 018, 019)
        assert.equal(normalizePhoneNumber('01300000000'), '+8801300000000');
        assert.equal(normalizePhoneNumber('01400000000'), '+8801400000000');
        assert.equal(normalizePhoneNumber('01500000000'), '+8801500000000');
        assert.equal(normalizePhoneNumber('01600000000'), '+8801600000000');
        assert.equal(normalizePhoneNumber('01800000000'), '+8801800000000');
        assert.equal(normalizePhoneNumber('01900000000'), '+8801900000000');
    });

    it('normalizes numbers starting with 880 or +880 or 00880', () => {
        assert.equal(normalizePhoneNumber('8801712345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('+8801712345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('+880 1712-345678'), '+8801712345678');
        assert.equal(normalizePhoneNumber('008801712345678'), '+8801712345678');
    });

    it('handles global international E.164 formats', () => {
        assert.equal(normalizePhoneNumber('+1 (415) 555-2671'), '+14155552671');
        assert.equal(normalizePhoneNumber('+44 7911 123456'), '+447911123456');
    });

    it('rejects invalid, malformed, or fake numbers', () => {
        assert.equal(normalizePhoneNumber(''), null);
        assert.equal(normalizePhoneNumber('   '), null);
        assert.equal(normalizePhoneNumber('12345'), null);
        assert.equal(normalizePhoneNumber('01212345678'), null); // Invalid BD prefix (012 doesn't exist)
        assert.equal(normalizePhoneNumber('01012345678'), null); // Invalid BD prefix (010 doesn't exist)
        assert.equal(normalizePhoneNumber('017123456'), null); // Too short (9 digits)
        assert.equal(normalizePhoneNumber('0171234567899'), null); // Too long
        assert.equal(normalizePhoneNumber('random_letters'), null);
        assert.equal(normalizePhoneNumber(null as unknown as string), null);
        assert.equal(normalizePhoneNumber(undefined as unknown as string), null);

        assert.equal(isValidPhoneNumber('01712345678'), true);
        assert.equal(isValidPhoneNumber('invalid'), false);
    });

    it('masks phone numbers for privacy while showing prefix and last 3 digits', () => {
        assert.equal(maskPhoneNumber('+8801712345678'), '+880 17•• •••678');
        assert.equal(maskPhoneNumber('01712-345678'), '+880 17•• •••678');
        assert.equal(maskPhoneNumber('01999999123'), '+880 19•• •••123');
        assert.equal(maskPhoneNumber(null), '—');
    });
});
