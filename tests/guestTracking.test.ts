import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber, isValidPhoneNumber } from '../src/lib/phone.ts';

interface GuestChangeHistory {
    field: string;
    oldValue: string | null;
    newValue: string | null;
    changedAt: Date;
    reason?: string | null;
}

interface GuestEntity {
    phone: string;
    name: string | null;
    email: string | null;
    status: 'active' | 'suspended';
    firstSeen: Date;
    lastSeen: Date;
    orderCount: number;
    totalSpend: number;
    orderIds: string[];
    orderMetadata: Array<{ orderId: string; ip?: string | null; userAgent?: string | null; createdAt: Date }>;
    addresses: Array<{ fullName: string; phone: string; addressLine1: string; city: string; country: string }>;
    changeHistory: GuestChangeHistory[];
    retentionExpiresAt: Date;
}

// Pure business domain simulation for guest tracking upsert
function simulateUpsertGuest(
    guestStore: Map<string, GuestEntity>,
    params: {
        phone: string;
        name?: string | null;
        email?: string | null;
        address?: { fullName: string; phone: string; addressLine1: string; city: string; country?: string } | null;
        orderId?: string | null;
        orderTotal?: number;
        ip?: string | null;
        userAgent?: string | null;
    }
): GuestEntity {
    const normalizedPhone = normalizePhoneNumber(params.phone);
    if (!normalizedPhone) {
        throw new Error(`Invalid phone number: ${params.phone}. Must be a valid phone number format.`);
    }

    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

    let guest = guestStore.get(normalizedPhone);

    if (!guest) {
        guest = {
            phone: normalizedPhone,
            name: params.name?.trim() || null,
            email: params.email?.trim().toLowerCase() || null,
            status: 'active',
            firstSeen: now,
            lastSeen: now,
            orderCount: params.orderId ? 1 : 0,
            totalSpend: params.orderTotal || 0,
            orderIds: params.orderId ? [params.orderId] : [],
            orderMetadata: params.orderId ? [{
                orderId: params.orderId,
                ip: params.ip || null,
                userAgent: params.userAgent || null,
                createdAt: now,
            }] : [],
            addresses: params.address ? [{
                fullName: params.address.fullName,
                phone: normalizePhoneNumber(params.address.phone) || normalizedPhone,
                addressLine1: params.address.addressLine1,
                city: params.address.city,
                country: params.address.country || 'Bangladesh',
            }] : [],
            changeHistory: [],
            retentionExpiresAt: oneYearFromNow,
        };
        guestStore.set(normalizedPhone, guest);
        return guest;
    }

    // Existing guest: detect changes
    const newName = params.name?.trim();
    if (newName && guest.name && guest.name !== newName) {
        guest.changeHistory.push({
            field: 'name',
            oldValue: guest.name,
            newValue: newName,
            changedAt: now,
            reason: 'Updated via checkout or form submission',
        });
        guest.name = newName;
    } else if (newName && !guest.name) {
        guest.name = newName;
    }

    const newEmail = params.email?.trim().toLowerCase();
    if (newEmail && guest.email && guest.email !== newEmail) {
        guest.changeHistory.push({
            field: 'email',
            oldValue: guest.email,
            newValue: newEmail,
            changedAt: now,
            reason: 'Updated via checkout or form submission',
        });
        guest.email = newEmail;
    } else if (newEmail && !guest.email) {
        guest.email = newEmail;
    }

    if (params.address) {
        const isDuplicate = guest.addresses.some(
            a => a.addressLine1.toLowerCase().trim() === params.address?.addressLine1.toLowerCase().trim() &&
                 a.city.toLowerCase().trim() === params.address?.city.toLowerCase().trim()
        );

        if (!isDuplicate) {
            if (guest.addresses.length > 0) {
                const primary = guest.addresses[guest.addresses.length - 1];
                guest.changeHistory.push({
                    field: 'address',
                    oldValue: `${primary.addressLine1}, ${primary.city}`,
                    newValue: `${params.address.addressLine1}, ${params.address.city}`,
                    changedAt: now,
                    reason: 'New shipping destination provided',
                });
            }

            guest.addresses.push({
                fullName: params.address.fullName,
                phone: normalizePhoneNumber(params.address.phone) || normalizedPhone,
                addressLine1: params.address.addressLine1,
                city: params.address.city,
                country: params.address.country || 'Bangladesh',
            });
        }
    }

    if (params.orderId) {
        if (!guest.orderIds.includes(params.orderId)) {
            guest.orderIds.push(params.orderId);
            guest.orderCount += 1;
            guest.totalSpend += (params.orderTotal || 0);
            guest.orderMetadata.push({
                orderId: params.orderId,
                ip: params.ip || null,
                userAgent: params.userAgent || null,
                createdAt: now,
            });
        }
    }

    guest.lastSeen = now;
    guest.retentionExpiresAt = oneYearFromNow;

    return guest;
}

