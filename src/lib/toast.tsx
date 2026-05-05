'use client';
import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface Toast { id: string; message: string; type: ToastType; leaving: boolean; }

interface ToastCtx {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

const Ctx = createContext<ToastCtx>({ toasts: [], addToast: () => {}, removeToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, leaving: true } : t));
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 350);
  }, []);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-3), { id, message, type, leaving: false }]);
    const timer = setTimeout(() => removeToast(id), 4000);
    timers.current.set(id, timer);
  }, [removeToast]);

  return (
    <Ctx.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </Ctx.Provider>
  );
}

export function useToast() {
  const { addToast } = useContext(Ctx);
  return {
    toast: {
      success: (msg: string) => addToast(msg, 'success'),
      error:   (msg: string) => addToast(msg, 'error'),
      info:    (msg: string) => addToast(msg, 'info'),
      warning: (msg: string) => addToast(msg, 'warning'),
    }
  };
}

const ICONS: Record<ToastType, string> = {
  success: '✓', error: '✕', info: 'ℹ', warning: '⚠',
};
const COLORS: Record<ToastType, string> = {
  success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b',
};

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div style={{
      position: 'fixed', bottom: '1.5rem', right: '1.5rem',
      zIndex: 9999, display: 'flex', flexDirection: 'column', gap: '0.5rem',
      alignItems: 'flex-end', pointerEvents: 'none',
    }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => removeToast(t.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.65rem',
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${COLORS[t.type]}40`,
            borderLeft: `3px solid ${COLORS[t.type]}`,
            borderRadius: '10px',
            padding: '0.7rem 1rem',
            minWidth: '260px', maxWidth: '380px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
            cursor: 'pointer',
            pointerEvents: 'all',
            animation: t.leaving ? 'toastOut 0.35s ease forwards' : 'toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1) both',
            color: '#f1f5f9',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `${COLORS[t.type]}20`, color: COLORS[t.type],
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
          }}>{ICONS[t.type]}</span>
          <span style={{ flex: 1, lineHeight: 1.4 }}>{t.message}</span>
          <span style={{ color: 'rgba(148,163,184,0.6)', fontSize: '0.75rem', flexShrink: 0 }}>✕</span>
        </div>
      ))}
    </div>
  );
}
