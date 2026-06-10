'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, Loader2, CheckCircle2, AlertCircle, Clock, Truck, ShieldAlert,
    User, Calendar, CreditCard, MapPin, Tag, Edit3, Send, Check, AlertTriangle, Printer
} from 'lucide-react';
import {
    getAdminOrderById, updateOrderStatus, updateOrderPaymentStatus,
    updateOrderTracking, AdminOrderDetail
} from '@/lib/db/omsQueries';

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [order, setOrder] = useState<AdminOrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updatingPayment, setUpdatingPayment] = useState(false);
    const [updatingTracking, setUpdatingTracking] = useState(false);

    // Form states
    const [status, setStatus] = useState('');
    const [statusNote, setStatusNote] = useState('');
    const [paymentStatus, setPaymentStatus] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [estimatedDelivery, setEstimatedDelivery] = useState('');

    const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

    useEffect(() => {
        loadOrder();
    }, [id]);

    async function loadOrder() {
        setLoading(true);
        try {
            const data = await getAdminOrderById(id);
            if (data) {
                setOrder(data);
                setStatus(data.status);
                setPaymentStatus(data.payment_status);
                setTrackingNumber(data.tracking_number || '');
                setTrackingUrl(data.tracking_url || '');
                setEstimatedDelivery(data.estimated_delivery ? data.estimated_delivery.split('T')[0] : '');
            }
        } catch (err) {
            console.error('Error fetching order detail:', err);
        } finally {
            setLoading(false);
        }
    }

    const showFlash = (type: 'ok' | 'err', text: string) => {
        setMsg({ type, text });
        setTimeout(() => setMsg(null), 4000);
    };

    const handleStatusUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingStatus(true);
        try {
            const res = await updateOrderStatus(id, status, statusNote);
            if (res.error) {
                showFlash('err', res.error);
            } else {
                showFlash('ok', 'Order status updated successfully!');
                setStatusNote('');
                loadOrder();
            }
        } catch (err) {
            showFlash('err', 'Failed to update order status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handlePaymentUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingPayment(true);
        try {
            const res = await updateOrderPaymentStatus(id, paymentStatus);
            if (res.error) {
                showFlash('err', res.error);
            } else {
                showFlash('ok', 'Payment status updated successfully!');
                loadOrder();
            }
        } catch (err) {
            showFlash('err', 'Failed to update payment status');
        } finally {
            setUpdatingPayment(false);
        }
    };

    const handleTrackingUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingTracking(true);
        try {
            const res = await updateOrderTracking(id, {
                trackingNumber,
                trackingUrl,
                estimatedDelivery
            });
            if (res.error) {
                showFlash('err', res.error);
            } else {
                showFlash('ok', 'Tracking details updated successfully!');
                loadOrder();
            }
        } catch (err) {
            showFlash('err', 'Failed to update tracking details');
        } finally {
            setUpdatingTracking(false);
        }
    };

    // Styling helpers
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

    if (!order) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <AlertCircle size={40} style={{ color: 'var(--color-error)', marginBottom: 16 }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 8 }}>Order Not Found</h2>
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>The order you are searching for does not exist in the database.</p>
                <Link href="/admin/orders" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    &larr; Back to Orders
                </Link>
            </div>
        );
    }

    const oStatus = getStatusStyle(order.status);
    const pStatus = getPaymentStatusStyle(order.payment_status);
    const StatusIcon = oStatus.icon;

    return (
        <div style={{ paddingBottom: 80 }}>
            {/* Back to list */}
            <Link href="/admin/orders" style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                color: 'var(--color-text-secondary)', textDecoration: 'none',
                fontSize: 13, fontWeight: 600, marginBottom: 20, transition: 'color var(--transition-fast)'
            }}>
                <ArrowLeft size={14} /> Back to Orders
            </Link>

            {/* Flash Messages */}
            {msg && (
                <div style={{
                    padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 13, fontWeight: 500,
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: msg.type === 'ok' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: msg.type === 'ok' ? '#22c55e' : '#ef4444',
                    border: `1px solid ${msg.type === 'ok' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                    {msg.type === 'ok' ? <Check size={14} /> : <AlertTriangle size={14} />} {msg.text}
                </div>
            )}

            {/* Title Block */}
            <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 28, borderBottom: '1px solid var(--color-border)',
                paddingBottom: 24
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                        <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>
                            Order #{order.order_number}
                        </h1>
                        <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px',
                            borderRadius: '9999px', fontSize: 12, fontWeight: 600, background: oStatus.bg, color: oStatus.color
                        }}>
                            <StatusIcon size={12} />
                            {oStatus.label}
                        </span>
                        <span style={{
                            display: 'inline-flex', padding: '5px 12px', borderRadius: '9999px',
                            fontSize: 12, fontWeight: 600, background: pStatus.bg, color: pStatus.color
                        }}>
                            {pStatus.label}
                        </span>
                    </div>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>
                        Placed on {new Date(order.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                </div>
                
                <Link
                    href={`/admin/orders/${order.id}/invoice`}
                    target="_blank"
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '10px 18px',
                        background: 'var(--color-bg-secondary)',
                        border: '1.5px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--color-text-primary)',
                        fontSize: 13,
                        fontWeight: 700,
                        textDecoration: 'none',
                        transition: 'all var(--transition-fast)',
                        cursor: 'pointer'
                    }}
                >
                    <Printer size={15} color="var(--color-accent)" />
                    Print/View Invoice
                </Link>
            </div>

            {/* Layout Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
                
                {/* Left Area (Order Items + Shipping details) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Order Items Box */}
                    <div style={panelStyle}>
                        <h3 style={panelTitleStyle}>Order Items ({order.order_items.length})</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {order.order_items.map((item) => (
                                <div key={item.id} style={{
                                    display: 'flex', gap: 16, alignItems: 'center',
                                    borderBottom: '1px solid var(--color-border)', paddingBottom: 16,
                                }}>
                                    {/* Product image preview */}
                                    <div style={{
                                        width: 54, height: 54, background: 'var(--color-bg-tertiary)',
                                        border: '1px solid var(--color-border)', borderRadius: 6,
                                        overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                                    }}>
                                        <img src={item.product_image || '/no-image.svg'} alt={item.product_name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {item.product_name}
                                        </span>
                                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            {item.size_label && (
                                                <span>Size: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.size_label}</strong></span>
                                            )}
                                            <span>Qty: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.quantity}</strong></span>
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                            ৳{item.total_price.toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            ৳{item.unit_price} each
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Totals Summary */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20, background: 'var(--color-bg-tertiary)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                            <div style={summaryRowStyle}>
                                <span>Subtotal</span>
                                <span>৳{order.subtotal.toLocaleString()}</span>
                            </div>
                            {order.discount_amount > 0 && (
                                <div style={{ ...summaryRowStyle, color: '#ef4444' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> Discount ({order.coupon_code || 'Coupon'})</span>
                                    <span>-৳{order.discount_amount.toLocaleString()}</span>
                                </div>
                            )}
                            <div style={summaryRowStyle}>
                                <span>Shipping Fees</span>
                                <span>৳{order.shipping_cost.toLocaleString()}</span>
                            </div>
                            <div style={summaryRowStyle}>
                                <span>Tax</span>
                                <span>৳{order.tax.toLocaleString()}</span>
                            </div>
                            <div style={{ ...summaryRowStyle, borderTop: '1px solid var(--color-border)', paddingTop: 10, fontWeight: 800, fontSize: 16, color: 'var(--color-text-primary)' }}>
                                <span>Total Paid</span>
                                <span style={{ color: 'var(--color-accent)' }}>৳{order.total.toLocaleString()} {order.currency}</span>
                            </div>
                        </div>
                    </div>

                    {/* Delivery & Shipping Info */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                        
                        <div style={panelStyle}>
                            <h3 style={{ ...panelTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}><MapPin size={16} /> Shipping Details</h3>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--color-text-primary)', display: 'block', fontSize: 14, marginBottom: 6 }}>
                                    {order.shipping_name || 'N/A'}
                                </strong>
                                {order.shipping_address_line_1 && <div>{order.shipping_address_line_1}</div>}
                                {order.shipping_address_line_2 && <div>{order.shipping_address_line_2}</div>}
                                <div>{order.shipping_city}, {order.shipping_state || ''} {order.shipping_postal_code || ''}</div>
                                <div>{order.shipping_country}</div>
                                <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                                    <strong>Phone:</strong> {order.shipping_phone || 'N/A'}
                                </div>
                            </div>
                        </div>

                        <div style={panelStyle}>
                            <h3 style={{ ...panelTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={16} /> Billing Details</h3>
                            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
                                <strong style={{ color: 'var(--color-text-primary)', display: 'block', fontSize: 14, marginBottom: 6 }}>
                                    {order.billing_name || 'N/A'}
                                </strong>
                                {order.billing_address_line_1 && <div>{order.billing_address_line_1}</div>}
                                {order.billing_address_line_2 && <div>{order.billing_address_line_2}</div>}
                                <div>{order.billing_city}, {order.billing_state || ''} {order.billing_postal_code || ''}</div>
                                <div>{order.billing_country}</div>
                                <div style={{ marginTop: 10, borderTop: '1px solid var(--color-border)', paddingTop: 10 }}>
                                    <strong>Payment Method:</strong> {order.payment_method?.toUpperCase() || 'N/A'}
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Order Notes / Extra Details */}
                    {(order.notes || order.transaction_id) && (
                        <div style={panelStyle}>
                            <h3 style={panelTitleStyle}>Additional Information</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                                {order.transaction_id && (
                                    <div>
                                        <strong style={{ color: 'var(--color-text-primary)' }}>Transaction/SSL Gateway ID:</strong>{' '}
                                        <code style={{ background: 'var(--color-bg-tertiary)', padding: '2px 6px', borderRadius: 4, color: 'var(--color-accent)' }}>
                                            {order.transaction_id}
                                        </code>
                                    </div>
                                )}
                                {order.notes && (
                                    <div>
                                        <strong style={{ color: 'var(--color-text-primary)', display: 'block', marginBottom: 4 }}>Customer Notes:</strong>
                                        <p style={{ background: 'var(--color-bg-tertiary)', padding: 12, borderRadius: 6, margin: 0, color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                            "{order.notes}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>

                {/* Right Area (Order modifiers / Timeline) */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    
                    {/* Order Status Action Panel */}
                    <div style={panelStyle}>
                        <h3 style={{ ...panelTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}><Edit3 size={15} /> Order Actions</h3>
                        
                        {/* Status Update Form */}
                        <form onSubmit={handleStatusUpdate} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 20, marginBottom: 20 }}>
                            <label style={labelStyle}>Order Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="pending">Pending</option>
                                <option value="confirmed">Confirmed</option>
                                <option value="processing">Processing</option>
                                <option value="shipped">Shipped</option>
                                <option value="in_transit">In Transit</option>
                                <option value="delivered">Delivered</option>
                                <option value="cancelled">Cancelled</option>
                            </select>

                            <label style={{ ...labelStyle, marginTop: 12 }}>Status Update Note</label>
                            <textarea
                                value={statusNote}
                                onChange={(e) => setStatusNote(e.target.value)}
                                placeholder="Add optional log note..."
                                rows={2}
                                style={{ ...inputStyle, resize: 'none' }}
                            />

                            <button type="submit" disabled={updatingStatus || order.status === status} style={submitButtonStyle}>
                                {updatingStatus ? <Loader2 size={13} style={{ animation: 'spin 1s linear' }} /> : <Send size={13} />} Update Status
                            </button>
                        </form>

                        {/* Payment Update Form */}
                        <form onSubmit={handlePaymentUpdate} style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 20, marginBottom: 20 }}>
                            <label style={labelStyle}>Payment Status</label>
                            <select
                                value={paymentStatus}
                                onChange={(e) => setPaymentStatus(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="pending">Pending</option>
                                <option value="captured">Paid</option>
                                <option value="refunded">Refunded</option>
                                <option value="failed">Failed</option>
                            </select>

                            <button type="submit" disabled={updatingPayment || order.payment_status === paymentStatus} style={{ ...submitButtonStyle, background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                                {updatingPayment ? <Loader2 size={13} style={{ animation: 'spin 1s linear' }} /> : <CheckCircle2 size={13} />} Update Payment
                            </button>
                        </form>

                        {/* Tracking details Form */}
                        <form onSubmit={handleTrackingUpdate}>
                            <h4 style={{ fontSize: 13, fontWeight: 700, margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--color-text-secondary)' }}>Delivery / Courier Info</h4>
                            
                            <label style={labelStyle}>Tracking Number</label>
                            <input
                                type="text"
                                value={trackingNumber}
                                onChange={(e) => setTrackingNumber(e.target.value)}
                                placeholder="Courier Tracking Code"
                                style={inputStyle}
                            />

                            <label style={{ ...labelStyle, marginTop: 10 }}>Tracking Portal URL</label>
                            <input
                                type="text"
                                value={trackingUrl}
                                onChange={(e) => setTrackingUrl(e.target.value)}
                                placeholder="e.g. https://steadfast.com/track"
                                style={inputStyle}
                            />

                            <label style={{ ...labelStyle, marginTop: 10 }}>Estimated Delivery Date</label>
                            <input
                                type="date"
                                value={estimatedDelivery}
                                onChange={(e) => setEstimatedDelivery(e.target.value)}
                                style={inputStyle}
                            />

                            <button type="submit" disabled={updatingTracking} style={{ ...submitButtonStyle, background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)' }}>
                                {updatingTracking ? <Loader2 size={13} style={{ animation: 'spin 1s linear' }} /> : <Check size={13} />} Save Tracking
                            </button>
                        </form>
                    </div>

                    {/* Timeline Log */}
                    <div style={panelStyle}>
                        <h3 style={{ ...panelTitleStyle, display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={15} /> Order Timeline</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'relative', paddingLeft: 12 }}>
                            {/* Vertical timeline line */}
                            <div style={{
                                position: 'absolute', left: 4, top: 4, bottom: 4,
                                width: 2, background: 'var(--color-border)', zIndex: 1
                            }} />

                            {order.status_history.map((h, i) => {
                                const isLatest = i === 0;
                                return (
                                    <div key={h.id} style={{ position: 'relative', zIndex: 2 }}>
                                        {/* Dot */}
                                        <div style={{
                                            position: 'absolute', left: -12, top: 4, width: 8, height: 8,
                                            borderRadius: '50%', background: isLatest ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                            border: `2.5px solid ${isLatest ? 'var(--color-accent-glow)' : 'var(--color-bg-secondary)'}`
                                        }} />
                                        <div style={{ fontSize: 13, fontWeight: 700, color: isLatest ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                            {h.status.replace(/_/g, ' ')}
                                        </div>
                                        {h.note && (
                                            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                {h.note}
                                            </div>
                                        )}
                                        <div style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>
                                            {new Date(h.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
            <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

// Styling elements
const panelStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: 24,
};

const panelTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    margin: '0 0 18px 0',
    fontFamily: "'Outfit', sans-serif",
    borderBottom: '1px solid var(--color-border)',
    paddingBottom: 10,
    color: 'var(--color-text-primary)',
};

const summaryRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: 'var(--color-text-secondary)',
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-secondary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 6,
    color: 'var(--color-text-primary)',
    fontSize: 13,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 12,
};

const submitButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    background: 'var(--gradient-accent)',
    color: '#0a0a0b',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    transition: 'opacity var(--transition-fast)',
};
