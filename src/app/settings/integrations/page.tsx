'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap, Search, Check, X, ChevronRight, Link2, Unlink, Key,
  Clock, Shield, Activity, ExternalLink, Globe, Smartphone,
  CreditCard, MessageSquare, Brain, Calendar, Camera,
  BarChart3, RefreshCw, AlertTriangle, CheckCircle2,
  Copy, Eye, EyeOff, Loader2, Plus, Settings, Webhook,
  Bot, Wifi, Cpu, Radio, Cloud,
} from 'lucide-react';

type IntegrationStatus = 'connected' | 'error' | 'pending' | 'unavailable';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  status: IntegrationStatus;
  connectedAt?: string;
  lastSync?: string;
  docsUrl?: string;
  popular?: boolean;
  comingSoon?: boolean;
}

const CATEGORIES = [
  { id: 'all', label: 'All Integrations', icon: <Zap size={13} /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard size={13} /> },
  { id: 'communication', label: 'Communication', icon: <MessageSquare size={13} /> },
  { id: 'ai', label: 'AI & Automation', icon: <Brain size={13} /> },
  { id: 'scheduling', label: 'Scheduling', icon: <Calendar size={13} /> },
  { id: 'devices', label: 'Devices & IoT', icon: <Camera size={13} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={13} /> },
];

// TODO: Fetch integrations from API endpoint

function StatusDot({ status }: { status: IntegrationStatus }) {
  const cfg = {
    connected: { bg: '#10b981', label: 'Connected' },
    error: { bg: '#ef4444', label: 'Error' },
    pending: { bg: '#f59e0b', label: 'Pending' },
    unavailable: { bg: '#94a3b8', label: 'Unavailable' },
  }[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold" style={{ color: cfg.bg }}>
      <span className="relative flex h-2 w-2">
        <span className="absolute h-full w-full rounded-full" style={{ background: cfg.bg, opacity: 0.3, animation: status === 'connected' ? 'pulse-ring 2s ease infinite' : 'none' }} />
        <span className="h-2 w-2 rounded-full" style={{ background: cfg.bg }} />
      </span>
      {cfg.label}
    </span>
  );
}

