import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhoneNumber } from '../src/lib/phone.ts';

interface SimulatedGuest {
    id: string;
    phone: string;
    name: string | null;
    orderIds: string[];
    addresses: Array<{ addressLine1: string; city: string }>;
    isMerged: boolean;
    mergedToUserId: string | null;
}

interface SimulatedUser {
    id: string;
    phone: string | null;
    isPhoneVerified: boolean;
}

interface SimulatedOrder {
    id: string;
    orderNumber: string;
    shippingPhone: string;
    userId: string | null;
    total: number;
}

// Pure business simulation of OTP verification and guest-to-account merge
class OtpMergeSimulator {
    private otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

    sendOtp(phone: string, code: string = '123456', validityMs: number = 300000): { success: boolean; code: string } {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized) throw new Error('Invalid phone');
        this.otpStore.set(normalized, {
            code,
            expiresAt: Date.now() + validityMs,
            attempts: 0,
        });
        return { success: true, code };
    }

    verifyOtp(phone: string, code: string): { success: boolean; error?: string } {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized) return { success: false, error: 'Invalid phone' };

        const entry = this.otpStore.get(normalized);
        if (!entry) return { success: false, error: 'No OTP requested' };

        if (Date.now() > entry.expiresAt) {
            this.otpStore.delete(normalized);
            return { success: false, error: 'OTP expired' };
        }

        entry.attempts += 1;
        if (entry.attempts > 5) {
            this.otpStore.delete(normalized);
            return { success: false, error: 'Too many attempts' };
        }

        if (entry.code !== code.trim()) {
            return { success: false, error: 'Incorrect OTP' };
        }

        this.otpStore.delete(normalized);
        return { success: true };
    }

    mergeGuestToAccount(
        user: SimulatedUser,
        guest: SimulatedGuest,
        orders: SimulatedOrder[],
        phone: string,
        otpCode: string
    ): { success: boolean; mergedOrdersCount: number; error?: string } {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized || normalized !== guest.phone) {
            return { success: false, mergedOrdersCount: 0, error: 'Phone mismatch' };
        }

        // 1. Must verify OTP first
        const otpResult = this.verifyOtp(normalized, otpCode);
        if (!otpResult.success) {
            return { success: false, mergedOrdersCount: 0, error: otpResult.error || 'OTP verification failed' };
        }

        // 2. Set user verified phone
        user.phone = normalized;
        user.isPhoneVerified = true;

        // 3. Migrate orders
        let count = 0;
        orders.forEach(o => {
            if ((guest.orderIds.includes(o.id) || o.shippingPhone === normalized) && !o.userId) {
                o.userId = user.id;
                count++;
            }
        });

        // 4. Mark guest as merged
        guest.isMerged = true;
        guest.mergedToUserId = user.id;

        return { success: true, mergedOrdersCount: count };
    }
}

describe('OTP Verification & Guest-to-Account Merge Semantics', () => {
    it('generates and validates OTP for Bangladeshi mobile numbers', () => {
        const simulator = new OtpMergeSimulator();
        const phone = '01712-345678';
        const { code } = simulator.sendOtp(phone, '543210');

        // Wrong code fails
        const wrongCheck = simulator.verifyOtp(phone, '000000');
        assert.equal(wrongCheck.success, false);
        assert.equal(wrongCheck.error, 'Incorrect OTP');

        // Correct code succeeds
        const correctCheck = simulator.verifyOtp(phone, code);
        assert.equal(correctCheck.success, true);
    });

    it('rejects expired OTPs', () => {
        const simulator = new OtpMergeSimulator();
        const phone = '01812-345678';
        simulator.sendOtp(phone, '999888', -1000); // Expired 1 second ago

        const check = simulator.verifyOtp(phone, '999888');
        assert.equal(check.success, false);
        assert.equal(check.error, 'OTP expired');
    });

    it('merges guest order history into new user profile only after successful OTP verification', () => {
        const simulator = new OtpMergeSimulator();
        const phone = '+8801712345678';
        const user: SimulatedUser = { id: 'usr_new_99', phone: null, isPhoneVerified: false };
        const guest: SimulatedGuest = {
            id: 'gst_1',
            phone,
            name: 'Tanvir Hossain',
            orderIds: ['ord_01', 'ord_02'],
            addresses: [{ addressLine1: 'Dhanmondi 27', city: 'Dhaka' }],
            isMerged: false,
            mergedToUserId: null,
        };
        const orders: SimulatedOrder[] = [
            { id: 'ord_01', orderNumber: 'VC-01', shippingPhone: phone, userId: null, total: 1200 },
            { id: 'ord_02', orderNumber: 'VC-02', shippingPhone: phone, userId: null, total: 3400 },
            { id: 'ord_03', orderNumber: 'VC-03', shippingPhone: '+8801999999999', userId: null, total: 500 }, // Other guest
        ];

        // 1. Attempting merge with invalid OTP must fail
        simulator.sendOtp(phone, '654321');
        const failedMerge = simulator.mergeGuestToAccount(user, guest, orders, phone, 'wrong_otp');
        assert.equal(failedMerge.success, false);
        assert.equal(user.phone, null);
        assert.equal(user.isPhoneVerified, false);
        assert.equal(guest.isMerged, false);
        assert.equal(orders[0].userId, null);

        // 2. Attempting merge with valid OTP succeeds
        simulator.sendOtp(phone, '777111');
        const successfulMerge = simulator.mergeGuestToAccount(user, guest, orders, phone, '777111');

        assert.equal(successfulMerge.success, true);
        assert.equal(successfulMerge.mergedOrdersCount, 2);
        assert.equal(user.phone, phone);
        assert.equal(user.isPhoneVerified, true);
        assert.equal(guest.isMerged, true);
        assert.equal(guest.mergedToUserId, user.id);

        // Confirm orders are now linked to user
        assert.equal(orders[0].userId, user.id);
        assert.equal(orders[1].userId, user.id);
        assert.equal(orders[2].userId, null); // Unrelated order untouched
    });
});

