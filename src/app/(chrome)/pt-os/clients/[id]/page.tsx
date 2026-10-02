'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CopyId } from '@/components/ui/CopyId';
import { m } from 'framer-motion';
import {
  User, Calendar, Target,
  Dumbbell, Wallet, FileText, RefreshCw,
  CheckCircle, AlertTriangle, Clock, IndianRupee,
  Zap, Repeat, ChevronRight,
  TrendingUp, MessageCircle, Save, Pencil,
  HeartPulse, Salad, Phone,
  ShieldCheck, FileSignature, ClipboardList,
  QrCode, Printer, ScrollText, ChevronDown, Mail, FileBarChart, Sparkles,
  Gauge, PersonStanding, Accessibility, Ruler, MessagesSquare, Send,
  Cake, UserPlus, Megaphone, Hourglass, CalendarRange, UserCheck, Flag,
  Route,
} from 'lucide-react';
import Guard from '@/components/Guard';

import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { PremiumAreaChart, Button } from '@/components/ui';
import ClientAiPanel from '@/components/pt-os/ClientAiPanel';
import ClientSnapshot from '@/components/pt-os/ClientSnapshot';
import ClientLoginCard from '@/components/pt-os/ClientLoginCard';
import ClientAiGenerateCard from '@/components/pt-os/ClientAiGenerateCard';
import RenewalOfferSheet from '@/components/pt-os/RenewalOfferSheet';
import {
  ClientTabs, TabPanel, LinkPanel, TAB_COLOR, TAB_KEYS, type TabKey,
} from '@/components/pt-os/client/ClientTabs';
import RecoveryPanel from '@/components/pt-os/client/RecoveryPanel';
import PhotosPanel from '@/components/pt-os/client/PhotosPanel';
import type { ClientRecovery, MeGoal, MeGoals } from '@/lib/api';
import { printWindowCloseButtonHtml } from '@/lib/printWindowChrome';
import { errorMessage } from '@/lib/forms/errors';
import { whatsAppHref } from '@/lib/phone';
import { amber, blue, emerald, gray, red, rgba } from '@/lib/palette';
import { tones, gradient, heroMesh, type Tone } from '@/components/profile/profileTheme';
import { hasPtTerm } from '@/lib/pt-term';
import type { ScreeningSummary } from '@/lib/screening';
import { termEnded } from '@/lib/term-dates';
import MessagePreferences from '@/components/pt-os/client/MessagePreferences';
import ClientJourneyCard from '@/components/pt-os/client/ClientJourneyCard';

interface PtClientDetail {
  id: string; unique_id?: string; client_id?: string; name: string;
  email?: string; mobile?: string; whatsapp?: string; gender?: string; dob?: string;
  address?: string; photo_url?: string;
  emergency_contact?: string;
  emergency_contact_relationship?: string;
  client_source?: string;
  trainer_id?: string; trainer_name?: string;
  package_type?: string;
  /** The server's answer to "Enroll or Renew?" (backend lib/ptTerm.js). */
  has_pt_term?: boolean;
  /** The training gate's reading of consent + PAR-Q (lib/screening.ts). */
  screening?: ScreeningSummary | null;
  /** Migration 226: the client asked to stop reminders/offers on a channel. */
  whatsapp_opt_out?: boolean;
  email_opt_out?: boolean;
  comm_prefs_updated_at?: string | null;
  base_amount: number; discount: number; final_amount: number;
  /** LIFETIME paid and its derived balance — NOT this term's. See current_term_* below. */
  paid_amount: number; balance_amount: number;
  /**
   * The current PT term's money, computed by the backend (GET
   * /api/pt-os/clients/:id), which owns the definition. This page must not
   * re-derive these from subscription history: those rows are per-term
   * snapshots that no payment path updates.
   *
   * Optional only so a cached page rendering against an older API response
   * still type-checks; the fallback is the client's own fields.
   */
  current_term_fee?: number; current_term_paid?: number; current_term_balance?: number;
  joining_date?: string; pt_start_date?: string; pt_end_date?: string;
  duration_months?: number; monthly_pt_amount: number;
  trainer_commission: number; weight?: number; notes?: string;
  status: string;
  /** Absent, not zero, for a client with no PT term — check with `!= null`. */
  days_left: number | null;
  due_status?: string;
}

