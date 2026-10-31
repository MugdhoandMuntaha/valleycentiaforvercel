/**
 * Role-Based Access Control (RBAC) Utilities
 * Protects administrative interfaces, OMS actions, and management APIs.
 */

export interface AdminAuthCheckParams {
    userId?: string | null;
    email?: string | null;
    role?: string | null;
}

export type AdminPermission = 'view_customers' | 'suspend_users' | 'export_data' | 'anonymize_users';

export function isUserAdmin(params: AdminAuthCheckParams): boolean {
    const { userId, email, role } = params;

    // 1. Direct role check
    if (role === 'admin' || role === 'superadmin') {
        return true;
    }

    // 2. Email-based allowlist
    const adminEmails = (process.env.ADMIN_EMAILS || '')
        .split(',')
        .map(e => e.trim().toLowerCase())
        .filter(Boolean);

    if (email && adminEmails.includes(email.toLowerCase())) {
        return true;
    }

    // 3. User ID allowlist
    const adminUserIds = (process.env.ADMIN_USER_IDS || '')
        .split(',')
        .map(id => id.trim())
        .filter(Boolean);

    if (userId && adminUserIds.includes(userId)) {
        return true;
    }

    return false;
}

export function hasAdminPermission(
    params: AdminAuthCheckParams & { permissions?: string[] },
    permission: AdminPermission
): boolean {
    if (!isUserAdmin(params)) {
        return false;
    }

    // Superadmins hold all permissions unconditionally
    if (params.role === 'superadmin') {
        return true;
    }

    // If explicit permissions list is assigned to the admin user
    if (params.permissions && params.permissions.length > 0) {
        return params.permissions.includes(permission);
    }

    // Standard admins have core permissions enabled by default
    return true;
}
