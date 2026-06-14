'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, X, CreditCard, Smartphone, MessageSquare, Send,
  Bot, Calendar, Camera, BarChart3, Loader2, Link2, Unlink,
  Settings, Clock, CheckCircle2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

type Status = 'connected' | 'error' | 'pending' | 'unavailable';

interface Integration {
  id: string; name: string; description: string; category: string;
  icon: string; color: string; bg: string; status: Status;
  connectedAt?: string; lastSync?: string; comingSoon?: boolean;
}

const INTEGRATIONS: Integration[] = [
  { id: 'razorpay', name: 'Razorpay', description: 'Payment gateway for fees, memberships & PT packages', category: 'payments', icon: 'CreditCard', color: '#2563eb', bg: '#eff6ff', status: 'connected', connectedAt: '2026-03-15', lastSync: '2026-06-12 10:30 AM' }, { id: 'paytm', name: 'Paytm', description: 'UPI & wallet payment processing', category: 'payments', icon: 'Smartphone', color: '#00baf2', bg: '#eef9ff', status: 'connected', connectedAt: '2026-02-01', lastSync: '2026-06-12 09:15 AM' }, { id: 'stripe', name: 'Stripe', description: 'International payment processing', category: 'payments', icon: 'CreditCard', color: '#635bff', bg: '#f0efff', status: 'error' }, { id: 'whatsapp', name: 'WhatsApp Business', description: 'Send notifications, reminders & marketing via WhatsApp', category: 'communication', icon: 'MessageSquare', color: '#25d366', bg: '#f0fdf4', status: 'connected', connectedAt: '2026-01-10', lastSync: '2026-06-12 11:00 AM' }, { id: 'twilio', name: 'Twilio SMS', description: 'SMS alerts for dues, check-ins & announcements', category: 'communication', icon: 'MessageSquare', color: '#f22f46', bg: '#fef2f2', status: 'pending' }, { id: 'sendgrid', name: 'SendGrid', description: 'Email marketing & transactional emails', category: 'communication', icon: 'Send', color: '#1a82e2', bg: '#eff6ff', status: 'unavailable', comingSoon: true }, { id: 'chatgpt', name: 'AI Assistant', description: 'AI-powered workout & nutrition recommendations', category: 'ai', icon: 'Bot', color: '#10a37f', bg: '#f0fdf4', status: 'unavailable', comingSoon: true }, { id: 'calendar', name: 'Google Calendar', description: 'Sync sessions, bookings & trainer schedules', category: 'scheduling', icon: 'Calendar', color: '#4285f4', bg: '#eff6ff', status: 'connected', connectedAt: '2026-04-05', lastSync: '2026-06-12 10:45 AM' }, { id: 'biometric', name: 'Biometric Scanner', description: 'Face & fingerprint check-in hardware', category: 'devices', icon: 'Camera', color: '#8b5cf6', bg: '#f5f3ff', status: 'connected', connectedAt: '2026-05-20', lastSync: '2026-06-12 08:30 AM' }, { id: 'zoho', name: 'Zoho Books', description: 'Accounting & invoicing sync', category: 'analytics', icon: 'BarChart3', color: '#e42527', bg: '#fef2f2', status: 'unavailable', comingSoon: true },
];

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'payments', label: 'Payments' },
  { id: 'communication', label: 'Communication' },
  { id: 'ai', label: 'AI & Automation' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'devices', label: 'Devices & IoT' },
  { id: 'analytics', label: 'Analytics' },
];

const iconMap: Record<string, React.ComponentType<any>> = {
  CreditCard, Smartphone, MessageSquare, Send, Bot, Calendar, Camera, BarChart3,
};

const glass = { background: 'var(--bg-card)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' };

const catColor: Record<string, string> = {
  payments: '#f59e0b',
  communication: '#10b981',
  ai: '#8b5cf6',
  scheduling: '#3b82f6',
  devices: '#ec4899',
  analytics: '#06b6d4',
};

