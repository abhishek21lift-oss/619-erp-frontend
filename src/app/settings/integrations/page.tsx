'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, X, CreditCard, Smartphone, MessageSquare, Send,
  Bot, Calendar, Camera, BarChart3, Loader2, Link2, Unlink,
  Settings, Clock, CheckCircle2, RefreshCw, ArrowRight, Sparkles,
  AlertCircle,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';
import type { AiProviderSettings, AiProviderStats, AiProviderStatEntry } from '@/lib/api';

type Status = 'connected' | 'error' | 'pending' | 'unavailable';

interface Integration {
  id: string; name: string; description: string; category: string;
  icon: string; color: string; bg: string; status: Status;
  connectedAt?: string; lastSync?: string; comingSoon?: boolean;
}

// Static integration metadata — status and dates are loaded from the API at runtime
const STATIC_INTEGRATIONS: Integration[] = [
  { id: 'razorpay',  name: 'Razorpay',          description: 'Payment gateway for fees, memberships & PT packages', category: 'payments',      icon: 'CreditCard',    color: '#2563eb', bg: '#eff6ff', status: 'pending' },
  { id: 'paytm',     name: 'Paytm',              description: 'UPI & wallet payment processing',                     category: 'payments',      icon: 'Smartphone',    color: '#00baf2', bg: '#eef9ff', status: 'pending' },
  { id: 'stripe',    name: 'Stripe',             description: 'International payment processing',                    category: 'payments',      icon: 'CreditCard',    color: '#635bff', bg: '#f0efff', status: 'pending' },
  { id: 'whatsapp',  name: 'WhatsApp Business',  description: 'Send notifications, reminders & marketing via WhatsApp', category: 'communication', icon: 'MessageSquare', color: '#25d366', bg: '#f0fdf4', status: 'pending' },
  { id: 'twilio',    name: 'Twilio SMS',         description: 'SMS alerts for dues, check-ins & announcements',     category: 'communication', icon: 'MessageSquare', color: '#f22f46', bg: '#fef2f2', status: 'pending' },
  { id: 'sendgrid',  name: 'SendGrid',           description: 'Email marketing & transactional emails',             category: 'communication', icon: 'Send',          color: '#1a82e2', bg: '#eff6ff', status: 'unavailable', comingSoon: true },
  // AI Coach card is rendered as a live AiCoachCard — not in this static list
  { id: 'biometric', name: 'Biometric Scanner',  description: 'Face & fingerprint check-in hardware',               category: 'devices',       icon: 'Camera',        color: '#8b5cf6', bg: '#f5f3ff', status: 'pending' },
  { id: 'zoho',      name: 'Zoho Books',         description: 'Accounting & invoicing sync',                        category: 'analytics',     icon: 'BarChart3',     color: '#e42527', bg: '#fef2f2', status: 'unavailable', comingSoon: true },
];

const CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'payments',     label: 'Payments' },
  { id: 'communication',label: 'Communication' },
  { id: 'ai',           label: 'AI & Automation' },
  { id: 'scheduling',   label: 'Scheduling' },
  { id: 'devices',      label: 'Devices & IoT' },
  { id: 'analytics',    label: 'Analytics' },
];

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  CreditCard, Smartphone, MessageSquare, Send, Bot, Calendar, Camera, BarChart3,
};

const glass = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

const catColor: Record<string, string> = {
  payments: '#f59e0b', communication: '#10b981', ai: '#8b5cf6',
  scheduling: '#3b82f6', devices: '#ec4899', analytics: '#06b6d4',
};

const sc: Record<Status, string> = { connected: '#10b981', error: '#ef4444', pending: '#f59e0b', unavailable: 'var(--text-disabled)' };
const sl: Record<Status, string> = { connected: 'Connected', error: 'Error', pending: 'Pending', unavailable: 'Unavailable' };

