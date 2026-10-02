"use server";

import connectToDatabase from '@/lib/mongodb';
import Address from '@/lib/models/Address';
import type { UserAddress, AddressFormData } from './types';

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
    await connectToDatabase();
    const addresses = await Address.find({ userId })
        .sort({ isDefault: -1, createdAt: -1 })
        .lean();

    return addresses.map(a => ({
        id: String(a._id),
        user_id: String(a.userId),
        label: a.label,
        full_name: a.fullName,
        phone: a.phone,
        address_line_1: a.addressLine1,
        address_line_2: a.addressLine2,
        city: a.city,
        state: a.state,
        postal_code: a.postalCode,
        country: a.country,
        landmark: a.landmark,
        is_default: a.isDefault,
        created_at: a.createdAt.toISOString(),
        updated_at: a.updatedAt.toISOString(),
    }));
}

export async function createAddress(userId: string, data: AddressFormData): Promise<{ id: string | null; error: string | null }> {
    await connectToDatabase();
    try {
        if (data.is_default) {
            await Address.updateMany({ userId }, { isDefault: false });
        }

        const addr = await Address.create({
            userId,
            label: data.label || 'Home',
            fullName: data.full_name,
            phone: data.phone,
            addressLine1: data.address_line_1,
            addressLine2: data.address_line_2 || null,
            city: data.city,
            state: data.state,
            postalCode: data.postal_code,
            country: data.country || 'Bangladesh',
            landmark: data.landmark || null,
            isDefault: data.is_default,
        });

        return { id: String(addr._id), error: null };
    } catch (err) {
        console.error('Error creating address:', err);
        return { id: null, error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function updateAddress(id: string, userId: string, data: AddressFormData): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        if (data.is_default) {
            await Address.updateMany({ userId }, { isDefault: false });
        }

        await Address.findByIdAndUpdate(id, {
            label: data.label || 'Home',
            fullName: data.full_name,
            phone: data.phone,
            addressLine1: data.address_line_1,
            addressLine2: data.address_line_2 || null,
            city: data.city,
            state: data.state,
            postalCode: data.postal_code,
            country: data.country || 'Bangladesh',
            landmark: data.landmark || null,
            isDefault: data.is_default,
        });

        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function deleteAddress(id: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await Address.findByIdAndDelete(id);
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}

export async function setDefaultAddress(userId: string, addressId: string): Promise<{ error: string | null }> {
    await connectToDatabase();
    try {
        await Address.updateMany({ userId }, { isDefault: false });
        await Address.findByIdAndUpdate(addressId, { isDefault: true });
        return { error: null };
    } catch (err) {
        return { error: err instanceof Error ? err.message : 'Failed' };
    }
}
