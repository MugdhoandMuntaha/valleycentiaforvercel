'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, BadgeCent, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import { getAdminOrderStats, AdminOrderStats } from '@/lib/db/omsQueries';

export default function OmsDashboard() {
    const [stats, setStats] = useState<AdminOrderStats>({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const orderStats = await getAdminOrderStats();
                setStats(orderStats);
            } catch (err) {
                console.error('Error loading dashboard stats:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const statCards = [
        {
            label: 'Total Net Sales',
            value: `৳${stats.totalRevenue.toLocaleString()}`,
            icon: BadgeCent,
            color: '#a855f7',
            bg: 'rgba(168, 85, 247, 0.1)',
        },
        {
            label: 'Total Orders Placed',
            value: stats.totalOrders,
            icon: ShoppingBag,
            color: 'var(--color-accent)',
            bg: 'var(--color-accent-glow)',
        },
        {
            label: 'Pending Shipments',
            value: stats.pendingOrders,
            icon: Clock,
            color: '#f5c518',
            bg: 'rgba(245, 197, 24, 0.1)',
        },
        {
            label: 'Delivered Packages',
            value: stats.deliveredOrders,
            icon: CheckCircle2,
            color: '#22c55e',
            bg: 'rgba(34, 197, 94, 0.1)',
        },
    ];

    return (
        <div>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 32,
            }}>
                <div>
                    <h1 style={{
                        fontSize: 28,
                        fontWeight: 800,
                        fontFamily: "'Outfit', sans-serif",
                        marginBottom: 4,
                    }}>
                        OMS Dashboard
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
                        Secure Order Fulfillment and Dispatch Control Center
                    </p>
                </div>
            </div>

            {/* Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 40,
            }}>
                {statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                        <div
                            key={stat.label}
                            style={{
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                padding: 24,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 16,
                            }}
                        >
                            <div style={{
                                width: 48,
                                height: 48,
                                borderRadius: 'var(--radius-md)',
                                background: stat.bg,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Icon size={22} style={{ color: stat.color }} />
                            </div>
                            <div>
                                <div style={{
                                    fontSize: 28,
                                    fontWeight: 800,
                                    fontFamily: "'Outfit', sans-serif",
                                    lineHeight: 1,
                                    color: 'var(--color-text-primary)',
                                }}>
                                    {loading ? '—' : stat.value}
                                </div>
                                <div style={{
                                    fontSize: 13,
                                    color: 'var(--color-text-muted)',
                                    marginTop: 6,
                                    fontWeight: 500,
                                }}>
                                    {stat.label}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <h2 style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "'Outfit', sans-serif",
                marginBottom: 16,
            }}>
                Quick Actions
            </h2>
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: 16,
            }}>
                <Link
                    href="/admin/orders"
                    style={{
                        background: 'var(--color-bg-secondary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-lg)',
                        padding: 24,
                        textDecoration: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'border-color var(--transition-fast)',
                    }}
                >
                    <ShoppingBag size={24} style={{ color: 'var(--color-accent)' }} />
                    <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        Fulfill Orders <ArrowRight size={14} />
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Inspect line items, generate tracking codes, and process customer shipments.
                    </span>
                </Link>
            </div>
        </div>
    );
}
