'use client';

import { use, useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CopyId } from '@/components/ui/CopyId';
import { m, useReducedMotion } from 'framer-motion';
import {
  User, Calendar,
  Dumbbell, Wallet, FileText, RefreshCw,
  CheckCircle, AlertTriangle, Clock, IndianRupee,
  Zap, Repeat, ChevronRight,
  TrendingUp, MessageCircle, Save, Pencil,
  HeartPulse, Salad, Phone,
  ShieldCheck, FileSignature, ClipboardList,
  QrCode, Printer, ScrollText, ChevronDown, Mail, FileBarChart, Sparkles,
  Gauge, PersonStanding, Accessibility, Ruler, MessagesSquare, Send,
  Cake, UserPlus, Megaphone, CalendarRange, Flag,
  Route,
} from 'lucide-react';
import Guard from '@/components/Guard';

import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth-context';
import { PremiumAreaChart, Button, cardSurfaceGlow, FormField, TextArea } from '@/components/ui';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import ClientAiPanel from '@/components/pt-os/ClientAiPanel';
import ClientSnapshot, { normaliseSnapshot, type SnapshotState } from '@/components/pt-os/ClientSnapshot';
import ClientLoginCard from '@/components/pt-os/ClientLoginCard';
import ScreeningLinkCard from '@/components/pt-os/ScreeningLinkCard';
import ClientAiGenerateCard from '@/components/pt-os/ClientAiGenerateCard';
import RenewalOfferSheet from '@/components/pt-os/RenewalOfferSheet';
import {
  ClientTabs, TabPanel, LinkPanel, TAB_COLOR, TAB_KEYS, type TabKey,
} from '@/components/pt-os/client/ClientTabs';
import RecoveryPanel from '@/components/pt-os/client/RecoveryPanel';
import PhotosPanel from '@/components/pt-os/client/PhotosPanel';
import type { MeGoal, MeGoals } from '@/lib/api';
import { printWindowCloseButtonHtml } from '@/lib/printWindowChrome';
import { escapeHtml, escapeImageDataUrl } from '@/lib/escapeHtml';
import { errorMessage } from '@/lib/forms/errors';
import { fmtDateMedium, fmtDayMonth, fmtMoney } from '@/lib/format';
import { whatsAppHref } from '@/lib/phone';
import { amber, indigo, emerald, gray, red, rgba } from '@/lib/palette';
import { tones, gradient, auroraHero, type Tone } from '@/components/profile/profileTheme';
import { hasPtTerm } from '@/lib/pt-term';
import type { ScreeningSummary } from '@/lib/screening';
import { termEnded } from '@/lib/term-dates';
import MessagePreferences from '@/components/pt-os/client/MessagePreferences';
import ClientJourneyCard from '@/components/pt-os/client/ClientJourneyCard';
import InterviewSnapshotCard from '@/components/pt-os/client/InterviewSnapshotCard';

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

// ── Colour ─────────────────────────────────────────────────────────────
// Decoration (section tiles, action buttons, tinted card depth) comes from
// the same Apple-style spectrum as My Profile — profileTheme.ts — so the
// coach's own page and the client pages they work on share one look. The
// hero is deliberately different: it wears the house navy every other
// top-of-page in the app uses. STATE never does — paid, due, overdue,
// expiring and document status keep the palette families that mean those
// things everywhere else in the app.
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

