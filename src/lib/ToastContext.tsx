'use client';

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ShoppingBag, X } from 'lucide-react';

/* ===== Toast Types ===== */
export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'info' | 'error' | 'cart';
    icon?: React.ReactNode;
}

interface ToastContextType {
    showToast: (message: string, type?: Toast['type']) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/* ===== Toast Container (presentation) ===== */
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
    return (
        <div style={{
            position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 99999,
            display: 'flex', flexDirection: 'column', gap: 8,
            pointerEvents: 'none',
            alignItems: 'center',
        }}>
            <AnimatePresence>
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        initial={{ opacity: 0, y: -50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -50, scale: 0.9 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '12px 18px', borderRadius: 12,
                            background: '#1a1a1a',
                            color: '#fff',
                            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                            fontFamily: "'Inter', sans-serif",
                            fontSize: 13, fontWeight: 600,
                            pointerEvents: 'auto',
                            minWidth: 240, maxWidth: 360,
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                            background: toast.type === 'success' || toast.type === 'cart'
                                ? 'rgba(34,197,94,0.15)'
                                : toast.type === 'error'
                                    ? 'rgba(239,68,68,0.15)'
                                    : 'rgba(245,197,24,0.15)',
                        }}>
                            {toast.type === 'cart' ? (
                                <ShoppingBag size={14} color="#22c55e" />
                            ) : toast.type === 'success' ? (
                                <Check size={14} color="#22c55e" />
                            ) : toast.type === 'error' ? (
                                <X size={14} color="#ef4444" />
                            ) : (
                                <Check size={14} color="#f5c518" />
                            )}
                        </div>
                        <span style={{ flex: 1 }}>{toast.message}</span>
                        <button
                            onClick={() => onDismiss(toast.id)}
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                color: 'rgba(255,255,255,0.4)', padding: 2,
                                display: 'flex', alignItems: 'center',
                            }}
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}

/* ===== Provider ===== */
export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const toastCounter = useRef(0);

    const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
        const id = `toast-${++toastCounter.current}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3000);
    }, []);

    const dismissToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        </ToastContext.Provider>
    );
}

/* ===== Hook ===== */
export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
}
