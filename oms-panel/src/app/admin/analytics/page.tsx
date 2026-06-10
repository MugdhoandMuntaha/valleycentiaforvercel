'use client';

import React, { useEffect, useState } from 'react';
import { 
    BarChart3, Calendar, MapPin, PieChart, Loader2,
    TrendingUp, BadgeCent, RefreshCw, ShoppingBag, XCircle, Clock
} from 'lucide-react';
import { getAdminSalesAnalytics, SalesAnalyticsReport } from '@/lib/db/omsQueries';

export default function SalesAnalyticsPage() {
    const [report, setReport] = useState<SalesAnalyticsReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [dailyMetric, setDailyMetric] = useState<'revenue' | 'count'>('revenue');
    const [hoveredBar, setHoveredBar] = useState<{ type: string; index: number; text: string } | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await getAdminSalesAnalytics();
            setReport(data);
        } catch (err) {
            console.error('Error loading sales reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading || !report) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
                <Loader2 size={32} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    const { dailySales, districtSales, statusReport } = report;

    // Calculate dynamic values for daily histogram scaling
    const maxDailyRevenue = Math.max(...dailySales.map(d => d.revenue), 1);
    const maxDailyCount = Math.max(...dailySales.map(d => d.count), 1);
    const maxDailyVal = dailyMetric === 'revenue' ? maxDailyRevenue : maxDailyCount;

    // Calculate dynamic values for district histogram scaling
    const maxDistrictRevenue = Math.max(...districtSales.map(d => d.revenue), 1);

    // Calculate aggregated overall stats
    const totalSalesVolume = statusReport.reduce((sum, s) => sum + s.revenue, 0);
    const totalOrdersCount = statusReport.reduce((sum, s) => sum + s.count, 0);
    const confirmedData = statusReport.find(s => s.status.includes('Confirmed')) || { revenue: 0, count: 0 };
    const cancelledData = statusReport.find(s => s.status.includes('Cancelled')) || { revenue: 0, count: 0 };

    return (
        <div style={{ paddingBottom: 60 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                <div>
                    <h1 style={{ fontSize: 28, fontWeight: 800, fontFamily: "'Outfit', sans-serif", marginBottom: 4 }}>Sales Analytics</h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Visualize performance metrics, order statuses, and regional distributions</p>
                </div>
                <button onClick={loadData} style={refreshButtonStyle}>
                    <RefreshCw size={14} /> Refresh Reports
                </button>
            </div>

            {/* Overall Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 20,
                marginBottom: 32,
            }}>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'var(--color-accent-glow)' }}>
                        <TrendingUp size={20} style={{ color: 'var(--color-accent)' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>৳{totalSalesVolume.toLocaleString()}</div>
                        <div style={statLabelStyle}>Total Projected Sales</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(34, 197, 94, 0.1)' }}>
                        <ShoppingBag size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{confirmedData.count}</div>
                        <div style={statLabelStyle}>Confirmed Orders</div>
                    </div>
                </div>
                <div style={statCardStyle}>
                    <div style={{ ...iconWrapperStyle, background: 'rgba(239, 68, 68, 0.1)' }}>
                        <XCircle size={20} style={{ color: '#ef4444' }} />
                    </div>
                    <div>
                        <div style={statValStyle}>{cancelledData.count}</div>
                        <div style={statLabelStyle}>Cancelled Orders</div>
                    </div>
                </div>
            </div>

            {/* Grid Layout for Charts */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
                
                {/* 1. Date Daily Histogram Card */}
                <div style={chartCardStyle}>
                    <div style={chartHeaderStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={18} style={{ color: 'var(--color-accent)' }} />
                            <h2 style={chartTitleStyle}>Sales Report according to Date</h2>
                        </div>
                        <div style={metricToggleGroupStyle}>
                            <button 
                                onClick={() => setDailyMetric('revenue')} 
                                style={{ ...metricToggleButtonStyle, ...(dailyMetric === 'revenue' ? metricActiveStyle : {}) }}
                            >
                                Revenue (৳)
                            </button>
                            <button 
                                onClick={() => setDailyMetric('count')} 
                                style={{ ...metricToggleButtonStyle, ...(dailyMetric === 'count' ? metricActiveStyle : {}) }}
                            >
                                Orders
                            </button>
                        </div>
                    </div>

                    {/* SVG Histogram */}
                    <div style={{ position: 'relative', width: '100%', height: 260, marginTop: 20 }}>
                        {/* Hover Tooltip */}
                        {hoveredBar && hoveredBar.type === 'daily' && (
                            <div style={{
                                position: 'absolute',
                                top: 10,
                                left: '50%',
                                transform: 'translateX(-50%)',
                                background: 'rgba(10,10,11,0.95)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 12,
                                color: 'var(--color-text-primary)',
                                pointerEvents: 'none',
                                zIndex: 10,
                                boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                            }}>
                                {hoveredBar.text}
                            </div>
                        )}

                        <svg viewBox="0 0 800 240" style={{ width: '100%', height: '100%' }}>
                            {/* Grid Lines */}
                            {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                                const y = 200 - ratio * 160;
                                return (
                                    <g key={idx}>
                                        <line x1="60" y1={y} x2="780" y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="4,4" />
                                        <text x="50" y={y + 4} fill="var(--color-text-muted)" fontSize="10" textAnchor="end">
                                            {dailyMetric === 'revenue' ? `৳${Math.round(ratio * maxDailyVal).toLocaleString()}` : Math.round(ratio * maxDailyVal)}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Histogram Bars */}
                            {dailySales.map((item, idx) => {
                                const slotWidth = 720 / dailySales.length;
                                const barWidth = Math.min(slotWidth * 0.7, 40);
                                const x = 60 + idx * slotWidth + (slotWidth - barWidth) / 2;
                                const currentVal = dailyMetric === 'revenue' ? item.revenue : item.count;
                                const barHeight = (currentVal / maxDailyVal) * 160;
                                const y = 200 - barHeight;

                                return (
                                    <g key={idx}>
                                        {/* Bar rect */}
                                        <rect
                                            x={x}
                                            y={y}
                                            width={barWidth}
                                            height={Math.max(barHeight, 3)}
                                            fill={dailyMetric === 'revenue' ? 'url(#goldenGradient)' : 'url(#blueGradient)'}
                                            rx="4"
                                            style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                            onMouseEnter={() => setHoveredBar({
                                                type: 'daily',
                                                index: idx,
                                                text: `${item.date} — ${dailyMetric === 'revenue' ? `৳${item.revenue.toLocaleString()}` : `${item.count} orders`}`
                                            })}
                                            onMouseLeave={() => setHoveredBar(null)}
                                        />
                                        
                                        {/* Labels */}
                                        <text 
                                            x={x + barWidth / 2} 
                                            y="220" 
                                            fill="var(--color-text-muted)" 
                                            fontSize="9.5" 
                                            textAnchor="middle"
                                        >
                                            {item.date}
                                        </text>
                                    </g>
                                );
                            })}

                            {/* Gradients */}
                            <defs>
                                <linearGradient id="goldenGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#f5c518" />
                                    <stop offset="100%" stopColor="rgba(245,197,24,0.2)" />
                                </linearGradient>
                                <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3b82f6" />
                                    <stop offset="100%" stopColor="rgba(59,130,246,0.2)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                </div>

                {/* Grid for Bottom Two Reports */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
                    
                    {/* 2. District Sales Report Card */}
                    <div style={chartCardStyle}>
                        <div style={{ ...chartHeaderStyle, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <MapPin size={18} style={{ color: '#a855f7' }} />
                                <h2 style={chartTitleStyle}>Sales Report according to District</h2>
                            </div>
                        </div>

                        {/* District horizontal histogram lines */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                            {districtSales.length > 0 ? (
                                districtSales.map((item, idx) => {
                                    const pctWidth = (item.revenue / maxDistrictRevenue) * 100;
                                    return (
                                        <div key={item.district} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                                                <span style={{ fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                    {idx + 1}. {item.district}
                                                </span>
                                                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>
                                                    ৳{item.revenue.toLocaleString()} <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({item.count} orders)</span>
                                                </span>
                                            </div>
                                            {/* Histogram progress bar track */}
                                            <div style={{
                                                width: '100%',
                                                height: 8,
                                                background: 'var(--color-bg-tertiary)',
                                                borderRadius: 999,
                                                overflow: 'hidden'
                                            }}>
                                                <div style={{
                                                    width: `${Math.max(pctWidth, 2)}%`,
                                                    height: '100%',
                                                    background: 'linear-gradient(90deg, #a855f7, #c084fc)',
                                                    borderRadius: 999,
                                                    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                                                }} />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)' }}>
                                    No district sales records found.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3. Overall Sales Status Card */}
                    <div style={chartCardStyle}>
                        <div style={{ ...chartHeaderStyle, marginBottom: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <PieChart size={18} style={{ color: '#22c55e' }} />
                                <h2 style={chartTitleStyle}>Overall Sales Report (Volume & Count)</h2>
                            </div>
                        </div>

                        {/* Overall stats list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                            {statusReport.map((item) => {
                                const isCancelled = item.status.toLowerCase().includes('cancelled');
                                const isConfirmed = item.status.toLowerCase().includes('confirmed');
                                const barColor = isCancelled ? '#ef4444' : isConfirmed ? '#22c55e' : '#f5c518';
                                const pctWidth = totalOrdersCount > 0 ? (item.count / totalOrdersCount) * 100 : 0;

                                return (
                                    <div key={item.status} style={{
                                        background: 'var(--color-bg-tertiary)',
                                        border: '1px solid var(--color-border)',
                                        borderRadius: 'var(--radius-md)',
                                        padding: '16px 20px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 12
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>{item.status}</div>
                                                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                    {item.count} orders ({Math.round(pctWidth)}% of total)
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 18, fontWeight: 800, color: barColor, fontFamily: "'Outfit', sans-serif" }}>
                                                ৳{item.revenue.toLocaleString()}
                                            </div>
                                        </div>
                                        {/* Status weight bar */}
                                        <div style={{
                                            width: '100%',
                                            height: 6,
                                            background: 'var(--color-bg-secondary)',
                                            borderRadius: 999,
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${pctWidth}%`,
                                                height: '100%',
                                                background: barColor,
                                                borderRadius: 999
                                            }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}

// Styling elements
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

const chartCardStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-lg)',
    padding: '24px 28px',
};

const chartHeaderStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
};

const chartTitleStyle: React.CSSProperties = {
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "'Outfit', sans-serif",
    margin: 0,
    color: 'var(--color-text-primary)',
};

const metricToggleGroupStyle: React.CSSProperties = {
    display: 'flex',
    background: 'var(--color-bg-tertiary)',
    padding: 3,
    borderRadius: 8,
    border: '1px solid var(--color-border)',
};

const metricToggleButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    border: 'none',
    background: 'transparent',
    color: 'var(--color-text-muted)',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: 6,
    transition: 'all var(--transition-fast)',
};

const metricActiveStyle: React.CSSProperties = {
    background: 'var(--color-bg-secondary)',
    color: 'var(--color-accent)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
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