// ── Static ConnectModal (non-calendar integrations) ───────────────────────────
function ConnectModal({ integration, isConnected, onClose, onConnect, onDisconnect }: {
  integration: Integration; isConnected: boolean; onClose: () => void;
  onConnect: (id: string, apiKey: string) => Promise<void>; onDisconnect: () => void;
}) {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const Icon = iconMap[integration.icon];

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await api.integrations.test(integration.id, { api_key: apiKey });
      setTestResult(res.success ? 'success' : 'error');
    } catch { setTestResult('error'); }
    finally { setTesting(false); }
  };

  const saveConnection = async () => {
    setSaving(true);
    try {
      await onConnect(integration.id, apiKey);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const sBtn = { width: '100%', padding: '10px 0', borderRadius: 12, border: 'none', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#ffffff' } as const;
  const aBtn = { flex: 1, padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: 'pointer' } as const;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.3, type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ width: '90%', maxWidth: 440, ...glass, borderRadius: 20, padding: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: integration.bg, color: integration.color }}>
            {Icon && <Icon size={20} />}
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>{integration.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{integration.description}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: 'auto', width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: 'var(--bg-subtle)', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={16} /></button>
        </div>
        {!isConnected && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>API Key / Webhook URL</label>
            <input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }} placeholder="Paste your API key or webhook URL..."
              style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${testResult === 'error' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, fontSize: 13, outline: 'none', color: 'var(--text-primary)', background: 'var(--bg-canvas)', boxSizing: 'border-box' }}
            />
          </div>
        )}
        {!isConnected && (
          <button onClick={testConnection} disabled={testing || !apiKey}
            style={{ ...sBtn, cursor: (testing || !apiKey) ? 'not-allowed' : 'pointer', background: testResult === 'success' ? 'linear-gradient(135deg,#10b981,#059669)' : testResult === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'linear-gradient(135deg,#f59e0b,#d97706)', opacity: !apiKey ? 0.6 : 1 }}
          >
            {testing && <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={16} /></motion.span>}
            {testing ? 'Testing...' : testResult === 'success' ? 'Connected Successfully' : testResult === 'error' ? 'Connection Failed' : 'Test Connection'}
          </button>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          {!isConnected ? (
            <button onClick={saveConnection} disabled={saving || !apiKey}
              style={{ ...aBtn, border: 'none', background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#fff', opacity: !apiKey ? 0.6 : 1 }}>
              {saving ? 'Saving…' : 'Save & Connect'}
            </button>
          ) : (
            <button onClick={onClose} style={{ ...aBtn, border: 'none', background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>Close</button>
          )}
          {isConnected && (
            <button onClick={() => { onDisconnect(); onClose(); }} style={{ ...aBtn, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Disconnect</button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── AI Coach Card (live) ──────────────────────────────────────────────────────
function AiCoachCard() {
  const router = useRouter();
  const [usage, setUsage] = useState<{ messages_today: string; tokens_today: string } | null>(null);

  useEffect(() => {
    api.ai.usage().then((r) => setUsage(r.data)).catch(() => {});
  }, []);

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catColor.ai}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', color: '#10a37f' }}>
          <Bot size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>619 AI Coach</span>
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 10, background: 'rgba(16,163,127,0.12)', color: '#10a37f', border: '1px solid rgba(16,163,127,0.25)' }}>Active</span>
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
            AI-powered workout &amp; nutrition coach with member context
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: '#10a37f' }}>
          <CheckCircle2 size={12} /> Connected · MiniMax-M3
        </span>
        {usage && (
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>
            {usage.messages_today} messages today
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => router.push('/ai-coach')}
          style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#10a37f,#059669)', color: '#ffffff', boxShadow: '0 4px 12px rgba(16,163,127,0.3)' }}
        >
          Open AI Coach <ArrowRight size={13} />
        </button>
      </div>
    </motion.div>
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
    <motion.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catColor.scheduling}`, position: 'relative', overflow: 'hidden' }}
    >
      {/* Success flash */}
      <AnimatePresence>
        {flash && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '8px 16px', background: 'linear-gradient(90deg,#10b981,#059669)', fontSize: 12, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 6, zIndex: 10 }}
          >
            <CheckCircle2 size={13} /> Google Calendar connected successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14, marginTop: flash ? 28 : 0, transition: 'margin-top 0.2s' }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#4285f4' }}>
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
            <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={11} /></motion.span>
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
                ? <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></motion.span>
                : <Unlink size={13} />
              }
            </button>
          </>
        ) : (
          <button
            onClick={handleConnect}
            disabled={connecting || loading}
            style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: (connecting || loading) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#4285f4,#1a73e8)', color: '#ffffff', boxShadow: '0 4px 12px rgba(66,133,244,0.3)', opacity: (connecting || loading) ? 0.7 : 1 }}
          >
            {connecting
              ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></motion.span> Redirecting…</>
              : <><Link2 size={13} /> Connect with Google</>
            }
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Static integration card ───────────────────────────────────────────────────
function StaticCard({ integration, isConnected, connectedAt, onConfigure, onToggle }: {
  integration: Integration; isConnected: boolean; connectedAt?: string;
  onConfigure: () => void; onToggle: () => void;
}) {
  const status: Status = isConnected ? 'connected' : integration.status;
  const Icon = iconMap[integration.icon];
  const catAccent = catColor[integration.category] || '#f59e0b';

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catAccent}` }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: integration.bg, color: integration.color }}>
          {Icon && <Icon size={20} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{integration.name}</span>
            {integration.comingSoon && (
              <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Coming Soon</span>
            )}
          </div>
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
      <div style={{ display: 'flex', gap: 8 }}>
        {integration.comingSoon ? (
          <div style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: 'var(--bg-subtle)', color: 'var(--text-disabled)', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid var(--border)' }}>
            <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Coming Soon
          </div>
        ) : isConnected ? (
          <>
            <button onClick={onConfigure} style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
              <Settings size={13} /> Configure
            </button>
            <button onClick={onToggle} style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <Unlink size={13} />
            </button>
          </>
        ) : (
          <button onClick={onConfigure} style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#ffffff', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
            <Link2 size={13} /> Connect
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Token Router / MiniMax-M3 Card ───────────────────────────────────────────
function TokenRouterCard() {
  const [settings, setSettings] = useState<AiProviderSettings | null>(null);
  const [stats,    setStats]    = useState<AiProviderStats | null>(null);
  const [testing,  setTesting]  = useState(false);
  const [testMsg,  setTestMsg]  = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    api.ai.providerSettings().then(r => setSettings(r.data)).catch(() => {});
    api.ai.providerStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleTest = async () => {
    setTesting(true); setTestMsg(null);
    try {
      const r = await api.ai.testProvider();
      setTestMsg(r);
    } catch { setTestMsg({ success: false, message: 'Test failed — network error' }); }
    finally { setTesting(false); }
  };

  const isConnected = settings?.configured ?? false;
  const mmStat      = stats?.minimax as AiProviderStatEntry | undefined;

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20, borderLeft: `3px solid ${catColor.ai}` }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.1)', color: '#8b5cf6' }}>
          <Sparkles size={20} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Token Router · MiniMax-M3</span>
            {isConnected
              ? <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 10, background: 'rgba(16,163,127,0.12)', color: '#10a37f', border: '1px solid rgba(16,163,127,0.25)' }}>Connected</span>
              : <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>Not configured</span>
            }
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>
            AI provider — all requests route via Token Router
          </p>
        </div>
      </div>

      {/* Model + API key status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: isConnected ? '#10a37f' : '#ef4444' }}>
            {isConnected ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
            {isConnected ? 'TOKEN_ROUTER_API_KEY loaded' : 'Set TOKEN_ROUTER_API_KEY in environment'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Zap size={11} style={{ color: '#8b5cf6' }} />
            Model: <strong style={{ color: 'var(--text-primary)' }}>minimax-m3</strong>
          </span>
        </div>
      </div>

      {/* Usage stats */}
      {mmStat && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {[
            { label: 'Requests (30d)', value: Number(mmStat.requests).toLocaleString() },
            { label: 'Tokens (30d)',   value: Number(mmStat.tokens_total).toLocaleString() },
            { label: 'Today',          value: `${mmStat.requests_today} req` },
          ].map(({ label, value }) => (
            <div key={label} style={{ flex: 1, background: 'var(--bg-subtle)', borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Test result banner */}
      {testMsg && (
        <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, background: testMsg.success ? 'rgba(16,163,127,0.1)' : 'rgba(239,68,68,0.1)', color: testMsg.success ? '#10a37f' : '#ef4444', border: `1px solid ${testMsg.success ? 'rgba(16,163,127,0.25)' : 'rgba(239,68,68,0.2)'}` }}>
          {testMsg.message}
        </div>
      )}

      {/* Test button */}
      <button
        onClick={handleTest}
        disabled={testing || !isConnected}
        style={{ width: '100%', padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: (testing || !isConnected) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: isConnected ? 'linear-gradient(135deg,#8b5cf6,#7c3aed)' : 'var(--bg-subtle)', color: isConnected ? '#ffffff' : 'var(--text-disabled)', boxShadow: isConnected ? '0 4px 12px rgba(139,92,246,0.3)' : 'none', opacity: (!isConnected || testing) ? 0.7 : 1 }}
      >
        {testing
          ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={13} /></motion.span> Testing MiniMax-M3…</>
          : <><Sparkles size={13} /> Test Connection</>
        }
      </button>
    </motion.div>
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
  const [modalId,  setModalId]    = useState<string | null>(null);

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

  const disconnectIntegration = async (id: string) => {
    try {
      await api.integrations.disconnect(id);
      setApiData(prev => ({ ...prev, [id]: { ...prev[id], id, status: 'disconnected' } }));
    } catch { /* silently ignore */ }
  };

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
    const showAi =
      (category === 'all' || category === 'ai') &&
      (!search || 'ai coach'.includes(search.toLowerCase()) || '619 ai workout nutrition'.includes(search.toLowerCase()));
    return { staticFiltered, showCalendar, showAi };
  }, [category, search]);

  const modalIntegration = modalId ? STATIC_INTEGRATIONS.find((i) => i.id === modalId) ?? null : null;

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>

          {/* ── Hero ── */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{ position: 'relative', overflow: 'hidden', borderRadius: 24, padding: '40px 36px', marginBottom: 32, background: 'linear-gradient(135deg, #0a0f1a 0%, #451a03 25%, #78350f 50%, #451a03 75%, #0a0f1a 100%)', border: '1px solid rgba(245,158,11,0.15)', boxShadow: '0 25px 60px -12px rgba(69,26,3,0.6)' }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 40%, rgba(245,158,11,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(217,119,6,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 32px rgba(245,158,11,0.3)' }}>
                <Zap size={26} color="#fff" />
              </div>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.03em' }}>Integrations</h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '4px 0 0' }}>Connect your studio with powerful tools</p>
              </div>
            </div>
          </motion.div>

          {/* ── Search & Filters ── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...glass, borderRadius: 14, padding: '4px 16px', marginBottom: 16 }}>
              <Search size={16} className="text-[var(--text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search integrations..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, padding: '12px 0', color: 'var(--text-primary)', background: 'transparent' }}
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
          </motion.div>

          {/* ── Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {filtered.staticFiltered.map((integration) => (
                <StaticCard
                  key={integration.id}
                  integration={integration}
                  isConnected={isConnected(integration.id)}
                  connectedAt={apiData[integration.id]?.connected_at}
                  onConfigure={() => setModalId(integration.id)}
                  onToggle={() => disconnectIntegration(integration.id)}
                />
              ))}
              {filtered.showAi && (
                <AiCoachCard key="ai-coach" />
              )}
              {filtered.showAi && (
                <TokenRouterCard key="token-router" />
              )}
              {filtered.showCalendar && (
                <GoogleCalendarCard key="calendar" flashSuccess={flashSuccess} />
              )}
            </AnimatePresence>
          </div>

          {!filtered.staticFiltered.length && !filtered.showCalendar && !filtered.showAi && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ textAlign: 'center', padding: '60px 20px', ...glass, borderRadius: 20, marginTop: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Search size={24} color="var(--text-muted)" />
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>No integrations found</p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>Try a different category or search term.</p>
            </motion.div>
          )}

          {modalIntegration && (
            <ConnectModal
              integration={modalIntegration}
              isConnected={isConnected(modalIntegration.id)}
              onClose={() => setModalId(null)}
              onConnect={async (id, apiKey) => {
                await api.integrations.connect(id, { api_key: apiKey });
                setApiData(prev => ({ ...prev, [id]: { ...prev[id], id, status: 'connected', connected_at: new Date().toISOString() } }));
              }}
              onDisconnect={() => disconnectIntegration(modalIntegration.id)}
            />
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
