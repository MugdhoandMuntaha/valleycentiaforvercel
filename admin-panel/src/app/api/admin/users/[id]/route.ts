import { NextRequest, NextResponse } from 'next/server';
import { getUserProfileDetails, anonymizeCustomer, exportCustomerData } from '@/lib/db/adminQueries';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const clientIp = getClientIp(req);
        const rateCheck = checkRateLimit(`admin_user_detail_${clientIp}`, 100, 60000);
        if (!rateCheck.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const { id } = await context.params;
        const { searchParams } = new URL(req.url);

        if (searchParams.get('export') === 'true') {
            const exp = await exportCustomerData(id, false);
            if (exp.error) return NextResponse.json({ error: exp.error }, { status: 400 });
            return new NextResponse(exp.data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Disposition': `attachment; filename="customer_${id}_export.json"`,
                },
            });
        }

        const details = await getUserProfileDetails(id);
        return NextResponse.json({ success: true, ...details });
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

export async function DELETE(
    _req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const res = await anonymizeCustomer(id);
        if (res.error) {
            return NextResponse.json({ error: res.error }, { status: 400 });
        }
        return NextResponse.json({ success: true, message: 'Customer successfully anonymized' });
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

