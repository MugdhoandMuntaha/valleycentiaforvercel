import { NextRequest, NextResponse } from 'next/server';
import { getAdminUsers, suspendUser, reactivateUser } from '@/lib/db/adminQueries';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
    try {
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`admin_users_${clientIp}`, 60, 60000);
        if (!rateCheck.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { searchParams } = new URL(req.url);
        const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
        const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 10;
        const search = searchParams.get('search') || undefined;
        const status = (searchParams.get('status') as 'all' | 'active' | 'suspended') || undefined;
        const dateFrom = searchParams.get('dateFrom') || undefined;
        const dateTo = searchParams.get('dateTo') || undefined;
        const hasOrders = (searchParams.get('hasOrders') as 'all' | 'yes' | 'no') || undefined;
        const sortBy = (searchParams.get('sortBy') as 'name' | 'registered' | 'last_login' | 'spend' | 'orders') || undefined;
        const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined;

        const result = await getAdminUsers({
            page,
            limit,
            search,
            status,
            dateFrom,
            dateTo,
            hasOrders,
            sortBy,
            sortOrder,
        });

        return NextResponse.json({ success: true, ...result });
    } catch (err: unknown) {
        const error = err as Error;
        const msg = error.message || 'Failed';
        if (msg.includes('401') || msg.includes('Authentication required')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (msg.includes('403') || msg.includes('Forbidden') || msg.includes('privileges required')) {
            return NextResponse.json({ error: 'Forbidden: Administrative privileges required' }, { status: 403 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { action, userId, reason, note } = body;

        if (!userId) {
            return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
        }

        if (action === 'suspend') {
            const res = await suspendUser(userId, reason || 'Suspended by admin');
            if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
            return NextResponse.json({ success: true });
        } else if (action === 'reactivate') {
            const res = await reactivateUser(userId, note || 'Reactivated by admin');
            if (res.error) return NextResponse.json({ error: res.error }, { status: 400 });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (err: unknown) {
        const error = err as Error;
        const msg = error.message || 'Failed';
        if (msg.includes('401') || msg.includes('Authentication required')) {
            return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
        if (msg.includes('403') || msg.includes('Forbidden')) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}