const fmtINR = (n: number | string | null | undefined) =>
  '₹' + Number(n ?? 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d?: string) => {
  if (!d) return '—';
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ── Colour ─────────────────────────────────────────────────────────────
// Decoration (section tiles, action buttons, the hero mesh) comes from the
// same Apple-style spectrum as My Profile — profileTheme.ts — so the coach's
// own page and the client pages they work on share one look. STATE never
// does: paid, due, overdue, expiring and document status keep the palette
// families that mean those things everywhere else in the app.
const state = (c: { 300: string; 400: string; 500: string; 600: string; 700: string }): Tone => ({
  from: c[400], to: c[600], ink: c[700], inkDark: c[300], wash: rgba(c[500], 0.12), glow: rgba(c[500], 0.32),
});
const OK = state(emerald);
const WARN = state(amber);
const BAD = state(red);
const NEUTRAL: Tone = {
  from: gray[400], to: gray[600], ink: gray[600], inkDark: gray[300], wash: rgba(gray[500], 0.12), glow: rgba(gray[500], 0.3),
};

/** Text in a tone that stays readable in dark mode (Tailwind `dark` is class-based). */
const inkClass = 'text-[var(--tone-ink)] dark:text-[var(--tone-ink-dark)]';
const inkVars = (t: Tone) => ({ '--tone-ink': t.ink, '--tone-ink-dark': t.inkDark }) as React.CSSProperties;

function getStatusConfig(status: string, days_left: number | null, pt_end_date?: string) {
  // The last day of the term is a valid day (lib/term-dates.ts).
  const endPassed = termEnded(days_left, pt_end_date);
  if (endPassed) return { label: 'Inactive', dot: gray[400] };
  if (status === 'frozen') return { label: 'Frozen', dot: blue[300] };
  if (status === 'active' && days_left != null && days_left <= 7) return { label: 'Expiring', dot: amber[400] };
  if (status === 'active') return { label: 'Active', dot: emerald[400] };
  if (status === 'expired' || status === 'inactive') return { label: 'Inactive', dot: gray[400] };
  return { label: status, dot: gray[400] };
}

/** A tinted squircle — the iOS Settings row icon. */
function Squircle({ tint, size = 30, children }: { tint: Tone; size?: number; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center text-white"
      style={{
        width: size, height: size, borderRadius: Math.round(size * 0.3),
        background: gradient(tint),
        boxShadow: `0 4px 12px -4px ${tint.from}99, inset 0 1px 0 rgba(255,255,255,0.28)`,
      }}
    >
      {children}
    </span>
  );
}

/**
 * A section on the page. Theme tokens throughout — the old card hard-coded
 * `bg-white` and `text-gray-900`, so in dark mode every section stayed a
 * white slab with near-black text on a dark page.
 */
/** One goal the member set, with the progress the member sees. */
function MemberGoalRow({ goal: g }: { goal: MeGoal }) {
  const label = g.kind === 'weight' ? `Reach ${g.target_value} kg`
    : g.kind === 'lift' ? `${g.exercise_name ?? 'Lift'} ${g.target_value} kg`
      : `${g.target_value} sessions`;
  const now = g.current_value == null ? null
    : g.kind === 'sessions' ? `${g.current_value} done` : `now ${g.current_value} kg`;
  const pct = g.progress_pct == null ? null : Math.max(0, Math.min(100, Math.round(g.progress_pct)));
  const tint = g.reached ? tones.lime : g.status === 'behind' ? tones.sunset : tones.violet;
  return (
    <div className="rounded-[14px] px-3.5 py-3" style={{ background: 'var(--bg-subtle)' }}>
      <div className="flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-[13.5px] font-[680]" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-[700] ${inkClass}`} style={{ background: tint.wash, ...inkVars(tint) }}>
          {g.reached ? 'Reached' : g.status === 'behind' ? 'Behind' : g.status === 'on_track' ? 'On track' : pct != null ? `${pct}%` : 'Started'}
        </span>
      </div>
      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
        {[now, g.target_date ? `by ${fmtDate(g.target_date)}` : null, g.projection?.eta ? `on pace for ${fmtDate(g.projection.eta)}` : null]
          .filter(Boolean).join(' · ') || 'No reading yet'}
      </p>
      {pct != null && !g.reached && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: gradient(tint) }} />
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon, tint, action, children, className = '' }: {
  title: string; icon: React.ReactNode; tint: Tone; action?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <m.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={`overflow-hidden rounded-[24px] ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 12px 32px -18px rgba(15,23,42,0.18)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
      }}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Squircle tint={tint}>{icon}</Squircle>
          <h3 className="truncate text-[15px] font-[720] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</h3>
        </div>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </m.section>
  );
}

