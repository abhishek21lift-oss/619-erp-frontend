'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, X, CreditCard, Smartphone, MessageSquare, Send,
  Calendar, Camera, BarChart3, Loader2, Link2, Unlink,
  Settings, Clock, CheckCircle2, RefreshCw, Bot, Activity,
} from 'lucide-react';
import Guard from '@/components/Guard';
import WhatsAppCard from '@/components/modules/WhatsAppCard';
import { api } from '@/lib/api';

type Status = 'connected' | 'error' | 'pending' | 'unavailable';

interface Integration {
  id: string; name: string; description: string; category: string;
  icon: string; color: string; bg: string; status: Status;
  connectedAt?: string; lastSync?: string;
  /** 'server' — the credential lives in the operator's environment and this
   *  screen can only report it, never set it. */
  managed?: 'server';
}

// The integrations this product actually has.
//
// Everything else that used to be listed here — Paytm, Stripe, Twilio SMS,
// SendGrid, Zoho Books, a biometric scanner — had no backend of any kind. They
// rendered a "Connect" button that opened a form for an API key, POSTed it to
// /api/integrations/:id/connect, and went green. Nothing read the key back:
// `integrations.api_key` has never been SELECTed anywhere in the backend, and
// the "Test Connection" that preceded it only checked the string's prefix, so
// it passed on any plausible-looking typo. A studio owner following that flow
// got a green badge and a live secret sitting in plaintext, and no integration.
//
// Razorpay is the one that works, and it is configured by the operator through
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET — not from this screen. Its card is
// therefore read-only and reports what the server says, which is why
// `managed: 'server'` exists.
//
// WhatsApp, Google Calendar and OpenRouter are not in this list either: each
// has a live card below with its own lifecycle (a device pairing, an OAuth
// grant, a model health check) rather than a stored string.
const STATIC_INTEGRATIONS: Integration[] = [
  { id: 'razorpay', name: 'Razorpay', description: 'Payment gateway for fees, memberships & PT packages', category: 'payments', icon: 'CreditCard', color: '#0067e0', bg: '#f1f5f9', status: 'unavailable', managed: 'server' },
];

const CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'payments',     label: 'Payments' },
  { id: 'communication',label: 'Communication' },
  { id: 'ai',           label: 'AI & Automation' },
  { id: 'scheduling',   label: 'Scheduling' },
];

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  CreditCard, Smartphone, MessageSquare, Send, Calendar, Camera, BarChart3,
};

const glass = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

const catColor: Record<string, string> = {
  payments: '#f59e0b', communication: '#10b981', ai: '#0067e0',
  scheduling: '#0067e0', devices: '#0067e0', analytics: '#0067e0',
};

const sc: Record<Status, string> = { connected: '#10b981', error: '#ef4444', pending: '#f59e0b', unavailable: 'var(--text-disabled)' };
const sl: Record<Status, string> = { connected: 'Connected', error: 'Error', pending: 'Pending', unavailable: 'Unavailable' };

// ── OpenRouter AI Card (live status) ─────────────────────────────────────────
type HealthModelInfo = { model: string; status: string; latency_ms?: number; error?: string };
type HealthResult = { primary?: HealthModelInfo; secondary?: HealthModelInfo; fallback?: HealthModelInfo };

