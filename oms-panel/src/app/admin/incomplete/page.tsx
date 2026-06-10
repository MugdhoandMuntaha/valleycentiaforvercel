'use client';

import React, { useEffect, useState } from 'react';
import { 
    ShoppingCart, Search, Loader2, ArrowUpDown, Calendar,
    User, Mail, Phone, ShoppingBag, ChevronDown, ChevronUp,
    RefreshCw, Clock, BadgeCent
} from 'lucide-react';
import { getIncompleteCarts, IncompleteCart } from '@/lib/db/omsQueries';

export default function IncompleteCartsPage() {
    const [carts, setCarts] = useState<IncompleteCart[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCartId, setExpandedCartId] = useState<string | null>(null);
    const [sortBy, setSortBy] = useState<'date' | 'value'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getIncompleteCarts();
            setCarts(data);
        } catch (err) {
            console.error('Error loading incomplete carts data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Filter logic
    const filteredCarts = carts.filter(cart => {
        const query = searchTerm.toLowerCase();
        return (
            cart.user_name.toLowerCase().includes(query) ||
            cart.user_email.toLowerCase().includes(query) ||
            (cart.user_phone && cart.user_phone.includes(searchTerm))
        );
    });

    // Sort logic
    const sortedCarts = [...filteredCarts].sort((a, b) => {
        if (sortBy === 'date') {
            const timeA = new Date(a.updated_at).getTime();
            const timeB = new Date(b.updated_at).getTime();
            return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
        } else {
            return sortOrder === 'desc' ? b.total_value - a.total_value : a.total_value - b.total_value;
        }
    });

    const handleSort = (field: 'date' | 'value') => {
        if (sortBy === field) {
            setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
        } else {
            setSortBy(field);
            setSortOrder('desc');
        }
    };

    const toggleExpand = (userId: string) => {
        setExpandedCartId(prev => prev === userId ? null : userId);
    };

    const getRelativeTime = (isoString: string) => {
        const diff = Date.now() - new Date(isoString).getTime();
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        const days = Math.floor(hours / 24);

        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    // Calculate aggregated statistics
    const totalPotentialValue = carts.reduce((sum, c) => sum + c.total_value, 0);
    const totalPotentialItems = carts.reduce((sum, c) => sum + c.total_items, 0);
    const totalAbandoners = carts.length;

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
                    <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>Incomplete Carts</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Track items added to cart by logged-in customers who haven't ordered yet</p>
                </div>
                <button onClick={loadData} style={refreshButtonStyle}>
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats Block */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 32,
            }}>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(245, 197, 24, 0.1)' }}>
                        <ShoppingCart size={20} style={{ color: '#f5c518' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{totalAbandoners}</div>
                        <div style={statLabelStyle}>Active Cart Users</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(59, 130, 246, 0.1)' }}>
                        <ShoppingBag size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{totalPotentialItems}</div>
                        <div style={statLabelStyle}>Total Items Pending</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(168, 85, 247, 0.1)' }}>
                        <BadgeCent size={20} style={{ color: '#a855f7' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>৳{totalPotentialValue.toLocaleString()}</div>
                        <div style={statLabelStyle}>Potential Cart Value</div>
                    </div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div style={{
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '20px 24px',
                marginBottom: 24,
            }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
                        <Search size={18} style={{
                            position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--color-text-muted)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search by User Name, Email or Phone..."
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
                            <Calendar size={14} /> Last Activity
                            <ArrowUpDown size={12} style={{ opacity: sortBy === 'date' ? 1 : 0.4 }} />
                        </button>
                        <button onClick={() => handleSort('value')} style={{ ...sortButtonStyle, border: sortBy === 'value' ? '1px solid var(--color-accent)' : '1px solid var(--color-border)' }}>
                            <BadgeCent size={14} /> Total Value
                            <ArrowUpDown size={12} style={{ opacity: sortBy === 'value' ? 1 : 0.4 }} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Carts Table/List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {sortedCarts.length > 0 ? (
                    sortedCarts.map(cart => {
                        const isExpanded = expandedCartId === cart.user_id;
                        return (
                            <div key={cart.user_id} style={{
                                background: 'var(--color-bg-secondary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                overflow: 'hidden',
                                transition: 'all var(--transition-fast)'
                            }}>
                                {/* Cart summary bar */}
                                <div 
                                    onClick={() => toggleExpand(cart.user_id)}
                                    style={{
                                        padding: '18px 24px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        cursor: 'pointer',
                                        flexWrap: 'wrap',
                                        gap: 16,
                                        userSelect: 'none'
                                    }}
                                    className="cart-summary-row"
                                >
                                    {/* User details */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 240, flex: 2 }}>
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: 'var(--color-bg-tertiary)', border: '1.5px solid var(--color-border)',
                                            overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            {cart.user_avatar ? (
                                                <img src={cart.user_avatar} alt={cart.user_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            ) : (
                                                <User size={18} style={{ color: 'var(--color-text-muted)' }} />
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                {cart.user_name}
                                            </span>
                                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                                <Mail size={12} /> {cart.user_email}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Phone number */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 140, flexShrink: 0 }}>
                                        {cart.user_phone ? (
                                            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                <Phone size={12} /> {cart.user_phone}
                                            </span>
                                        ) : (
                                            <span style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No Phone</span>
                                        )}
                                    </div>

                                    {/* Activity relative time */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 120, flexShrink: 0 }}>
                                        <Clock size={13} style={{ color: 'var(--color-text-muted)' }} />
                                        <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                            {getRelativeTime(cart.updated_at)}
                                        </span>
                                    </div>

                                    {/* Cart Totals */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, width: 160, flexShrink: 0, justifyContent: 'flex-end' }}>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-accent)' }}>
                                                ৳{cart.total_value.toLocaleString()}
                                            </div>
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                {cart.total_items} {cart.total_items === 1 ? 'item' : 'items'}
                                            </div>
                                        </div>
                                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                    </div>
                                </div>

                                {/* Expanded item list */}
                                {isExpanded && (
                                    <div style={{
                                        borderTop: '1px solid var(--color-border)',
                                        background: 'var(--color-bg-tertiary)',
                                        padding: '20px 24px'
                                    }}>
                                        <h4 style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Items in Customer Cart</h4>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8 }}>
                                                    <th style={itemThStyle}>Product</th>
                                                    <th style={itemThStyle}>Selected Size</th>
                                                    <th style={{ ...itemThStyle, textAlign: 'center' }}>Quantity</th>
                                                    <th style={{ ...itemThStyle, textAlign: 'right' }}>Unit Price</th>
                                                    <th style={{ ...itemThStyle, textAlign: 'right' }}>Total Price</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {cart.items.map(item => (
                                                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                                        <td style={itemTdStyle}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                                <div style={{
                                                                    width: 40, height: 40, background: 'var(--color-bg-secondary)',
                                                                    border: '1px solid var(--color-border)', borderRadius: 4,
                                                                    overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                                                }}>
                                                                    <img src={item.product_image || '/no-image.svg'} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                                </div>
                                                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                                    {item.product_name}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td style={itemTdStyle}>
                                                            {item.size_label ? (
                                                                <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--color-bg-secondary)', padding: '2px 8px', borderRadius: 4, color: 'var(--color-text-secondary)' }}>
                                                                    {item.size_label}
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Default</span>
                                                            )}
                                                        </td>
                                                        <td style={{ ...itemTdStyle, textAlign: 'center' }}>
                                                            {item.quantity}
                                                        </td>
                                                        <td style={{ ...itemTdStyle, textAlign: 'right', fontWeight: 600 }}>
                                                            ৳{item.unit_price.toLocaleString()}
                                                        </td>
                                                        <td style={{ ...itemTdStyle, textAlign: 'right', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                            ৳{item.total_price.toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })
                ) : (
                    <div style={{
                        background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)',
                        padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 14
                    }}>
                        No incomplete carts found matching your filters.
                    </div>
                )}
            </div>

            <style>{`
                .cart-summary-row:hover {
                    background: var(--color-bg-tertiary) !important;
                }
            `}</style>
        </div>
    );
}

// Styling components
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

const refreshButtonStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 14px',
    background: 'var(--gradient-accent)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    color: '#0a0a0b',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
};

const itemThStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    padding: '8px 0',
    letterSpacing: 0.5
};

const itemTdStyle: React.CSSProperties = {
    padding: '12px 0',
    verticalAlign: 'middle',
    fontSize: 13,
    color: 'var(--color-text-secondary)'
};