function getStatusConfig(status: string, days_left: number | null, pt_end_date?: string, has_pt_term = false) {
  // The last day of the term is a valid day (lib/term-dates.ts).
  const endPassed = termEnded(days_left, pt_end_date);
  if (endPassed) return { label: 'Inactive', dot: gray[400] };
  if (status === 'frozen') return { label: 'Frozen', dot: indigo[300] };
  // A provisional enrolment has a term but is not active until screening.
  if (status === 'pending' && has_pt_term) return { label: 'Activation Pending', dot: amber[400] };
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
        {[now, g.target_date ? `by ${fmtDateMedium(g.target_date)}` : null, g.projection?.eta ? `on pace for ${fmtDateMedium(g.projection.eta)}` : null]
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
    <section
      className={`overflow-hidden rounded-[24px] ${className}`}
      style={{
        // Adaptive glass rather than one light-only shadow: the tokens carry
        // the dark mode, and the tint keeps each section's own colour in its
        // depth instead of every card casting the same slate.
        ...cardSurfaceGlow(tint.glow),
      }}
    >
      <header className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-3">
          <Squircle tint={tint}>{icon}</Squircle>
          <h2 className="truncate text-[15px] font-[720] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
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

function DocumentRow({ icon, tint, label, status, detail, href }: {
  icon: React.ReactNode; tint: Tone; label: string; status: string; detail?: { text: string; tone: Tone } | null;
  href: string;
}) {
  // Falls back to `unknown`, not to `none`: a status this table has not
  // heard of is one we cannot interpret, which is not the same as a form
  // that was never started.
  const style = DOC_STATUS_STYLE[status] || DOC_STATUS_STYLE.unknown;
  return (
    <Link href={href}
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
    </Link>
  );
}

/**
 * Reads `client.screening` — the server's own reading, the same one that
 * allows or refuses training — rather than guessing from the newest row of
 * each list. Without it (an older server) every row says "Not checked".
 */
function DocumentsCard({ clientId, screening }: { clientId: string; screening?: ScreeningSummary | null }) {
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
          href={`/pt-os/informed-consent?client_id=${clientId}`} />
        <DocumentRow icon={<ShieldCheck size={14} />} tint={tones.lime} label="PAR-Q screening"
          status={parq?.status ?? 'unknown'} detail={riskDetail}
          href={`/pt-os/parq?client_id=${clientId}`} />
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Generated on first expand, not on every profile view: this is a
  // print-once artefact most trainers never open, and the QR endpoint does
  // real work per call.
  const generate = () => {
    setLoading(true);
    setError('');
    api.qr.generateFor('client', clientId)
      .then((res) => setDataUrl(res.dataUrl))
      .catch((e) => setError(errorMessage(e, 'Failed to generate QR code')))
      .finally(() => setLoading(false));
  };

  const toggle = () => {
    if (!open && !dataUrl) generate();
    setOpen((o) => !o);
  };

  const handlePrint = () => {
    if (!dataUrl) return;
    const w = window.open('', '_blank', 'width=420,height=560');
    if (!w) return;
    // This popup is same-origin (window.open('') inherits the opener's origin)
    // and the enforced CSP still allows inline script, so clientName — a
    // database value — is escaped and the QR src is validated as an image data
    // URL rather than merely quoted. See lib/escapeHtml.ts.
    w.document.write(
      `<html><head><title>${escapeHtml(clientName)} — Check-in QR</title></head>` +
      `<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">` +
      printWindowCloseButtonHtml() +
      `<img src="${escapeImageDataUrl(dataUrl)}" width="280" height="280" alt="Check-in QR code" />` +
      `<p style="margin-top:12px;font-size:16px;font-weight:700;">${escapeHtml(clientName)}</p>` +
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
      <button type="button" onClick={toggle} aria-expanded={open}
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
 * Coach notes — the one editor, on Overview where they are read.
 *
 * The Notes tab used to hold a second mount of this same editor, so a save in
 * one left the other showing stale text until the next load.
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
          className={`flex h-[44px] items-center gap-1.5 rounded-full px-3 text-[12.5px] font-[650] ${inkClass}`}
          style={{ background: tones.sunset.wash, ...inkVars(tones.sunset) }}>
          <Pencil size={12} /> {notes ? 'Edit' : 'Add'}
        </button>
      ) : undefined}
    >
      {editing ? (
        <div className="space-y-3">
          <FormField label="Coach notes" labelHidden>
            <TextArea value={draft} onChange={(e) => setDraft(e.target.value)} rows={5} autoFocus
              className="resize-none text-[14px] leading-relaxed"
              placeholder="Injuries, preferences, what worked last session…" />
          </FormField>
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
  const { toast } = useToast();
  const { user } = useAuth();
  const reduce = useReducedMotion();
  const [client, setClient] = useState<PtClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  /** The whole summary, so Check-ins can tell loading/failure from "none". */
  const [snapshotState, setSnapshotState] = useState<SnapshotState>({ status: 'loading' });
  /** Which section of the workspace is open. Overview is where you land. */
  const [tab, setTab] = useState<TabKey>('overview');
  // Notifications deep-link a section (a weekly check-in lands on Check-ins).
  // Read once on mount; the tabs are this page's own state after that.
  useEffect(() => {
    const want = new URLSearchParams(window.location.search).get('tab');
    if (want && (TAB_KEYS as readonly string[]).includes(want)) setTab(want as TabKey);
  }, []);

  // The URL follows the selected section, so refresh/share/Back land where
  // the trainer was. Replace rather than push: tab switches are not pages.
  const selectTab = useCallback((next: TabKey) => {
    setTab(next);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', next);
    window.history.replaceState(null, '', url);
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

  const loadSnapshot = useCallback(async () => {
    setSnapshotState({ status: 'loading' });
    try {
      const { data } = await api.pt.snapshot(id);
      if (!data || typeof data !== 'object') throw new Error('The summary came back empty.');
      setSnapshotState({ status: 'ready', snapshot: normaliseSnapshot(data) });
    } catch (err) {
      setSnapshotState({
        status: 'error',
        message: errorMessage(err, 'The summary could not be loaded.'),
      });
    }
  }, [id]);

  // Fetched here, not inside the snapshot, so Check-ins can still tell
  // "loading" and "failed" from "no check-ins" when it is opened directly.
  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);

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

  // The backend owns the current-term definition (GET /clients/:id). A
  // pt_client_subscriptions row is a snapshot no payment path updates, so it
  // is never read for the current term; the fallbacks are the client's own
  // fields, for an older API response.
  const currentTermFee     = Number(client?.current_term_fee     ?? client?.final_amount   ?? 0);
  const currentTermPaid    = Number(client?.current_term_paid    ?? client?.paid_amount    ?? 0);
  const currentTermBalance = Number(client?.current_term_balance ?? client?.balance_amount ?? 0);

  // Lifetime paid across every PT term — pt_clients.paid_amount is that total.
  const lifetimePaid = Number(client?.paid_amount ?? 0);
  // A never-enrolled client has no terms. The old fallback credited everybody
  // with one, so a new lead showed "1 term · ₹0 lifetime paid" as if a term
  // had been sold and paid.
  const lifetimeTermCount = subscriptionHistory.length > 0
    ? subscriptionHistory.length
    : hasPtTerm(client) ? 1 : 0;

  // More than the single 'enrollment' term means a renewal (studio, UPI, or a
  // legacy row) already exists — and the server refuses a term edit with
  // USE_RENEW, so the link would lead to a form that cannot save.
  const hasRenewed = subscriptionHistory.length > 1
    || subscriptionHistory.some((s: any) => s.source !== 'enrollment');

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

  // Readiness belongs to the summary; only hand it over once that answered.
  const recovery = snapshotState.status === 'ready' ? snapshotState.snapshot.recovery : undefined;
  const weightPoints = recentWeights.map((a: any) => ({
    date: fmtDayMonth(a.created_at || a.assessment_date),
    weight: Number(a.weight),
  }));
  const firstWeight = weightPoints[0];
  const lastWeight = weightPoints[weightPoints.length - 1];

  // Null when the number cannot be normalised — no button then, rather than
  // a WhatsApp link to nobody.
  // The WhatsApp number when the client has one — the number every automated
  // message goes to — else the mobile. This button used the mobile alone, so
  // the trainer and the studio's own reminders could be writing to two
  // different numbers.
  const waNumber = client?.whatsapp || client?.mobile;
  const waHref = waNumber ? whatsappHref(waNumber, client?.name) : null;
  const statusCfg = client ? getStatusConfig(client.status, client.days_left, client.pt_end_date, client.has_pt_term) : null;
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
                  them. The paint is the house hero — the same navy gradient,
                  gold and blue light, grid and vignette the dashboard and
                  every other PageHero page open on — so the page a coach
                  opens most is not the one that looks like a foreign site.
                  The light is the house's own too: two blurred discs, behind
                  the content and inside the hero's overflow-hidden, which is
                  what keeps a blur from escaping the rounded corner. */}
              <m.section
                initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="relative mb-5 overflow-hidden rounded-[32px] p-5 text-white sm:p-7"
                style={{
                  background: `${auroraHero.crown}, ${auroraHero.base}`,
                  boxShadow: auroraHero.shadow,
                }}
              >
                {/* Decoration behind the content, matching the house hero. */}
                <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
                  {/* The house's two lights, blurred behind the content. */}
                  <div className="absolute -right-14 -top-20 h-60 w-60 rounded-full opacity-35"
                    style={{ background: `radial-gradient(circle, ${auroraHero.glowWarm} 0%, transparent 70%)`, filter: 'blur(46px)' }} />
                  <div className="absolute -bottom-20 -left-14 h-60 w-60 rounded-full opacity-25"
                    style={{ background: `radial-gradient(circle, ${auroraHero.glowCool} 0%, transparent 70%)`, filter: 'blur(54px)' }} />
                  <svg className="absolute inset-0 h-full w-full opacity-[0.055]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <pattern id="cp-grid" width="34" height="34" patternUnits="userSpaceOnUse">
                        <path d="M 34 0 L 0 0 0 34" fill="none" stroke="white" strokeWidth="0.6" />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cp-grid)" />
                  </svg>
                  <div className="absolute inset-0"
                    style={{ background: 'radial-gradient(120% 120% at 50% 38%, transparent 52%, rgba(15,23,42,0.55) 100%)' }} />
                </div>

                <div className="relative z-10">
                <div className="flex items-start gap-4 sm:gap-6">
                  <ClientAvatar
                    name={client.name}
                    photoUrl={client.photo_url}
                    alt=""
                    className="relative flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-full text-[28px] font-[800] sm:h-[112px] sm:w-[112px] sm:text-[36px]"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,255,255,0.35), rgba(255,255,255,0.08))',
                      border: '3px solid rgba(255,255,255,0.55)',
                      boxShadow: '0 12px 28px -10px rgba(0,0,0,0.45)',
                    }}
                  />

                  <div className="min-w-0 flex-1 pt-1">
                    <h1 className="line-clamp-2 break-words text-[22px] font-[800] leading-[1.1] tracking-[-0.03em] sm:line-clamp-none sm:truncate sm:text-[34px]">
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

                  <Link href={`/pt-os/clients/${id}/edit`}
                    aria-label="Edit profile"
                    className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[700] text-white transition active:scale-95"
                    style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                    <Pencil size={13} /> <span className="hidden sm:inline">Edit</span>
                  </Link>
                </div>
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
                  href={`/pt-os/messages?client=${encodeURIComponent(String(id))}`} />
                {hasTerm ? (
                  <ActionButton label="Renew" icon={<Repeat size={20} />} tint={tones.indigo}
                    href={`/pt-os/clients/${id}/renew`} />
                ) : (
                  <ActionButton label="Enroll" icon={<UserPlus size={20} />} tint={tones.indigo}
                    href={`/pt-os/clients/${id}/enroll`} />
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
                      <m.div initial={reduce ? false : { width: 0 }} animate={{ width: `${ptTermPct}%` }}
                        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${tones.sky.from}, ${tones.indigo.to} 55%, ${tones.berry.from})` }} />
                    </div>
                    <div className="mt-2 flex justify-between text-[11.5px] font-[560]" style={{ color: 'var(--text-muted)' }}>
                      <span>{fmtDateMedium(client.pt_start_date)}</span>
                      <span>{fmtDateMedium(client.pt_end_date)}</span>
                    </div>
                  </>
                ) : (
                  <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
                    No PT term yet — enroll them to start one.
                  </p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
                  {[
                    { label: 'Term fee', value: fmtMoney(currentTermFee), tint: tones.sky, icon: <IndianRupee size={12} /> },
                    { label: 'Paid', value: fmtMoney(currentTermPaid), tint: OK, icon: <CheckCircle size={12} /> },
                    {
                      label: 'Balance', value: fmtMoney(currentTermBalance), tint: balanceTint,
                      icon: currentTermBalance > 0 ? <AlertTriangle size={12} /> : <CheckCircle size={12} />,
                      // Balance's state is otherwise carried only by colour.
                      state: currentTermBalance > 0 ? (client.due_status === 'OVERDUE' ? 'Overdue' : 'Due') : 'Cleared',
                      // Full-width on phones so six-figure INR never truncates.
                      wide: true,
                    },
                  ].map((k) => (
                    <div key={k.label} className={`min-w-0 rounded-[18px] p-3 ${k.wide ? 'col-span-2 sm:col-span-1' : ''}`}
                      style={{ background: `linear-gradient(160deg, ${k.tint.wash}, transparent)`, border: `1px solid ${k.tint.wash}` }}>
                      <p className={`flex items-center gap-1 text-[11px] font-[700] uppercase tracking-[0.06em] ${inkClass}`} style={inkVars(k.tint)}>
                        {k.icon}{k.label}
                        {k.state && <span className="sr-only"> — {k.state}</span>}
                      </p>
                      <p className="mt-1 break-words text-[18px] font-[800] leading-tight tracking-[-0.02em] tabular-nums sm:text-[22px]"
                        style={{ color: 'var(--text-primary)' }}>
                        {k.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Editing the term, rather than enrolling them again. Only
                    while the term is running: once it has ended the server
                    refuses a term edit and Renew is the path (its arithmetic
                    and history live there). A price with no end date is not a
                    term yet — that client is still waiting to be enrolled.
                    Once they have renewed, the server answers USE_RENEW and
                    this link would lead to a form that cannot save. */}
                {hasTerm && client.days_left != null && !termEnded(client.days_left, client.pt_end_date)
                  && !hasRenewed && (
                  <Link
                    href={`/pt-os/clients/${id}/enroll`}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12.5px] font-[700]"
                    style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}
                  >
                    <Pencil size={13} aria-hidden /> Edit enrolment
                  </Link>
                )}
              </SectionCard>

              {/* ── CLIENT LOGIN ──
                  Under the money because that is where the reader looks for
                  "what does this client still owe / have access to". The login
                  itself no longer depends on payment — see clientInvitations.js. */}
              <div className="mb-5">
                <ClientLoginCard clientId={client.id} />
              </div>

              {/* ── REMOTE SCREENING ──
                  Sits with the login card: both are one-time links sent to the
                  client, and the trainer who is about to send one is usually
                  also about to send the other. */}
              <div className="mb-5">
                <ScreeningLinkCard
                  clientId={client.id}
                  clientName={client.name}
                  phone={client.whatsapp || client.mobile}
                />
              </div>

              {/* ── WORKSPACE ── */}
              <ClientTabs active={tab} onChange={selectTab} clientId={client.id} />

              <TabPanel id="overview" active={tab}>
                {/* The summary is part of Overview, not a separate block above
                    the workspace: it was the last thing pushing the tabs below
                    a phone's first screen. */}
                <div className="mb-4">
                  <ClientSnapshot clientId={client.id} state={snapshotState} onRetry={loadSnapshot} />
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 items-start">
                  {/* Where the client is in intake, and the one next thing to do. */}
                  <SectionCard title="Client journey" icon={<Route size={15} />} tint={tones.indigo}>
                    <ClientJourneyCard clientId={client.id} />
                  </SectionCard>
                  {weightPoints.length >= 2 && firstWeight && lastWeight && (
                    <SectionCard title="Weight trend" icon={<TrendingUp size={15} />} tint={tones.lime}>
                      <PremiumAreaChart
                        data={weightPoints as Record<string, unknown>[]}
                        xKey="date"
                        areas={[{ key: 'weight', label: 'Weight (kg)', color: emerald[500] }]}
                        height={110}
                        formatValue={(v) => `${v} kg`}
                        yMin="auto"
                      />
                      {/* The chart's own accessible name says "six points";
                          these are the readings a screen reader cannot hover. */}
                      <p className="sr-only">
                        Weight trend: {firstWeight.weight} kg on {firstWeight.date} to {lastWeight.weight} kg on {lastWeight.date}.
                      </p>
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
                    <InfoRow icon={<Cake size={13} />} tint={tones.berry} label="Birthday" value={fmtDateMedium(client.dob)} />
                    <InfoRow icon={<Phone size={13} />} tint={tones.lime} label="Phone" value={client.mobile || '—'} />
                    {client.whatsapp && client.whatsapp !== client.mobile && (
                      <InfoRow icon={<MessageCircle size={13} />} tint={tones.mint} label="WhatsApp" value={client.whatsapp} />
                    )}
                    <InfoRow icon={<Mail size={13} />} tint={tones.sky} label="Email" value={client.email || '—'} />
                    <InfoRow icon={<Calendar size={13} />} tint={tones.sunset} label="Joined" value={fmtDateMedium(client.joining_date)} />
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
                    <InfoRow icon={<Clock size={13} />} tint={tones.mint} label="Duration" value={client.duration_months ? `${client.duration_months} months` : '—'} />
                    <InfoRow icon={<IndianRupee size={13} />} tint={tones.sky} label="Monthly fee" value={fmtMoney(client.monthly_pt_amount)} last />
                  </SectionCard>

                  <NotesCard notes={client.notes} onSave={handleSaveNotes} />

                  <div className="grid grid-cols-1 gap-4">
                    <Link href={`/pt-os/session-balance?client_id=${client.id}`}
                      className="group flex w-full items-center justify-between gap-3 rounded-[24px] p-4 text-left transition active:scale-[0.99]"
                      style={{ ...cardSurfaceGlow(tones.mint.glow) }}>
                      <div className="flex items-center gap-3">
                        <Squircle tint={tones.mint} size={42}><Zap size={17} /></Squircle>
                        <div>
                          <p className="text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>Session balance</p>
                          <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>Packages and sessions left</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                    </Link>
                    <QrCheckinCard clientId={client.id} clientName={client.name} />
                  </div>
                </div>
              </TabPanel>

              <TabPanel id="payments" active={tab}>
                <div className="mb-4">
                  <LinkPanel
                    icon={<Wallet size={16} />}
                    title="Payments"
                    color={TAB_COLOR.danger}
                    links={[
                      { label: 'Payment history', href: `/pt-os/clients/${client.id}/payments`, hint: 'Every transaction', icon: <Wallet size={15} />, color: TAB_COLOR.primary },
                      { label: 'Session balance', href: `/pt-os/session-balance?client_id=${client.id}`, hint: 'Packages and sessions left', icon: <Clock size={15} />, color: TAB_COLOR.warning },
                    ]}
                  />
                </div>
                <Link
                  href={`/pt-os/clients/${client.id}/subscriptions`}
                  className="group flex w-full flex-wrap items-center justify-between gap-4 rounded-[24px] p-5 text-left transition active:scale-[0.99]"
                  style={{ ...cardSurfaceGlow(tones.indigo.glow) }}>
                  <div className="flex items-center gap-3">
                    <Squircle tint={tones.indigo} size={42}><Repeat size={18} /></Squircle>
                    <div>
                      <h2 className="text-[15px] font-[720]" style={{ color: 'var(--text-primary)' }}>PT subscription history</h2>
                      <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                        {lifetimeTermCount} term{lifetimeTermCount !== 1 ? 's' : ''} · {fmtMoney(lifetimePaid)} lifetime paid
                      </p>
                    </div>
                  </div>
                  <ChevronRight size={18} className="transition-transform group-hover:translate-x-0.5" style={{ color: 'var(--text-muted)' }} />
                </Link>
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
                    { label: 'Strength tracking', href: `/pt-os/strength-tracking?client_id=${client.id}`, hint: 'Lifts and personal records', icon: <Zap size={15} />, color: TAB_COLOR.danger },
                  ]}
                />
              </TabPanel>

              <TabPanel id="checkins" active={tab}>
                <RecoveryPanel
                  recovery={recovery}
                  clientId={client.id}
                  status={snapshotState.status}
                  error={snapshotState.status === 'error' ? snapshotState.message : undefined}
                  onRetry={loadSnapshot}
                />
              </TabPanel>

              <TabPanel id="photos" active={tab}>
                <PhotosPanel clientId={client.id} />
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
                  body="Ask about their programme, recovery or nutrition."
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
                  body="What this client's month looks like."
                  color={TAB_COLOR.success}
                  links={[
                    { label: 'Measurements', href: `/pt-os/measurements?client_id=${client.id}`, hint: 'Readings over time', icon: <Ruler size={15} />, color: TAB_COLOR.danger },
                    { label: 'Progress tracking overview', href: `/pt-os/progress-tracking-setup?client_id=${client.id}`, hint: 'Which baselines are complete', icon: <Flag size={15} />, color: TAB_COLOR.primary },
                    { label: 'Studio reports', href: '/insights/revenue', hint: 'Revenue and commissions across the studio', icon: <FileBarChart size={15} />, color: TAB_COLOR.warning },
                  ]}
                />
              </TabPanel>

              <TabPanel id="documents" active={tab}>
                <div className="mb-4">
                  <InterviewSnapshotCard clientId={client.id} />
                </div>
                <div className="mb-4">
                  <LinkPanel
                    icon={<ShieldCheck size={16} />}
                    title="Screening &amp; assessments"
                    color={TAB_COLOR.dangerDeep}
                    links={[
                      { label: 'Client interview', href: `/pt-os/interview?client_id=${client.id}`, hint: 'History, pain, lifestyle, goals', icon: <MessagesSquare size={15} />, color: TAB_COLOR.primary },
                      { label: 'Lifestyle assessment', href: `/pt-os/lifestyle-assessment?client_id=${client.id}`, hint: 'Sleep, stress, recovery', icon: <HeartPulse size={15} />, color: TAB_COLOR.danger },
                      { label: 'Nutrition assessment', href: `/pt-os/nutrition-assessment?client_id=${client.id}`, hint: 'Habits, intake, barriers', icon: <Salad size={15} />, color: TAB_COLOR.success },
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