function OpenRouterCard() {
  const [settings, setSettings] = useState<{ configured: boolean; models?: { primary: string; secondary: string; fallback: string } } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [callError, setCallError] = useState(false);
  const [health, setHealth]       = useState<HealthResult>({});
  const [checking, setChecking]   = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt]   = useState<string | null>(null);

  useEffect(() => {
    api.ai.providerSettings()
      .then((res) => { setCallError(false); setSettings({ configured: res.data.configured, models: res.data.models }); })
      .catch(() => { setCallError(true); setSettings({ configured: false }); })
      .finally(() => setLoading(false));
  }, []);

  const checkHealth = async () => {
    setChecking(true);
    setHealthError(null);
    try {
      const res = await api.ai.health();
      setHealth(res.models as HealthResult);
      setCheckedAt(new Date().toLocaleTimeString());
    } catch (e: unknown) {
      setHealthError(e instanceof Error ? e.message : 'Health check failed — check your API key and model IDs');
      setCheckedAt(new Date().toLocaleTimeString());
    } finally {
      setChecking(false);
    }
  };

  const currentStatus: Status = loading ? 'pending' : (callError ? 'pending' : (settings?.configured ? 'connected' : 'unavailable'));
  const modelEntries: { label: string; key: keyof HealthResult; name?: string }[] = [
    { label: 'Primary',   key: 'primary',   name: settings?.models?.primary },
    { label: 'Secondary', key: 'secondary', name: settings?.models?.secondary },
    { label: 'Fallback',  key: 'fallback',  name: settings?.models?.fallback },
  ];

  const healthValues = Object.values(health) as HealthModelInfo[];
  const okCount = healthValues.filter((h) => h.status === 'ok').length;

  return (
    <m.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catColor.ai}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#0067e0' }}>
          <Bot size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>OpenRouter AI</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
            Multi-model AI gateway powering coaching, workouts &amp; insights
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        {loading ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={11} /></m.span>
            Checking…
          </span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: callError ? '#f59e0b' : sc[currentStatus] }}>
            {settings?.configured ? <CheckCircle2 size={12} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: callError ? '#f59e0b' : sc[currentStatus], display: 'inline-block' }} />}
            {callError ? 'Error — backend unreachable' : (settings?.configured ? 'Configured' : 'Not Configured')}
          </span>
        )}
      </div>

      {settings?.configured && (
        <div style={{ marginBottom: 14, fontSize: 11, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {modelEntries.filter((e) => e.name).map(({ label, key, name }) => {
            const h = health[key];
            const isError = h && h.status !== 'ok';
            return (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ minWidth: 58 }}>{label}:</span>
                  <code style={{ fontSize: 10, background: 'var(--bg-subtle)', padding: '1px 6px', borderRadius: 6, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</code>
                  {h && (
                    <span style={{ fontSize: 9, fontWeight: 700, flexShrink: 0, color: h.status === 'ok' ? '#10b981' : '#ef4444' }}>
                      {h.status === 'ok' ? `● ${h.latency_ms}ms` : '✕'}
                    </span>
                  )}
                </div>
                {isError && h.error && (
                  <div style={{ paddingLeft: 66, fontSize: 10, color: '#ef4444', lineHeight: 1.3, wordBreak: 'break-all' }}>
                    {h.error.slice(0, 120)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {checkedAt && !healthError && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
          background: okCount === healthValues.length ? '#d1fae5' : okCount > 0 ? '#fef3c7' : '#fee2e2',
          color:      okCount === healthValues.length ? '#065f46' : okCount > 0 ? '#92400e' : '#991b1b' }}>
          {okCount === healthValues.length
            ? `All ${okCount} models healthy`
            : okCount > 0
            ? `${okCount} / ${healthValues.length} models healthy — check errors above`
            : `All models failed — verify model IDs and API key`}
          <span style={{ float: 'right', fontWeight: 400, opacity: 0.7 }}>{checkedAt}</span>
        </div>
      )}

      {healthError && (
        <div style={{ marginBottom: 10, padding: '6px 10px', borderRadius: 8, fontSize: 11, background: '#fee2e2', color: '#991b1b' }}>
          {healthError}
          <span style={{ float: 'right', fontWeight: 400, opacity: 0.7 }}>{checkedAt}</span>
        </div>
      )}

      <button
        onClick={checkHealth}
        disabled={checking || !settings?.configured}
        style={{ width: '100%', padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: (checking || !settings?.configured) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: settings?.configured ? 'linear-gradient(135deg,#0067e0,#0059ce)' : 'var(--bg-subtle)', color: settings?.configured ? '#ffffff' : 'var(--text-disabled)', opacity: !settings?.configured ? 0.6 : 1, boxShadow: settings?.configured ? '0 4px 12px rgba(0,103,224,0.3)' : 'none' }}
      >
        {checking ? <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></m.span> : <Activity size={13} />}
        {checking ? 'Pinging models…' : 'Check Model Health'}
      </button>
    </m.div>
  );
}

// ── Google Calendar Card (live OAuth) ─────────────────────────────────────────
function GoogleCalendarCard({ flashSuccess }: { flashSuccess: boolean }) {
  const [status, setStatus]         = useState<{ connected: boolean; connectedAt?: string; lastSyncAt?: string } | null>(null);
  const [loading, setLoading]       = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [flash, setFlash]           = useState(flashSuccess);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await api.calendar.status();
      setStatus(s);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // Clear the flash after 4 seconds
  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 4000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { url } = await api.calendar.authUrl();
      window.location.href = url;
    } catch {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await api.calendar.disconnect();
      setStatus({ connected: false });
    } catch {
      // ignore
    } finally {
      setDisconnecting(false);
    }
  };

  const isConnected = status?.connected ?? false;
  const currentStatus: Status = loading ? 'pending' : isConnected ? 'connected' : 'unavailable';

  const fmtDate = (iso?: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

  return (
    <m.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catColor.scheduling}`, position: 'relative', overflow: 'hidden' }}
    >
      {/* Success flash */}
      <AnimatePresence>
        {flash && (
          <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 16px', background: 'linear-gradient(90deg,#10b981,#059669)', fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}
          >
            <CheckCircle2 size={13} /> Google Calendar connected successfully!
          </m.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14, marginTop: flash ? 28 : 0, transition: 'margin-top 0.2s' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#0067e0' }}>
          <Calendar size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Google Calendar</div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
            Sync class bookings to your Google Calendar automatically
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {loading ? (
          <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={11} /></m.span>
            Checking…
          </span>
        ) : (
          <>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: sc[currentStatus] }}>
              {isConnected ? <CheckCircle2 size={12} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc[currentStatus], display: 'inline-block' }} />}
              {sl[currentStatus]}
            </span>
            {isConnected && status?.connectedAt && (
              <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
                Connected {fmtDate(status.connectedAt)}
              </span>
            )}
          </>
        )}
      </div>

      {isConnected && status?.lastSyncAt && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'var(--text-disabled)', marginBottom: 12 }}>
          <RefreshCw size={9} /> Last sync: {fmtDate(status.lastSyncAt)}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {isConnected ? (
          <>
            <button
              disabled
              style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg-subtle)', color: 'var(--text-muted)', opacity: 0.6 }}
            >
              <Settings size={13} /> Auto-sync on
            </button>
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, fontWeight: 600, cursor: disconnecting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
            >
              {disconnecting
                ? <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></m.span>
                : <Unlink size={13} />
              }
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting || loading}
            style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: (connecting || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#0067e0,#0059ce)', color: '#ffffff', boxShadow: '0 4px 12px rgba(0,103,224,0.3)', opacity: (connecting || loading) ? 0.7 : 1 }}
          >
            {connecting
              ? <><m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></m.span> Redirecting…</>
              : <><Link2 size={13} /> Connect with Google</>
            }
          </button>
        )}
      </div>
    </m.div>
  );
}

// ── Static integration card ───────────────────────────────────────────────────
function StaticCard({ integration, isConnected, connectedAt }: {
  integration: Integration; isConnected: boolean; connectedAt?: string;
}) {
  const status: Status = isConnected ? 'connected' : integration.status;
  const Icon = iconMap[integration.icon];
  const catAccent = catColor[integration.category] || '#f59e0b';

  return (
    <m.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catAccent}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: integration.bg, color: integration.color }}>
          {Icon && <Icon size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{integration.name}</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{integration.description}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: sc[status] }}>
          {isConnected ? <CheckCircle2 size={12} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc[status], display: 'inline-block', boxShadow: `0 0 8px ${sc[status]}` }} />}
          {sl[status]}
        </span>
        {isConnected && connectedAt && (
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Connected {new Date(connectedAt).toLocaleDateString()}</span>
        )}
      </div>
      {/* Server-managed: say who holds the credential rather than offering a
          field that writes one nothing reads. The previous button opened that
          form; a studio admin cannot change this and should not be invited to
          try. */}
      {integration.managed === 'server' && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, padding: '9px 12px', borderRadius: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', fontSize: 11, lineHeight: 1.45, color: 'var(--text-muted)' }}>
          <Settings size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            {isConnected
              ? 'Configured by your operator. Keys are held in the server environment, not in this studio\u2019s settings.'
              : 'Not configured. Ask your operator to set the Razorpay keys in the server environment to enable online payments.'}
          </span>
        </div>
      )}
    </m.div>
  );
}

type ApiIntegration = { id: string; status: string; connected_at?: string; last_sync_at?: string };

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
  const searchParams  = useSearchParams();
  const router        = useRouter();
  const [category, setCategory]   = useState('all');
  const [search,   setSearch]     = useState('');
  const [apiData,  setApiData]    = useState<Record<string, ApiIntegration>>({});

  // Load integration statuses from backend
  useEffect(() => {
    api.integrations.list().then(rows => {
      const map: Record<string, ApiIntegration> = {};
      (rows as ApiIntegration[]).forEach(r => { map[r.id] = r; });
      setApiData(map);
    }).catch(() => {});
  }, []);

  // Detect OAuth callback result
  const calendarParam = searchParams.get('calendar');
  const flashSuccess  = calendarParam === 'connected';

  // Clear the ?calendar= query param from the URL so it doesn't persist on refresh
  useEffect(() => {
    if (calendarParam) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('calendar');
      const newUrl = params.toString() ? `?${params.toString()}` : '/settings/integrations';
      router.replace(newUrl, { scroll: false });
    }
  }, [calendarParam, searchParams, router]);

  const isConnected = (id: string) => apiData[id]?.status === 'connected';

  // Build the filtered list: inject calendar card placeholder for layout purposes
  const ALL_IDS_WITH_CALENDAR = [
    ...STATIC_INTEGRATIONS.map((i) => i.id),
    'calendar',
  ];

  const filtered = useMemo(() => {
    const staticFiltered = STATIC_INTEGRATIONS.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const showCalendar =
      (category === 'all' || category === 'scheduling') &&
      (!search || 'google calendar'.includes(search.toLowerCase()) || 'sync sessions bookings'.includes(search.toLowerCase()));
    const showOpenRouter =
      (category === 'all' || category === 'ai') &&
      (!search || 'openrouter ai'.includes(search.toLowerCase()) || 'coaching workout diet insights'.includes(search.toLowerCase()));
    const showWhatsApp =
      (category === 'all' || category === 'communication') &&
      (!search || 'whatsapp'.includes(search.toLowerCase()) || 'messages reminders receipts qr'.includes(search.toLowerCase()));
    return { staticFiltered, showCalendar, showOpenRouter, showWhatsApp };
  }, [category, search]);


  return (
    <Guard role="admin">
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Hero ── */}
        <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '40px 36px', marginBottom: 32, background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 50%, #fde68a 100%)', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 4px 24px rgba(245,158,11,0.15)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
              <Zap size={26} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: '#92400e', margin: 0, letterSpacing: '-0.03em' }}>Integrations</h1>
              <p style={{ fontSize: 14, color: '#64748b', margin: '4px 0 0' }}>Connect your studio with powerful tools</p>
            </div>
          </div>
        </m.div>

        {/* ── Search & Filters ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...glass, borderRadius: 14, padding: '4px 16px', marginBottom: 16 }}>
            <Search size={16} className="text-[var(--text-muted)]" />
            <input aria-label="Search integrations" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search integrations..."
              style={{ flex: 1, border: 'none', fontSize: 13, padding: '12px 0', color: 'var(--text-primary)', background: 'transparent' }}
            />
            {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={14} /></button>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {CATEGORIES.map((cat) => (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                style={{ padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: category === cat.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-subtle)', color: category === cat.id ? '#ffffff' : 'var(--text-secondary)', boxShadow: category === cat.id ? '0 4px 12px rgba(245,158,11,0.3)' : 'none' }}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </m.div>

        {/* ── Grid ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          <AnimatePresence mode="popLayout">
            {filtered.staticFiltered.map((integration) => (
              <StaticCard
                key={integration.id}
                integration={integration}
                isConnected={isConnected(integration.id)}
                connectedAt={apiData[integration.id]?.connected_at}
              />
            ))}
            {filtered.showCalendar && (
              <GoogleCalendarCard key="calendar" flashSuccess={flashSuccess} />
            )}
            {filtered.showOpenRouter && (
              <OpenRouterCard key="openrouter" />
            )}
            {filtered.showWhatsApp && (
              <WhatsAppCard key="whatsapp" />
            )}
          </AnimatePresence>
        </div>

        {!filtered.staticFiltered.length && !filtered.showCalendar && !filtered.showOpenRouter && !filtered.showWhatsApp && (
          <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '60px 20px', ...glass, borderRadius: 20, marginTop: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Search size={24} color="var(--text-muted)" />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>No integrations found</p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Try a different category or search term.</p>
          </m.div>
        )}

      </div>
    </Guard>
  );
}
