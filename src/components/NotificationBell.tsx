'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Bell } from 'lucide-react';

type Notification = {
  id: string;
  icon: string;
  tone: 'warning' | 'danger' | 'info' | 'success';
  title: string;
  body: string;
  href: string;
  createdAt: number;
};

const READ_KEY = '619_notifs_read';
const SNOOZE_KEY = '619_notifs_snoozed';

function readSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function writeSet(key: string, set: Set<string>) {
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [snoozedIds, setSnoozedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setReadIds(readSet(READ_KEY));
    setSnoozedIds(readSet(SNOOZE_KEY));
  }, []);

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.dashboard
      .summary()
      .then((d: any) => {
        if (cancelled || !d) return;
        const list: Notification[] = [];
        const now = Date.now();
        if (d.expiring_soon > 0) {
          list.push({
            id: 'expiring',
            icon: '⚠',
            tone: 'warning',
            title: `${d.expiring_soon} membership${d.expiring_soon > 1 ? 's' : ''} expiring soon`,
            body: 'Renew within the next 7 days to keep them on the roster.',
            href: '/clients?segment=expiring',
            createdAt: now,
          });
        }
        if (d.total_dues && Number(d.total_dues) > 0) {
          const v = Number(d.total_dues);
          const pretty =
            v >= 100000
              ? '₹' + (v / 100000).toFixed(1) + 'L'
              : '₹' + Math.round(v).toLocaleString('en-IN');
          list.push({
            id: 'dues',
            icon: '◈',
            tone: 'danger',
            title: `${pretty} in outstanding dues`,
            body: 'Tap to send payment reminders.',
            href: '/reports?view=dues',
            createdAt: now,
          });
        }
        if (Array.isArray(d.recent_payments) && d.recent_payments.length > 0) {
          const p = d.recent_payments[0];
          list.push({
            id: 'pay-' + p.id,
            icon: '✓',
            tone: 'success',
            title: `${p.client_name || 'A member'} just paid ₹${Number(p.amount).toLocaleString('en-IN')}`,
            body: `${p.method || 'Payment'} · ${p.date || 'today'}`,
            href: '/payments',
            createdAt: now - 60_000,
          });
        }
        if (Number(d.attendance_today || 0) === 0) {
          list.push({
            id: 'no-attendance',
            icon: '◧',
            tone: 'info',
            title: 'No check-ins logged today',
            body: 'Make sure attendance is captured at the front desk.',
            href: '/attendance',
            createdAt: now - 120_000,
          });
        }
        setItems(list);
      })
      .catch((err) => console.error('[NotificationBell] dashboard summary failed', err))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = items.filter((i) => !snoozedIds.has(i.id));
  const unreadCount = visible.filter((i) => !readIds.has(i.id)).length;

  function markAllRead() {
    const next = new Set(readIds);
    visible.forEach((i) => next.add(i.id));
    setReadIds(next);
    writeSet(READ_KEY, next);
  }
  function snooze(id: string) {
    const next = new Set(snoozedIds);
    next.add(id);
    setSnoozedIds(next);
    writeSet(SNOOZE_KEY, next);
  }
  function markRead(id: string) {
    if (readIds.has(id)) return;
    const next = new Set(readIds);
    next.add(id);
    setReadIds(next);
    writeSet(READ_KEY, next);
  }

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notif-btn glass-btn"
        aria-label="Notifications"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <Bell size={13} style={{ opacity: 0.7 }} />
        {unreadCount > 0 && (
          <span
            className="notif-badge"
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 16,
              height: 16,
              borderRadius: 999,
              background: 'var(--danger)',
              color: 'var(--text-inverse)',
              fontSize: 9,
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 3px',
              boxShadow: '0 2px 6px var(--brand-glow)',
              lineHeight: 1,
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="notif-panel glass-dropdown"
          role="dialog"
          aria-label="Notifications"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 340,
            zIndex: 9999,
            padding: 8,
            transformOrigin: 'top right',
          }}
        >
          <div className="notif-panel-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px 6px' }}>
            <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>
              Notifications
            </div>
            {visible.length > 0 && (
              <button
                type="button"
                className="notif-clear"
                onClick={markAllRead}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'var(--brand-lo)',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: 6,
                  transition: 'background 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'color-mix(in srgb, var(--brand-lo) 8%, transparent)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                Mark all read
              </button>
            )}
          </div>

          {loading && (
            <div className="notif-empty" style={{ padding: 24, textAlign: 'center', fontSize: 12.5, color: 'var(--text-muted)' }}>
              <div style={{ animation: 'pulse 1.5s ease infinite', opacity: 0.5 }}>Loading…</div>
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div className="notif-empty" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 8, opacity: 0.4 }}>◐</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                You&apos;re all caught up
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Nothing needs your attention right now.
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 340, overflowY: 'auto' }}>
            {visible.map((n) => {
              const toneColors: Record<string, { bg: string; dot: string; text: string }> = {
                warning: { bg: 'color-mix(in srgb, var(--warning) 8%, transparent)', dot: 'var(--warning)', text: 'var(--warning)' },
                danger: { bg: 'color-mix(in srgb, var(--danger) 6%, transparent)', dot: 'var(--danger)', text: 'var(--danger)' },
                success: { bg: 'color-mix(in srgb, var(--success) 8%, transparent)', dot: 'var(--success)', text: 'var(--success)' },
                info: { bg: 'color-mix(in srgb, var(--info) 8%, transparent)', dot: 'var(--info)', text: 'var(--info)' },
              };
              const tc = toneColors[n.tone] || toneColors.info;
              return (
                <div
                  key={n.id}
                  className={`notif-item${readIds.has(n.id) ? ' is-read' : ''}`}
                  style={{
                    borderRadius: 12,
                    overflow: 'hidden',
                    transition: 'background 150ms',
                  }}
                >
                  <Link
                    href={n.href}
                    className="notif-item-body"
                    onClick={() => {
                      markRead(n.id);
                      setOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      gap: 10,
                      padding: '8px 10px',
                      textDecoration: 'none',
                      alignItems: 'flex-start',
                    }}
                  >
                    <span
                      className="notif-item-icon"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        background: tc.bg,
                        color: tc.dot,
                        flexShrink: 0,
                      }}
                    >
                      {n.icon}
                    </span>
                    <span className="notif-item-text" style={{ flex: 1, minWidth: 0 }}>
                      <span className="notif-item-title" style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        {n.title}
                      </span>
                      <span className="notif-item-sub" style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {n.body}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    className="notif-item-snooze"
                    aria-label="Dismiss"
                    onClick={() => snooze(n.id)}
                    title="Dismiss"
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      width: 20,
                      height: 20,
                      borderRadius: 6,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 10,
                      color: 'var(--text-disabled)',
                      opacity: 0,
                      transition: 'opacity 150ms, background 150ms',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.background = 'var(--border)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '0';
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .notif-item { position: relative; }
        .notif-item:hover .notif-item-snooze { opacity: 1 !important; }
        .notif-item:hover { background: rgba(255,255,255,0.50); }
        .notif-item.is-read { opacity: 0.65; }
      `}</style>
    </div>
  );
}