/** A grouped-list row: tinted icon, label, value — the iOS Contacts detail row. */
function InfoRow({ icon, tint, label, value, danger, last }: {
  icon: React.ReactNode; tint: Tone; label: string; value: string; danger?: boolean; last?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5" style={last ? undefined : { borderBottom: '1px solid var(--border)' }}>
      <Squircle tint={tint} size={26}>{icon}</Squircle>
      <span className="shrink-0 text-[13px] font-[560]" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className={`min-w-0 flex-1 break-words text-right text-[13.5px] font-[650] ${danger ? inkClass : ''}`}
        style={danger ? inkVars(BAD) : { color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  );
}

// ── Documents card: PAR-Q + Informed Consent, as the training gate reads them ──
const DOC_STATUS_STYLE: Record<string, { label: string; tone: Tone }> = {
  // Distinct from `none`, and the distinction is the point: "we could not
  // check" and "there is nothing on file" need different words, because only
  // one of them means the client still has to be screened.
  unknown: { label: 'Not checked', tone: NEUTRAL },
  none: { label: 'Not started', tone: NEUTRAL },
  in_progress: { label: 'In progress', tone: WARN },
  submitted: { label: 'Submitted', tone: OK },
  reviewed: { label: 'Reviewed', tone: OK },
  completed: { label: 'Completed', tone: OK },
  revoked: { label: 'Revoked', tone: BAD },
  expired: { label: 'Expired', tone: BAD },
};

function DocumentRow({ icon, tint, label, status, detail, onClick }: {
  icon: React.ReactNode; tint: Tone; label: string; status: string; detail?: { text: string; tone: Tone } | null;
  onClick: () => void;
}) {
  // Falls back to `unknown`, not to `none`: a status this table has not
  // heard of is one we cannot interpret, which is not the same as a form
  // that was never started.
  const style = DOC_STATUS_STYLE[status] || DOC_STATUS_STYLE.unknown;
  return (
    <button onClick={onClick}
      className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-[14px] px-3 py-2.5 text-left transition active:scale-[0.99]"
      style={{ background: 'var(--bg-subtle)' }}>
      <div className="flex min-w-0 items-center gap-2.5">
        <Squircle tint={tint} size={26}>{icon}</Squircle>
        <span className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>{label}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {detail && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-[700] ${inkClass}`} style={{ background: detail.tone.wash, ...inkVars(detail.tone) }}>
            {detail.text}
          </span>
        )}
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-[700] ${inkClass}`} style={{ background: style.tone.wash, ...inkVars(style.tone) }}>
          {style.label}
        </span>
        <ChevronRight size={15} style={{ color: 'var(--text-muted)' }} />
      </div>
    </button>
  );
}

/**
 * Reads `client.screening` — the server's own reading, the same one that
 * allows or refuses training — rather than guessing from the newest row of
 * each list. Without it (an older server) every row says "Not checked".
 */
function DocumentsCard({ clientId, screening }: { clientId: string; screening?: ScreeningSummary | null }) {
  const router = useRouter();
  const parq = screening?.parq;
  const riskDetail = parq?.risk_level === 'high'
    ? { text: parq.has_valid_clearance ? 'High risk · cleared' : 'High risk', tone: parq.has_valid_clearance ? WARN : BAD }
    : parq?.risk_level === 'medium' ? { text: 'Needs review', tone: WARN } : null;

  return (
    <SectionCard title="Documents" icon={<FileSignature size={15} />} tint={NEUTRAL}>
      <div className="space-y-2">
        {screening?.block && (
          <div role="alert" className="flex items-start gap-2.5 rounded-[14px] px-3 py-2.5" style={{ background: BAD.wash }}>
            <AlertTriangle size={16} className={`mt-0.5 shrink-0 ${inkClass}`} style={inkVars(BAD)} />
            <div className="min-w-0">
              <p className={`text-[12.5px] font-[750] ${inkClass}`} style={inkVars(BAD)}>Training is blocked</p>
              <p className="text-[12.5px] leading-snug" style={{ color: 'var(--text-primary)' }}>{screening.block.message}</p>
            </div>
          </div>
        )}
        <DocumentRow icon={<FileSignature size={14} />} tint={tones.sky} label="Informed consent"
          status={screening?.consent.status ?? 'unknown'}
          onClick={() => router.push(`/pt-os/informed-consent?client_id=${clientId}`)} />
        <DocumentRow icon={<ShieldCheck size={14} />} tint={tones.lime} label="PAR-Q screening"
          status={parq?.status ?? 'unknown'} detail={riskDetail}
          onClick={() => router.push(`/pt-os/parq?client_id=${clientId}`)} />
        {!screening?.block && (screening?.warnings?.length ?? 0) > 0 && (
          <ul className="space-y-1 px-1 pt-1">
            {screening!.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5 text-[12px] leading-snug" style={{ color: 'var(--text-muted)' }}>
                <AlertTriangle size={12} className={`mt-0.5 shrink-0 ${inkClass}`} style={inkVars(WARN)} />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

// ── QR Check-in card: printable scannable code for the check-in scanner ──
function QrCheckinCard({ clientId, clientName }: { clientId: string; clientName: string }) {
  const [open, setOpen] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api.qr.generateFor('client', clientId)
      .then((res) => { if (!cancelled) setDataUrl(res.dataUrl); })
      .catch((e) => { if (!cancelled) setError(errorMessage(e, 'Failed to generate QR code')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [clientId]);

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    w.document.write(
      `<html><head><title>${clientName} — Check-in QR</title></head>` +
      `<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">` +
      printWindowCloseButtonHtml() +
      `<img src="${dataUrl}" width="280" height="280" alt="Check-in QR code" />` +
      `<p style="margin-top:12px;font-size:16px;font-weight:700;">${clientName}</p>` +
      `<p style="margin-top:2px;font-size:12px;color:#666;">Scan at check-in</p>` +
      `</body></html>`
    );
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <SectionCard title="Check-in QR" icon={<QrCode size={15} />} tint={tones.indigo}>
      {/* Collapsed by default: a print-once artefact, looked at when a client
          joins and rarely again. */}
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className={`flex h-[44px] w-full items-center justify-between gap-2 rounded-[12px] px-3.5 text-[13px] font-[650] transition active:scale-[0.99] ${inkClass}`}
        style={{ background: 'var(--bg-subtle)', ...inkVars(tones.indigo) }}>
        {open ? 'Hide code' : 'Show code'}
        <ChevronDown size={15} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div className="mt-3">
          {loading && <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Generating…</p>}
          {error && <p className={`text-[12.5px] ${inkClass}`} style={inkVars(BAD)}>{error}</p>}
          {dataUrl && !loading && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="Check-in QR code" className="h-40 w-40 rounded-[16px] bg-white p-2" />
              <button onClick={handlePrint}
                className="flex h-[44px] items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[650] text-white"
                style={{ background: gradient(tones.indigo) }}>
                <Printer size={14} /> Print card
              </button>
            </div>
          )}
        </div>
      )}
    </SectionCard>
  );
}

/**
 * Coach notes — one editor, shown on Overview and in the Notes tab.
 *
 * The Notes tab used to be a panel whose only content was a button sending
 * you back to Overview, where the notes actually lived.
 */
function NotesCard({ notes, onSave }: { notes?: string; onSave: (next: string) => Promise<boolean> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(notes || '');
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!editing) setDraft(notes || ''); }, [notes, editing]);

  const save = async () => {
    setSaving(true);
    const ok = await onSave(draft);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <SectionCard
      title="Coach notes" icon={<FileText size={15} />} tint={tones.sunset}
      action={!editing ? (
        <button type="button" onClick={() => setEditing(true)}
          className={`flex h-[36px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-[650] ${inkClass}`}
          style={{ background: tones.sunset.wash, ...inkVars(tones.sunset) }}>
          <Pencil size={12} /> {notes ? 'Edit' : 'Add'}
        </button>
      ) : undefined}
    >
      {editing ? (
        <div className="space-y-3">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} autoFocus
            aria-label="Coach notes"
            className="w-full resize-none rounded-[14px] px-3.5 py-3 text-[14px] leading-relaxed outline-none focus-visible:ring-2"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
            placeholder="Injuries, preferences, what worked last session…" />
          <div className="flex gap-2">
            <button onClick={save} disabled={saving}
              className="flex h-[44px] flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[13.5px] font-[700] text-white disabled:opacity-60"
              style={{ background: gradient(tones.sunset) }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => { setEditing(false); setDraft(notes || ''); }}
              className="h-[44px] flex-1 rounded-[12px] text-[13.5px] font-[650]"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : notes ? (
        <p className="whitespace-pre-wrap text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notes}</p>
      ) : (
        <p className="text-[13.5px]" style={{ color: 'var(--text-muted)' }}>
          Nothing written yet. Notes sit here beside the client&apos;s details, so they are read on every visit.
        </p>
      )}
    </SectionCard>
  );
}

/** One glass figure on the hero. */
function HeroStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[18px] px-3 py-2.5 sm:px-3.5 sm:py-3"
      style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <p className="flex items-center gap-1 text-[10px] font-[700] uppercase tracking-[0.08em] text-white/75">
        {icon}{label}
      </p>
      <p className="mt-1 truncate text-[16px] font-[780] leading-tight tracking-[-0.01em] text-white sm:text-[18px]">{value}</p>
    </div>
  );
}

/** A round action with its label underneath — the iOS Contacts action row. */
function ActionButton({ label, ariaLabel, icon, tint, onClick, href, external }: {
  label: string;
  /** The full name for assistive tech when the visible label is abbreviated. */
  ariaLabel?: string;
  icon: React.ReactNode; tint: Tone;
  onClick?: () => void; href?: string; external?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full text-white transition-transform group-active:scale-95"
        style={{ background: gradient(tint), boxShadow: `0 8px 20px -8px ${tint.from}, inset 0 1px 0 rgba(255,255,255,0.3)` }}>
        {icon}
      </span>
      <span className="w-full truncate text-center text-[11.5px] font-[620]" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </>
  );
  const cls = 'group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-[16px] py-1 outline-none focus-visible:ring-2';
  if (href) {
    return (
      <a href={href} className={cls} aria-label={ariaLabel ?? label}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {inner}
      </a>
    );
  }
  return <button type="button" onClick={onClick} className={cls} aria-label={ariaLabel ?? label}>{inner}</button>;
}

function ProfileSkeleton() {
  const block = (h: number, r = 24) => (
    <div className="animate-pulse" style={{ height: h, borderRadius: r, background: 'var(--bg-subtle)' }} />
  );
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading client profile">
      {block(236, 32)}
      <div className="flex justify-between gap-3 px-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="h-[52px] w-[52px] animate-pulse rounded-full" style={{ background: 'var(--bg-subtle)' }} />
        ))}
      </div>
      {block(170)}
      {block(120)}
    </div>
  );
}

