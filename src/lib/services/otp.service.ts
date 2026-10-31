import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import Guest from '@/lib/models/Guest';
import Order from '@/lib/models/Order';
import Address from '@/lib/models/Address';
import AuditLog from '@/lib/models/AuditLog';
import { normalizePhoneNumber } from '@/lib/phone';

interface OtpEntry {
    code: string;
    expiresAt: number;
    attempts: number;
    verified: boolean;
}

const otpStore = new Map<string, OtpEntry>();

export class OtpService {
    static async sendOtp(phone: string, preferredCode?: string): Promise<{ success: boolean; message: string; testCode?: string }> {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized) {
            throw new Error(`Invalid phone number: ${phone}`);
        }

        const code = preferredCode || (process.env.NODE_ENV === 'test' ? '123456' : Math.floor(100000 + Math.random() * 900000).toString());
        const expiresAt = Date.now() + 5 * 60 * 1000;

        otpStore.set(normalized, {
            code,
            expiresAt,
            attempts: 0,
            verified: false,
        });

        return {
            success: true,
            message: `OTP sent successfully to ${phone}`,
            testCode: code,
        };
    }

    static async verifyOtp(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized) {
            return { success: false, error: 'Invalid phone number format' };
        }

        const entry = otpStore.get(normalized);
        if (!entry) {
            return { success: false, error: 'No OTP requested for this phone number' };
        }

        if (Date.now() > entry.expiresAt) {
            otpStore.delete(normalized);
            return { success: false, error: 'OTP has expired. Please request a new one.' };
        }

        if (entry.attempts >= 5) {
            otpStore.delete(normalized);
            return { success: false, error: 'Too many incorrect attempts. Please request a new OTP.' };
        }

        entry.attempts += 1;

        if (entry.code !== code.trim()) {
            return { success: false, error: 'Incorrect OTP' };
        }

        entry.verified = true;
        return { success: true };
    }

    static async mergeGuestToAccount(
        userId: string,
        phone: string,
        otpCode: string
    ): Promise<{ success: boolean; mergedOrdersCount: number; error?: string }> {
        const normalized = normalizePhoneNumber(phone);
        if (!normalized) {
            return { success: false, mergedOrdersCount: 0, error: 'Invalid phone format' };
        }

        const otpCheck = await this.verifyOtp(normalized, otpCode);
        if (!otpCheck.success) {
            return { success: false, mergedOrdersCount: 0, error: otpCheck.error || 'OTP verification failed' };
        }

        await connectToDatabase();

        const user = await User.findOne({
            $or: [{ _id: mongoose.isValidObjectId(userId) ? userId : null }, { clerkId: userId }],
        });

        if (!user) {
            return { success: false, mergedOrdersCount: 0, error: 'User account not found' };
        }

        user.phone = normalized;
        user.isPhoneVerified = true;

        const guest = await Guest.findOne({ phone: normalized });
        if (!guest) {
            await user.save();
            return { success: true, mergedOrdersCount: 0 };
        }

        const userIdentifier = String(user._id);

        const updateOrdersResult = await Order.updateMany(
            {
                $or: [
                    { _id: { $in: guest.orderIds } },
                    { shippingPhone: normalized, userId: null },
                ],
            },
            {
                $set: { userId: userIdentifier },
            }
        );

        const mergedCount = updateOrdersResult.modifiedCount || guest.orderIds.length;

        if (guest.addresses && guest.addresses.length > 0) {
            for (const addr of guest.addresses) {
                const existing = await Address.findOne({
                    userId: userIdentifier,
                    addressLine1: addr.addressLine1,
                    city: addr.city,
                });

                if (!existing) {
                    await Address.create({
                        userId: userIdentifier,
                        label: 'Imported',
                        fullName: addr.fullName,
                        phone: addr.phone,
                        addressLine1: addr.addressLine1,
                        addressLine2: addr.addressLine2 || null,
                        city: addr.city,
                        state: addr.state || null,
                        postalCode: addr.postalCode || null,
                        country: addr.country || 'Bangladesh',
                        isDefault: false,
                    });
                }
            }
        }

        guest.isMerged = true;
        guest.mergedToUserId = userIdentifier;
        guest.mergedAt = new Date();
        await guest.save();

        await user.save();

        await AuditLog.create({
            tableName: 'users',
            recordId: userIdentifier,
            action: 'MERGE',
            oldData: null,
            newData: {
                guestPhone: normalized,
                guestId: String(guest._id),
                mergedOrdersCount: mergedCount,
            },
            performedBy: userIdentifier,
            metadata: {
                note: 'Guest history merged into registered user profile following OTP verification',
            },
            performedAt: new Date(),
        });

        otpStore.delete(normalized);

        return {
            success: true,
            mergedOrdersCount: mergedCount,
        };
    }
}
