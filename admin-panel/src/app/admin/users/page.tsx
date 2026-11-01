'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
    Users, Search, Eye, Filter, ArrowUpDown, Calendar,
    CheckCircle2, AlertCircle, Clock, ShieldAlert,
    X, Loader2, Download, Trash2, Ban, RefreshCw,
    MapPin, Star, History, Smartphone, Mail, UserCheck
} from 'lucide-react';
import {
    getAdminUsers, getAdminGuests, getUserProfileDetails, getGuestProfileDetails,
    suspendUser, reactivateUser, suspendGuest, reactivateGuest, exportCustomerData, anonymizeCustomer,
    AdminUserRow, AdminGuestRow, UserProfileDetails, GuestProfileDetails,
    AdminUsersFilter, AdminGuestsFilter
} from '@/lib/db/adminQueries';
import { useOverlayHistory } from '@/hooks/useOverlayHistory';

export default function AdminUsersPage() {
    const [activeTab, setActiveTab] = useState<'registered' | 'guests'>('registered');
    const [tableError, setTableError] = useState<string | null>(null);

    // Registered users state
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [userTotal, setUserTotal] = useState(0);
    const [userPage, setUserPage] = useState(1);
    const [userTotalPages, setUserTotalPages] = useState(1);
    const [usersLoading, setUsersLoading] = useState(true);

    // Guests state
    const [guests, setGuests] = useState<AdminGuestRow[]>([]);
    const [guestTotal, setGuestTotal] = useState(0);
    const [guestPage, setGuestPage] = useState(1);
    const [guestTotalPages, setGuestTotalPages] = useState(1);
    const [guestsLoading, setGuestsLoading] = useState(true);

    // Filter controls
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [hasOrdersFilter, setHasOrdersFilter] = useState<'all' | 'yes' | 'no'>('all');
    const [sortBy, setSortBy] = useState<string>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal state
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
    const [modalDataUser, setModalDataUser] = useState<UserProfileDetails | null>(null);
    const [modalDataGuest, setModalDataGuest] = useState<GuestProfileDetails | null>(null);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);
    const [modalSubTab, setModalSubTab] = useState<'info' | 'addresses' | 'orders' | 'reviews' | 'history' | 'audit'>('info');

    // Action dialog state
    const [actionLoading, setActionLoading] = useState(false);
    const [suspendReason, setSuspendReason] = useState('');
    const [showSuspendInput, setShowSuspendInput] = useState(false);
    const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

    // Accessibility Focus Trap ref
    const modalRef = useRef<HTMLDivElement>(null);

    // Load registered users via real API endpoint
    const loadUsers = useCallback(async () => {
        setUsersLoading(true);
        setTableError(null);
        try {
            const params = new URLSearchParams({
                page: String(userPage),
                limit: '10',
                search: searchTerm,
                status: statusFilter,
                hasOrders: hasOrdersFilter,
                sortBy: sortBy === 'date' ? 'registered' : sortBy,
                sortOrder,
            });
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await fetch(`/api/admin/users?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}: Failed to load users`);
            }
            setUsers(data.users || []);
            setUserTotal(data.total || 0);
            setUserTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to load users:', err);
            setTableError(err instanceof Error ? err.message : 'Failed to load users from database');
            setUsers([]);
        } finally {
            setUsersLoading(false);
        }
    }, [userPage, searchTerm, statusFilter, dateFrom, dateTo, hasOrdersFilter, sortBy, sortOrder]);

    // Load guests via real API endpoint
    const loadGuests = useCallback(async () => {
        setGuestsLoading(true);
        setTableError(null);
        try {
            const params = new URLSearchParams({
                page: String(guestPage),
                limit: '10',
                search: searchTerm,
                status: statusFilter,
                hasOrders: hasOrdersFilter,
                sortBy: sortBy === 'date' ? 'first_seen' : sortBy,
                sortOrder,
            });
            if (dateFrom) params.set('dateFrom', dateFrom);
            if (dateTo) params.set('dateTo', dateTo);

            const res = await fetch(`/api/admin/guests?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}: Failed to load guests`);
            }
            setGuests(data.guests || []);
            setGuestTotal(data.total || 0);
            setGuestTotalPages(data.totalPages || 1);
        } catch (err) {
            console.error('Failed to load guests:', err);
            setTableError(err instanceof Error ? err.message : 'Failed to load guests from database');
            setGuests([]);
        } finally {
            setGuestsLoading(false);
        }
    }, [guestPage, searchTerm, statusFilter, dateFrom, dateTo, hasOrdersFilter, sortBy, sortOrder]);

    useEffect(() => {
        if (activeTab === 'registered') {
            loadUsers();
        } else {
            loadGuests();
        }
    }, [activeTab, loadUsers, loadGuests]);

    // Open User Modal via real API endpoint
    const handleOpenUserModal = async (id: string) => {
        setSelectedUserId(id);
        setSelectedGuestId(null);
        setModalLoading(true);
        setModalError(null);
        setModalSubTab('info');
        setShowSuspendInput(false);
        setActionMessage(null);

        try {
            const res = await fetch(`/api/admin/users/${id}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}: Could not load user profile`);
            }
            setModalDataUser(data);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Could not load user profile');
        } finally {
            setModalLoading(false);
        }
    };

    // Open Guest Modal via real API endpoint
    const handleOpenGuestModal = async (id: string) => {
        setSelectedGuestId(id);
        setSelectedUserId(null);
        setModalLoading(true);
        setModalError(null);
        setModalSubTab('info');
        setShowSuspendInput(false);
        setActionMessage(null);

        try {
            const res = await fetch(`/api/admin/guests/${id}`);
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || `HTTP ${res.status}: Could not load guest profile`);
            }
            setModalDataGuest(data);
        } catch (err) {
            setModalError(err instanceof Error ? err.message : 'Could not load guest profile');
        } finally {
            setModalLoading(false);
        }
    };
    const closeModal = () => {
        setSelectedUserId(null);
        setSelectedGuestId(null);
        setModalDataUser(null);
        setModalDataGuest(null);
        setModalError(null);
        setShowSuspendInput(false);
        setActionMessage(null);
    };

    useOverlayHistory({
        overlayId: 'admin-customer-profile-modal',
        isOpen: Boolean(selectedUserId || selectedGuestId),
        onClose: closeModal,
    });

    // Accessibility: Escape key and Focus Trap
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeModal();
            }

            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (e.shiftKey && document.activeElement === first) {
                    last.focus({ preventScroll: true });
                    e.preventDefault();
                } else if (!e.shiftKey && document.activeElement === last) {
                    first.focus({ preventScroll: true });
                    e.preventDefault();
                }
            }
        };

        let prevScrollY = 0;
        if (selectedUserId || selectedGuestId) {
            prevScrollY = typeof window !== 'undefined' ? window.scrollY : 0;
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
            if (prevScrollY > 0 && typeof window !== 'undefined' && window.scrollY !== prevScrollY) {
                window.scrollTo({ top: prevScrollY, left: 0, behavior: 'instant' as ScrollBehavior });
            }
        };
    }, [selectedUserId, selectedGuestId]);

    // Admin Action: Suspend / Reactivate
    const handleToggleSuspend = async () => {
        setActionLoading(true);
        setActionMessage(null);
        try {
            if (selectedUserId && modalDataUser) {
                if (modalDataUser.user.status === 'active') {
                    if (!showSuspendInput) {
                        setShowSuspendInput(true);
                        setActionLoading(false);
                        return;
                    }
                    const res = await suspendUser(selectedUserId, suspendReason || 'Violation of terms');
                    if (res.error) throw new Error(res.error);
                    setActionMessage({ text: 'User account suspended', type: 'success' });
                    setModalDataUser(prev => prev ? {
                        ...prev,
                        user: { ...prev.user, status: 'suspended' },
                        status_history: [{ status: 'suspended', note: suspendReason || 'Violation of terms', changed_by: 'admin', created_at: new Date().toISOString() }, ...prev.status_history]
                    } : null);
                    setShowSuspendInput(false);
                    loadUsers();
                } else {
                    const res = await reactivateUser(selectedUserId, 'Reactivated by admin');
                    if (res.error) throw new Error(res.error);
                    setActionMessage({ text: 'User account reactivated', type: 'success' });
                    setModalDataUser(prev => prev ? {
                        ...prev,
                        user: { ...prev.user, status: 'active' },
                        status_history: [{ status: 'active', note: 'Reactivated by admin', changed_by: 'admin', created_at: new Date().toISOString() }, ...prev.status_history]
                    } : null);
                    loadUsers();
                }
            } else if (selectedGuestId && modalDataGuest) {
                if (modalDataGuest.guest.status === 'active') {
                    if (!showSuspendInput) {
                        setShowSuspendInput(true);
                        setActionLoading(false);
                        return;
                    }
                    const res = await suspendGuest(selectedGuestId, suspendReason || 'Suspended by admin');
                    if (res.error) throw new Error(res.error);
                    setActionMessage({ text: 'Guest record suspended', type: 'success' });
                    setModalDataGuest(prev => prev ? {
                        ...prev,
                        guest: { ...prev.guest, status: 'suspended' }
                    } : null);
                    setShowSuspendInput(false);
                    loadGuests();
                } else {
                    const res = await reactivateGuest(selectedGuestId, 'Reactivated by admin');
                    if (res.error) throw new Error(res.error);
                    setActionMessage({ text: 'Guest record reactivated', type: 'success' });
                    setModalDataGuest(prev => prev ? {
                        ...prev,
                        guest: { ...prev.guest, status: 'active' }
                    } : null);
                    loadGuests();
                }
            }
        } catch (err) {
            setActionMessage({ text: err instanceof Error ? err.message : 'Action failed', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    // Admin Action: Export Data
    const handleExport = async () => {
        const id = selectedUserId || selectedGuestId;
        if (!id) return;
        try {
            const res = await exportCustomerData(id, Boolean(selectedGuestId));
            if (res.data) {
                const blob = new Blob([res.data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `customer_export_${id}.json`;
                a.click();
                URL.revokeObjectURL(url);
                setActionMessage({ text: 'Data exported successfully', type: 'success' });
            } else if (res.error) {
                setActionMessage({ text: res.error, type: 'error' });
            }
        } catch (err) {
            setActionMessage({ text: 'Export failed', type: 'error' });
        }
    };

    // Admin Action: Anonymize
    const handleAnonymize = async () => {
        if (!selectedUserId) return;
        if (!confirm('Are you sure you want to anonymize this user? Personal data will be permanently wiped.')) return;
        setActionLoading(true);
        try {
            const res = await anonymizeCustomer(selectedUserId);
            if (res.error) throw new Error(res.error);
            setActionMessage({ text: 'Customer anonymized successfully', type: 'success' });
            handleOpenUserModal(selectedUserId);
            loadUsers();
        } catch (err) {
            setActionMessage({ text: err instanceof Error ? err.message : 'Anonymize failed', type: 'error' });
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <h1 style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Outfit', sans-serif", color: 'var(--color-text-primary)' }}>
                        Customer & User Management
                    </h1>
                    <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 4 }}>
                        Monitor registered customer profiles, track guest interactions, and administer account states securely.
                    </p>
                </div>

                {/* Tabs */}
                <div style={{
                    display: 'flex', background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 4, gap: 4
                }}>
                    <button
                        onClick={() => { setActiveTab('registered'); setSearchTerm(''); }}
                        style={{
                            padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
                            background: activeTab === 'registered' ? 'var(--color-accent)' : 'transparent',
                            color: activeTab === 'registered' ? '#000' : 'var(--color-text-secondary)',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all var(--transition-fast)'
                        }}
                    >
                        Registered Users ({userTotal})
                    </button>
                    <button
                        onClick={() => { setActiveTab('guests'); setSearchTerm(''); }}
                        style={{
                            padding: '8px 18px', borderRadius: 'var(--radius-sm)', border: 'none',
                            background: activeTab === 'guests' ? 'var(--color-accent)' : 'transparent',
                            color: activeTab === 'guests' ? '#000' : 'var(--color-text-secondary)',
                            fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all var(--transition-fast)'
                        }}
                    >
                        Guests ({guestTotal})
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', padding: 16, marginBottom: 20
            }}>
                {/* Search */}
                <div style={{ position: 'relative' }}>
                    <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        placeholder="Search by name, email, or phone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{
                            width: '100%', padding: '9px 12px 9px 36px', background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
                        }}
                    />
                </div>

                {/* Status Filter */}
                <div>
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'suspended')}
                        style={{
                            width: '100%', padding: '9px 12px', background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
                        }}
                    >
                        <option value="all">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>

                {/* Has Orders Filter */}
                <div>
                    <select
                        value={hasOrdersFilter}
                        onChange={e => setHasOrdersFilter(e.target.value as 'all' | 'yes' | 'no')}
                        style={{
                            width: '100%', padding: '9px 12px', background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
                        }}
                    >
                        <option value="all">All Customers</option>
                        <option value="yes">With Orders</option>
                        <option value="no">Without Orders</option>
                    </select>
                </div>

                {/* Date range from */}
                <div>
                    <input
                        type="date"
                        value={dateFrom}
                        onChange={e => setDateFrom(e.target.value)}
                        placeholder="From date"
                        style={{
                            width: '100%', padding: '9px 12px', background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
                        }}
                    />
                </div>

                {/* Date range to */}
                <div>
                    <input
                        type="date"
                        value={dateTo}
                        onChange={e => setDateTo(e.target.value)}
                        placeholder="To date"
                        style={{
                            width: '100%', padding: '9px 12px', background: 'var(--color-bg-tertiary)',
                            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)',
                            color: 'var(--color-text-primary)', fontSize: 13, outline: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Table Area */}
            <div style={{
                background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)', overflow: 'hidden'
            }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)' }}>
                                {activeTab === 'registered' ? (
                                    <>
                                        <th style={thStyle}>User</th>
                                        <th style={thStyle}>Email</th>
                                        <th style={thStyle}>Phone (Masked)</th>
                                        <th style={thStyle}>Registered</th>
                                        <th style={thStyle}>Last Login</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Orders</th>
                                        <th style={thStyle}>Spend</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                                    </>
                                ) : (
                                    <>
                                        <th style={thStyle}>Guest</th>
                                        <th style={thStyle}>Phone (Masked)</th>
                                        <th style={thStyle}>Email</th>
                                        <th style={thStyle}>First Seen</th>
                                        <th style={thStyle}>Last Seen</th>
                                        <th style={thStyle}>Status</th>
                                        <th style={thStyle}>Orders</th>
                                        <th style={thStyle}>Spend</th>
                                        <th style={{ ...thStyle, textAlign: 'right' }}>Action</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {tableError ? (
                                <tr>
                                    <td colSpan={9} style={{ padding: 48, textAlign: 'center' }}>
                                        <AlertCircle size={36} style={{ color: 'var(--color-error, #ef4444)', margin: '0 auto 12px' }} />
                                        <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--color-text-primary)' }}>
                                            Failed to load {activeTab === 'registered' ? 'registered users' : 'guests'}
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>{tableError}</div>
                                        <button
                                            onClick={() => (activeTab === 'registered' ? loadUsers() : loadGuests())}
                                            style={{
                                                marginTop: 16,
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 8,
                                                padding: '8px 16px',
                                                background: 'var(--color-accent)',
                                                color: '#000',
                                                border: 'none',
                                                borderRadius: 6,
                                                fontWeight: 600,
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <RefreshCw size={14} /> Retry
                                        </button>
                                    </td>
                                </tr>
                            ) : (activeTab === 'registered' ? usersLoading : guestsLoading) ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        {Array.from({ length: 9 }).map((_, j) => (
                                            <td key={j} style={{ padding: 14 }}>
                                                <div style={{ height: 16, background: 'var(--color-bg-tertiary)', borderRadius: 4, width: j === 0 ? 120 : 70 }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : activeTab === 'registered' ? (
                                users.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            <Users size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>No registered users found</div>
                                            <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting search filters.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    users.map(u => (
                                        <tr
                                            key={u.id}
                                            onClick={() => handleOpenUserModal(u.id)}
                                            style={rowStyle}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                                {u.avatar_url ? (
                                                    <img src={u.avatar_url} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-accent)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
                                                        {u.full_name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                )}
                                                <div>
                                                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                        {u.full_name}
                                                        {u.is_anonymized && <span style={{ marginLeft: 6, fontSize: 10, color: '#f59e0b' }}>[Anonymized]</span>}
                                                    </div>
                                                    {u.display_name && <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>@{u.display_name}</div>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{u.email}</td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{u.phone || '—'}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{new Date(u.registered_date).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={u.status === 'active' ? statusActiveBadge : statusSuspendedBadge}>
                                                    {u.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{u.total_orders}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-accent)' }}>৳{u.total_spend.toLocaleString()}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenUserModal(u.id); }}
                                                    style={actionButtonStyle}
                                                    title="View Profile"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            ) : (
                                guests.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} style={{ padding: 48, textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                            <Users size={36} style={{ opacity: 0.3, marginBottom: 12 }} />
                                            <div style={{ fontWeight: 600, fontSize: 15 }}>No guest records found</div>
                                            <div style={{ fontSize: 13, marginTop: 4 }}>Guests will be automatically recorded on checkout.</div>
                                        </td>
                                    </tr>
                                ) : (
                                    guests.map(g => (
                                        <tr
                                            key={g.id}
                                            onClick={() => handleOpenGuestModal(g.id)}
                                            style={rowStyle}
                                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg-tertiary)')}
                                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                        >
                                            <td style={{ padding: '12px 16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <span style={{ fontSize: 10, padding: '2px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: 4, color: 'var(--color-text-muted)' }}>
                                                        GUEST
                                                    </span>
                                                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{g.name}</span>
                                                    {g.is_merged && <span style={{ fontSize: 10, color: '#3b82f6' }}>[Merged]</span>}
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{g.phone}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{g.email || '—'}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{new Date(g.first_seen).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 16px', color: 'var(--color-text-muted)' }}>{new Date(g.last_seen).toLocaleDateString()}</td>
                                            <td style={{ padding: '12px 16px' }}>
                                                <span style={g.status === 'active' ? statusActiveBadge : statusSuspendedBadge}>
                                                    {g.status}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600 }}>{g.order_count}</td>
                                            <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-accent)' }}>৳{g.total_spend.toLocaleString()}</td>
                                            <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleOpenGuestModal(g.id); }}
                                                    style={actionButtonStyle}
                                                    title="View Profile"
                                                >
                                                    <Eye size={14} /> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '14px 20px', borderTop: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)'
                }}>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13 }}>
                        Showing Page {activeTab === 'registered' ? userPage : guestPage} of {activeTab === 'registered' ? userTotalPages : guestTotalPages} ({activeTab === 'registered' ? userTotal : guestTotal} total)
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            disabled={activeTab === 'registered' ? userPage <= 1 : guestPage <= 1}
                            onClick={() => activeTab === 'registered' ? setUserPage(p => Math.max(1, p - 1)) : setGuestPage(p => Math.max(1, p - 1))}
                            style={paginationBtnStyle}
                        >
                            Previous
                        </button>
                        <button
                            disabled={activeTab === 'registered' ? userPage >= userTotalPages : guestPage >= guestTotalPages}
                            onClick={() => activeTab === 'registered' ? setUserPage(p => p + 1) : setGuestPage(p => p + 1)}
                            style={paginationBtnStyle}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Profile Detail Modal */}
            {(selectedUserId || selectedGuestId) && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
                        backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', zIndex: 1000, padding: 20
                    }}
                    onClick={closeModal}
                >
                    <div
                        ref={modalRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Customer Profile Modal"
                        onClick={e => e.stopPropagation()}
                        style={{
                            background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)',
                            borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 840,
                            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                            overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}
                    >
                        {/* Modal Header */}
                        <div style={{
                            padding: '18px 24px', borderBottom: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{
                                    width: 38, height: 38, borderRadius: '50%', background: 'var(--color-accent)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#000'
                                }}>
                                    {selectedUserId ? (modalDataUser?.user.full_name?.charAt(0) || 'U') : (modalDataGuest?.guest.name?.charAt(0) || 'G')}
                                </div>
                                <div>
                                    <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                        {selectedUserId ? (modalDataUser?.user.full_name || 'Customer Profile') : (modalDataGuest?.guest.name || 'Guest Record')}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                                        {selectedUserId ? `Registered Account (${modalDataUser?.user.email})` : `Guest Record (${modalDataGuest?.guest.phone})`}
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeModal} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 6 }}>
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Tabs */}
                        <div style={{
                            display: 'flex', borderBottom: '1px solid var(--color-border)',
                            padding: '0 24px', background: 'rgba(0,0,0,0.2)', gap: 16, overflowX: 'auto'
                        }}>
                            {[
                                { key: 'info', label: 'Overview' },
                                { key: 'addresses', label: `Addresses (${selectedUserId ? modalDataUser?.addresses.length || 0 : modalDataGuest?.addresses.length || 0})` },
                                { key: 'orders', label: `Orders (${selectedUserId ? modalDataUser?.orders.length || 0 : modalDataGuest?.orders.length || 0})` },
                                ...(selectedUserId ? [
                                    { key: 'reviews', label: `Reviews (${modalDataUser?.reviews.length || 0})` },
                                    { key: 'history', label: 'Status History' },
                                    { key: 'audit', label: 'Audit Trail' },
                                ] : [
                                    { key: 'history', label: 'Change History' },
                                    { key: 'audit', label: 'IP & Devices' },
                                ])
                            ].map(t => (
                                <button
                                    key={t.key}
                                    onClick={() => setModalSubTab(t.key as any)}
                                    style={{
                                        padding: '12px 4px', border: 'none', background: 'none',
                                        color: modalSubTab === t.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
                                        borderBottom: modalSubTab === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
                                        fontWeight: 600, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body with internal scrolling */}
                        <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                            {modalLoading ? (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
                                    <Loader2 size={32} style={{ color: 'var(--color-accent)', animation: 'spin 1s linear infinite' }} />
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>Loading full profile details...</div>
                                </div>
                            ) : modalError ? (
                                <div style={{ padding: 32, textAlign: 'center' }}>
                                    <AlertCircle size={36} style={{ color: 'var(--color-error, #ef4444)', margin: '0 auto 12px' }} />
                                    <div style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: 16 }}>Failed to load profile</div>
                                    <div style={{ color: 'var(--color-text-muted)', fontSize: 13, marginTop: 4 }}>{modalError}</div>
                                    <button
                                        onClick={() => selectedUserId ? handleOpenUserModal(selectedUserId) : handleOpenGuestModal(selectedGuestId!)}
                                        style={{ marginTop: 16, padding: '8px 16px', background: 'var(--color-accent)', color: '#000', border: 'none', borderRadius: 4, fontWeight: 600, cursor: 'pointer' }}
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {actionMessage && (
                                        <div style={{
                                            padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13,
                                            background: actionMessage.type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                                            border: `1px solid ${actionMessage.type === 'success' ? '#22c55e' : '#ef4444'}`,
                                            color: actionMessage.type === 'success' ? '#22c55e' : '#ef4444'
                                        }}>
                                            {actionMessage.text}
                                        </div>
                                    )}

                                    {/* Sub-tab 1: Overview */}
                                    {modalSubTab === 'info' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                                                <div style={statBoxStyle}>
                                                    <div style={statLabelStyle}>Status</div>
                                                    <div style={{ fontSize: 15, fontWeight: 700, color: (selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status) === 'active' ? '#22c55e' : '#ef4444' }}>
                                                        {(selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status)?.toUpperCase()}
                                                    </div>
                                                </div>
                                                <div style={statBoxStyle}>
                                                    <div style={statLabelStyle}>Total Orders</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                                                        {selectedUserId ? modalDataUser?.user.total_orders : modalDataGuest?.guest.order_count}
                                                    </div>
                                                </div>
                                                <div style={statBoxStyle}>
                                                    <div style={statLabelStyle}>Lifetime Spend</div>
                                                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-accent)' }}>
                                                        ৳{(selectedUserId ? modalDataUser?.user.total_spend : modalDataGuest?.guest.total_spend)?.toLocaleString()}
                                                    </div>
                                                </div>
                                                <div style={statBoxStyle}>
                                                    <div style={statLabelStyle}>Verified Phone</div>
                                                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                                                        {selectedUserId ? (modalDataUser?.user.phone || 'Not linked') : modalDataGuest?.guest.phone}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details list */}
                                            <div style={{ background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: 18 }}>
                                                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                    Contact & Account Details
                                                </h4>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                                                    <div>
                                                        <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>{' '}
                                                        {(selectedUserId ? modalDataUser?.user.email : modalDataGuest?.guest.email) || '—'}
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--color-text-muted)' }}>Phone (Full):</span>{' '}
                                                        {(selectedUserId ? modalDataUser?.user.phone : modalDataGuest?.guest.phone) || '—'}
                                                    </div>
                                                    <div><span style={{ color: 'var(--color-text-muted)' }}>Created / First Seen:</span> {new Date(selectedUserId ? modalDataUser?.user.registered_date! : modalDataGuest?.guest.first_seen!).toLocaleString()}</div>
                                                    <div><span style={{ color: 'var(--color-text-muted)' }}>Last Activity:</span> {new Date(selectedUserId ? (modalDataUser?.user.last_login || modalDataUser?.user.registered_date!) : modalDataGuest?.guest.last_seen!).toLocaleString()}</div>
                                                    {selectedUserId && (
                                                        <>
                                                            <div><span style={{ color: 'var(--color-text-muted)' }}>Provider:</span> {modalDataUser?.user.provider}</div>
                                                            <div><span style={{ color: 'var(--color-text-muted)' }}>Email Verified:</span> {modalDataUser?.user.is_email_verified ? 'Yes' : 'No'}</div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Suspend Reason Input when toggling */}
                                            {showSuspendInput && (
                                                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 16, borderRadius: 'var(--radius-md)' }}>
                                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 8 }}>
                                                        State the reason for suspension (logged in audit trail):
                                                    </div>
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. Fraudulent activity, chargeback dispute, policy violation"
                                                        value={suspendReason}
                                                        onChange={e => setSuspendReason(e.target.value)}
                                                        style={{
                                                            width: '100%', padding: '8px 12px', background: 'var(--color-bg-secondary)',
                                                            border: '1px solid var(--color-border)', borderRadius: 4, color: '#fff', fontSize: 13, marginBottom: 10
                                                        }}
                                                    />
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button
                                                            onClick={handleToggleSuspend}
                                                            style={{ padding: '6px 14px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: 4, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}
                                                        >
                                                            Confirm Suspension
                                                        </button>
                                                        <button
                                                            onClick={() => setShowSuspendInput(false)}
                                                            style={{ padding: '6px 14px', background: 'transparent', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 2: Addresses */}
                                    {modalSubTab === 'addresses' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {(selectedUserId ? modalDataUser?.addresses : modalDataGuest?.addresses)?.length === 0 ? (
                                                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No saved addresses.</div>
                                            ) : (
                                                (selectedUserId ? modalDataUser?.addresses : modalDataGuest?.addresses)?.map((a, i) => (
                                                    <div key={i} style={{ background: 'var(--color-bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                                                {a.full_name} ({a.phone})
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                                {'is_default' in a && a.is_default && <span style={{ fontSize: 10, background: 'var(--color-accent)', color: '#000', padding: '2px 6px', borderRadius: 3, fontWeight: 700 }}>DEFAULT</span>}
                                                            </div>
                                                        </div>
                                                        <div style={{ color: 'var(--color-text-secondary)' }}>{a.address_line_1} {a.address_line_2 || ''}</div>
                                                        <div style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{a.city}, {a.state || ''} {a.postal_code || ''}, {a.country}</div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 3: Orders */}
                                    {modalSubTab === 'orders' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {(selectedUserId ? modalDataUser?.orders : modalDataGuest?.orders)?.length === 0 ? (
                                                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No orders found.</div>
                                            ) : (
                                                (selectedUserId ? modalDataUser?.orders : modalDataGuest?.orders)?.map((o, i) => (
                                                    <div key={i} style={{ background: 'var(--color-bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                                            <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--color-accent)' }}>{o.order_number}</div>
                                                            <div style={{ display: 'flex', gap: 8 }}>
                                                                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.08)' }}>{o.status}</span>
                                                                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: o.payment_status === 'paid' ? 'rgba(34,197,94,0.1)' : 'rgba(245,197,24,0.1)', color: o.payment_status === 'paid' ? '#22c55e' : '#f5c518' }}>
                                                                    {o.payment_status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                                            <div>Date: {new Date(o.created_at).toLocaleString()}</div>
                                                            <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>৳{o.total.toLocaleString()}</div>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 4: Reviews (Registered only) */}
                                    {modalSubTab === 'reviews' && modalDataUser && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {modalDataUser.reviews.length === 0 ? (
                                                <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No reviews submitted.</div>
                                            ) : (
                                                modalDataUser.reviews.map(r => (
                                                    <div key={r.id} style={{ background: 'var(--color-bg-tertiary)', padding: 14, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#f5c518' }}>
                                                                <Star size={14} fill="#f5c518" /> {r.rating} / 5
                                                            </div>
                                                            <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: r.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', color: r.status === 'active' ? '#22c55e' : '#ef4444' }}>
                                                                {r.status}
                                                            </span>
                                                        </div>
                                                        {r.title && <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 4 }}>{r.title}</div>}
                                                        <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{r.body}</div>
                                                        <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 8 }}>
                                                            Submitted: {new Date(r.created_at).toLocaleDateString()} • {r.helpful_count} found helpful • {r.report_count} reports
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 5: History / Status / Changes */}
                                    {modalSubTab === 'history' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {selectedUserId ? (
                                                modalDataUser?.status_history.length === 0 ? (
                                                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No status changes recorded.</div>
                                                ) : (
                                                    modalDataUser?.status_history.map((sh, idx) => (
                                                        <div key={idx} style={{ background: 'var(--color-bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontWeight: 600, color: sh.status === 'active' ? '#22c55e' : '#ef4444' }}>{sh.status.toUpperCase()}</span>
                                                                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{new Date(sh.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 12 }}>{sh.note || 'No notes specified.'}</div>
                                                        </div>
                                                    ))
                                                )
                                            ) : (
                                                modalDataGuest?.change_history.length === 0 ? (
                                                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No field changes recorded.</div>
                                                ) : (
                                                    modalDataGuest?.change_history.map((ch, idx) => (
                                                        <div key={idx} style={{ background: 'var(--color-bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 13 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>Field: {ch.field}</span>
                                                                <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>{new Date(ch.changed_at).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                                                                Old: <span style={{ color: '#ef4444' }}>{ch.old_value || 'None'}</span> ➔ New: <span style={{ color: '#22c55e' }}>{ch.new_value}</span>
                                                            </div>
                                                            {ch.reason && <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 4 }}>{ch.reason}</div>}
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    )}

                                    {/* Sub-tab 6: Audit / Metadata */}
                                    {modalSubTab === 'audit' && (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                            {selectedUserId ? (
                                                modalDataUser?.audit_notes.length === 0 ? (
                                                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No audit notes found.</div>
                                                ) : (
                                                    modalDataUser?.audit_notes.map((an, idx) => (
                                                        <div key={idx} style={{ background: 'var(--color-bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontWeight: 600, color: 'var(--color-accent)' }}>{an.action}</span>
                                                                <span style={{ color: 'var(--color-text-muted)' }}>{new Date(an.performed_at).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ color: 'var(--color-text-secondary)' }}>Admin: {an.performed_by || 'system'}</div>
                                                        </div>
                                                    ))
                                                )
                                            ) : (
                                                modalDataGuest?.order_metadata.length === 0 ? (
                                                    <div style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 24 }}>No IP or device records.</div>
                                                ) : (
                                                    modalDataGuest?.order_metadata.map((om, idx) => (
                                                        <div key={idx} style={{ background: 'var(--color-bg-tertiary)', padding: 12, borderRadius: 'var(--radius-md)', fontSize: 12 }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                                                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>IP: {om.ip || 'Unknown'}</span>
                                                                <span style={{ color: 'var(--color-text-muted)' }}>{new Date(om.created_at).toLocaleString()}</span>
                                                            </div>
                                                            <div style={{ color: 'var(--color-text-secondary)', fontSize: 11, wordBreak: 'break-all' }}>UA: {om.user_agent || 'Unknown'}</div>
                                                        </div>
                                                    ))
                                                )
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Modal Footer with Actions */}
                        <div style={{
                            padding: '16px 24px', borderTop: '1px solid var(--color-border)',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            background: 'rgba(255,255,255,0.02)'
                        }}>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button
                                    onClick={handleExport}
                                    style={footerBtnStyle}
                                    title="Export customer profile & history"
                                >
                                    <Download size={14} /> Export JSON
                                </button>
                                {selectedUserId && (
                                    <button
                                        onClick={handleAnonymize}
                                        disabled={actionLoading || modalDataUser?.user.is_anonymized}
                                        style={{ ...footerBtnStyle, color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)' }}
                                        title="Anonymize personal data"
                                    >
                                        <Trash2 size={14} /> Anonymize
                                    </button>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: 10 }}>
                                <button
                                    onClick={handleToggleSuspend}
                                    disabled={actionLoading}
                                    style={{
                                        ...footerBtnStyle,
                                        background: (selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status) === 'active' ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                                        color: (selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status) === 'active' ? '#ef4444' : '#22c55e',
                                        borderColor: (selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status) === 'active' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'
                                    }}
                                >
                                    <Ban size={14} />
                                    {(selectedUserId ? modalDataUser?.user.status : modalDataGuest?.guest.status) === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                                </button>

                                <button onClick={closeModal} style={{ ...footerBtnStyle, background: 'var(--color-bg-tertiary)' }}>
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Styles matching admin design tokens
const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
};

const rowStyle: React.CSSProperties = {
    borderBottom: '1px solid var(--color-border)',
    transition: 'background var(--transition-fast)',
    cursor: 'pointer',
};

const statusActiveBadge: React.CSSProperties = {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 12,
    background: 'rgba(34,197,94,0.1)',
    color: '#22c55e',
    fontWeight: 600,
    textTransform: 'capitalize',
};

const statusSuspendedBadge: React.CSSProperties = {
    fontSize: 11,
    padding: '3px 8px',
    borderRadius: 12,
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    fontWeight: 600,
    textTransform: 'capitalize',
};

const actionButtonStyle: React.CSSProperties = {
    padding: '6px 12px',
    borderRadius: 'var(--radius-sm)',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
};

const paginationBtnStyle: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--color-bg-tertiary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
};

const statBoxStyle: React.CSSProperties = {
    background: 'var(--color-bg-tertiary)',
    padding: 14,
    borderRadius: 'var(--radius-md)',
};

const statLabelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
};

const footerBtnStyle: React.CSSProperties = {
    padding: '8px 14px',
    borderRadius: 'var(--radius-sm)',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
};

