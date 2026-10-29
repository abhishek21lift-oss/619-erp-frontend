'use client';

// Manual WhatsApp outreach.
//
// ── What this page is, and is not ───────────────────────────────────────────
//
// It opens a pre-filled wa.me chat in the trainer's own WhatsApp. It does NOT
// send anything: the message leaves only when the trainer presses Send inside
// WhatsApp. So the page must never say "delivered", and the counter is "chats
// opened", not "messages sent".
//
// Automated reminders are a different path — the studio's paired gateway
// (settings/integrations). Its state is shown here because a trainer planning
// outreach needs to know whether the automated half is live, but this page
// does not drive it.
//
// SMS is not implemented anywhere in the backend. The old title claimed
// "WhatsApp / SMS"; it now says WhatsApp and states the SMS gap explicitly.

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import Image from 'next/image';
import Guard from '@/components/Guard';
import { PageContainer, PageHero } from '@/components/ui';
import {
  MessageCircle, Send, Users, CheckCircle2, Phone, Clock, Search, X,
  ExternalLink, AlertTriangle, Loader2, Settings2, RefreshCw, CheckCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { WhatsAppStatus } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { whatsAppHref, toWhatsAppNumber } from '@/lib/phone';
import { FormField, TextArea, TextInput } from '@/components/ui/form';

interface Member {
  id: string;
  name?: string;
  mobile?: string;
  photo_url?: string;
  pt_end_date?: string;
  balance_amount?: number;
}

function buildTemplates(studio: string) {
  return [
    { id: 'renewal', name: 'Renewal Reminder', body: `Hi {name}! 👋 Your membership with ${studio} expires on {date}. Renew today and keep your fitness streak going! Call us: ${process.env.NEXT_PUBLIC_SUPPORT_PHONE || '8756562188'}` },
    { id: 'birthday', name: 'Birthday Wish', body: `Happy Birthday {name}! 🎂🎉 ${studio} wishes you a fantastic year ahead. Come in today for a special birthday session on us! 💪` },
    { id: 'due', name: 'Due Reminder', body: `Hi {name}, you have a pending balance of ₹{amount} with ${studio}. Please clear it at your earliest convenience. Thank you! 🙏` },
    { id: 'welcome', name: 'New Member Welcome', body: `Welcome to ${studio}, {name}! 🏋️ We are thrilled to have you. Your fitness journey starts today. Here to help you reach your goals. See you soon! 💪` },
    { id: 'custom', name: 'Custom Message', body: '' },
  ];
}

const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as [number, number, number, number] } },
};

export default function WhatsAppPage() {
  return <Guard role="trainer"><WAContent /></Guard>;
}

