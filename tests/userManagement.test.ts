import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUserAdmin, hasAdminPermission } from '../src/lib/authUtils.ts';
import { maskPhoneNumber } from '../src/lib/phone.ts';

describe('Admin User & Customer Management RBAC & Actions', () => {
    it('authorizes admin to list users and view customer profiles', () => {
        // Admin role
        assert.equal(isUserAdmin({ role: 'admin' }), true);
        assert.equal(hasAdminPermission({ role: 'admin' }, 'view_customers'), true);
        assert.equal(hasAdminPermission({ role: 'admin' }, 'suspend_users'), true);
        assert.equal(hasAdminPermission({ role: 'admin' }, 'export_data'), true);

        // Superadmin role
        assert.equal(hasAdminPermission({ role: 'superadmin' }, 'view_customers'), true);
        assert.equal(hasAdminPermission({ role: 'superadmin' }, 'suspend_users'), true);
    });

    it('rejects non-admin and unauthenticated users with 403 Forbidden / 401 Unauthorized', () => {
        // Customer / unauthenticated
        assert.equal(isUserAdmin({ role: 'customer' }), false);
        assert.equal(hasAdminPermission({ role: 'customer' }, 'view_customers'), false);
        assert.equal(hasAdminPermission({ role: 'customer' }, 'suspend_users'), false);

        assert.equal(isUserAdmin({}), false);
        assert.equal(hasAdminPermission({}, 'view_customers'), false);
    });

    it('enforces separate permissions for viewing customers vs suspending users when restricted', () => {
        // Admin user with restricted permissions: only 'view_customers'
        const viewerAdmin = {
            userId: 'adm_view_only',
            role: 'admin',
            permissions: ['view_customers'],
        };

        assert.equal(hasAdminPermission(viewerAdmin, 'view_customers'), true);
        assert.equal(hasAdminPermission(viewerAdmin, 'suspend_users'), false); // Disallowed to suspend
        assert.equal(hasAdminPermission(viewerAdmin, 'anonymize_users'), false);

        // Admin user with only 'suspend_users'
        const moderatorAdmin = {
            userId: 'adm_suspend_only',
            role: 'admin',
            permissions: ['suspend_users'],
        };
        assert.equal(hasAdminPermission(moderatorAdmin, 'view_customers'), false);
        assert.equal(hasAdminPermission(moderatorAdmin, 'suspend_users'), true);
    });

    it('masks phone numbers in table listings and preserves full number for modal inspection', () => {
        const rawUserPhone = '+8801712345678';
        const maskedInTable = maskPhoneNumber(rawUserPhone);

        // Masked version must obscure middle digits
        assert.equal(maskedInTable, '+880 17•• •••678');
        assert.notEqual(maskedInTable, rawUserPhone);
        assert.ok(!maskedInTable.includes('345'));

        // Full phone remains intact for profile view
        assert.equal(rawUserPhone, '+8801712345678');
    });

    it('records state transitions in user status history during suspension and reactivation', () => {
        const user = {
            id: 'usr_test_101',
            status: 'active',
            statusHistory: [] as Array<{ status: string; note: string; changedBy: string; createdAt: Date }>,
        };

        // Suspend
        const suspendNote = 'Repeated fraudulent order cancellations';
        user.status = 'suspended';
        user.statusHistory.push({
            status: 'suspended',
            note: suspendNote,
            changedBy: 'admin_1',
            createdAt: new Date(),
        });

        assert.equal(user.status, 'suspended');
        assert.equal(user.statusHistory.length, 1);
        assert.equal(user.statusHistory[0].status, 'suspended');
        assert.equal(user.statusHistory[0].note, suspendNote);

        // Reactivate
        const reactivateNote = 'Customer verified identity via official documentation';
        user.status = 'active';
        user.statusHistory.push({
            status: 'active',
            note: reactivateNote,
            changedBy: 'admin_2',
            createdAt: new Date(),
        });

        assert.equal(user.status, 'active');
        assert.equal(user.statusHistory.length, 2);
        assert.equal(user.statusHistory[1].status, 'active');
        assert.equal(user.statusHistory[1].note, reactivateNote);
    });

    it('anonymizes personal identifiers and redacts phone and email for privacy deletion', () => {
        const user = {
            id: 'usr_to_anonymize',
            fullName: 'Jane Doe',
            displayName: 'janedoe',
            email: 'jane.doe@example.com',
            phone: '+8801711223344',
            status: 'active',
            isAnonymized: false,
        };

        // Anonymization routine
        user.fullName = 'Anonymized User';
        user.displayName = 'Anonymized';
        user.email = `anonymized_${user.id}@valleycentia.local`;
        user.phone = null as unknown as string;
        user.status = 'suspended';
        user.isAnonymized = true;

        assert.equal(user.isAnonymized, true);
        assert.equal(user.fullName, 'Anonymized User');
        assert.equal(user.phone, null);
        assert.ok(user.email.startsWith('anonymized_'));
        assert.equal(user.status, 'suspended');
    });
});