function IntegrationCard({ integration, onToggle }: { integration: Integration; onToggle: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-[18px] p-4 transition-all duration-200 hover:shadow-lg"
      style={{
        background: 'rgba(255,255,255,0.78)',
        border: '1px solid rgba(255,255,255,0.55)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-all"
          style={{ background: integration.bg, color: integration.color }}
        >
          {integration.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {integration.name}
            </h3>
            {integration.popular && (
              <span className="rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(124,58,237,0.10)', color: '#7c3aed' }}>
                Popular
              </span>
            )}
            {integration.comingSoon && (
              <span className="rounded-full px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-wider"
                style={{ background: 'rgba(245,158,11,0.10)', color: '#f59e0b' }}>
                Coming Soon
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            {integration.description}
          </p>
          <div className="mt-1.5 flex items-center gap-3">
            <StatusDot status={integration.status} />
            {integration.lastSync && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                Sync: {integration.lastSync}
              </span>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {integration.comingSoon ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(148,163,184,0.08)' }}>
              <Clock size={14} style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : integration.status === 'connected' ? (
            <button
              onClick={() => onToggle(integration.id)}
              className="flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[11px] font-bold text-rose-600 transition-all hover:bg-rose-50"
              style={{ background: 'rgba(225,29,72,0.06)' }}
            >
              <Unlink size={12} /> Disconnect
            </button>
          ) : (
            <button
              onClick={() => onToggle(integration.id)}
              className="flex h-8 items-center gap-1.5 rounded-[10px] px-3 text-[11px] font-bold text-emerald-600 transition-all hover:bg-emerald-50"
              style={{ background: 'rgba(16,185,129,0.08)' }}
            >
              <Link2 size={12} /> Connect
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {expanded && integration.status === 'connected' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 overflow-hidden"
          >
            <div className="rounded-[12px] p-3" style={{ background: 'rgba(248,250,252,0.80)', border: '1px solid rgba(15,23,42,0.06)' }}>
              <div className="flex items-center justify-between text-[11.5px]">
                <span style={{ color: 'var(--text-muted)' }}>Connected</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{integration.connectedAt}</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11.5px]">
                <span style={{ color: 'var(--text-muted)' }}>Last Sync</span>
                <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{integration.lastSync}</span>
              </div>
              <button
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-[10px] py-2 text-[11px] font-semibold transition-all hover:bg-white/80"
                style={{ background: 'rgba(255,255,255,0.60)', color: 'var(--text-secondary)' }}
              >
                <Settings size={11} /> Configure
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ApiKeySection() {
  const [keys, setKeys] = useState([
    { id: '1', name: 'Production API Key', key: '619_live_8a7f3b2c9d1e4f5a6b7c8d9e0f1a2b3c', created: '15 Jan 2026', lastUsed: '2 mins ago', env: 'production' },
    { id: '2', name: 'Development API Key', key: '619_test_3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d', created: '20 Mar 2026', lastUsed: '1 hr ago', env: 'development' },
  ]);
  const [visible, setVisible] = useState<Record<string, boolean>>({});

  const copyKey = (key: string) => navigator.clipboard?.writeText(key);

  return (
    <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(124,58,237,0.08)' }}>
          <Key size={14} style={{ color: '#7c3aed' }} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>API Keys</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Manage your API keys for programmatic access</p>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {keys.map((k) => (
          <div key={k.id} className="rounded-[14px] p-3.5 transition-all hover:shadow-sm"
            style={{ background: 'rgba(248,250,252,0.85)', border: '1px solid rgba(15,23,42,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{k.name}</span>
                <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase" style={{ background: k.env === 'production' ? 'rgba(16,185,129,0.10)' : 'rgba(245,158,11,0.10)', color: k.env === 'production' ? '#10b981' : '#f59e0b' }}>
                  {k.env}
                </span>
              </div>
              <div className="flex gap-1">
                <button onClick={() => copyKey(k.key)} className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-all hover:bg-white/80" style={{ color: 'var(--text-muted)' }}>
                  <Copy size={12} />
                </button>
                <button onClick={() => setVisible((v) => ({ ...v, [k.id]: !v[k.id] }))} className="flex h-7 w-7 items-center justify-center rounded-[8px] transition-all hover:bg-white/80" style={{ color: 'var(--text-muted)' }}>
                  {visible[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ background: 'rgba(15,23,42,0.03)' }}>
              <code className="flex-1 text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                {visible[k.id] ? k.key : `${k.key.slice(0, 12)}${'•'.repeat(20)}${k.key.slice(-4)}`}
              </code>
            </div>
            <div className="mt-2 flex gap-4 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              <span>Created: {k.created}</span>
              <span>Last used: {k.lastUsed}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2.5 text-[12px] font-semibold transition-all hover:shadow-sm"
        style={{ background: 'rgba(124,58,237,0.06)', color: '#7c3aed', border: '1px dashed rgba(124,58,237,0.20)' }}>
        <Plus size={13} /> Generate New API Key
      </button>
    </div>
  );
}

function WebhookSection() {
  const [hooks] = useState([
    { id: '1', name: 'Member Created', url: 'https://api.619fitness.com/webhooks/member-created', events: '2.3k', lastTriggered: '5 mins ago', status: 'active' as const },
    { id: '2', name: 'Payment Received', url: 'https://api.619fitness.com/webhooks/payment', events: '1.1k', lastTriggered: '2 mins ago', status: 'active' as const },
    { id: '3', name: 'Check-in Event', url: 'https://api.619fitness.com/webhooks/checkin', events: '8.7k', lastTriggered: 'Just now', status: 'active' as const },
  ]);

  return (
    <div className="rounded-[20px] p-5" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.55)', boxShadow: '0 2px 8px rgba(15,23,42,0.05)' }}>
      <div className="flex items-center gap-2.5 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: 'rgba(16,185,129,0.08)' }}>
          <Webhook size={14} style={{ color: '#10b981' }} />
        </div>
        <div>
          <h2 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Webhooks</h2>
          <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>Real-time event notifications to your endpoints</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {hooks.map((h) => (
          <div key={h.id} className="rounded-[14px] p-3.5 transition-all"
            style={{ background: 'rgba(248,250,252,0.85)', border: '1px solid rgba(15,23,42,0.06)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute h-full w-full rounded-full bg-emerald-500 opacity-30" style={{ animation: 'pulse-ring 2s ease infinite' }} />
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                <span className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{h.name}</span>
              </div>
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{h.events} events</span>
            </div>
            <div className="rounded-[10px] px-3 py-2 text-[11px] font-mono" style={{ background: 'rgba(15,23,42,0.03)', color: 'var(--text-muted)' }}>
              {h.url}
            </div>
            <div className="mt-1.5 text-[10.5px]" style={{ color: 'var(--text-muted)' }}>
              Last triggered: {h.lastTriggered}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [connected, setConnected] = useState<Set<string>>(new Set());

  const toggleIntegration = (id: string) => {
    setConnected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = useMemo(() => {
    return integrations.filter((i) => {
      if (category !== 'all' && i.category !== category) return false;
      if (search && !i.name.toLowerCase().includes(search.toLowerCase()) && !i.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [integrations, category, search]);

  const stats = useMemo(() => ({
    total: integrations.length,
    connected: connected.size,
    errors: integrations.filter((i) => i.status === 'error').length,
    pending: integrations.filter((i) => i.status === 'pending' || i.comingSoon).length,
  }), [integrations, connected]);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(2.5); opacity: 0; }
        }
      `}</style>

      {/* ── Executive Header ── */}
      <div className="border-b" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
        <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(124,58,237,0.10)' }}>
                  <Zap size={16} style={{ color: '#7c3aed' }} />
                </div>
                <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Integrations</h1>
              </div>
              <p className="mt-1.5 ml-0 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Connect your studio with the tools you use every day.</p>
            </div>
            <button className="flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-[740] text-white transition-all hover:brightness-105 active:scale-95"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 4px 16px rgba(124,58,237,0.28)' }}>
              <ExternalLink size={14} /> Explore Marketplace
            </button>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-4 gap-3 sm:flex sm:flex-wrap">
            {[
              { label: 'Total', value: stats.total, color: '#7c3aed', icon: <Zap size={12} /> },
              { label: 'Connected', value: stats.connected, color: '#10b981', icon: <CheckCircle2 size={12} /> },
              { label: 'Errors', value: stats.errors, color: '#ef4444', icon: <AlertTriangle size={12} /> },
              { label: 'Pending', value: stats.pending, color: '#f59e0b', icon: <Clock size={12} /> },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-[12px] px-3.5 py-2.5"
                style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(15,23,42,0.07)' }}>
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px]" style={{ background: `${s.color}12`, color: s.color }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[17px] font-[800] leading-none" style={{ color: 'rgb(15,23,42)' }}>{s.value}</p>
                  <p className="text-[10px] font-medium" style={{ color: 'rgb(148,163,184)' }}>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* ── Sidebar ── */}
          <div className="lg:w-[200px] shrink-0">
            <div className="rounded-[18px] p-2" style={{ background: 'rgba(255,255,255,0.70)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.50)' }}>
              <div className="relative mb-2 flex items-center gap-2 rounded-[12px] px-3 py-2" style={{ background: 'rgba(248,250,252,0.90)' }}>
                <Search size={12} style={{ color: 'var(--text-muted)' }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..." className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: 'var(--text-primary)' }} />
                {search && (
                  <button onClick={() => setSearch('')}><X size={11} style={{ color: 'var(--text-muted)' }} /></button>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                {CATEGORIES.map((cat) => (
                  <button key={cat.id} onClick={() => setCategory(cat.id)}
                    className="flex items-center gap-2.5 rounded-[11px] px-3 py-2.5 text-[12px] font-semibold transition-all"
                    style={{
                      background: category === cat.id ? 'rgba(255,255,255,0.90)' : 'transparent',
                      color: category === cat.id ? '#7c3aed' : 'var(--text-muted)',
                      boxShadow: category === cat.id ? '0 1px 4px rgba(15,23,42,0.06)' : 'none',
                    }}>
                    {cat.icon}
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Grid ── */}
          <div className="flex-1">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filtered.map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={{ ...integration, status: connected.has(integration.id) ? 'connected' : integration.status === 'error' ? 'error' : 'pending' }}
                    onToggle={toggleIntegration}
                  />
                ))}
              </AnimatePresence>
            </div>
            {integrations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: 'rgba(148,163,184,0.08)' }}>
                  <Cloud size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Integration data not yet available from API</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Connect to the backend to see available integrations.</p>
              </div>
            ) : filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[18px]" style={{ background: 'rgba(148,163,184,0.08)' }}>
                  <Search size={24} style={{ color: 'var(--text-muted)' }} />
                </div>
                <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>No integrations found</p>
                <p className="mt-1 text-[13px]" style={{ color: 'var(--text-muted)' }}>Try a different category or search term.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── API & Webhooks Section ── */}
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          <ApiKeySection />
          <WebhookSection />
        </div>

        {/* ── AI Recommendations ── */}
        {stats.connected < stats.total && (
          <div className="mt-6 rounded-[20px] p-5" style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(99,102,241,0.04))', border: '1px solid rgba(124,58,237,0.12)' }}>
            <div className="flex items-center gap-2.5 mb-3">
              <Brain size={16} style={{ color: '#7c3aed' }} />
              <h2 className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>AI Recommendations</h2>
            </div>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Connect {integrations.filter((i) => i.popular && !connected.has(i.id)).map((i) => i.name).join(', ')} to unlock automated workflows, smart insights, and seamless member experiences.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {integrations.filter((i) => i.popular && !connected.has(i.id)).map((i) => (
                <button key={i.id} onClick={() => toggleIntegration(i.id)}
                  className="inline-flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[11px] font-semibold transition-all hover:brightness-95"
                  style={{ background: i.bg, color: i.color, border: `1px solid ${i.color}20` }}>
                  <Plus size={11} /> {i.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
