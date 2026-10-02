import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isUserAdmin } from '../src/lib/authUtils.ts';

describe('Admin RBAC & Security Access Control', () => {
    it('authorizes users with explicit admin or superadmin roles', () => {
        assert.strictEqual(isUserAdmin({ role: 'admin' }), true);
        assert.strictEqual(isUserAdmin({ role: 'superadmin' }), true);
    });

    it('rejects standard users and customers without admin privileges', () => {
        assert.strictEqual(isUserAdmin({ role: 'customer' }), false);
        assert.strictEqual(isUserAdmin({ role: 'user' }), false);
        assert.strictEqual(isUserAdmin({}), false);
    });

    it('authorizes allowlisted admin emails from environment config', () => {
        process.env.ADMIN_EMAILS = 'founder@valleycentia.com, ops@valleycentia.com';
        
        assert.strictEqual(isUserAdmin({ email: 'founder@valleycentia.com' }), true);
        assert.strictEqual(isUserAdmin({ email: 'FOUNDER@VALLEYCENTIA.COM' }), true); // Case-insensitive
        assert.strictEqual(isUserAdmin({ email: 'ops@valleycentia.com' }), true);
        assert.strictEqual(isUserAdmin({ email: 'hacker@example.com' }), false);
    });

    it('authorizes allowlisted user IDs from environment config', () => {
        process.env.ADMIN_USER_IDS = 'usr_admin_01, usr_admin_02';

        assert.strictEqual(isUserAdmin({ userId: 'usr_admin_01' }), true);
        assert.strictEqual(isUserAdmin({ userId: 'usr_admin_02' }), true);
        assert.strictEqual(isUserAdmin({ userId: 'usr_guest_99' }), false);
    });
});
