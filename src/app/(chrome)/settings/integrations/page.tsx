'use client';

import { useState, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, X, CreditCard, Smartphone, MessageSquare, Send,
  Camera, BarChart3,
  Settings, CheckCircle2,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { PageHero } from '@/components/ui';
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
// Razorpay is configured by the operator through RAZORPAY_KEY_ID /
// RAZORPAY_KEY_SECRET — not from this screen. Its card is therefore read-only
// and reports what the server says, which is why `managed: 'server'` exists.
// The keys are not a working checkout: nothing in the app creates or captures
// a Razorpay payment, and the webhook only logs. The card says so rather than
// showing "Connected", which read as "online payments are live".
//
// WhatsApp is not in this list: it has a live card below with its own
// device-pairing lifecycle rather than a stored string. AI was removed from
// this page entirely — model health is an operator concern and now lives in
// the Command Center. Studio AI features are unaffected.
const STATIC_INTEGRATIONS: Integration[] = [
  { id: 'razorpay', name: 'Razorpay', description: 'Razorpay keys, held by your operator. Online checkout is not enabled — record payments manually.', category: 'payments', icon: 'CreditCard', color: '#A33757', bg: '#f1f5f9', status: 'unavailable', managed: 'server' },
];

const CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'payments',     label: 'Payments' },
  { id: 'communication',label: 'Communication' },
];

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  CreditCard, Smartphone, MessageSquare, Send, Camera, BarChart3,
};

const glass = {
  background: 'var(--bg-card)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid var(--border)',
  boxShadow: 'var(--shadow-card)',
} as const;

const sc: Record<Status, string> = { connected: '#10b981', error: '#ef4444', pending: '#f59e0b', unavailable: 'var(--text-disabled)' };
const sl: Record<Status, string> = { connected: 'Connected', error: 'Error', pending: 'Pending', unavailable: 'Unavailable' };

// ── Static integration card ───────────────────────────────────────────────────
function StaticCard({ integration, isConnected, connectedAt }: {
  integration: Integration; isConnected: boolean; connectedAt?: string;
}) {
  const status: Status = isConnected ? 'connected' : integration.status;
  const Icon = iconMap[integration.icon];

  return (
    <m.div layout initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }} transition={{ duration: 0.25 }}
      whileHover={{ y: -4, boxShadow: '0 16px 48px rgba(0,0,0,0.2)' }}
      style={{ ...glass, borderRadius: 20, padding: 20 }}
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
          {/* "Connected" would claim a working payment channel. All this card
              knows is that the operator's keys are present. */}
          {isConnected ? 'Keys configured' : sl[status]}
        </span>
        {isConnected && connectedAt && (
          <span style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Configured {new Date(connectedAt).toLocaleDateString()}</span>
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
              ? 'Keys are held in the server environment, not in this studio\u2019s settings. Online checkout is not enabled yet — fees are recorded manually.'
              : 'Not configured. Ask your operator to set the Razorpay keys in the server environment.'}
          </span>
        </div>
      )}
    </m.div>
  );
}

type ApiIntegration = { id: string; status: string; connected_at?: string; last_sync_at?: string };

// ── Main page ─────────────────────────────────────────────────────────────────
export default function IntegrationsPage() {
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

  const isConnected = (id: string) => apiData[id]?.status === 'connected';

  const filtered = useMemo(() => {
    const staticFiltered = STATIC_INTEGRATIONS.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const showWhatsApp =
      (category === 'all' || category === 'communication') &&
      (!search || 'whatsapp'.includes(search.toLowerCase()) || 'messages reminders receipts qr'.includes(search.toLowerCase()));
    return { staticFiltered, showWhatsApp };
  }, [category, search]);

  return (
    <Guard role="trainer">
      <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 4 }}>

        <PageHero
          className="mb-5"
          icon={<Zap size={20} />}
          title="Integrations"

        />

        {/* ── Search & Filters ── */}
        <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }} style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...glass, borderRadius: 14, padding: '4px 16px', marginBottom: 16 }}>
            <Search size={16} className="text-[var(--text-muted)]" />
            <input aria-label="Search integrations" value={search} onChange={(e) => setSearch(e.target.value)}
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
            {filtered.showWhatsApp && (
              <WhatsAppCard key="whatsapp" />
            )}
          </AnimatePresence>
        </div>

        {!filtered.staticFiltered.length && !filtered.showWhatsApp && (
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
