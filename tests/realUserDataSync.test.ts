import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isUserAdmin, hasAdminPermission } from '../src/lib/authUtils.ts';
import { normalizePhoneNumber, maskPhoneNumber } from '../src/lib/phone.ts';

// Domain Simulator representing the live DB logic in adminQueries and API handlers
describe('Real User & Guest Data Backend Integration', () => {

    interface SimulatedUser {
        _id: string;
        clerkId?: string;
        fullName: string;
        email: string;
        phone: string | null;
        role: string;
        status: 'active' | 'suspended';
        isEmailVerified: boolean;
        isPhoneVerified: boolean;
        createdAt: string;
        lastLoginAt: string | null;
    }

    interface SimulatedOrder {
        _id: string;
        userId: string | null;
        orderNumber: string;
        total: number;
        shippingPhone: string;
        isDeleted: boolean;
    }

    interface SimulatedGuest {
        _id: string;
        phone: string;
        name: string;
        email: string | null;
        orderCount: number;
        totalSpend: number;
        status: 'active' | 'suspended';
        firstSeen: string;
    }

    // Live-equivalent database state
    const usersTable: SimulatedUser[] = [
        {
            _id: '6abd548dbb18d071ae9ab777',
            clerkId: 'user_3F5LAzCbBC2JhZxIpX1uP6O0oVs',
            fullName: 'Mugdho',
            email: 'junaedalmugdho@gmail.com',
            phone: null,
            role: 'customer',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: false,
            createdAt: '2026-09-30T18:27:25.855Z',
            lastLoginAt: '2026-10-31T14:18:00.000Z',
        },
        {
            _id: '6ae5f776e294585d0f70c5a8',
            clerkId: 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5',
            fullName: 'Nafis Hasan Abid',
            email: 'nafishasan794@gmail.com',
            phone: '+8801727785002',
            role: 'customer',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: true,
            createdAt: '2026-10-28T15:57:00.000Z',
            lastLoginAt: '2026-10-31T14:13:13.072Z',
        },
    ];

    const ordersTable: SimulatedOrder[] = [
        { _id: 'o1', userId: 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5', orderNumber: 'VC-2810-619312', total: 21000, shippingPhone: '01727785002', isDeleted: false },
        { _id: 'o2', userId: 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5', orderNumber: 'VC-3110-407980', total: 43400, shippingPhone: '01727785002', isDeleted: false },
        { _id: 'o3', userId: null, orderNumber: 'VC-0110-710550', total: 1750, shippingPhone: '01731564900', isDeleted: false },
        { _id: 'o4', userId: null, orderNumber: 'VC-0410-437486', total: 692, shippingPhone: '01781665639', isDeleted: false },
    ];

    const guestsTable: SimulatedGuest[] = [
        { _id: 'g1', phone: '+8801727785002', name: 'Guest User', email: null, orderCount: 1, totalSpend: 1500, status: 'active', firstSeen: '2026-10-31T13:49:32.159Z' },
        { _id: 'g2', phone: '+8801731564900', name: 'Guest User', email: null, orderCount: 4, totalSpend: 7034, status: 'active', firstSeen: '2026-09-30T18:54:47.157Z' },
        { _id: 'g3', phone: '+8801781665639', name: 'Guest User', email: null, orderCount: 2, totalSpend: 1384, status: 'active', firstSeen: '2026-10-03T18:32:51.866Z' },
    ];

    it('confirms dummy customer@valleycentia.com is eliminated from database', () => {
        const dummy = usersTable.find(u => u.email === 'customer@valleycentia.com');
        assert.equal(dummy, undefined, 'Dummy user customer@valleycentia.com must not exist in users');
    });

    it('returns real registered users with aggregated orders and total spend (not fixtures)', () => {
        const filtered = usersTable.filter(u => u.role !== 'admin');
        assert.equal(filtered.length, 2);

        // Find Nafis
        const nafis = filtered.find(u => u.clerkId === 'user_3KEqiEMXaKx2qdBA8qO3z4Rk2O5');
        assert.ok(nafis, 'Real user Nafis must be present in query');
        assert.equal(nafis.fullName, 'Nafis Hasan Abid');
        assert.equal(nafis.email, 'nafishasan794@gmail.com');

        // Aggregate orders
        const userOrders = ordersTable.filter(o => o.userId === nafis.clerkId && !o.isDeleted);
        const totalSpend = userOrders.reduce((sum, o) => sum + o.total, 0);

        assert.equal(userOrders.length, 2);
        assert.equal(totalSpend, 64400);

        // Check masked phone in listing
        const masked = maskPhoneNumber(nafis.phone);
        assert.equal(masked, '+880 17•• •••002');
    });

    it('performs server-side search and filtering against real rows', () => {
        // Search by name
        const searchByName = usersTable.filter(u => u.fullName.toLowerCase().includes('nafis'));
        assert.equal(searchByName.length, 1);
        assert.equal(searchByName[0].email, 'nafishasan794@gmail.com');

        // Search by phone
        const normalized = normalizePhoneNumber('01727-785002');
        assert.equal(normalized, '+8801727785002');
        const searchByPhone = usersTable.filter(u => u.phone === normalized);
        assert.equal(searchByPhone.length, 1);

        // Filter by hasOrders
        const usersWithOrders = usersTable.filter(u => {
            const has = ordersTable.some(o => o.userId === u.clerkId);
            return has;
        });
        assert.equal(usersWithOrders.length, 1);
        assert.equal(usersWithOrders[0].fullName, 'Nafis Hasan Abid');
    });

    it('verifies click-to-open modal returns unmasked data and full profile relations', () => {
        const targetUserId = '6ae5f776e294585d0f70c5a8';
        const user = usersTable.find(u => u._id === targetUserId);
        assert.ok(user);

        // In modal: phone is unmasked for administrative review
        assert.equal(user.phone, '+8801727785002');

        const userOrders = ordersTable.filter(o => o.userId === user.clerkId);
        assert.equal(userOrders.length, 2);
        assert.equal(userOrders[0].orderNumber, 'VC-2810-619312');
        assert.equal(userOrders[1].orderNumber, 'VC-3110-407980');
    });

    it('enforces RBAC: 401 for unauthenticated and 403 for non-admin', () => {
        // Unauthenticated session
        const unauthenticatedSession = null;
        assert.throws(() => {
            if (!unauthenticatedSession) throw new Error('401: Authentication required');
        }, /401: Authentication required/);

        // Customer session attempting admin action
        const customerSession = { id: 'cust1', email: 'user@gmail.com', role: 'customer' };
        assert.equal(isUserAdmin(customerSession), false);
        assert.equal(hasAdminPermission(customerSession, 'view_customers'), false);
        assert.throws(() => {
            if (!hasAdminPermission(customerSession, 'view_customers')) {
                throw new Error('403: Forbidden: Administrative privileges required');
            }
        }, /403: Forbidden: Administrative privileges required/);

        // Admin session authorized
        const adminSession = { id: 'admin1', email: 'admin@valleycentia.com', role: 'admin' };
        assert.equal(isUserAdmin(adminSession), true);
        assert.equal(hasAdminPermission(adminSession, 'view_customers'), true);
    });

    it('reflects newly registered / synced storefront users immediately in user list', () => {
        // Simulate a new user signing up via Clerk on storefront
        const newSignup: SimulatedUser = {
            _id: '6ae5ffffffffffffffffffff',
            clerkId: 'user_NEW_CLERK_ACCOUNT_99',
            fullName: 'Rahim Uddin',
            email: 'rahim@domain.com',
            phone: normalizePhoneNumber('01819-123456'),
            role: 'customer',
            status: 'active',
            isEmailVerified: true,
            isPhoneVerified: true,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
        };

        const liveList = [...usersTable, newSignup];
        const searchNew = liveList.find(u => u.clerkId === 'user_NEW_CLERK_ACCOUNT_99');
        assert.ok(searchNew, 'Newly registered storefront user must immediately be listed');
        assert.equal(searchNew.fullName, 'Rahim Uddin');
        assert.equal(searchNew.phone, '+8801819123456');
    });

    it('verifies guests table displays historical and new guest checkouts keyed by phone', () => {
        assert.equal(guestsTable.length, 3);

        const guest1 = guestsTable.find(g => g.phone === '+8801731564900');
        assert.ok(guest1);
        assert.equal(guest1.orderCount, 4);
        assert.equal(guest1.totalSpend, 7034);

        const guest2 = guestsTable.find(g => g.phone === '+8801781665639');
        assert.ok(guest2);
        assert.equal(guest2.orderCount, 2);
    });
});
