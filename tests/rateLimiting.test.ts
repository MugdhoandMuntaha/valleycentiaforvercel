import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit } from '../src/lib/rateLimit.ts';

describe('Rate Limiter (Sliding Window)', () => {
    it('allows requests within limit', () => {
        const ip = `test_ip_allow_${Date.now()}`;
        const res1 = checkRateLimit(ip, 5, 10000);
        assert.equal(res1.success, true);
        assert.equal(res1.limit, 5);
        assert.equal(res1.remaining, 4);

        const res2 = checkRateLimit(ip, 5, 10000);
        assert.equal(res2.success, true);
        assert.equal(res2.remaining, 3);
    });

    it('blocks requests exceeding limit with 429 semantics', () => {
        const ip = `test_ip_block_${Date.now()}`;
        const max = 3;

        // Exhaust quota
        for (let i = 0; i < max; i++) {
            const res = checkRateLimit(ip, max, 10000);
            assert.equal(res.success, true);
        }

        // Exceeded request
        const blocked = checkRateLimit(ip, max, 10000);
        assert.equal(blocked.success, false);
        assert.equal(blocked.remaining, 0);
        assert.ok(blocked.reset >= Date.now());
    });

    it('isolates different IPs independently', () => {
        const ipA = `test_ip_A_${Date.now()}`;
        const ipB = `test_ip_B_${Date.now()}`;

        // Exhaust IP A
        checkRateLimit(ipA, 1, 10000);
        const blockedA = checkRateLimit(ipA, 1, 10000);
        assert.equal(blockedA.success, false);

        // IP B should still be allowed
        const allowedB = checkRateLimit(ipB, 1, 10000);
        assert.equal(allowedB.success, true);
    });
});