describe('Guest Tracking & Phone-Keyed Upsert Semantics', () => {
    it('creates a new guest record with normalized E.164 phone and initial order data', () => {
        const store = new Map<string, GuestEntity>();

        const guest = simulateUpsertGuest(store, {
            phone: '01712-345000', // Local format with dashes
            name: 'Rahim Khan',
            email: 'rahim@example.com',
            address: {
                fullName: 'Rahim Khan',
                phone: '01712-345000',
                addressLine1: 'House 12, Road 5',
                city: 'Dhaka',
            },
            orderId: 'ord_101',
            orderTotal: 1500,
            ip: '103.205.10.1',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0)',
        });

        assert.equal(guest.phone, '+8801712345000');
        assert.equal(guest.name, 'Rahim Khan');
        assert.equal(guest.email, 'rahim@example.com');
        assert.equal(guest.orderCount, 1);
        assert.equal(guest.totalSpend, 1500);
        assert.equal(guest.addresses.length, 1);
        assert.equal(guest.addresses[0].city, 'Dhaka');
        assert.equal(guest.orderMetadata.length, 1);
        assert.equal(guest.orderMetadata[0].ip, '103.205.10.1');
        assert.equal(guest.status, 'active');
        assert.equal(guest.changeHistory.length, 0);
        assert.ok(guest.retentionExpiresAt > guest.firstSeen);
    });

    it('matches existing guest across different BD phone formats and records name and address changes', () => {
        const store = new Map<string, GuestEntity>();

        // Order 1: entered as "01712345000"
        simulateUpsertGuest(store, {
            phone: '01712345000',
            name: 'Rahim Khan',
            email: 'rahim@example.com',
            address: {
                fullName: 'Rahim Khan',
                phone: '01712345000',
                addressLine1: 'House 12, Road 5',
                city: 'Dhaka',
            },
            orderId: 'ord_101',
            orderTotal: 1500,
        });

        // Order 2: entered with international code "+880 1712-345000", different name & city
        const updated = simulateUpsertGuest(store, {
            phone: '+880 1712-345000',
            name: 'Mohammad Rahim Khan',
            email: 'rahim.khan@example.com',
            address: {
                fullName: 'Mohammad Rahim Khan',
                phone: '+8801712345000',
                addressLine1: 'Flat 4B, Tower 2',
                city: 'Chittagong',
            },
            orderId: 'ord_102',
            orderTotal: 2200,
            ip: '103.205.10.2',
            userAgent: 'Mozilla/5.0 (Mobile)',
        });

        // Verifies both orders map to single unique phone record
        assert.equal(store.size, 1);
        assert.equal(updated.phone, '+8801712345000');
        assert.equal(updated.orderCount, 2);
        assert.equal(updated.totalSpend, 3700);
        assert.equal(updated.name, 'Mohammad Rahim Khan');
        assert.equal(updated.email, 'rahim.khan@example.com');

        // Check change history
        assert.equal(updated.changeHistory.length, 3);
        const nameChange = updated.changeHistory.find(c => c.field === 'name');
        assert.equal(nameChange?.oldValue, 'Rahim Khan');
        assert.equal(nameChange?.newValue, 'Mohammad Rahim Khan');

        const emailChange = updated.changeHistory.find(c => c.field === 'email');
        assert.equal(emailChange?.oldValue, 'rahim@example.com');
        assert.equal(emailChange?.newValue, 'rahim.khan@example.com');

        const addressChange = updated.changeHistory.find(c => c.field === 'address');
        assert.equal(addressChange?.oldValue, 'House 12, Road 5, Dhaka');
        assert.equal(addressChange?.newValue, 'Flat 4B, Tower 2, Chittagong');
    });

    it('rejects invalid or malformed phone numbers with descriptive error', () => {
        const store = new Map<string, GuestEntity>();

        assert.throws(
            () => {
                simulateUpsertGuest(store, {
                    phone: '12345',
                    name: 'Invalid User',
                });
            },
            /Invalid phone number/
        );

        assert.throws(
            () => {
                simulateUpsertGuest(store, {
                    phone: '01012345678', // Invalid BD prefix (010)
                    name: 'Bad Prefix',
                });
            },
            /Invalid phone number/
        );
    });
});
