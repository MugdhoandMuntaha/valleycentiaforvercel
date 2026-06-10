'use client';

import React, { useEffect, useState, useRef, use } from 'react';
import Link from 'next/link';
import {
    ArrowLeft, Printer, ShoppingBag, Tag,
    Download, ImageIcon, FileText, Loader2,
    CheckCircle2, AlertCircle, Clock, Truck,
    ShieldAlert, MapPin, CreditCard, Phone
} from 'lucide-react';
import { getAdminOrderById, AdminOrderDetail } from '@/lib/db/omsQueries';

export default function OrderInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [order, setOrder] = useState<AdminOrderDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<'pdf' | 'png' | null>(null);
    const invoiceRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        async function loadOrder() {
            setLoading(true);
            try {
                const data = await getAdminOrderById(id);
                if (data) {
                    setOrder(data);
                }
            } catch (err) {
                console.error('Error fetching order detail for invoice:', err);
            } finally {
                setLoading(false);
            }
        }
        loadOrder();
    }, [id]);

    const handleDownloadPNG = async () => {
        if (!invoiceRef.current) return;
        setDownloading('png');
        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(invoiceRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });
            const link = document.createElement('a');
            link.download = `invoice-${order?.order_number || 'order'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (err) {
            console.error('PNG export failed:', err);
        } finally {
            setDownloading(null);
        }
    };

    const handleDownloadPDF = async () => {
        if (!invoiceRef.current) return;
        setDownloading('pdf');
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(invoiceRef.current, {
                scale: 3,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pageWidth - 20; // 10mm margin each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            if (imgHeight <= pageHeight - 20) {
                pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            } else {
                let yOffset = 0;
                const pageContentHeight = pageHeight - 20;
                let pageNum = 0;
                while (yOffset < imgHeight) {
                    if (pageNum > 0) pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 10, 10 - yOffset, imgWidth, imgHeight);
                    yOffset += pageContentHeight;
                    pageNum++;
                }
            }

            pdf.save(`invoice-${order?.order_number || 'order'}.pdf`);
        } catch (err) {
            console.error('PDF export failed:', err);
        } finally {
            setDownloading(null);
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
                <p style={{ color: 'var(--color-text-muted)', marginBottom: 20 }}>The order you are requesting an invoice for does not exist.</p>
                <Link href="/admin/orders" style={{ color: 'var(--color-accent)', textDecoration: 'none', fontWeight: 600 }}>
                    &larr; Back to Orders
                </Link>
            </div>
        );
    }

    const orderDate = new Date(order.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
    });

    const isCod = order.payment_method?.toLowerCase() === 'cod';

    return (
        <div style={{ paddingBottom: 60, fontFamily: "'Inter', sans-serif" }}>
            {/* Action Bar / Controls */}
            <div className="no-print" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 16,
                marginBottom: 24,
                background: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                padding: '16px 20px',
                borderRadius: 'var(--radius-lg)'
            }}>
                <Link href={`/admin/orders/${order.id}`} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--color-text-secondary)', textDecoration: 'none',
                    fontSize: 13, fontWeight: 600, transition: 'color var(--transition-fast)'
                }}>
                    <ArrowLeft size={14} /> Back to Details
                </Link>
                
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={downloading !== null}
                        style={{ ...actionButtonStyle, background: 'var(--color-accent)', color: '#0a0a0b' }}
                    >
                        {downloading === 'pdf' ? (
                            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating PDF...</>
                        ) : (
                            <><FileText size={14} /> Save PDF</>
                        )}
                    </button>
                    <button
                        onClick={handleDownloadPNG}
                        disabled={downloading !== null}
                        style={actionButtonStyle}
                    >
                        {downloading === 'png' ? (
                            <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Generating PNG...</>
                        ) : (
                            <><ImageIcon size={14} /> Save PNG</>
                        )}
                    </button>
                    <button
                        onClick={() => window.print()}
                        disabled={downloading !== null}
                        style={actionButtonStyle}
                    >
                        <Printer size={14} /> Print Invoice
                    </button>
                </div>
            </div>

            {/* Printable Invoice Wrapper */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div
                    ref={invoiceRef}
                    id="printable-invoice"
                    style={{
                        width: '100%',
                        maxWidth: '720px',
                        background: '#ffffff',
                        borderRadius: '16px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        color: '#1f2937'
                    }}
                >
                    {/* Header */}
                    <div style={{
                        padding: '32px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                    }}>
                        <div>
                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '24px', fontWeight: 800, color: '#111827', letterSpacing: '-0.5px' }}>
                                VALLEY<span style={{ color: '#f5c518' }}>CENTIA</span>
                            </div>
                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Order Invoice</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '1px' }}>Order ID</div>
                            <div style={{ fontFamily: "'Outfit', sans-serif", fontSize: '18px', fontWeight: 800, color: '#111827', marginTop: '2px' }}>
                                #{order.order_number}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>Date: {orderDate}</div>
                        </div>
                    </div>

                    {/* Meta info row: Payment and Status */}
                    <div style={{
                        padding: '20px 32px',
                        background: '#f9fafb',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <CreditCard size={16} color="#6b7280" />
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>Payment Method:</span>
                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', textTransform: 'uppercase' }}>
                                {order.payment_method || 'Unknown'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#4b5563' }}>Order Status:</span>
                            <span style={{
                                display: 'inline-flex',
                                padding: '4px 10px',
                                borderRadius: '9999px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                background: order.status === 'delivered' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(245, 197, 24, 0.1)',
                                color: order.status === 'delivered' ? '#22c55e' : '#b8960a'
                            }}>
                                {order.status}
                            </span>
                        </div>
                    </div>

                    {/* Address section */}
                    <div style={{
                        padding: '24px 32px',
                        borderBottom: '1px solid #f3f4f6',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 24
                    }} className="invoice-addresses">
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <MapPin size={14} color="#f5c518" />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delivery Destination</span>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                                {order.shipping_name || 'N/A'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                                {order.shipping_address_line_1}
                                {order.shipping_address_line_2 ? `, ${order.shipping_address_line_2}` : ''}
                                <br />
                                {order.shipping_city}, {order.shipping_state || ''} {order.shipping_postal_code || ''}
                                <br />
                                {order.shipping_country}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: '12px', color: '#6b7280' }}>
                                <Phone size={12} /> {order.shipping_phone || 'N/A'}
                            </div>
                        </div>

                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                                <CreditCard size={14} color="#f5c518" />
                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Billing Address</span>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                                {order.billing_name || order.shipping_name || 'N/A'}
                            </div>
                            <div style={{ fontSize: '13px', color: '#4b5563', lineHeight: '1.5' }}>
                                {order.billing_address_line_1 || order.shipping_address_line_1}
                                {(order.billing_address_line_2 || order.shipping_address_line_2) ? `, ${order.billing_address_line_2 || order.shipping_address_line_2}` : ''}
                                <br />
                                {order.billing_city || order.shipping_city}, {order.billing_state || order.shipping_state || ''} {order.billing_postal_code || order.shipping_postal_code || ''}
                                <br />
                                {order.billing_country || order.shipping_country}
                            </div>
                        </div>
                    </div>

                    {/* Order items */}
                    <div style={{ padding: '32px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                            <ShoppingBag size={14} color="#f5c518" />
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Ordered Items</span>
                        </div>

                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #111827', fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>
                                    <th style={{ padding: '8px 0' }}>Item details</th>
                                    <th style={{ padding: '8px 0', textAlign: 'center', width: '60px' }}>Qty</th>
                                    <th style={{ padding: '8px 0', textAlign: 'right', width: '90px' }}>Rate</th>
                                    <th style={{ padding: '8px 0', textAlign: 'right', width: '100px' }}>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.order_items.map((item, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6', fontSize: '13px' }}>
                                        <td style={{ padding: '14px 0' }}>
                                            <span style={{ fontWeight: 600, color: '#111827' }}>{item.product_name}</span>
                                            {item.size_label && (
                                                <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '8px', background: '#f3f4f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                    Size: {item.size_label}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '14px 0', textAlign: 'center', color: '#4b5563' }}>{item.quantity}</td>
                                        <td style={{ padding: '14px 0', textAlign: 'right', color: '#4b5563' }}>৳{item.unit_price.toLocaleString()}</td>
                                        <td style={{ padding: '14px 0', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                                            ৳{(item.unit_price * item.quantity).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Coupon / Promo note */}
                    {order.coupon_code && order.discount_amount > 0 && (
                        <div style={{
                            margin: '0 32px 20px',
                            padding: '12px 16px',
                            background: 'rgba(34, 197, 94, 0.05)',
                            border: '1px dashed rgba(34, 197, 94, 0.25)',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8
                        }}>
                            <Tag size={14} color="#22c55e" />
                            <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: 600 }}>
                                Coupon code Applied: <strong>{order.coupon_code}</strong> (saved ৳{order.discount_amount.toLocaleString()})
                            </span>
                        </div>
                    )}

                    {/* Invoice Summary Totals */}
                    <div style={{
                        padding: '24px 32px',
                        background: '#fafafa',
                        borderTop: '1px solid #f3f4f6',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 10
                    }}>
                        <div style={summaryRowStyle}>
                            <span style={{ color: '#6b7280' }}>Subtotal</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>৳{order.subtotal.toLocaleString()}</span>
                        </div>
                        {order.discount_amount > 0 && (
                            <div style={summaryRowStyle}>
                                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> Discount</span>
                                <span style={{ fontWeight: 600, color: '#ef4444' }}>-৳{order.discount_amount.toLocaleString()}</span>
                            </div>
                        )}
                        <div style={summaryRowStyle}>
                            <span style={{ color: '#6b7280' }}>Shipping Fees</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>৳{order.shipping_cost.toLocaleString()}</span>
                        </div>
                        <div style={summaryRowStyle}>
                            <span style={{ color: '#6b7280' }}>Tax / Vat</span>
                            <span style={{ fontWeight: 600, color: '#374151' }}>৳{order.tax.toLocaleString()}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            borderTop: '2px solid #111827',
                            paddingTop: 14,
                            marginTop: 4
                        }}>
                            <span style={{ fontSize: '15px', fontWeight: 800, color: '#111827' }}>Grand Total Due</span>
                            <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: "'Outfit', sans-serif", color: '#111827' }}>
                                ৳{order.total.toLocaleString()} {order.currency}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '20px 32px',
                        borderTop: '1px solid #f3f4f6',
                        fontSize: '11px',
                        color: '#9ca3af',
                        textAlign: 'center',
                        lineHeight: '1.5'
                    }}>
                        {isCod ? (
                            <span>This is a Cash on Delivery order. Kindly collect ৳{order.total.toLocaleString()} upon delivery.</span>
                        ) : (
                            <span>Thank you for shopping at Valleycentia. If you have any inquiries, contact support@valleycentia.com.</span>
                        )}
                        <div style={{ marginTop: '4px', fontSize: '10px' }}>Powered by Valleycentia OMS Panel</div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                    }
                    /* Hide components */
                    .no-print, 
                    .admin-sidebar,
                    header {
                        display: none !important;
                    }
                    /* Reset margins */
                    .admin-sidebar ~ div {
                        margin-left: 0 !important;
                    }
                    main {
                        padding: 0 !important;
                    }
                    #printable-invoice {
                        border: none !important;
                        box-shadow: none !important;
                        border-radius: 0 !important;
                        max-width: 100% !important;
                    }
                    .invoice-addresses {
                        grid-template-columns: 1fr 1fr !important;
                        gap: 20px !important;
                    }
                }
                @media (max-width: 600px) {
                    .invoice-addresses {
                        grid-template-columns: 1fr !important;
                        gap: 16px !important;
                    }
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}

const actionButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 16px',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    color: 'var(--color-text-primary)',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)'
};

const summaryRowStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '13px'
};
