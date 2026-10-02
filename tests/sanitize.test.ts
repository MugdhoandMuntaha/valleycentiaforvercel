import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeNoSql } from '../src/lib/sanitize.ts';

describe('NoSQL Injection & Prototype Pollution Sanitizer', () => {
    it('removes keys starting with dollar sign ($where, $gt, etc.)', () => {
        const payload = {
            username: 'alice',
            password: { $ne: null },
            filter: { $where: 'sleep(5000)' },
        };

        const cleaned = sanitizeNoSql(payload);
        assert.equal(cleaned.username, 'alice');
        assert.equal(cleaned.password.$ne, undefined);
        assert.equal(cleaned.filter.$where, undefined);
    });

    it('removes dot-notation path traversal keys', () => {
        const payload = {
            'user.role': 'admin',
            validKey: 'ok',
        };

        const cleaned = sanitizeNoSql(payload);
        assert.equal((cleaned as any)['user.role'], undefined);
        assert.equal(cleaned.validKey, 'ok');
    });

    it('blocks prototype pollution attempts', () => {
        const payload = {
            valid: true,
            __proto__: { isAdmin: true },
            constructor: { evil: true },
            prototype: { bypass: true },
        };

        const cleaned = sanitizeNoSql(payload);
        assert.equal(cleaned.valid, true);
        assert.equal((cleaned as any).__proto__.isAdmin, undefined);
        assert.equal((cleaned as any).constructor.evil, undefined);
        assert.equal((cleaned as any).prototype, undefined);
    });

    it('recursively cleans nested arrays of objects', () => {
        const payload = {
            items: [
                { id: '1', quantity: 2, $evil: true },
                { id: '2', quantity: 1, safe: { $gt: 5 } },
            ],
        };

        const cleaned = sanitizeNoSql(payload);
        assert.equal(cleaned.items.length, 2);
        assert.equal(cleaned.items[0].id, '1');
        assert.equal((cleaned.items[0] as any).$evil, undefined);
        assert.equal((cleaned.items[1].safe as any).$gt, undefined);
    });

    it('preserves primitive values and null/undefined without changes', () => {
        assert.equal(sanitizeNoSql(null), null);
        assert.equal(sanitizeNoSql(undefined), undefined);
        assert.equal(sanitizeNoSql('hello'), 'hello');
        assert.equal(sanitizeNoSql(123), 123);
        assert.equal(sanitizeNoSql(true), true);
    });
});
