import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    return NextResponse.json(
        { error: 'Registration is disabled for the admin panel.' },
        { status: 403 }
    );
}
