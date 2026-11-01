import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';
import { normalizePhoneNumber } from '@/lib/phone';

export async function POST(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        let body: {
            email?: string;
            fullName?: string;
            displayName?: string;
            avatarUrl?: string;
            phone?: string;
        } = {};

        try {
            body = await req.json();
        } catch {
            // body is optional if user data comes from currentUser()
        }

        let email = body.email;
        let fullName = body.fullName;
        let displayName = body.displayName;
        let avatarUrl = body.avatarUrl;
        let phone = body.phone;

        // Optionally augment from Clerk's currentUser
        try {
            const clerkUser = await currentUser();
            if (clerkUser) {
                if (!email) {
                    email = clerkUser.primaryEmailAddress?.emailAddress || clerkUser.emailAddresses?.[0]?.emailAddress;
                }
                if (!fullName) {
                    fullName = clerkUser.fullName || `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || undefined;
                }
                if (!displayName) {
                    displayName = clerkUser.firstName || clerkUser.username || (email ? email.split('@')[0] : undefined);
                }
                if (!avatarUrl) {
                    avatarUrl = clerkUser.imageUrl;
                }
                if (!phone && clerkUser.primaryPhoneNumber?.phoneNumber) {
                    phone = clerkUser.primaryPhoneNumber.phoneNumber;
                }
            }
        } catch (clerkErr) {
            console.warn('Could not fetch Clerk currentUser:', clerkErr);
        }

        await connectToDatabase();

        const normalizedPhone = phone ? normalizePhoneNumber(phone) || phone : undefined;

        const updateData: Record<string, unknown> = {
            clerkId: userId,
            role: 'customer',
            lastLoginAt: new Date(),
            updatedAt: new Date(),
        };

        if (email) updateData.email = email;
        if (fullName) updateData.fullName = fullName;
        if (displayName) updateData.displayName = displayName;
        if (avatarUrl) updateData.avatarUrl = avatarUrl;
        if (normalizedPhone) updateData.phone = normalizedPhone;

        const user = await User.findOneAndUpdate(
            { $or: [{ clerkId: userId }, ...(email ? [{ email }] : [])] },
            {
                $set: updateData,
                $setOnInsert: {
                    status: 'active',
                    isEmailVerified: Boolean(email),
                    isPhoneVerified: Boolean(normalizedPhone),
                    statusHistory: [{
                        status: 'active',
                        note: 'Automatic account sync on login/registration',
                        changedBy: 'system',
                        createdAt: new Date(),
                    }],
                    isAnonymized: false,
                    permissions: [],
                    createdAt: new Date(),
                },
            },
            { upsert: true, new: true }
        );

        return NextResponse.json({
            success: true,
            user: {
                id: String(user._id),
                clerkId: user.clerkId,
                email: user.email,
                fullName: user.fullName,
                phone: user.phone,
                role: user.role,
                status: user.status,
            },
        });
    } catch (err: unknown) {
        console.error('Clerk user sync error:', err);
        return NextResponse.json({ error: (err as Error).message || 'Internal server error' }, { status: 500 });
    }
}

