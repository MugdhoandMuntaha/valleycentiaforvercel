import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import connectToDatabase from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function PATCH(req: NextRequest) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const updates = await req.json();

        await connectToDatabase();

        // Find or create user by Clerk userId
        let user = await User.findOne({ clerkId: userId });
        if (!user) {
            // Fallback: try finding by _id for legacy users, or create new
            user = await User.findById(userId).catch(() => null);
            if (!user) {
                // Create a new profile document linked to the Clerk user
                user = await User.create({
                    clerkId: userId,
                    role: 'customer',
                });
            }
        }

        // Apply profile updates
        if (updates.full_name !== undefined) user.fullName = updates.full_name;
        if (updates.display_name !== undefined) user.displayName = updates.display_name;
        if (updates.phone !== undefined) user.phone = updates.phone;
        if (updates.avatar_url !== undefined) user.avatarUrl = updates.avatar_url;
        if (updates.date_of_birth !== undefined) user.dateOfBirth = updates.date_of_birth;
        if (updates.gender !== undefined) user.gender = updates.gender;

        await user.save();

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Profile update error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        await connectToDatabase();
        let user = await User.findOne({ clerkId: userId }).lean();
        if (!user) {
            user = await User.findById(userId).lean().catch(() => null);
        }

        if (!user) {
            return NextResponse.json({
                profile: {
                    full_name: null,
                    display_name: null,
                    phone: null,
                    avatar_url: null,
                    date_of_birth: null,
                    gender: null,
                    role: 'customer',
                },
            });
        }

        return NextResponse.json({
            profile: {
                full_name: user.fullName,
                display_name: user.displayName,
                phone: user.phone,
                avatar_url: user.avatarUrl,
                date_of_birth: user.dateOfBirth,
                gender: user.gender,
                role: user.role,
            },
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
