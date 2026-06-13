'use client';

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useUser, useClerk, useAuth as useClerkAuth } from '@clerk/nextjs';

/* ===== Types ===== */
export type UserRole = 'customer' | 'admin';

export interface UserProfile {
    full_name: string | null;
    display_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    date_of_birth: string | null;
    gender: string | null;
    role: UserRole;
}

// Session user type — maintained for backward compatibility
interface SessionUser {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    role: UserRole;
    fullName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    createdAt: string | null;
}

interface AuthContextType {
    user: SessionUser | null;
    role: UserRole;
    profile: UserProfile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: { message: string } | null }>;
    signUp: (email: string, password: string, name: string) => Promise<{ error: { message: string } | null }>;
    signInWithGoogle: () => Promise<{ error: { message: string } | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Omit<UserProfile, 'role'>>) => Promise<{ error: string | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/* ===== Provider ===== */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const { user: clerkUser, isLoaded } = useUser();
    const { signOut: clerkSignOut, openSignIn, openSignUp } = useClerk();
    const { userId } = useClerkAuth();
    const [profileOverrides, setProfileOverrides] = useState<Partial<UserProfile>>({});

    const loading = !isLoaded;

    const user: SessionUser | null = useMemo(() => {
        if (!clerkUser || !userId) return null;

        const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
        const fullName = clerkUser.fullName || null;
        const displayName = clerkUser.firstName || clerkUser.username || primaryEmail.split('@')[0] || null;
        const avatarUrl = clerkUser.imageUrl || null;

        // Check for admin role in public metadata
        const role = ((clerkUser.publicMetadata?.role as string) || 'customer') as UserRole;

        return {
            id: userId,
            email: primaryEmail,
            name: fullName || displayName,
            image: avatarUrl,
            role,
            fullName,
            displayName,
            avatarUrl,
            createdAt: clerkUser.createdAt ? new Date(clerkUser.createdAt).toISOString() : null,
        };
    }, [clerkUser, userId]);

    const role: UserRole = user?.role || 'customer';

    const profile: UserProfile | null = useMemo(() => {
        if (!user) return null;
        return {
            full_name: profileOverrides.full_name ?? user.fullName,
            display_name: profileOverrides.display_name ?? user.displayName,
            phone: profileOverrides.phone ?? null,
            avatar_url: profileOverrides.avatar_url ?? user.avatarUrl,
            date_of_birth: profileOverrides.date_of_birth ?? null,
            gender: profileOverrides.gender ?? null,
            role: user.role,
        };
    }, [user, profileOverrides]);

    // Clerk manages sign-in/sign-up via its own UI.
    // These methods open the Clerk modal or redirect to Clerk's sign-in page.
    const signIn = useCallback(async (_email: string, _password: string) => {
        try {
            openSignIn();
            return { error: null };
        } catch (err) {
            return { error: { message: err instanceof Error ? err.message : 'Sign in failed' } };
        }
    }, [openSignIn]);

    const signUp = useCallback(async (_email: string, _password: string, _name: string) => {
        try {
            openSignUp();
            return { error: null };
        } catch (err) {
            return { error: { message: err instanceof Error ? err.message : 'Sign up failed' } };
        }
    }, [openSignUp]);

    const signInWithGoogle = useCallback(async () => {
        try {
            openSignIn();
            return { error: null };
        } catch (err) {
            return { error: { message: err instanceof Error ? err.message : 'Google sign in failed' } };
        }
    }, [openSignIn]);

    const signOutFn = useCallback(async () => {
        setProfileOverrides({});
        await clerkSignOut({ redirectUrl: '/' });
    }, [clerkSignOut]);

    const updateProfile = useCallback(async (updates: Partial<Omit<UserProfile, 'role'>>) => {
        if (!user) return { error: 'Not authenticated' };

        try {
            const res = await fetch('/api/auth/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates),
            });

            const data = await res.json();

            if (!res.ok) {
                return { error: data.error || 'Failed to update profile' };
            }

            // Update local state
            setProfileOverrides(prev => ({ ...prev, ...updates }));

            return { error: null };
        } catch (err) {
            return { error: err instanceof Error ? err.message : 'Failed to update profile' };
        }
    }, [user]);

    const refreshProfile = useCallback(async () => {
        // Clerk automatically handles user data refresh
        if (clerkUser) {
            await clerkUser.reload();
        }
    }, [clerkUser]);

    return (
        <AuthContext.Provider value={{
            user, role, profile, loading,
            signIn, signUp, signInWithGoogle, signOut: signOutFn,
            updateProfile, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

/* ===== Hook ===== */
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