// Baseline Setup is not an action here: it belongs to onboarding (see
// ClientSnapshot). Delete is not either — a destructive action does not
// belong beside "Call". It lives inside Edit.
export default function PtClientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** Readiness, lifted off the snapshot so the Check-ins tab can render it. */
  const [recovery, setRecovery] = useState<ClientRecovery | undefined>(undefined);
  /** Which section of the workspace is open. Overview is where you land. */
  const [tab, setTab] = useState<TabKey>('overview');
  // Notifications deep-link a section (a weekly check-in lands on Check-ins).
  // Read once on mount; the tabs are this page's own state after that.
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('tab');
    if (want && (TAB_KEYS as readonly string[]).includes(want)) setTab(want as TabKey);
  }, []);
  /** Ask AI — the read-only assistant scoped to this client. */
  const [aiOpen, setAiOpen] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);

  const [recentWeights, setRecentWeights] = useState<any[]>([]);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  /** Targets the member set in the member app. null until loaded or on failure. */
  const [memberGoals, setMemberGoals] = useState<MeGoals | null>(null);
  const [subscriptionHistory, setSubscriptionHistory] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true); setError('');
      const clientRes = await api.pt.client(id);
      const c = (clientRes as any)?.data ?? null;
      if (!c) { setError('Client not found'); setLoading(false); return; }
      setClient(c);

      // Three requests. Check-in and payment lists are not fetched here: none
      // of these endpoints returns a total, so a count built from a limited
      // page would be a wrong number on screen rather than a missing one.
      const [assessmentsRes, goalsRes, renewalsRes, memberGoalsRes] = await Promise.allSettled([
        api.progress.assessments.list({ client_id: id, limit: 10 }),
        api.progress.goals.list({ client_id: id }),
        api.pt.subscriptions(id),
        api.pt.memberGoals(id),
      ]);
      setMemberGoals(memberGoalsRes.status === 'fulfilled' ? memberGoalsRes.value.data : null);

      const assessments = assessmentsRes.status === 'fulfilled' && Array.isArray((assessmentsRes.value as any)?.data) ? (assessmentsRes.value as any).data : [];
      setRecentWeights(assessments.filter((a: any) => a.weight).slice(0, 6));

      const goals = goalsRes.status === 'fulfilled' && Array.isArray((goalsRes.value as any)?.data) ? (goalsRes.value as any).data : [];
      setActiveGoals(goals.filter((g: any) => g.status === 'active'));

      const renewals = renewalsRes.status === 'fulfilled' && Array.isArray((renewalsRes.value as any)?.data) ? (renewalsRes.value as any).data : [];
      setSubscriptionHistory(renewals);
    } catch (err: any) {
      setError(err?.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async (next: string): Promise<boolean> => {
    try {
      await api.clients.update(id, { notes: next });
      setClient(prev => prev ? { ...prev, notes: next } : prev);
      return true;
    } catch {
      toast.error('Failed to save notes');
      return false;
    }
  };

  useEffect(() => { loadData(); }, [id]);

  const [activePlanName, setActivePlanName] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    api.workouts.assignments.list({ client_id: id, status: 'active' }).then((rows) => {
      if (!cancelled) setActivePlanName(rows[0]?.plan_name ?? null);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [id]);

  // Shared, length-based normalisation — see lib/phone.ts.
  const whatsappHref = (phone?: string, name?: string) =>
    whatsAppHref(phone, `Hi ${name ?? 'there'}, this is your trainer from ${user?.organization_name || 'MY PT STUDIO'}.`);

  // Set only when the browser fails to load photo_url, so one bad path does
  // not leave a broken-image icon where the client's face should be.
  const [photoBroken, setPhotoBroken] = useState(false);

  const initials = (name: string) =>
    name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  // The backend owns the current-term definition (GET /clients/:id). A
  // pt_client_subscriptions row is a snapshot no payment path updates, so it
  // is never read for the current term; the fallbacks are the client's own
  // fields, for an older API response.
  const currentTermFee     = Number(client?.current_term_fee     ?? client?.final_amount   ?? 0);
  const currentTermPaid    = Number(client?.current_term_paid    ?? client?.paid_amount    ?? 0);
  const currentTermBalance = Number(client?.current_term_balance ?? client?.balance_amount ?? 0);

  // Lifetime paid across every PT term — pt_clients.paid_amount is that total.
  const lifetimePaid = Number(client?.paid_amount ?? 0);
  const lifetimeTermCount = subscriptionHistory.length > 0 ? subscriptionHistory.length : 1;

  // PT term progress: elapsed over total, clamped so a finished term is 100%.
  const totalDurationDays = client?.pt_start_date && client?.pt_end_date
    ? Math.max(1, Math.round((new Date(client.pt_end_date).getTime() - new Date(client.pt_start_date).getTime()) / 86400000))
    : 0;
  const elapsedDays = totalDurationDays > 0 && client?.pt_start_date
    ? Math.max(0, Math.min(totalDurationDays, Math.round((Date.now() - new Date(client.pt_start_date).getTime()) / 86400000)))
    : 0;
  const ptTermPct = totalDurationDays > 0 ? Math.round((elapsedDays / totalDurationDays) * 100) : 0;
  // Enroll vs Renew, from the server's term flag — never from pt_start_date,
  // which client creation used to default for everyone (lib/pt-term.ts).
  const hasTerm = hasPtTerm(client);

  // Null when the number cannot be normalised — no button then, rather than
  // a WhatsApp link to nobody.
  // The WhatsApp number when the client has one — the number every automated
  // message goes to — else the mobile. This button used the mobile alone, so
  // the trainer and the studio's own reminders could be writing to two
  // different numbers.
  const waNumber = client?.whatsapp || client?.mobile;
  const waHref = waNumber ? whatsappHref(waNumber, client?.name) : null;
  const statusCfg = client ? getStatusConfig(client.status, client.days_left, client.pt_end_date) : null;
  const balanceTint = currentTermBalance > 0 ? (client?.due_status === 'OVERDUE' ? BAD : WARN) : OK;
  const daysTint = client?.days_left != null && client.days_left <= 7 ? WARN : tones.sky;

  return (
    <Guard>
      <div className="min-h-screen">
        <div className="relative mx-auto max-w-screen-lg pb-6">

          {loading && <ProfileSkeleton />}

          {!loading && error && (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
              <Squircle tint={BAD} size={60}><AlertTriangle size={26} /></Squircle>
              <p className="text-[14px]" style={{ color: 'var(--text-muted)' }}>{error}</p>
              <button onClick={loadData}
                className="flex h-[44px] items-center gap-2 rounded-full px-5 text-[13.5px] font-[700] text-white"
                style={{ background: gradient(tones.sky) }}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && client && (
            <>
              {/* ── HERO ──
                  Who this is, how they stand, and the one action that edits
                  them. A colour mesh rather than a flat navy slab: indigo into
                  purple with pink and orange light — the page is somebody's
                  profile, not a finance statement. The glows are background
                  layers, never blurred children: on iOS Safari a filtered
                  child escapes the rounded clip as a square wedge. */}
              <m.section
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-5 overflow-hidden rounded-[32px] p-5 text-white sm:p-7"
                style={{
                  background: [
                    `radial-gradient(circle 280px at 12% 110%, ${heroMesh.glowA}, transparent 70%)`,
                    `radial-gradient(circle 260px at calc(100% - 40px) -20px, ${heroMesh.glowB}, transparent 70%)`,
                    heroMesh.base,
                  ].join(', '),
                  boxShadow: `0 28px 60px -24px ${tones.violet.glow}, inset 0 1px 0 rgba(255,255,255,0.18)`,
                }}
              >
                <div className="flex items-start gap-4 sm:gap-6">
                  {/* The client's face when there is one; onError falls back
                      to initials rather than a broken image. */}
                  <div className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[28px] font-[800] sm:h-[112px] sm:w-[112px] sm:text-[36px]"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))',
                      border: '3px solid rgba(255,255,255,0.55)',
                      boxShadow: '0 12px 28px -10px rgba(0,0,0,0.45)',
                    }}>
                    {client.photo_url && !photoBroken ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={client.photo_url} alt={client.name} onError={() => setPhotoBroken(true)}
                        className="h-full w-full object-cover" />
                    ) : (
                      initials(client.name)
                    )}
                  </div>

                  <div className="min-w-0 flex-1 pt-1">
                    <h1 className="truncate text-[24px] font-[800] leading-[1.1] tracking-[-0.03em] sm:text-[34px]">
                      {client.name}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {statusCfg && (
                        <span className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[700]"
                          style={{ background: 'rgba(255,255,255,0.20)', border: '1px solid rgba(255,255,255,0.28)' }}>
                          <span className="h-2 w-2 rounded-full" style={{ background: statusCfg.dot, boxShadow: `0 0 0 2px rgba(255,255,255,0.6)` }} />
                          {statusCfg.label}
                        </span>
                      )}
                      <CopyId id={client.unique_id || client.client_id || client.id.slice(0, 8)} color={gray[0]} />
                    </div>
                    {(client.email || client.package_type) && (
                      <p className="mt-2 truncate text-[12.5px] font-[560] text-white/75">
                        {[client.package_type, client.email].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>

                  <button onClick={() => router.push(`/pt-os/clients/${id}/edit`)}
                    aria-label="Edit profile"
                    className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[700] text-white transition active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                    <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
                  <HeroStat icon={<Hourglass size={11} />} label="Days left"
                    value={client.days_left != null ? String(Math.max(0, client.days_left)) : '—'} />
                  <HeroStat icon={<UserCheck size={11} />} label="Trainer" value={client.trainer_name || '—'} />
                  <HeroStat icon={<ScrollText size={11} />} label="Programme" value={activePlanName || 'None yet'} />
                </div>
              </m.section>

              {/* ── ACTIONS ──
                  Round, coloured, labelled underneath — the Contacts row.
                  Enroll only for somebody without a PT term, Renew only for
                  somebody with one: showing both offered a choice that only
                  ever had one right answer. */}
              <nav aria-label="Client actions" className="mb-5 flex items-start justify-between gap-1 px-1 sm:justify-start sm:gap-6 sm:px-2">
                {client.mobile && (
                  <ActionButton label="Call" icon={<Phone size={20} />} tint={tones.lime} href={`tel:${client.mobile}`} />
                )}
                {waHref && (
                  <ActionButton label="WhatsApp" icon={<MessageCircle size={20} />} tint={tones.mint} href={waHref} external />
                )}
                <ActionButton label="Message" icon={<MessagesSquare size={20} />} tint={tones.sky}
                  onClick={() => router.push(`/pt-os/messages?client=${encodeURIComponent(String(id))}`)} />
                {hasTerm ? (
                  <ActionButton label="Renew" icon={<Repeat size={20} />} tint={tones.indigo}
                    onClick={() => router.push(`/pt-os/clients/${id}/renew`)} />
                ) : (
                  <ActionButton label="Enroll" icon={<UserPlus size={20} />} tint={tones.indigo}
                    onClick={() => router.push(`/pt-os/clients/${id}/enroll`)} />
                )}
                {/* The member renews themselves: priced here, paid by UPI in their app. */}
                <ActionButton label="Offer" ariaLabel="Renewal offer" icon={<Send size={20} />} tint={tones.berry} onClick={() => setOfferOpen(true)} />
              </nav>

              {/* ── MEMBERSHIP ──
                  The term and its money in one card — they answer one
                  question ("where do they stand?") and were two blocks apart. */}
              <SectionCard
                title="PT membership" icon={<CalendarRange size={15} />} tint={tones.sky} className="mb-5"
                action={hasTerm && client.days_left != null ? (
                  <span className={`text-[13px] font-[750] tabular-nums ${inkClass}`} style={inkVars(daysTint)}>
                    {Math.max(0, client.days_left)} days left
                  </span>
                ) : undefined}
              >
                {hasTerm ? (
                  <>
                    <div className="h-2.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}
                      role="progressbar" aria-label="PT term elapsed" aria-valuenow={ptTermPct} aria-valuemin={0} aria-valuemax={100}>
                      <m.div initial={{ width: 0 }} animate={{ width: `${ptTermPct}%` }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${tones.sky.from}, ${tones.indigo.to} 55%, ${tones.berry.from})` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[11.5px] font-[560]" style={{ color: 'var(--text-muted)' }}>
                      <span>{fmtDate(client.pt_start_date)}</span>
                      <span>{fmtDate(client.pt_end_date)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    No PT term yet — enroll them to start one.
                  </p>
                )}

                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
                  {[
                    { label: 'Term fee', value: fmtINR(currentTermFee), tint: tones.sky, icon: <IndianRupee size={12} /> },
                    { label: 'Paid', value: fmtINR(currentTermPaid), tint: OK, icon: <CheckCircle size={12} /> },
                    {
                      label: 'Balance', value: fmtINR(currentTermBalance), tint: balanceTint,
                      icon: currentTermBalance > 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />,
                      // Balance's state is otherwise carried only by colour.
                      state: currentTermBalance > 0 ? (client.due_status === 'OVERDUE' ? 'Overdue' : 'Due') : 'Cleared',
                    },
                  ].map((k) => (
                    <div key={k.label} className="min-w-0 rounded-[18px] p-3"
                      style={{ background: `linear-gradient(160deg, ${k.tint.wash}, transparent)`, border: `1px solid ${k.tint.wash}` }}>
                      <p className={`flex items-center gap-1 text-[10.5px] font-[700] uppercase tracking-[0.06em] ${inkClass}`} style={inkVars(k.tint)}>
                        {k.icon}{k.label}
                        {k.state && <span className="sr-only"> — {k.state}</span>}
                      </p>
                      <p className="mt-1 truncate text-[18px] font-[800] leading-tight tracking-[-0.02em] tabular-nums sm:text-[22px]"
                        style={{ color: 'var(--text-primary)' }}>
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>
              </SectionCard>

              {/* ── CLIENT LOGIN ──
                  Under the money, because eligibility depends on it. Renders
                  nothing if the status read fails. */}
              <div className="mb-5">
                <ClientLoginCard clientId={client.id} />
              </div>

              {/* What needs attention, the goal, the coach, the records. */}
              <ClientSnapshot clientId={client.id} onLoaded={(s) => setRecovery(s.recovery)} />

              {/* ── WORKSPACE ── */}
              <ClientTabs active={tab} onChange={setTab} clientId={client.id} />

              <TabPanel id="overview" active={tab}>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {/* Where the client is in intake, and the one next thing to do. */}
                  <SectionCard title="Client journey" icon={<Route size={15} />} tint={tones.indigo}>
                    <ClientJourneyCard clientId={client.id} />
                  </SectionCard>
                  {recentWeights.length >= 2 && (
                    <SectionCard title="Weight trend" icon={<TrendingUp size={15} />} tint={tones.lime}>
                      <PremiumAreaChart
                        data={recentWeights.map((a: any) => ({
                          date: fmtDate(a.created_at || a.assessment_date).slice(0, 5),
                          weight: Number(a.weight),
                        })) as Record<string, unknown>[]}
                        xKey="date"
                        areas={[{ key: 'weight', label: 'Weight (kg)', color: emerald[500] }]}
                        height={110}
                        formatValue={(v) => `${v} kg`}
                      />
                    </SectionCard>
                  )}

                  {activeGoals.length > 0 && (
                    <SectionCard title="Active goals" icon={<Target size={15} />} tint={tones.berry}
                      action={(
                        <button onClick={() => router.push(`/pt-os/goals?client_id=${client.id}`)}
                          className={`h-[36px] rounded-full px-3 text-[12.5px] font-[650] ${inkClass}`}
                          style={{ background: tones.berry.wash, ...inkVars(tones.berry) }}>
                          View all
                        </button>
                      )}>
                      <div className="space-y-2">
                        {activeGoals.slice(0, 3).map((g: any) => (
                          <div key={g.id} className="rounded-[14px] px-3.5 py-3" style={{ background: 'var(--bg-subtle)' }}>
                            <p className="text-[13.5px] font-[680] capitalize" style={{ color: 'var(--text-primary)' }}>
                              {String(g.goal_type || g.type || 'Goal').replace(/_/g, ' ')}
                            </p>
                            {(g.target_weight || g.target_body_fat) && (
                              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                                {[g.target_weight ? `Target ${g.target_weight} kg` : null, g.target_body_fat ? `Body fat ${g.target_body_fat}%` : null]
                                  .filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  {memberGoals && memberGoals.goals.length > 0 && (
                    <SectionCard title="Their own goals" icon={<Flag size={15} />} tint={tones.violet}>
                      {/* Set by the member in the member app. Nothing on this
                          side read them before; the trainer heard of one only
                          when it was reached. */}
                      <div className="space-y-2">
                        {memberGoals.goals.slice(0, 5).map((g) => (
                          <MemberGoalRow key={g.id} goal={g} />
                        ))}
                      </div>
                    </SectionCard>
                  )}

                  <SectionCard title="Personal info" icon={<User size={15} />} tint={tones.sky}>
                    <InfoRow icon={<User size={13} />} tint={tones.indigo} label="Gender" value={client.gender || '—'} />
                    <InfoRow icon={<Cake size={13} />} tint={tones.berry} label="Birthday" value={fmtDate(client.dob)} />
                    <InfoRow icon={<Phone size={13} />} tint={tones.lime} label="Phone" value={client.mobile || '—'} />
                    {client.whatsapp && client.whatsapp !== client.mobile && (
                      <InfoRow icon={<MessageCircle size={13} />} tint={tones.mint} label="WhatsApp" value={client.whatsapp} />
                    )}
                    <InfoRow icon={<Mail size={13} />} tint={tones.sky} label="Email" value={client.email || '—'} />
                    <InfoRow icon={<Calendar size={13} />} tint={tones.sunset} label="Joined" value={fmtDate(client.joining_date)} />
                    {/* Asked at intake; the one field here a studio owner reads on purpose. */}
                    <InfoRow icon={<Megaphone size={13} />} tint={tones.violet} label="Source" value={client.client_source || '—'} last />
                  </SectionCard>

                  <SectionCard title="Messages" icon={<MessageCircle size={15} />} tint={tones.mint}>
                    <MessagePreferences clientId={client.id}
                      whatsappOptOut={client.whatsapp_opt_out === true}
                      emailOptOut={client.email_opt_out === true}
                      updatedAt={client.comm_prefs_updated_at ?? null} />
                  </SectionCard>

                  <SectionCard title="PT assignment" icon={<Dumbbell size={15} />} tint={tones.indigo}>
                    <InfoRow icon={<Calendar size={13} />} tint={tones.lime} label="Start" value={fmtDate(client.pt_start_date)} />
                    <InfoRow icon={<Calendar size={13} />} tint={tones.rose} label="End" value={fmtDate(client.pt_end_date)} />
                    <InfoRow icon={<Clock size={13} />} tint={tones.mint} label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                    <InfoRow icon={<IndianRupee size={13} />} tint={tones.sky} label="Monthly fee" value={fmtINR(client.monthly_pt_amount)} />
                    <InfoRow icon={<Hourglass size={13} />} tint={daysTint} label="Days left"
                      value={client.days_left != null ? `${client.days_left} days` : '—'}
                      danger={client.days_left != null && client.days_left <= 7} last />
                  </SectionCard>

                  <NotesCard notes={client.notes} onSave={handleSaveNotes} />

                  <div className="grid grid-cols-1 gap-4">
                    <button onClick={() => router.push(`/pt-os/session-balance?client_id=${client.id}`)}
                      className="group flex w-full items-center justify-between gap-3 rounded-[24px] p-4 text-left transition active:scale-[0.99]"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 12px 32px -18px rgba(15,23,42,0.18)' }}>
                      <div className="flex items-center gap-3">
                        <Squircle tint={tones.mint} size={40}><Zap size={17} /></Squircle>
                        <div>
                          <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>Session balance</p>
                          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Packages and sessions left</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                    </button>
                    <QrCheckinCard clientId={client.id} clientName={client.name} />
                  </div>
                </div>
              </TabPanel>

              <TabPanel id="payments" active={tab}>
                <div className="mb-4">
                  <LinkPanel
                    icon={<Wallet size={16} />}
                    title="Payments"
                    body="What has been taken, what is outstanding, and the sessions it bought."
                    color={TAB_COLOR.danger}
                    links={[
                      { label: 'Payment history', href: `/pt-os/clients/${client.id}/payments`, hint: 'Every transaction', icon: <Wallet size={15} />, color: TAB_COLOR.primary },
                      { label: 'Session balance', href: `/pt-os/session-balance?client_id=${client.id}`, hint: 'Packages and sessions left', icon: <Clock size={15} />, color: TAB_COLOR.warning },
                    ]}
                  />
                </div>
                <m.button
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => router.push(`/pt-os/clients/${client.id}/subscriptions`)}
                  className="group flex w-full flex-wrap items-center justify-between gap-4 rounded-[24px] p-5 text-left transition active:scale-[0.99]"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 12px 32px -18px rgba(15,23,42,0.18)' }}>
                  <div className="flex items-center gap-3">
                    <Squircle tint={tones.indigo} size={42}><Repeat size={18} /></Squircle>
                    <div>
                      <h3 className="text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>PT subscription history</h3>
                      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {lifetimeTermCount} term{lifetimeTermCount !== 1 ? 's' : ''} · {fmtINR(lifetimePaid)} lifetime paid
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-[700] ${inkClass}`}
                      style={{ background: balanceTint.wash, ...inkVars(balanceTint) }}>
                      {currentTermBalance > 0 ? `${fmtINR(currentTermBalance)} due` : 'Cleared'}
                    </span>
                    <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                  </div>
                </m.button>
              </TabPanel>

              {/* Tabs whose work lives on its own screen send you there rather
                  than re-implementing it; Workout Log, Measurements and
                  Nutrition go straight to their screens (see ClientTabs). */}
              <TabPanel id="training" active={tab}>
                <LinkPanel
                  icon={<Dumbbell size={16} />}
                  title="Training"
                  body={activePlanName
                    ? `Currently running "${activePlanName}".`
                    : 'No programme is assigned yet — start with a plan, then build the week.'}
                  color={TAB_COLOR.success}
                  links={[
                    { label: 'Workout programmes', href: `/pt-os/workout-plans?client_id=${client.id}`, hint: 'Design or assign a plan', icon: <ScrollText size={15} />, color: TAB_COLOR.primary },
                    { label: 'Assigned programme', href: `/pt-os/clients/${client.id}/training/assigned`, hint: 'What they are on now', icon: <ClipboardList size={15} />, color: TAB_COLOR.success },
                    { label: 'Progress analytics', href: `/pt-os/clients/${client.id}/training/analytics`, hint: 'Volume, intensity, trend', icon: <TrendingUp size={15} />, color: TAB_COLOR.warning },
                  ]}
                />
              </TabPanel>

              <TabPanel id="checkins" active={tab}>
                <RecoveryPanel recovery={recovery} clientId={client.id} />
              </TabPanel>

              <TabPanel id="photos" active={tab}>
                <PhotosPanel clientId={client.id} />
              </TabPanel>

              <TabPanel id="notes" active={tab}>
                {/* The notes themselves, not a button back to Overview. */}
                <NotesCard notes={client.notes} onSave={handleSaveNotes} />
              </TabPanel>

              <TabPanel id="ai" active={tab}>
                {/* The one-tap generators live with the rest of the AI tools
                    rather than between the money and the tabs, where they
                    pushed the workspace a full screen down on a phone. */}
                <div className="mb-4">
                  <ClientAiGenerateCard client={client} goalType={activeGoals[0]?.goal_type} />
                </div>
                <LinkPanel
                  icon={<Sparkles size={16} />}
                  title="AI Coach"
                  body="The observations above the tabs are derived from this client's own readings. The assistant can go further — ask it about their programme, recovery or nutrition."
                  color={TAB_COLOR.warning}
                  action={(
                    <Button
                      iconLeft={<Sparkles size={15} />}
                      onClick={() => setAiOpen(true)}
                      style={{ background: gradient(tones.violet), color: '#fff' }}
                    >
                      Ask AI about {client.name?.split(' ')[0] || 'this client'}
                    </Button>
                  )}
                  links={[
                    { label: 'AI progress analysis', href: `/ai/progress-analysis?client_id=${client.id}`, hint: 'Trend and recommendations', icon: <TrendingUp size={15} />, color: TAB_COLOR.primary },
                    { label: 'AI workout generator', href: `/ai/workout-generator?client_id=${client.id}`, hint: 'Draft a programme', icon: <Dumbbell size={15} />, color: TAB_COLOR.success },
                    { label: 'AI diet generator', href: `/ai/diet-generator?client_id=${client.id}`, hint: 'Draft a meal plan', icon: <Salad size={15} />, color: TAB_COLOR.warning },
                    { label: 'Training brief', href: `/pt-os/workout-plans?client_id=${client.id}`, hint: 'Everything needed to design a programme', icon: <FileText size={15} />, color: TAB_COLOR.danger },
                  ]}
                />
              </TabPanel>

              <TabPanel id="reports" active={tab}>
                <LinkPanel
                  icon={<FileBarChart size={16} />}
                  title="Reports"
                  body="What this client's month looks like. The studio-wide report is a different question and lives on its own screen."
                  color={TAB_COLOR.success}
                  links={[
                    { label: 'Progress analytics', href: `/pt-os/clients/${client.id}/training/analytics`, hint: 'Volume, intensity, trend', icon: <TrendingUp size={15} />, color: TAB_COLOR.success },
                    { label: 'Payment history', href: `/pt-os/clients/${client.id}/payments`, hint: 'Every transaction', icon: <Wallet size={15} />, color: TAB_COLOR.primary },
                    { label: 'Measurements', href: `/pt-os/measurements?client_id=${client.id}`, hint: 'Readings over time', icon: <Ruler size={15} />, color: TAB_COLOR.danger },
                    { label: 'Studio reports', href: '/insights/revenue', hint: 'Revenue and commissions across the studio', icon: <FileBarChart size={15} />, color: TAB_COLOR.warning },
                  ]}
                />
              </TabPanel>

              <TabPanel id="documents" active={tab}>
                <div className="mb-4">
                  <LinkPanel
                    icon={<ShieldCheck size={16} />}
                    title="Screening &amp; assessments"
                    body="The forms the training brief is assembled from."
                    color={TAB_COLOR.dangerDeep}
                    links={[
                      { label: 'PAR-Q', href: `/pt-os/parq?client_id=${client.id}`, hint: 'Medical clearance', icon: <ShieldCheck size={15} />, color: TAB_COLOR.success },
                      { label: 'Informed consent', href: `/pt-os/informed-consent?client_id=${client.id}`, hint: 'Signed agreement', icon: <FileSignature size={15} />, color: TAB_COLOR.primary },
                      { label: 'Client interview', href: `/pt-os/interview?client_id=${client.id}`, hint: 'History, pain, lifestyle, goals', icon: <MessagesSquare size={15} />, color: TAB_COLOR.primary },
                      { label: 'Lifestyle assessment', href: `/pt-os/lifestyle-assessment?client_id=${client.id}`, hint: 'Sleep, stress, recovery', icon: <HeartPulse size={15} />, color: TAB_COLOR.danger },
                      { label: 'Posture assessment', href: `/pt-os/posture-assessment?client_id=${client.id}`, hint: 'Alignment findings', icon: <Accessibility size={15} />, color: TAB_COLOR.primary },
                      { label: 'Mobility assessment', href: `/pt-os/mobility-assessment?client_id=${client.id}`, hint: 'Restriction and pain', icon: <PersonStanding size={15} />, color: TAB_COLOR.danger },
                      { label: 'Fitness testing', href: `/pt-os/assessment?client_id=${client.id}`, hint: 'Strength, cardio, flexibility', icon: <Gauge size={15} />, color: TAB_COLOR.warning },
                    ]}
                  />
                </div>
                <DocumentsCard clientId={client.id} screening={client.screening} />
              </TabPanel>
            </>
          )}
        </div>
      </div>

      {/* Rendered only while open. The AI panel is keyed by client id, so no
          transcript survives a switch to another client. */}
      {offerOpen && client && (
        <RenewalOfferSheet
          client={{ id: String(id), name: client.name, mobile: client.mobile, duration_months: client.duration_months, final_amount: client.final_amount }}
          onClose={() => setOfferOpen(false)} />
      )}

      {aiOpen && client && (
        <ClientAiPanel
          key={client.id}
          clientId={client.id}
          clientName={client.name || 'this client'}
          onClose={() => setAiOpen(false)}
        />
      )}
    </Guard>
  );
}
