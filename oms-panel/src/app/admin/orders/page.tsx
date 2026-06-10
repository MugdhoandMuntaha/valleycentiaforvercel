'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
    ShoppingBag, Search, Eye, Filter, Loader2, ArrowUpDown, Calendar,
    CheckCircle2, AlertCircle, Clock, Truck, ShieldAlert, BadgeCent
} from 'lucide-react';
import { getAdminOrders, getAdminOrderStats, AdminOrder, AdminOrderStats } from '@/lib/db/omsQueries';

export default function AdminOrdersPage() {
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [stats, setStats] = useState<AdminOrderStats>({
        totalRevenue: 0,
        totalOrders: 0,
        pendingOrders: 0,
        deliveredOrders: 0,
    });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState<'date' | 'total'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    useEffect(() => {
        async function loadData() {
            setLoading(true);
            try {
                const [ordersData, statsData] = await Promise.all([
                    getAdminOrders(),
                    getAdminOrderStats(),
                ]);
                setOrders(ordersData);
                setStats(statsData);
            } catch (err) {
                console.error('Error loading order data:', err);
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Filter and search logic
    const filteredOrders = orders.filter(order => {
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        
        const searchLower = searchTerm.toLowerCase().trim();
        if (!searchLower) return matchesStatus;

        // Check order number & customer name
        const matchesText = 
            order.order_number.toLowerCase().includes(searchLower) ||
            (order.shipping_name && order.shipping_name.toLowerCase().includes(searchLower));

        // Normalize both target and search numbers for robust matching (ignoring +, spaces, dashes)
        const digitsSearch = searchLower.replace(/\D/g, '');
        const matchesPhone = digitsSearch && order.shipping_phone && 
            order.shipping_phone.replace(/\D/g, '').includes(digitsSearch);

        return matchesStatus && (matchesText || matchesPhone);
    });

    // Sort logic
    const sortedOrders = [...filteredOrders].sort((a, b) => {
        if (sortBy === 'date') {
            const timeA = new Date(a.created_at).getTime();
            const timeB = new Date(b.created_at).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        } else {
            return sortOrder === 'desc' ? b.total - a.total : a.total - b.total;
        }
    });

    const handleSort = (field: 'date' | 'total') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    // Style Helpers
    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'delivered':
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Delivered', icon: CheckCircle2 };
            case 'shipped':
            case 'in_transit':
                return { bg: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', label: 'Shipped', icon: Truck };
            case 'confirmed':
            case 'processing':
                return { bg: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', label: 'Processing', icon: Clock };
            case 'pending':
                return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', label: 'Pending', icon: Clock };
            case 'cancelled':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Cancelled', icon: ShieldAlert };
            default:
                return { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', label: status, icon: AlertCircle };
        }
    };

    const getPaymentStatusStyle = (status: string) => {
        switch (status) {
            case 'paid':
            case 'captured':
                return { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', label: 'Paid' };
            case 'refunded':
                return { bg: 'rgba(168, 85, 247, 0.1)', color: '#a855f7', label: 'Refunded' };
            case 'failed':
                return { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', label: 'Failed' };
            default:
                return { bg: 'rgba(245, 197, 24, 0.1)', color: '#f5c518', label: status };
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={32} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>Order Management</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Monitor order volumes, manage shipments, and update payment statuses</p>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 32,
            }}>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'var(--color-accent-glow)' }}>
                        <ShoppingBag size={20} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{stats.totalOrders}</div>
                        <div style={statLabelStyle}>Total Orders</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(245, 197, 24, 0.1)' }}>
                        <Clock size={20} style={{ color: '#f5c518' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{stats.pendingOrders}</div>
                        <div style={statLabelStyle}>Pending Orders</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(34, 197, 94, 0.1)' }}>
                        <CheckCircle2 size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{stats.deliveredOrders}</div>
                        <div style={statLabelStyle}>Delivered Orders</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(168, 85, 247, 0.1)' }}>
                        <BadgeCent size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>৳{stats.totalRevenue.toLocaleString()}</div>
                        <div style={statLabelStyle}>Total Net Sales</div>
                    </div>
                </div>
            </div>

            {/* Filters and Search Bar */}
            <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Search and Sort controls */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                            <Search size={18} style={{
                                position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                                color: 'var(--color-text-muted)'
                            }} />
                            <input
                                type="text"
                                placeholder="Search by Order #, Customer Name, or Mobile..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    width: '100%', padding: '10px 14px 10px 42px',
                                    background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)',
                                    borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)',
                                    fontSize: 13, outline: 'none', boxSizing: 'border-box'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => handleSort('date')} style={{ ...sortButtonStyle, border: sortBy === 'date' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}>
                                <Calendar size={14} /> Date
                                <ArrowUpDown size={12} style={{ opacity: sortBy === 'date' ? 1 : 0.4 }} />
                            </button>
                            <button onClick={() => handleSort('total')} style={{ ...sortButtonStyle, border: sortBy === 'total' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}>
                                <BadgeCent size={14} /> Total
                                <ArrowUpDown size={12} style={{ opacity: sortBy === 'total' ? 1 : 0.4 }} />
                            </button>
                        </div>
                    </div>

                    {/* Status Tabs */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderBottom: '1px solid var(--color-border)', paddingBottom: 10 }}>
                        {['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => {
                            const isActive = statusFilter === status;
                            return (
                                <button
                                    key={status}
                                    onClick={() => setStatusFilter(status)}
                                    style={{
                                        padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none',
                                        background: isActive ? 'var(--color-accent-glow)' : 'transparent',
                                        color: isActive ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                                        fontSize: 13, fontWeight: isActive ? 600 : 500, cursor: 'pointer',
                                        textTransform: 'capitalize', transition: 'all var(--transition-fast)'
                                    }}
                                >
                                    {status}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-tertiary)' }}>
                                <th style={thStyle}>Order Number</th>
                                <th style={thStyle}>Date & Time</th>
                                <th style={thStyle}>Customer</th>
                                <th style={thStyle}>Total Amount</th>
                                <th style={thStyle}>Payment Status</th>
                                <th style={thStyle}>Order Status</th>
                                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedOrders.length > 0 ? (
                                sortedOrders.map((order, idx) => {
                                    const oStatus = getStatusStyle(order.status);
                                    const pStatus = getPaymentStatusStyle(order.payment_status);
                                    const StatusIcon = oStatus.icon;

                                    const orderDate = new Date(order.created_at);
                                    const currentDateStr = orderDate.toLocaleDateString('en-US', { 
                                        weekday: 'long', 
                                        month: 'long', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                    });

                                    const prevOrder = idx > 0 ? sortedOrders[idx - 1] : null;
                                    const prevOrderDateStr = prevOrder 
                                        ? new Date(prevOrder.created_at).toLocaleDateString('en-US', { 
                                            weekday: 'long', 
                                            month: 'long', 
                                            day: 'numeric', 
                                            year: 'numeric' 
                                          })
                                        : '';

                                    const showSeparator = sortBy === 'date' && currentDateStr !== prevOrderDateStr;

                                    return (
                                        <React.Fragment key={order.id}>
                                            {showSeparator && (
                                                <tr key={`date-sep-${order.id}`}>
                                                    <td colSpan={7} style={{
                                                        background: 'rgba(255, 255, 255, 0.015)',
                                                        borderBottom: '1px solid var(--color-border)',
                                                        borderTop: idx > 0 ? '1px solid var(--color-border)' : 'none',
                                                        padding: '12px 20px',
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                            <Calendar size={13} style={{ color: 'var(--color-accent)' }} />
                                                            <span style={{ 
                                                                fontSize: 11, 
                                                                fontWeight: 700, 
                                                                color: 'var(--color-text-secondary)', 
                                                                textTransform: 'uppercase', 
                                                                letterSpacing: '1px',
                                                                fontFamily: "'Outfit', sans-serif"
                                                            }}>
                                                                {currentDateStr}
                                                            </span>
                                                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                            <tr className="order-row" style={{
                                                borderBottom: '1px solid var(--color-border)',
                                                transition: 'background var(--transition-fast)'
                                            }}>
                                                <td style={tdStyle}>
                                                    <Link href={`/admin/orders/${order.id}`} style={{
                                                        color: 'var(--color-accent)', fontWeight: 700,
                                                        textDecoration: 'none', fontFamily: "'Outfit', sans-serif"
                                                    }}>
                                                        #{order.order_number}
                                                    </Link>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 13, color: 'var(--color-text-primary)' }}>
                                                            {new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                            {new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                            {order.shipping_name || 'Anonymous'}
                                                        </span>
                                                        <span style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                            {order.shipping_phone || 'N/A'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                        ৳{order.total.toLocaleString()}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        display: 'inline-flex', padding: '5px 12px', borderRadius: '9999px',
                                                        fontSize: 11, fontWeight: 600, background: pStatus.bg, color: pStatus.color
                                                    }}>
                                                        {pStatus.label}
                                                    </span>
                                                </td>
                                                <td style={tdStyle}>
                                                    <span style={{
                                                        display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
                                                        borderRadius: '9999px', fontSize: 11, fontWeight: 600, background: oStatus.bg, color: oStatus.color
                                                    }}>
                                                        <StatusIcon size={12} />
                                                        {oStatus.label}
                                                    </span>
                                                </td>
                                                <td style={{ ...tdStyle, textAlign: 'right' }}>
                                                    <Link href={`/admin/orders/${order.id}`} style={actionButtonStyle}>
                                                        <Eye size={13} /> Details
                                                    </Link>
                                                </td>
                                            </tr>
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                                        No orders found matching your search or filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .order-row:hover {
                    background: var(--color-bg-tertiary);
                }
            `}</style>
        </div>
    );
}

// Inline Styles
const statCardStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
};

const iconWrapperStyle: React.CSSProperties = {
    width: 48,
    height: 48,
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
};

const statValStyle: React.CSSProperties = {
    fontSize: 26,
    fontWeight: 800,
    fontFamily: "'Outfit', sans-serif",
    lineHeight: 1,
    color: 'var(--color-text-primary)',
};

const statLabelStyle: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginTop: 4,
};

const sortButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'var(--color-bg-tertiary)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
};

const thStyle: React.CSSProperties = {
    padding: '14px 20px',
    fontSize: 12,
    fontWeight: 700,
    color: 'var(--color-text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
};

const tdStyle: React.CSSProperties = {
    padding: '16px 20px',
    verticalAlign: 'middle',
};

const actionButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 12px',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 600,
    textDecoration: 'none',
    cursor: 'pointer',
};
