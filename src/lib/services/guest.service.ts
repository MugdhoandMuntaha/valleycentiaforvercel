import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';
import Guest, { IGuest } from '@/lib/models/Guest';
import { normalizePhoneNumber } from '@/lib/phone';

export interface GuestAddressInput {
    fullName: string;
    phone: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state?: string | null;
    postalCode?: string | null;
    country?: string;
}

export interface UpsertGuestParams {
    phone: string;
    name?: string | null;
    email?: string | null;
    address?: GuestAddressInput | null;
    orderId?: string | mongoose.Types.ObjectId | null;
    orderTotal?: number;
    ip?: string | null;
    userAgent?: string | null;
}

/**
 * Service to manage guest profiles, change tracking, and order association.
 */
export class GuestService {
    /**
     * Upserts a guest record keyed by their unique E.164-normalized phone number.
     * Records any changes to name, email, or address into `changeHistory`.
     */
    static async upsertGuest(params: UpsertGuestParams): Promise<IGuest> {
        const normalizedPhone = normalizePhoneNumber(params.phone);
        if (!normalizedPhone) {
            throw new Error(`Invalid phone number: ${params.phone}. Must be a valid phone number format.`);
        }

        await connectToDatabase();

        const now = new Date();
        const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);

        let guest = await Guest.findOne({ phone: normalizedPhone });

        if (!guest) {
            // New guest creation
            const addresses = params.address ? [{
                fullName: params.address.fullName,
                phone: normalizePhoneNumber(params.address.phone) || normalizedPhone,
                addressLine1: params.address.addressLine1,
                addressLine2: params.address.addressLine2 || null,
                city: params.address.city,
                state: params.address.state || null,
                postalCode: params.address.postalCode || null,
                country: params.address.country || 'Bangladesh',
                createdAt: now,
            }] : [];

            const orderIds = params.orderId ? [new mongoose.Types.ObjectId(String(params.orderId))] : [];
            const orderMetadata = params.orderId ? [{
                orderId: String(params.orderId),
                ip: params.ip || null,
                userAgent: params.userAgent || null,
                createdAt: now,
            }] : [];

            guest = await Guest.create({
                phone: normalizedPhone,
                name: params.name?.trim() || null,
                email: params.email?.trim().toLowerCase() || null,
                status: 'active',
                firstSeen: now,
                lastSeen: now,
                orderCount: params.orderId ? 1 : 0,
                totalSpend: params.orderTotal || 0,
                orderIds,
                orderMetadata,
                addresses,
                changeHistory: [],
                isMerged: false,
                retentionExpiresAt: oneYearFromNow,
            });

            return guest;
        }

        // Existing guest: detect changes and record history
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

        // Add or update address
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
                    addressLine2: params.address.addressLine2 || null,
                    city: params.address.city,
                    state: params.address.state || null,
                    postalCode: params.address.postalCode || null,
                    country: params.address.country || 'Bangladesh',
                    createdAt: now,
                });
            }
        }

        // Append order data if present
        if (params.orderId) {
            const orderObjId = new mongoose.Types.ObjectId(String(params.orderId));
            const alreadyHasOrder = guest.orderIds.some(id => String(id) === String(orderObjId));

            if (!alreadyHasOrder) {
                guest.orderIds.push(orderObjId);
                guest.orderCount += 1;
                guest.totalSpend += (params.orderTotal || 0);

                guest.orderMetadata.push({
                    orderId: String(params.orderId),
                    ip: params.ip || null,
                    userAgent: params.userAgent || null,
                    createdAt: now,
                });
            }
        }

        guest.lastSeen = now;
        guest.retentionExpiresAt = oneYearFromNow;

        await guest.save();
        return guest;
    }
}