function WAContent() {
  const { user } = useAuth();
  const studioName = user?.organization_name || 'MY PT STUDIO';
  const templates = useMemo(() => buildTemplates(studioName), [studioName]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [template, setTemplate] = useState(templates[0]);
  const [customMsg, setCustomMsg] = useState('');
  // Chats this trainer opened in THIS session. Not delivery, not persisted.
  const [opened, setOpened] = useState(0);
  const [integration, setIntegration] = useState<WhatsAppStatus | null>(null);
  const { toast } = useToast();

  const loadMembers = useCallback(() => {
    setLoading(true);
    setLoadError('');
    api.clients.list({ status: 'active' })
      .then((d) => { setMembers(Array.isArray(d) ? (d as unknown as Member[]) : []); })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Failed to load members';
        setLoadError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  // Integration state is advisory: a failure here must not block manual chats.
  useEffect(() => {
    api.whatsapp.status().then(setIntegration).catch(() => setIntegration(null));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => (m.name || '').toLowerCase().includes(q) || (m.mobile || '').includes(q));
  }, [members, search]);

  const toggleSelect = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const selectAll = () => setSelected(filtered.map((m) => m.id));
  const clearAll = () => setSelected([]);

  function buildMsg(member: Member) {
    const body = template.id === 'custom' ? customMsg : template.body;
    return body
      .replace('{name}', member.name || 'there')
      .replace('{date}', member.pt_end_date || 'soon')
      .replace('{amount}', String(member.balance_amount || 0));
  }

  /** Opens one chat. Returns false when the number is unusable or the tab was blocked. */
  function openWhatsApp(member: Member): boolean {
    const href = whatsAppHref(member.mobile, buildMsg(member));
    if (!href) {
      toast.error(`${member.name || 'Member'} has no usable phone number on file`);
      return false;
    }
    const win = window.open(href, '_blank');
    if (!win) {
      toast.error('The browser blocked the WhatsApp tab. Allow pop-ups for this site, then try again.');
      return false;
    }
    win.opener = null;
    setOpened((n) => n + 1);
    return true;
  }

  function sendBulk() {
    const targets = members.filter((m) => selected.includes(m.id));
    const reachable = targets.filter((m) => toWhatsAppNumber(m.mobile));
    const skipped = targets.length - reachable.length;
    if (!reachable.length) {
      toast.error('None of the selected members has a usable phone number.');
      return;
    }
    const ok = window.confirm(
      `Open ${reachable.length} WhatsApp chat${reachable.length > 1 ? 's' : ''}?` +
      `\n\nEach opens in a new tab with the message pre-filled. Nothing is sent until you press Send inside WhatsApp.` +
      (skipped ? `\n\n${skipped} member${skipped > 1 ? 's have' : ' has'} no usable number and will be skipped.` : ''),
    );
    if (!ok) return;

    let blocked = 0;
    for (const member of reachable) {
      const href = whatsAppHref(member.mobile, buildMsg(member));
      if (!href) continue;
      const win = window.open(href, '_blank');
      if (!win) { blocked += 1; continue; }
      win.opener = null;
      setOpened((n) => n + 1);
    }
    if (blocked) {
      toast.error(
        `${blocked} tab${blocked > 1 ? 's were' : ' was'} blocked by the browser. Allow pop-ups for this site, or open chats one at a time.`,
      );
    }
  }

  const connected = integration?.state === 'connected';
  const integrationKnown = integration !== null;

  return (
    <PageContainer>
      <PageHero
        icon={<MessageCircle size={20} />}
        title="WhatsApp"
        subtitle="Open a pre-filled chat in your own WhatsApp. Nothing is sent until you press Send there."
        compact
      />

      <div className="mx-auto w-full max-w-6xl space-y-5">

        {/* ── Capability + integration status ── */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50 p-4">
            <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-emerald-900">Manual chats — available</p>
              <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                Opens WhatsApp Web or the app with your message. A tab opening is not a delivery
                receipt; check each chat for the sent tick.
              </p>
            </div>
          </div>

          <div className={`flex items-start gap-3 rounded-[20px] border p-4 ${
            connected ? 'border-blue-200 bg-blue-50'
              : integrationKnown && integration?.configured ? 'border-amber-200 bg-amber-50'
                : 'border-gray-200 bg-gray-50'
          }`}>
            {connected
              ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />}
            <div className="min-w-0 flex-1">
              <p className={`text-sm font-bold ${connected ? 'text-blue-900' : 'text-gray-900'}`}>
                Automated reminders — {connected
                  ? 'connected'
                  : !integrationKnown ? 'status unavailable'
                    : integration?.configured ? 'not connected' : 'not set up'}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">
                {connected
                  ? <>Sending from {integration.phone_e164 || 'your studio number'}. </>
                  : 'Automated rules are paused until this studio pairs its own WhatsApp. Manual chats below still work.'}
              </p>
              <Link href="/settings/integrations" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline">
                <Settings2 className="h-3 w-3" /> {connected ? 'Manage connection' : 'Connect in Settings'}
              </Link>
            </div>
          </div>
        </div>

        {/* ── KPI CARDS ── */}
        <m.div variants={containerVariants} initial="hidden" animate="visible" className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active members', value: members.length, icon: <Users size={18} />, color: '#0067e0' },
            { label: 'Selected', value: selected.length, icon: <CheckCircle2 size={18} />, color: '#0067e0' },
            { label: 'Chats opened', value: opened, icon: <MessageCircle size={18} />, color: '#10b981', hint: 'this session' },
          ].map((k) => (
            <m.div key={k.label} variants={itemVariants}
              className="relative overflow-hidden rounded-[20px] border border-gray-200 bg-white p-4 sm:p-5"
              style={{ boxShadow: 'var(--shadow-xs)' }}>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: `${k.color}18`, color: k.color }}>
                  {k.icon}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-gray-500 sm:text-[11px]">{k.label}</span>
              </div>
              <div className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">{k.value}</div>
              {k.hint && <div className="mt-0.5 text-[10px] text-gray-400">{k.hint}</div>}
            </m.div>
          ))}
        </m.div>

        {/* ── MAIN CONTENT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

          {/* Member list */}
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-[20px] border border-gray-200 bg-white" style={{ boxShadow: 'var(--shadow-xs)' }}>
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 bg-gray-50 px-4 py-3">
              <div className="flex min-w-[180px] flex-1 items-center gap-2 rounded-[10px] border border-gray-300 bg-white px-3 py-2">
                <Search size={14} className="text-gray-400" />
                <FormField label="Search members" labelHidden className="min-w-0 flex-1">
                  <TextInput
                    placeholder="Search members…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="border-none bg-transparent px-0 text-[13px] font-medium"
                    style={{ minHeight: 0, padding: 0, background: 'transparent', border: 'none', color: 'var(--text-primary)' }}
                  />
                </FormField>
                {search && (
                  <button onClick={() => setSearch('')} aria-label="Clear search" className="text-gray-400 hover:text-gray-600">
                    <X size={13} />
                  </button>
                )}
              </div>
              <button onClick={selectAll} className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100">
                All
              </button>
              <button onClick={clearAll} className="rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-200">
                None
              </button>
            </div>

            <div className="max-h-[520px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-10 text-sm text-gray-400">
                  <Loader2 size={16} className="animate-spin" /> Loading members…
                </div>
              ) : loadError ? (
                <div role="alert" className="p-6 text-center">
                  <p className="text-sm font-semibold text-red-700">Could not load members</p>
                  <p className="mt-1 text-xs text-gray-500">{loadError}</p>
                  <button onClick={loadMembers} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50">
                    <RefreshCw size={12} /> Retry
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-10 text-center text-sm text-gray-400">
                  {search ? 'No members match that search.' : 'No active members found.'}
                </div>
              ) : (
                filtered.map((member) => {
                  const isSelected = selected.includes(member.id);
                  const reachable = Boolean(toWhatsAppNumber(member.mobile));
                  return (
                    <div
                      key={member.id}
                      onClick={() => toggleSelect(member.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(member.id); }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={isSelected}
                      aria-label={`Select ${member.name || 'member'}`}
                      className={`flex items-center gap-3 border-b border-gray-100 px-4 py-3 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                    >
                      <input
                        aria-label={`Select ${member.name || 'member'}`}
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(member.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-700">
                        {member.photo_url
                          ? <Image src={member.photo_url} alt={member.name || ''} width={36} height={36} className="h-full w-full object-cover" />
                          : (member.name || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-bold text-gray-900">{member.name || 'Unnamed member'}</div>
                        <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500">
                          <span className={`inline-flex items-center gap-1 ${reachable ? '' : 'text-red-600'}`}>
                            <Phone size={10} />{reachable ? member.mobile : 'No usable number'}
                          </span>
                          {member.pt_end_date && <span className="inline-flex items-center gap-1"><Clock size={10} />Exp: {member.pt_end_date}</span>}
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); openWhatsApp(member); }}
                        disabled={!reachable}
                        title={reachable ? 'Open a pre-filled WhatsApp chat' : 'Add a valid mobile number first'}
                        className="flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[11px] font-bold transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
                        style={reachable
                          ? { background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', boxShadow: '0 4px 12px rgba(0,103,224,0.3)' }
                          : { background: '#f1f5f9', color: '#94a3b8' }}
                      >
                        <MessageCircle size={12} /> Open
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {selected.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
                <span className="text-[13px] font-semibold text-blue-700">
                  {selected.length} member{selected.length > 1 ? 's' : ''} selected
                </span>
                <button
                  onClick={sendBulk}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', boxShadow: '0 4px 16px rgba(0,103,224,0.35)' }}
                >
                  <Send size={13} /> Open selected chats
                </button>
              </div>
            )}
          </m.div>

          {/* Template panel */}
          <div className="flex flex-col gap-4">
            <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="rounded-[20px] border border-gray-200 bg-white p-5" style={{ boxShadow: 'var(--shadow-xs)' }}>
              <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-gray-900">
                <MessageCircle size={15} className="text-blue-600" /> Message template
              </h3>
              <div className="mb-4 flex flex-col gap-1.5">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t)}
                    aria-pressed={template.id === t.id}
                    className={`rounded-[10px] border px-4 py-2.5 text-left text-[13px] transition-colors ${
                      template.id === t.id
                        ? 'border-blue-600 bg-blue-50 font-bold text-blue-700'
                        : 'border-gray-200 bg-gray-50 font-medium text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
              {template.id === 'custom' ? (
                <FormField label="Custom message" labelHidden>
                  <TextArea
                    rows={6}
                    value={customMsg}
                    onChange={(e) => setCustomMsg(e.target.value)}
                    placeholder="Write your custom message. Use {name} for member name, {date} for expiry date, {amount} for balance."
                    className="rounded-[10px] px-3.5 py-3 text-[13px] leading-relaxed"
                    style={{ border: '1px solid #d1d5db', background: '#f9fafb', color: 'var(--text-primary)' }}
                  />
                </FormField>
              ) : (
                <div className="whitespace-pre-wrap rounded-[10px] border border-gray-200 bg-gray-50 p-3.5 text-[13px] leading-relaxed text-gray-700">
                  {template.body}
                </div>
              )}
            </m.div>

            <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="rounded-[20px] border border-blue-200 bg-blue-50 p-5">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-bold text-blue-800">
                <ExternalLink size={14} /> Opens WhatsApp — does not send
              </div>
              <p className="m-0 text-xs leading-relaxed text-blue-800">
                Each button opens WhatsApp Web or the app with the message pre-filled. You press
                Send there, in your own number. Opening a tab is not proof of delivery.
              </p>
              <p className="m-0 mt-2 text-xs leading-relaxed text-amber-700">
                SMS is not connected. This page sends nothing over SMS.
              </p>
            </m.div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
