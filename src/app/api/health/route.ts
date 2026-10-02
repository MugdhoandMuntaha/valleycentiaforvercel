import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectToDatabase from '@/lib/mongodb';

/**
 * Health Check Probe: GET /api/health
 * 
 * Verifies application and database readiness for load balancers,
 * uptime monitors (e.g. UptimeRobot, BetterStack), and container orchestrators.
 */
export async function GET() {
    const startTime = Date.now();

    try {
        await connectToDatabase();

        // Check MongoDB connection state (1 = connected)
        const isDbConnected = mongoose.connection.readyState === 1;
        const dbLatencyMs = Date.now() - startTime;

        if (!isDbConnected) {
            return NextResponse.json(
                {
                    status: 'unhealthy',
                    timestamp: new Date().toISOString(),
                    error: 'Database connection not ready',
                    db: {
                        connected: false,
                        readyState: mongoose.connection.readyState,
                    },
                },
                { status: 503 }
            );
        }

        const memory = process.memoryUsage();

        return NextResponse.json(
            {
                status: 'healthy',
                timestamp: new Date().toISOString(),
                uptime: Math.floor(process.uptime()),
                db: {
                    connected: true,
                    latencyMs: dbLatencyMs,
                },
                memory: {
                    rssMb: Math.round(memory.rss / 1024 / 1024),
                    heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
                    heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024),
                },
                version: process.env.npm_package_version || '1.0.0',
            },
            {
                headers: {
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                },
            }
        );
    } catch (err) {
        return NextResponse.json(
            {
                status: 'unhealthy',
                timestamp: new Date().toISOString(),
                error: err instanceof Error ? err.message : 'Health check failed',
            },
            { status: 503 }
        );
    }
}