function ConnectModal({ integration, onClose, onDisconnect }: { integration: Integration; onClose: () => void; onDisconnect: () => void }) {
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const Icon = iconMap[integration.icon];

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await api.integrations.test(integration.id, { api_key: apiKey });
      setTestResult(res.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally { setTesting(false); }
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
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6, display: 'block' }}>API Key / Webhook URL</label>
          <input value={apiKey} onChange={(e) => { setApiKey(e.target.value); setTestResult(null); }} placeholder="Paste your API key or webhook URL..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 12, border: `1px solid ${testResult === 'error' ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`, fontSize: 13, outline: 'none', color: 'var(--text-primary)', background: 'var(--bg-canvas)', boxSizing: 'border-box' }}
          />
        </div>
        <button onClick={testConnection} disabled={testing}
          style={{ ...sBtn, cursor: testing ? 'not-allowed' : 'pointer', background: testResult === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : testResult === 'error' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)' }}
        >
          {testing && <motion.span style={{ display: 'inline-flex' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}><Loader2 size={16} /></motion.span>}
          {testing ? 'Testing...' : testResult === 'success' ? 'Connected Successfully' : testResult === 'error' ? 'Connection Failed' : 'Test Connection'}
        </button>
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={onClose} style={{ ...aBtn, border: 'none', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff' }}>Save</button>
          <button onClick={() => { onDisconnect(); onClose(); }} style={{ ...aBtn, border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>Disconnect</button>
        </div>
      </motion.div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [connected, setConnected] = useState<Set<string>>(new Set(['razorpay', 'paytm', 'whatsapp', 'calendar']));
  const [modalId, setModalId] = useState<string | null>(null);

  const toggleIntegration = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() =>
    INTEGRATIONS.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    }), [category, search]);

  const modalIntegration = modalId ? INTEGRATIONS.find((i) => i.id === modalId) ?? null : null;

  return (
    <Guard role="admin">
      <AppShell>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* ── Hero ── */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            style={{
              position: 'relative', overflow: 'hidden',
              borderRadius: 24, padding: '40px 36px', marginBottom: 32,
              background: 'linear-gradient(135deg, #0a0f1a 0%, #451a03 25%, #78350f 50%, #451a03 75%, #0a0f1a 100%)',
              border: '1px solid rgba(245,158,11,0.15)',
              boxShadow: '0 25px 60px -12px rgba(69,26,3,0.6)',
            }}
          >
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 20% 40%, rgba(245,158,11,0.12) 0%, transparent 60%), radial-gradient(ellipse at 80% 60%, rgba(217,119,6,0.08) 0%, transparent 50%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', top: -80, right: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -20, width: 180, height: 180, borderRadius: '50%', background: 'radial-gradient(circle, rgba(217,119,6,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px), repeating-linear-gradient(90deg, transparent, transparent 1px, rgba(255,255,255,0.015) 1px, rgba(255,255,255,0.015) 2px)', pointerEvents: 'none' }} />
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
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, ...glass,
              borderRadius: 14, padding: '4px 16px', marginBottom: 16,
            }}>
              <Search size={16} className="text-[var(--text-muted)]" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search integrations..."
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, padding: '12px 0', color: 'var(--text-primary)', background: 'transparent' }}
              />
              {search && <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}><X size={14} /></button>}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map((cat) => (
                <button key={cat.id} onClick={() => setCategory(cat.id)}
                  style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                    border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                    background: category === cat.id ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-subtle)',
                    color: category === cat.id ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: category === cat.id ? '0 4px 12px rgba(245,158,11,0.3)' : 'none',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* ── Grid ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((integration) => {
                const isConnected = connected.has(integration.id);
                const status = isConnected ? 'connected' : integration.status;
                const sc: Record<Status, string> = { connected: '#10b981', error: '#ef4444', pending: '#f59e0b', unavailable: 'var(--text-disabled)' };
                const sl: Record<Status, string> = { connected: 'Connected', error: 'Error', pending: 'Pending', unavailable: 'Unavailable' };
                const Icon = iconMap[integration.icon];
                const catAccent = catColor[integration.category] || '#f59e0b';

                return (
                  <motion.div key={integration.id} layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25 }}
                    whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
                    style={{
                      ...glass, borderRadius: 20, padding: 20,
                      borderLeft: `3px solid ${catAccent}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: integration.bg, color: integration.color }}>
                        {Icon && <Icon size={20} />}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{integration.name}</span>
                          {integration.comingSoon && <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 8px', borderRadius: 10, background: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: '1px solid rgba(245,158,11,0.2)' }}>Coming Soon</span>}
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0', lineHeight: 1.4 }}>{integration.description}</p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 600, color: sc[status] }}>
                        {isConnected ? <CheckCircle2 size={12} /> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: sc[status], display: 'inline-block', boxShadow: `0 0 8px ${sc[status]}` }} />}
                        {sl[status]}
                      </span>
                      {isConnected && integration.connectedAt && <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Connected {integration.connectedAt}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {integration.comingSoon ? (
                        <div style={{ flex: 1, padding: '8px 0', borderRadius: 12, background: 'var(--bg-subtle)', color: 'var(--text-disabled)', fontSize: 12, fontWeight: 600, textAlign: 'center', border: '1px solid var(--border)' }}>
                          <Clock size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Coming Soon
                        </div>
                      ) : isConnected ? (
                        <>
                          <button onClick={() => setModalId(integration.id)} style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
                            <Settings size={13} /> Configure
                          </button>
                          <button onClick={() => toggleIntegration(integration.id)} style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}><Unlink size={13} /></button>
                        </>
                      ) : (
                        <button onClick={() => setModalId(integration.id)} style={{ flex: 1, padding: '8px 0', borderRadius: 12, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#ffffff', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
                          <Link2 size={13} /> Connect
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {filtered.length === 0 && (
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
              onClose={() => setModalId(null)}
              onDisconnect={() => toggleIntegration(modalIntegration.id)}
            />
          )}
        </div>
      </AppShell>
    </Guard>
  );
}
