'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { m, AnimatePresence, useInView } from 'framer-motion';
import qrcode from 'qrcode-generator';
import {
  User, Mail, Phone, MapPin, Activity, Shield,
  Bell, Smartphone, Monitor, Tablet, Moon, Sun, Globe,
  CheckCircle2, XCircle, Lock, Key, Eye, EyeOff,
  RefreshCw, LogOut, ShieldCheck, AlertTriangle,
  History, Fingerprint, Copy, Loader2, Settings,
  Zap, Calendar, Wifi, Camera, FileSignature, Dumbbell, ClipboardList,
  Award, Plus, BadgeCheck, Briefcase, GraduationCap, Trophy, Images,
} from 'lucide-react';
import Guard from '@/components/Guard';
import { useTheme } from '@/components/ThemeProvider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, FloatInput } from '@/components/ui';
import { api } from '@/lib/api';
import type {
  ProfileMe, NotificationPreferences, UserPreferences, ProfileDevice, ProfileSession,
  ActivityEvent, Certification, CoachingMode, ProfileGym, WorkingHours,
  ProfileEducation, ProfileAchievement, ProfileTab,
} from '@/lib/api';
import { AboutSection } from '@/components/profile/AboutSection';
import { ProfessionalSection, WorkingHoursEditor } from '@/components/profile/ProfessionalSection';
import { EducationSection } from '@/components/profile/EducationSection';
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { CompletionPanel } from '@/components/profile/CompletionPanel';
import { ProfileHero } from '@/components/profile/ProfileHero';
import { useFounder } from '@/lib/use-founder';
import { PortfolioSkeleton } from '@/components/profile/PortfolioSection';

/**
 * The gallery is the heaviest thing on this page — a media grid, an upload
 * dialog and a lightbox — and most visits to /settings/profile never open it.
 * `ssr: false` because it is entirely client state: rendering it on the server
 * would produce an empty grid and then immediately replace it.
 */
const PortfolioSection = dynamic(() => import('@/components/profile/PortfolioSection'), {
  ssr: false,
  loading: () => <PortfolioSkeleton />,
});
import { apiBase } from '@/lib/http';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast';
import { fmtDate } from '@/lib/format';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function initials(name: string) {
  const n = name.trim();
  if (!n) return '?';
  return n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function pwStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Weak', color: '#ef4444' };
  if (s <= 2) return { score: s, label: 'Fair', color: '#f59e0b' };
  if (s <= 3) return { score: s, label: 'Good', color: '#0067e0' };
  return { score: s, label: 'Strong', color: '#10b981' };
}

function timeAgo(iso?: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const diffSec = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.round(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(iso);
}

const ACTIVITY_LABELS: Record<string, string> = {
  'profile.update': 'Profile details updated',
  'profile.avatar.update': 'Profile photo changed',
  'profile.password.update': 'Password changed',
  'profile.mfa.enable': 'Two-factor authentication enabled',
  'profile.mfa.disable': 'Two-factor authentication disabled',
  'profile.sessions.revoke_all': 'Signed out of all devices',
  'parq.submit': 'PAR-Q screening submitted',
  'parq.consent.sign': 'PAR-Q consent signed',
  'informed_consent.create': 'Informed consent created',
  'informed_consent.completed': 'Informed consent completed',
  'informed_consent.revoke': 'Informed consent revoked',
  'informed_consent.new_version': 'Informed consent updated',
  'informed_consent.clearance_upload': 'Medical clearance uploaded',
  'workout.assign.blocked': 'Workout assignment blocked',
  'workout.assign.warned': 'Workout assignment flagged',
  'workout_log.session.create': 'Workout session logged',
  'workout_log.session.delete': 'Workout session deleted',
};

function activityIcon(category: string): { icon: React.ReactNode; color: string; bg: string } {
  const map: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
    profile:           { icon: <User size={11} />,          color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
    parq:               { icon: <ShieldCheck size={11} />,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    informed_consent:   { icon: <FileSignature size={11} />, color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
    workout:            { icon: <Dumbbell size={11} />,      color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
    workout_log:        { icon: <ClipboardList size={11} />, color: '#0067e0', bg: 'rgba(0,103,224,0.12)' },
  };
  return map[category] ?? { icon: <Activity size={11} />, color: '#0067e0', bg: 'rgba(0,103,224,0.12)' };
}

function deviceIcon(type: string, size = 16, color = '#0067e0') {
  if (type === 'mobile') return <Smartphone size={size} style={{ color }} />;
  if (type === 'tablet') return <Tablet size={size} style={{ color }} />;
  return <Monitor size={size} style={{ color }} />;
}

/* ─────────────────────────────────────────
   FADE-UP WRAPPER
───────────────────────────────────────── */
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <m.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  );
}

/* ─────────────────────────────────────────
   GLASS CARD
───────────────────────────────────────── */
function GlassCard({ children, className = '', style = {}, glow = false }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  glow?: boolean;
}) {
  return (
    <div
      className={`rounded-3xl ${className}`}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: glow
          ? '0 4px 32px rgba(0,103,224,0.10), 0 1px 0 rgba(255,255,255,0.9) inset'
          : '0 2px 20px rgba(15,23,42,0.07), 0 1px 0 rgba(255,255,255,0.9) inset',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────
   CREDENTIALS
───────────────────────────────────────── */

/** The editable copy of a certificate — the server's derived fields removed. */
type CertDraft = Omit<Certification, 'status' | 'daysLeft'>;

type Snapshot = {
  name: string; email: string; phone: string; location: string; bio: string;
  jobTitle: string; experienceSince: string;
  philosophy: string; trainingStyle: string; designation: string;
  /** Serialised, so the dirty check compares values rather than references. */
  specialisations: string; certifications: string;
  languages: string; coachingModes: string; previousGyms: string; workingHours: string;
  education: string; achievements: string;
};

/**
 * How a certificate's expiry reads.
 *
 * Four states, not three. "No expiry recorded" is deliberately not folded into
 * valid: the certificate might never expire, or might have lapsed two years
 * ago, and showing those the same way is the failure this whole feature is
 * meant to prevent. Every state carries an icon and a word — colour never
 * carries the meaning alone.
 */
const CERT_STATUS: Record<Certification['status'], { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  expired:  { label: 'Expired',  color: '#dc2626', bg: 'rgba(220,38,38,0.10)',  icon: <XCircle size={11} /> },
  expiring: { label: 'Renew soon', color: '#b45309', bg: 'rgba(245,158,11,0.12)', icon: <AlertTriangle size={11} /> },
  valid:    { label: 'Valid',    color: '#047857', bg: 'rgba(16,185,129,0.10)', icon: <CheckCircle2 size={11} /> },
  unknown:  { label: 'No expiry set', color: '#64748b', bg: 'rgba(100,116,139,0.10)', icon: <AlertTriangle size={11} /> },
};

function certExpiryLine(status: Certification['status'], daysLeft: number | null, expiresOn: string | null) {
  if (status === 'unknown' || daysLeft === null) return 'No expiry date recorded';
  if (status === 'expired') {
    const d = Math.abs(daysLeft);
    return `Lapsed ${d === 0 ? 'today' : `${d} day${d === 1 ? '' : 's'} ago`} · ${fmtDate(expiresOn)}`;
  }
  if (daysLeft === 0) return `Expires today · ${fmtDate(expiresOn)}`;
  return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left · ${fmtDate(expiresOn)}`;
}

/**
 * One certificate, editable in place.
 *
 * The status pill is driven by the SERVER's verdict for the saved copy. While a
 * row is being edited the pill is hidden rather than recomputed in the browser,
 * because a locally-derived "Valid" is exactly the reassurance nobody should
 * get from an unverified clock.
 */
function CertificateRow({ cert, saved, onChange, onRemove }: {
  cert: CertDraft;
  saved: Certification | undefined;
  onChange: (next: CertDraft) => void;
  onRemove: () => void;
}) {
  const edited = !saved
    || saved.name !== cert.name || saved.issuer !== cert.issuer
    || saved.issued_on !== cert.issued_on || saved.expires_on !== cert.expires_on
    || saved.credential_id !== cert.credential_id;
  const meta = saved && !edited ? CERT_STATUS[saved.status] : null;
  const set = (k: keyof CertDraft, v: string) => onChange({ ...cert, [k]: v || (k.endsWith('_on') ? null : '') } as CertDraft);

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'var(--bg-subtle)',
        border: '1px solid var(--border)',
        // A hairline in the status colour down the leading edge, so a wall of
        // certificates shows its problems before any of it is read.
        borderLeft: `3px solid ${meta ? meta.color : 'var(--border)'}`,
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        {/* The name gets the full width and the status sits UNDER it, beside
            the sentence that explains it. Sharing a row with the pill truncated
            real certification names on a phone — "NASM Certified Personal Tr" —
            and split the status from its own explanation. */}
        <div className="min-w-0 flex-1">
          <input
            value={cert.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Certification name"
            className="w-full bg-transparent text-[14px] font-[780] tracking-[-0.01em] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          {meta && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-[760] whitespace-nowrap"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.icon} {meta.label}
              </span>
              <span className="text-[11px] font-[560]" style={{ color: 'var(--text-muted)' }}>
                {certExpiryLine(saved!.status, saved!.daysLeft, saved!.expires_on)}
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onRemove}
          aria-label={`Remove ${cert.name || 'certification'}`}
          className="shrink-0 rounded-lg p-1.5 transition-colors hover:bg-[var(--bg-hover)]"
          style={{ color: 'var(--text-disabled)' }}
        >
          <XCircle size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {([
          ['Issuing body', 'issuer', 'text', 'NASM, ACE, K11…'],
          ['Credential ID', 'credential_id', 'text', 'Optional'],
          ['Issued', 'issued_on', 'date', ''],
          ['Expires', 'expires_on', 'date', ''],
        ] as const).map(([label, key, type, placeholder]) => (
          <label key={key} className="block">
            <span className="mb-1 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
              {label}
            </span>
            <input
              type={type}
              value={(cert[key] as string) || ''}
              placeholder={placeholder}
              onChange={(e) => set(key, e.target.value)}
              className="w-full rounded-xl px-3 py-2 text-[12.5px] font-[560] outline-none"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

/** Free-text tags. Enter or comma commits; backspace on an empty box removes. */
function SpecialisationEditor({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState('');

  const commit = (raw: string) => {
    const v = raw.replace(/\s+/g, ' ').trim();
    if (!v) return;
    // Matches the server, which de-duplicates case-insensitively and keeps the
    // spelling that was typed first.
    if (value.some((x) => x.toLowerCase() === v.toLowerCase())) { setDraft(''); return; }
    onChange([...value, v]);
    setDraft('');
  };

  return (
    <div>
      <div className="mb-2.5 flex flex-wrap gap-2">
        {value.length === 0 && (
          <p className="text-[12px]" style={{ color: 'var(--text-disabled)' }}>
            Nothing added yet — try “Strength &amp; Conditioning” or “Post-natal”.
          </p>
        )}
        {value.map((sp) => (
          <span
            key={sp}
            className="inline-flex items-center gap-1.5 rounded-full py-1.5 pl-3 pr-1.5 text-[12px] font-[680]"
            style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0', border: '1px solid rgba(0,103,224,0.22)' }}
          >
            {sp}
            <button
              onClick={() => onChange(value.filter((x) => x !== sp))}
              aria-label={`Remove ${sp}`}
              className="rounded-full p-0.5 transition-opacity hover:opacity-70"
            >
              <XCircle size={13} />
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => {
          // A comma is how people naturally separate these, so treat it as Enter
          // rather than letting it become part of the tag.
          if (e.target.value.includes(',')) commit(e.target.value.replace(/,/g, ''));
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); commit(draft); }
          if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => commit(draft)}
        placeholder="Add a specialisation and press Enter"
        className="w-full rounded-xl px-3.5 py-2.5 text-[12.5px] font-[560] outline-none"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      />
    </div>
  );
}

/* ─────────────────────────────────────────
   SECTION HEADER
───────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
        style={{ background: 'linear-gradient(135deg,rgba(0,103,224,0.15),rgba(0,103,224,0.10))' }}
      >
        {icon}
      </div>
      <div>
        <p className="text-[14px] font-[780] tracking-[-0.01em]" style={{ color: 'var(--text-primary)' }}>{title}</p>
        <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   FLOAT INPUT (GLASS)
───────────────────────────────────────── */


/* ─────────────────────────────────────────
   IOS TOGGLE
───────────────────────────────────────── */
function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className="relative flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
      style={{
        width: 44, height: 26,
        borderRadius: 999,
        background: enabled
          ? 'linear-gradient(135deg,#0067e0,#0059ce)'
          : 'var(--border-3)',
        boxShadow: enabled ? '0 0 16px rgba(0,103,224,0.30)' : 'none',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 250ms, box-shadow 250ms',
      }}
    >
      <m.span
        animate={{ x: enabled ? 20 : 2 }}
        transition={{ type: 'spring', stiffness: 600, damping: 32 }}
        style={{
          position: 'absolute',
          top: 3, width: 20, height: 20,
          borderRadius: 999,
          background: 'white',
          boxShadow: '0 1px 4px rgba(15,23,42,0.18)',
        }}
      />
    </button>
  );
}

/* ─────────────────────────────────────────
   STAT CHIP
───────────────────────────────────────── */
function StatChip({ icon, label, value, gradient }: {
  icon: React.ReactNode; label: string; value: string;
  gradient: string;
}) {
  return (
    <m.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(0,103,224,0.14)' }}
      whileTap={{ scale: 0.97 }}
      className="flex-shrink-0 rounded-2xl p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        minWidth: 130,
        cursor: 'default',
      }}
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <p className="text-[16px] font-[820] tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="mt-0.5 text-[10.5px] font-[500]" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </m.div>
  );
}

/* ─────────────────────────────────────────
   SETTING ROW
───────────────────────────────────────── */
function SettingRow({ label, description, children, accent = false }: {
  label: string; description?: string;
  children: React.ReactNode; accent?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3.5 rounded-2xl transition-colors"
      style={{
        background: accent ? 'rgba(0,103,224,0.05)' : 'var(--bg-subtle)',
        border: '1px solid var(--border)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-[660]" style={{ color: 'var(--text-primary)' }}>{label}</p>
        {description && (
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SELECT ROW (native select, glass-styled)
───────────────────────────────────────── */
function SelectRow({ label, description, value, options, onChange }: {
  label: string; description?: string; value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <SettingRow label={label} description={description}>
      <select aria-label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="rounded-[10px] px-2.5 py-1.5 text-[12px] font-[660] outline-none"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </SettingRow>
  );
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function ProfileSkeleton() {
  return (
    <div>
      <div className="mx-auto max-w-screen-xl py-8">
        <div className="animate-pulse space-y-5">
          <div className="h-48 w-full rounded-3xl" style={{ background: 'var(--border)' }} />
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_1fr]">
            <div className="space-y-4">
              {[80, 60, 90].map(w => (
                <div key={w} className="h-10 rounded-2xl" style={{ background: 'var(--border)', width: `${w}%` }} />
              ))}
            </div>
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-2xl" style={{ background: 'var(--border)' }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   STICKY SAVE BAR
───────────────────────────────────────── */
function StickySaveBar({ dirty, saving, onSave, onDiscard, msg }: {
  dirty: boolean; saving: boolean;
  onSave: () => void; onDiscard: () => void;
  msg: { type: 'success' | 'error'; text: string } | null;
}) {
  // Whether the bar is centred (desktop) or spans the gutter (phone). Read as
  // a media query rather than assumed, because the x offset has to be handed
  // to Framer Motion — CSS cannot supply half of a transform it is animating.
  const [centred, setCentred] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)');
    const sync = () => setCentred(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  return (
    <AnimatePresence>
      {dirty && (
        <m.div
          initial={{ y: 100, opacity: 0, x: centred ? '-50%' : 0 }}
          animate={{ y: 0, opacity: 1, x: centred ? '-50%' : 0 }}
          exit={{ y: 100, opacity: 0, x: centred ? '-50%' : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          /*
            Spans the width on a phone, centres on desktop.

            It used to be `left-1/2` with `transform: translateX(-50%)` in the
            inline style. Framer Motion animates `y` by writing `transform`, so
            it overwrote that centring outright: the bar's LEFT edge sat at 50%
            of the viewport and Save ran off the right of the screen with no way
            to reach it. Anything that has to compose with a motion transform
            belongs in the motion props, not in `style` — hence `x` below rather
            than a CSS translate.

            On a phone the answer is not to centre it at all: full width with a
            gutter gives the buttons room and puts them under the thumb.
          */
          className="fixed above-bottom-nav left-4 right-4 z-50 flex flex-wrap items-center justify-end gap-2.5 rounded-2xl px-4 py-3 sm:left-1/2 sm:right-auto sm:w-auto sm:flex-nowrap sm:gap-3 sm:px-5"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          }}
        >
          {msg ? (
            <>
              {msg.type === 'success'
                ? <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                : <XCircle size={14} style={{ color: '#ef4444' }} />}
              <span className="text-[12.5px] font-[600]" style={{ color: msg.type === 'success' ? '#10b981' : '#ef4444' }}>
                {msg.text}
              </span>
            </>
          ) : (
            <>
              <span className="mr-auto text-[12.5px] font-[500]" style={{ color: 'var(--text-secondary)' }}>Unsaved changes</span>
              <button
                onClick={onDiscard}
                className="rounded-xl px-3 py-1.5 text-[12px] font-[620] transition-colors"
                style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)' }}
              >
                Discard
              </button>
              <button
                onClick={onSave}
                disabled={saving}
                className="flex items-center gap-2 rounded-xl px-4 py-1.5 text-[12px] font-[700] transition-all"
                style={{
                  background: 'linear-gradient(135deg,#0067e0,#0059ce)',
                  color: 'white',
                  boxShadow: '0 2px 12px rgba(0,103,224,0.40)',
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </>
          )}
        </m.div>
      )}
    </AnimatePresence>
  );
}

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Calcutta', label: 'India (IST, UTC+5:30)' },
  { value: 'Asia/Dubai', label: 'Dubai (UTC+4:00)' },
  { value: 'Asia/Singapore', label: 'Singapore (UTC+8:00)' },
  { value: 'Europe/London', label: 'London (UTC+0:00)' },
  { value: 'America/New_York', label: 'New York (UTC-5:00)' },
];
const DATE_FORMAT_OPTIONS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
];
const FREQUENCY_OPTIONS: { value: string; label: string }[] = [
  { value: 'instant', label: 'Instant' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
];

const NOTIFICATION_ROWS: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: 'email_logins', label: 'Login Alerts (Email)', description: 'Email me on new sign-ins to my account' },
  { key: 'email_payments', label: 'Payment Emails', description: 'Receipts and payment confirmations' },
  { key: 'email_reports', label: 'Report Emails', description: 'Scheduled business reports' },
  { key: 'email_marketing', label: 'Marketing Emails', description: 'Product news and offers' },
  { key: 'push_logins', label: 'Login Alerts (Push)', description: 'Browser/app push on new sign-ins' },
  { key: 'push_tasks', label: 'Task Push', description: 'Assigned tasks and reminders' },
  { key: 'push_mentions', label: 'Mention Push', description: 'When someone mentions you' },
  { key: 'whatsapp_alerts', label: 'WhatsApp Alerts', description: 'Critical alerts via WhatsApp' },
];

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function ProfilePage() {
  const founderNumber = useFounder();
  // `user` is the session. The studio name comes from there rather than from
  // the profile form — see the note at the top of ProfileHero.
  const { logout, user } = useAuth();
  const { toast } = useToast();
  // ProfileTab is the subset a completion step can link to; Security and
  // Preferences hold nothing that is scored, so they are named separately.
  const [tab, setTab] = useState<ProfileTab | 'security' | 'preferences'>('overview');

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [me, setMe] = useState<ProfileMe | null>(null);
  const [notifications, setNotifications] = useState<NotificationPreferences | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [device, setDevice] = useState<ProfileDevice | null>(null);
  const [session, setSession] = useState<ProfileSession | null>(null);
  const [activityItems, setActivityItems] = useState<ActivityEvent[]>([]);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityLoading, setActivityLoading] = useState(true);

  /* Personal info form + dirty tracking */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  /* Professional credentials */
  const [jobTitle, setJobTitle] = useState('');
  const [experienceSince, setExperienceSince] = useState('');
  const [specialisations, setSpecialisations] = useState<string[]>([]);
  const [certifications, setCertifications] = useState<CertDraft[]>([]);

  /* Professional profile (migration 133) */
  const [philosophy, setPhilosophy] = useState('');
  const [trainingStyle, setTrainingStyle] = useState('');
  const [designation, setDesignation] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [coachingModes, setCoachingModes] = useState<CoachingMode[]>([]);
  const [previousGyms, setPreviousGyms] = useState<ProfileGym[]>([]);
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [education, setEducation] = useState<ProfileEducation[]>([]);
  const [achievements, setAchievements] = useState<ProfileAchievement[]>([]);

  const originalRef = useRef<Snapshot>({
    name: '', email: '', phone: '', location: '', bio: '',
    jobTitle: '', experienceSince: '', philosophy: '', trainingStyle: '', designation: '',
    specialisations: '[]', certifications: '[]',
    languages: '[]', coachingModes: '[]', previousGyms: '[]', workingHours: '{}',
    education: '[]', achievements: '[]',
  });
  // The two lists compare by serialised value rather than reference: editing a
  // certificate replaces the array, so an identity check would call the form
  // dirty the moment anything was touched and never clean again.
  const isDirty = name !== originalRef.current.name
    || email !== originalRef.current.email
    || phone !== originalRef.current.phone
    || location !== originalRef.current.location
    || bio !== originalRef.current.bio
    || jobTitle !== originalRef.current.jobTitle
    || experienceSince !== originalRef.current.experienceSince
    || philosophy !== originalRef.current.philosophy
    || trainingStyle !== originalRef.current.trainingStyle
    || designation !== originalRef.current.designation
    || JSON.stringify(specialisations) !== originalRef.current.specialisations
    || JSON.stringify(certifications) !== originalRef.current.certifications
    || JSON.stringify(languages) !== originalRef.current.languages
    || JSON.stringify(coachingModes) !== originalRef.current.coachingModes
    || JSON.stringify(previousGyms) !== originalRef.current.previousGyms
    || JSON.stringify(workingHours) !== originalRef.current.workingHours
    || JSON.stringify(education) !== originalRef.current.education
    || JSON.stringify(achievements) !== originalRef.current.achievements;

  /** Load a server row into the form and reset the dirty baseline together. */
  const hydrate = useCallback((row: ProfileMe) => {
    setMe(row);
    setName(row.name); setEmail(row.email); setPhone(row.phone);
    setLocation(row.location); setBio(row.bio);
    setJobTitle(row.jobTitle || '');
    setExperienceSince(row.experienceSince || '');
    setSpecialisations(row.specialisations || []);
    setPhilosophy(row.philosophy || '');
    setTrainingStyle(row.trainingStyle || '');
    setDesignation(row.designation || '');
    setLanguages(row.languages || []);
    setCoachingModes(row.coachingModes || []);
    setPreviousGyms(row.previousGyms || []);
    setWorkingHours(row.workingHours || {});
    setEducation(row.education || []);
    setAchievements(row.achievements || []);
    // Drop the server's computed status from the editable copy: it is derived,
    // and keeping it in the draft would make the dirty check fire whenever the
    // clock rolled a certificate from "valid" to "expiring".
    const drafts: CertDraft[] = (row.certifications || []).map((x) => ({
      id: x.id, name: x.name, issuer: x.issuer,
      issued_on: x.issued_on, expires_on: x.expires_on, credential_id: x.credential_id,
    }));
    setCertifications(drafts);
    originalRef.current = {
      name: row.name, email: row.email, phone: row.phone, location: row.location, bio: row.bio,
      jobTitle: row.jobTitle || '', experienceSince: row.experienceSince || '',
      philosophy: row.philosophy || '', trainingStyle: row.trainingStyle || '',
      designation: row.designation || '',
      specialisations: JSON.stringify(row.specialisations || []),
      certifications: JSON.stringify(drafts),
      languages: JSON.stringify(row.languages || []),
      coachingModes: JSON.stringify(row.coachingModes || []),
      previousGyms: JSON.stringify(row.previousGyms || []),
      workingHours: JSON.stringify(row.workingHours || {}),
      education: JSON.stringify(row.education || []),
      achievements: JSON.stringify(row.achievements || []),
    };
  }, []);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Avatar + cover banner */
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);

  /* Password */
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* MFA */
  const [mfaSetup, setMfaSetup] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaBusy, setMfaBusy] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disableMfaOpen, setDisableMfaOpen] = useState(false);
  const [signOutAllOpen, setSignOutAllOpen] = useState(false);
  const [signingOutAll, setSigningOutAll] = useState(false);

  const strength = useMemo(() => pwStrength(newPw), [newPw]);
  const pwMatch = confirmPw.length > 0 && newPw === confirmPw;
  const pwMismatch = confirmPw.length > 0 && newPw !== confirmPw;

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle}
      className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:opacity-70">
      {show
        ? <EyeOff size={13} style={{ color: 'var(--text-disabled)' }} />
        : <Eye size={13} style={{ color: 'var(--text-disabled)' }} />}
    </button>
  );

  /* ── Load everything ── */
  const loadProfile = useCallback(() => {
    setPageLoading(true);
    setPageError(null);
    api.profile.me()
      // hydrate() sets `me` as well as the form fields and the dirty baseline,
      // so they can never drift apart.
      .then(hydrate)
      .catch(err => setPageError(err instanceof Error ? err.message : 'Could not load profile'))
      .finally(() => setPageLoading(false));
    api.profile.notifications.get().then(setNotifications).catch(() => {});
    api.profile.preferences.get().then(setPreferences).catch(() => {});
  }, [hydrate]);

  const fetchActivity = useCallback(async () => {
    setActivityLoading(true);
    try {
      const [feed, devices, sessions] = await Promise.all([
        api.activity.list({ limit: 8 }),
        api.activity.devices(),
        api.activity.sessions(),
      ]);
      setActivityItems(feed?.events ?? []);
      setActivityTotal(feed?.total ?? 0);
      setDevice(Array.isArray(devices) && devices.length > 0 ? devices[0] : null);
      setSession(Array.isArray(sessions) && sessions.length > 0 ? sessions[0] : null);
    } catch {
      setActivityItems([]);
      setActivityTotal(0);
      setDevice(null);
      setSession(null);
    } finally {
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); fetchActivity(); }, [loadProfile, fetchActivity]);

  /* ── Save personal info ── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const row = await api.profile.updateMe({
        name, email, phone, location, bio,
        job_title: jobTitle,
        philosophy, training_style: trainingStyle, designation,
        languages, coaching_modes: coachingModes,
        previous_gyms: previousGyms, working_hours: workingHours,
        education, achievements,
        // '' clears the date; the server distinguishes that from omitting it.
        experience_since: experienceSince || '',
        specialisations,
        // status/daysLeft are the server's to compute — sending them back
        // would let a stale browser assert a certificate is still valid.
        certifications: certifications.map(({ id, name: n, issuer, issued_on, expires_on, credential_id }) => ({
          id, name: n, issuer, issued_on, expires_on, credential_id,
        })),
      });
      hydrate(row);
      setSaveMsg({ type: 'success', text: 'Profile saved successfully' });
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setSaveMsg({ type: 'error', text: msg });
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    const o = originalRef.current;
    setName(o.name); setEmail(o.email); setPhone(o.phone); setLocation(o.location); setBio(o.bio);
    setJobTitle(o.jobTitle); setExperienceSince(o.experienceSince);
    setPhilosophy(o.philosophy); setTrainingStyle(o.trainingStyle); setDesignation(o.designation);
    setLanguages(JSON.parse(o.languages));
    setCoachingModes(JSON.parse(o.coachingModes));
    setPreviousGyms(JSON.parse(o.previousGyms));
    setWorkingHours(JSON.parse(o.workingHours));
    setEducation(JSON.parse(o.education));
    setAchievements(JSON.parse(o.achievements));
    setSpecialisations(JSON.parse(o.specialisations));
    setCertifications(JSON.parse(o.certifications));
    setSaveMsg(null);
  };

  /**
   * Re-read the profile for its DERIVED fields only.
   *
   * An upload or a portfolio change moves the completion score, and the score
   * is the server's to compute. Merging the whole row back in would be a
   * hydrate() in disguise: it would overwrite whatever is half-typed in the
   * form and reset the dirty baseline underneath the Save bar. So only the
   * fields no input is bound to are taken.
   */
  const refreshDerived = useCallback(async () => {
    try {
      const row = await api.profile.me();
      setMe(prev => (prev ? {
        ...prev,
        completion: row.completion,
        portfolioCount: row.portfolioCount,
        avatarUrl: row.avatarUrl,
        coverUrl: row.coverUrl,
      } : row));
    } catch {
      // A stale ring is not worth an error toast on top of whichever one the
      // action that triggered this already showed.
    }
  }, []);

  /** Shared guard for the two image uploads. */
  const rejectImage = (file: File, maxBytes: number): string | null => {
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      return 'Only PNG, JPG, WEBP, or GIF images are allowed';
    }
    if (file.size > maxBytes) return `Image must be under ${Math.round(maxBytes / (1024 * 1024))}MB`;
    return null;
  };

  /* ── Avatar upload ── */
  const handleAvatarFile = async (file: File) => {
    const bad = rejectImage(file, 2 * 1024 * 1024);
    if (bad) { toast.error(bad); return; }
    setAvatarUploading(true);
    try {
      const { avatarUrl } = await api.profile.uploadAvatar(file);
      setMe(prev => prev ? { ...prev, avatarUrl } : prev);
      toast.success('Profile photo updated');
      refreshDerived();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
    }
  };

  /* ── Cover banner ── */
  const handleCoverFile = async (file: File) => {
    const bad = rejectImage(file, 5 * 1024 * 1024);
    if (bad) { toast.error(bad); return; }
    setCoverBusy(true);
    try {
      const { coverUrl } = await api.profile.uploadCover(file);
      setMe(prev => prev ? { ...prev, coverUrl } : prev);
      toast.success('Cover banner updated');
      refreshDerived();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload banner');
    } finally {
      setCoverBusy(false);
    }
  };

  const handleCoverRemove = async () => {
    setCoverBusy(true);
    try {
      await api.profile.removeCover();
      setMe(prev => prev ? { ...prev, coverUrl: null } : prev);
      toast.success('Cover banner removed');
      refreshDerived();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove banner');
    } finally {
      setCoverBusy(false);
    }
  };

  /* ── Change password ── */
  const handleChangePw = async () => {
    setChangingPw(true);
    setPwMsg(null);
    try {
      await api.auth.changePassword(currentPw, newPw);
      setPwMsg({ type: 'success', text: 'Password updated successfully' });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err: unknown) {
      setPwMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password' });
    } finally {
      setChangingPw(false);
    }
  };

  /* ── MFA ── */
  const startMfaSetup = async () => {
    setMfaBusy(true);
    try {
      const res = await api.profile.mfa.setup();
      setMfaSetup(res);
      setMfaCode('');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to start two-factor setup');
    } finally {
      setMfaBusy(false);
    }
  };

  const verifyMfa = async () => {
    if (mfaCode.length !== 6) return;
    setMfaBusy(true);
    try {
      const res = await api.profile.mfa.verify(mfaCode);
      setRecoveryCodes(res.recoveryCodes);
      setMfaSetup(null);
      setMfaCode('');
      setMe(prev => prev ? { ...prev, mfaEnabled: true } : prev);
      toast.success('Two-factor authentication enabled');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid code — please try again');
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async () => {
    setMfaBusy(true);
    try {
      await api.profile.mfa.disable();
      setMe(prev => prev ? { ...prev, mfaEnabled: false } : prev);
      setDisableMfaOpen(false);
      toast.success('Two-factor authentication disabled');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to disable two-factor authentication');
    } finally {
      setMfaBusy(false);
    }
  };

  const mfaQrSvg = useMemo(() => {
    if (!mfaSetup) return '';
    const qr = qrcode(0, 'M');
    qr.addData(mfaSetup.qrUrl);
    qr.make();
    return qr.createSvgTag({ scalable: true });
  }, [mfaSetup]);

  /* ── Notifications (write-through) ── */
  const toggleNotification = async (key: keyof NotificationPreferences, value: boolean) => {
    if (!notifications) return;
    const next = { ...notifications, [key]: value };
    setNotifications(next);
    try {
      await api.profile.notifications.update(next);
    } catch (err: unknown) {
      setNotifications(notifications);
      toast.error(err instanceof Error ? err.message : 'Failed to save notification preference');
    }
  };

  const setFrequency = async (value: string) => {
    if (!notifications) return;
    const next = { ...notifications, frequency: value };
    setNotifications(next);
    try {
      await api.profile.notifications.update(next);
    } catch (err: unknown) {
      setNotifications(notifications);
      toast.error(err instanceof Error ? err.message : 'Failed to save notification frequency');
    }
  };

  const { setTheme } = useTheme();

  /* ── Preferences (write-through) ── */
  // Goes through ThemeProvider, like the header toggle does.
  //
  // This used to hand-roll the same side effects against localStorage
  // ['619-theme'] — mirroring AppShell, which was itself the wrong half of the
  // split. Two keys ('619-theme' here and in AppShell, 'theme' in
  // ThemeProvider and the pre-paint script) meant this control changed the
  // page but not the context, and the next page load fell back to the system
  // preference and discarded the choice. One writer now.
  //
  // 'system' still resolves here rather than in the provider: the provider's
  // Theme type is the RESOLVED value, and what the user picked is already
  // persisted server-side in `preferences.theme`.
  const applyThemeLive = (theme: 'light' | 'dark' | 'system') => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    setTheme(resolved);
  };

  const setPreference = async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    if (!preferences) return;
    const next = { ...preferences, [key]: value };
    setPreferences(next);
    if (key === 'theme') applyThemeLive(value as 'light' | 'dark' | 'system');
    try {
      await api.profile.preferences.update(next);
    } catch (err: unknown) {
      setPreferences(preferences);
      toast.error(err instanceof Error ? err.message : 'Failed to save preference');
    }
  };

  /* ── Sign out everywhere ── */
  const handleSignOutAll = async () => {
    setSigningOutAll(true);
    try {
      await api.profile.revokeAllSessions();
      toast.success('Signed out of all devices');
      logout();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to sign out everywhere');
      setSigningOutAll(false);
    }
  };

  if (pageLoading) return <Guard><ProfileSkeleton /></Guard>;

  if (pageError) {
    return (
      <Guard>
        <div className="flex min-h-[60vh] items-center justify-center">
          <GlassCard className="p-10 text-center max-w-sm mx-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            </div>
            <p className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Failed to load profile</p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{pageError}</p>
            <button
              onClick={loadProfile}
              className="mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-[700] text-white mx-auto"
              style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 14px rgba(0,103,224,0.35)' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </GlassCard>
        </div>
      </Guard>
    );
  }

  const displayName = me?.name || 'User';
  const roleLabel = me?.role ? me.role.charAt(0).toUpperCase() + me.role.slice(1) : '—';

  return (
    <Guard>
      {/* No page-level background: .shell-main (globals.css) already paints
          the canvas with --bg-canvas. A --bg-subtle panel on top of it read
          as a grey block inset from the page edges. The banded sections
          below keep their own backgrounds and inner padding — those are
          deliberate bands, not a page wrapper. */}
      {/* The breadcrumb, the "My Profile" heading and its subtitle used to
          sit in a bordered band here. All three said what the page already
          says: the card immediately below carries the user's name, photo,
          role and studio, so the title was a label for something already
          labelled, costing about a fifth of a phone screen before any
          content.

          Only the band is gone. .shell-main's own padding stays, because it
          is the same small gap every other hero in the app sits below —
          cancelling it here made this page sit tighter than the rest of the
          product for no reason a reader could see. */}
      <div>

        {/* ── MAIN ── */}
        {/* The bottom padding clears the fixed mobile bottom nav AND the
            floating save bar above it — without it the last card sat under
            both with no way to scroll further. Matches the pattern the
            dashboard and Leads pages already use. */}
        <div className="mx-auto max-w-screen-xl pb-[calc(var(--bottom-nav-h,4rem)+env(safe-area-inset-bottom,0px)+5.5rem)] lg:pb-10">

          {/* ── HERO ── */}
          {/* Reads `me`, not the form state: this is who the server says you
              are, and it must not change while somebody is typing a new name
              into a field they have not saved yet. */}
          {me && (
            <FadeUp>
              <ProfileHero
                me={me}
                organizationName={user?.organization_name}
                founderNumber={founderNumber}
                resolveUrl={(p) => `${apiBase()}${p}`}
                roleLabel={roleLabel}
                memberSince={fmtDate(me.createdAt)}
                avatarUploading={avatarUploading}
                coverBusy={coverBusy}
                onPickAvatar={handleAvatarFile}
                onPickCover={handleCoverFile}
                onRemoveCover={handleCoverRemove}
              />
            </FadeUp>
          )}

          {/* ── QUICK STATS ── */}
          <FadeUp delay={0.06}>
            <div className="mb-7 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {[
                  { icon: <Calendar size={16} style={{ color: '#0067e0' }} />, label: 'Member Since', value: fmtDate(me?.createdAt), gradient: 'linear-gradient(135deg,rgba(0,103,224,0.15),rgba(0,103,224,0.06))' },
                  { icon: <Shield size={16} style={{ color: me?.mfaEnabled ? '#10b981' : '#f59e0b' }} />, label: 'Two-Factor Auth', value: me?.mfaEnabled ? 'Enabled' : 'Disabled', gradient: me?.mfaEnabled ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.06))' : 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.06))' },
                  { icon: <ShieldCheck size={16} style={{ color: '#0067e0' }} />, label: 'Role', value: roleLabel, gradient: 'linear-gradient(135deg,rgba(0,103,224,0.15),rgba(0,103,224,0.06))' },
                  { icon: <History size={16} style={{ color: '#0067e0' }} />, label: 'All-Time Actions', value: String(activityTotal), gradient: 'linear-gradient(135deg,rgba(0,103,224,0.15),rgba(0,103,224,0.06))' },
                ].map((s, i) => (
                  <FadeUp key={s.label} delay={0.04 * i}>
                    <StatChip {...s} />
                  </FadeUp>
                ))}
              </div>
            </div>
          </FadeUp>

          {/* ── TABS ── */}
          <FadeUp delay={0.1}>
            {/* `inline-flex` shrank the strip to its content and then clipped
                it: a fourth tab was cut mid-word with no scrollbar and no
                hint there was anything past it. Full width scrolls properly,
                and the tabs no longer shrink below their labels. */}
            <div className="mb-7 flex w-full overflow-x-auto rounded-2xl p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              {([
                { id: 'overview', label: 'Overview', icon: <User size={13} /> },
                { id: 'credentials', label: 'Credentials', icon: <Award size={13} /> },
                { id: 'portfolio', label: 'Portfolio', icon: <Images size={13} /> },
                { id: 'security', label: 'Security', icon: <Lock size={13} /> },
                { id: 'preferences', label: 'Preferences', icon: <Settings size={13} /> },
              ] as const).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className="relative flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[13px] px-4 py-2.5 text-[12.5px] font-[680] transition-all"
                  style={{
                    background: tab === t.id ? 'rgba(0,103,224,1)' : 'transparent',
                    color: tab === t.id ? 'white' : 'var(--text-muted)',
                    boxShadow: tab === t.id ? '0 2px 8px rgba(0,103,224,0.35)' : 'none',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </FadeUp>

          {/* ── TAB CONTENT ── */}
          <AnimatePresence mode="wait">

            {/* ═══ OVERVIEW ═══ */}
            {tab === 'overview' && (
              <m.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Leads the tab: it is the one thing on this page that says
                    what to do next, and it is useless below the fold.
                    lg:col-span-2 because the checklist reads as a list, not
                    as a column beside another card. */}
                {me?.completion && (
                  <GlassCard className="p-6 lg:col-span-2" glow>
                    <SectionHeader
                      icon={<BadgeCheck size={15} style={{ color: '#0067e0' }} />}
                      title="Profile completion"
                      subtitle="Scored on what you've saved, not what you've typed"
                    />
                    <CompletionPanel completion={me.completion} onGoToTab={setTab} />
                  </GlassCard>
                )}

                {/* Personal Information */}
                <FadeUp>
                  <GlassCard className="p-6">
                    <SectionHeader icon={<User size={14} style={{ color: '#0067e0' }} />} title="Personal Information" subtitle="Your name, contact and bio" />
                    <div className="flex flex-col gap-3">
                      <FloatInput tone="brand" upperLifted label="Full Name" value={name} onChange={setName} required />
                      <FloatInput tone="brand" upperLifted label="Email Address" type="email" value={email} onChange={setEmail} required />
                      <FloatInput tone="brand" upperLifted label="Phone Number" value={phone} onChange={setPhone} />
                      <FloatInput tone="brand" upperLifted label="Location" value={location} onChange={setLocation} />
                      <FloatInput tone="brand" upperLifted label="Bio" value={bio} onChange={setBio} multiline />
                    </div>
                  </GlassCard>
                </FadeUp>

                {/* Activity Timeline */}
                <FadeUp delay={0.05}>
                  <GlassCard className="p-6">
                    <SectionHeader icon={<History size={14} style={{ color: '#0067e0' }} />} title="Activity Timeline" subtitle="Recent account events" />
                    {activityLoading ? (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
                      </div>
                    ) : activityItems.length === 0 ? (
                      <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No recent activity recorded</p>
                    ) : (
                      <div className="relative pl-5">
                        <div className="absolute left-[9px] top-2 bottom-2 w-px"
                          style={{ background: 'linear-gradient(to bottom, rgba(0,103,224,0.3), rgba(0,103,224,0.05))' }} />
                        <div className="flex flex-col gap-4">
                          {activityItems.map((item, i) => {
                            const ico = activityIcon(item.category);
                            return (
                              <m.div key={item.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.06, duration: 0.35 }} className="relative flex items-start gap-3">
                                <div className="absolute -left-5 flex h-4 w-4 items-center justify-center rounded-full"
                                  style={{ background: ico.bg, color: ico.color, top: 2 }}>
                                  {ico.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-[12.5px] font-[660]" style={{ color: 'var(--text-primary)' }}>
                                    {ACTIVITY_LABELS[item.type] ?? item.description}
                                  </p>
                                  {item.ip && (
                                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>IP {item.ip}</p>
                                  )}
                                </div>
                                <span className="shrink-0 whitespace-nowrap text-[10px] font-[500]" style={{ color: 'var(--text-muted)', paddingTop: 2 }}>
                                  {timeAgo(item.createdAt)}
                                </span>
                              </m.div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </FadeUp>

                {/* Current Session */}
                <FadeUp delay={0.08}>
                  <GlassCard className="p-6 lg:col-span-2">
                    <SectionHeader icon={<Wifi size={14} style={{ color: '#0067e0' }} />} title="Current Session" subtitle="This device, right now" />
                    {!device || !session ? (
                      <p className="text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>Session info unavailable.</p>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 rounded-2xl p-4"
                          style={{ background: 'rgba(0,103,224,0.05)', border: '1px solid rgba(0,103,224,0.18)' }}>
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                            style={{ background: 'linear-gradient(135deg,rgba(0,103,224,0.15),rgba(0,103,224,0.10))' }}>
                            {deviceIcon(device.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-[13px] font-[660]" style={{ color: 'var(--text-primary)' }}>{device.name}</p>
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-[760] uppercase"
                                style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                                <Wifi size={7} /> This device
                              </span>
                            </div>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                              {device.ip} · {device.location} · Signed in {timeAgo(session.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                            This app tracks the device you&apos;re on now, not a roster of past logins. If you suspect
                            unauthorized access, sign out everywhere from the Security tab — it immediately invalidates
                            every active login, including this one.
                          </p>
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </FadeUp>

              </m.div>
            )}

            {/* ═══ SECURITY ═══ */}
            {/* ═══ CREDENTIALS ═══ */}
            {tab === 'credentials' && (
              <m.div key="credentials" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6">

                {/* The banner exists because a lapsed certificate is an
                    insurance problem, not an admin one. It leads the tab
                    rather than sitting under the list — the whole reason
                    expiry dates are stored per certificate instead of as one
                    block of text is to be able to say this sentence. */}
                {me && (me.credentialSummary.expired > 0 || me.credentialSummary.expiring > 0) && (
                  <div className="rounded-2xl p-4"
                    style={{
                      background: me.credentialSummary.expired > 0 ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.09)',
                      border: `1px solid ${me.credentialSummary.expired > 0 ? 'rgba(220,38,38,0.22)' : 'rgba(245,158,11,0.24)'}`,
                    }}>
                    <p className="flex items-start gap-2.5 text-[12.5px] font-[620] leading-relaxed"
                      style={{ color: me.credentialSummary.expired > 0 ? '#b91c1c' : '#b45309' }}>
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span>
                        {me.credentialSummary.expired > 0 && (
                          <><strong>{me.credentialSummary.expired}</strong> certification{me.credentialSummary.expired === 1 ? ' has' : 's have'} expired. </>
                        )}
                        {me.credentialSummary.expiring > 0 && (
                          <><strong>{me.credentialSummary.expiring}</strong> expire{me.credentialSummary.expiring === 1 ? 's' : ''} within 60 days. </>
                        )}
                        Renew before taking sessions against them.
                      </span>
                    </p>
                  </div>
                )}

                <GlassCard className="p-6" glow>
                  <SectionHeader
                    icon={<Briefcase size={15} style={{ color: '#0067e0' }} />}
                    title="Professional profile"
                    subtitle="What you do, as opposed to what the software lets you click"
                  />
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FloatInput tone="brand" upperLifted label="Job title" value={jobTitle} onChange={setJobTitle} />
                    <div>
                      <label htmlFor="coaching-since" className="mb-1.5 block text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        Coaching since
                      </label>
                      <input id="coaching-since"
                        type="date" value={experienceSince}
                        onChange={(e) => setExperienceSince(e.target.value)}
                        className="w-full rounded-xl px-3.5 py-3 text-[13px] font-[560] outline-none"
                        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                      />
                      {/* A date is stored and the duration derived, so this
                          never silently goes stale the way a typed "8 years"
                          would. */}
                      <p className="mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {me?.yearsExperience != null
                          ? `${me.yearsExperience} year${me.yearsExperience === 1 ? '' : 's'} of experience`
                          : 'Set a date and the years keep themselves current'}
                      </p>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<User size={15} style={{ color: '#0067e0' }} />}
                    title="About"
                    subtitle="What you'd tell someone before they train with you"
                  />
                  <AboutSection
                    bio={bio} philosophy={philosophy} trainingStyle={trainingStyle} languages={languages}
                    set={(patch) => {
                      if (patch.bio !== undefined) setBio(patch.bio);
                      if (patch.philosophy !== undefined) setPhilosophy(patch.philosophy);
                      if (patch.trainingStyle !== undefined) setTrainingStyle(patch.trainingStyle);
                      if (patch.languages !== undefined) setLanguages(patch.languages);
                    }}
                  />
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<Briefcase size={15} style={{ color: '#0067e0' }} />}
                    title="Professional information"
                    subtitle="Your designation, how you coach, and where you've coached"
                  />
                  <ProfessionalSection
                    designation={designation} coachingModes={coachingModes} previousGyms={previousGyms}
                    set={(patch) => {
                      if (patch.designation !== undefined) setDesignation(patch.designation);
                      if (patch.coachingModes !== undefined) setCoachingModes(patch.coachingModes);
                      if (patch.previousGyms !== undefined) setPreviousGyms(patch.previousGyms);
                    }}
                  />
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<Calendar size={15} style={{ color: '#0067e0' }} />}
                    title="Availability"
                    subtitle="When you take sessions. Split shifts are supported."
                  />
                  <WorkingHoursEditor
                    value={workingHours} onChange={setWorkingHours}
                    weeklyMinutes={me?.weeklyMinutes ?? 0}
                  />
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<Dumbbell size={15} style={{ color: '#0067e0' }} />}
                    title="Specialisations"
                    subtitle="The work you take on"
                  />
                  <SpecialisationEditor value={specialisations} onChange={setSpecialisations} />
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<GraduationCap size={15} style={{ color: '#0067e0' }} />}
                    title="Education"
                    subtitle="Degrees, diplomas and academy courses"
                  />
                  <EducationSection value={education} onChange={setEducation} />
                </GlassCard>

                <GlassCard className="p-6">
                  <SectionHeader
                    icon={<Trophy size={15} style={{ color: '#0067e0' }} />}
                    title="Achievements"
                    subtitle="Competitions, records, awards and media — newest first"
                  />
                  <AchievementsSection value={achievements} onChange={setAchievements} />
                </GlassCard>

                <GlassCard className="p-6">
                  <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                    <SectionHeader
                      icon={<Award size={15} style={{ color: '#0067e0' }} />}
                      title="Certifications"
                      subtitle={me && me.credentialSummary.total > 0
                        ? `${me.credentialSummary.total} on file${me.credentialSummary.unknown > 0 ? ` · ${me.credentialSummary.unknown} with no expiry recorded` : ''}`
                        : 'Qualifications, with the dates that matter'}
                    />
                    <button
                      onClick={() => setCertifications((prev) => [...prev, {
                        // Local-only id; the server issues its own on save.
                        id: `new_${Date.now().toString(36)}`,
                        name: '', issuer: '', issued_on: null, expires_on: null, credential_id: '',
                      }])}
                      className="flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-[700] text-white transition-transform hover:scale-[1.03]"
                      style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 14px rgba(0,103,224,0.32)' }}
                    >
                      <Plus size={13} /> Add
                    </button>
                  </div>

                  {certifications.length === 0 ? (
                    <div className="rounded-2xl px-4 py-10 text-center"
                      style={{ background: 'var(--bg-subtle)', border: '1px dashed var(--border)' }}>
                      <BadgeCheck size={26} className="mx-auto mb-2.5" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-[13px] font-[680]" style={{ color: 'var(--text-primary)' }}>No certifications yet</p>
                      <p className="mx-auto mt-1 max-w-[380px] text-[12px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        Add your CPT, CPR/AED and any specialist qualifications. Record the
                        expiry and this page will tell you before one lapses.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {certifications.map((cert, i) => (
                        <CertificateRow
                          key={cert.id}
                          cert={cert}
                          saved={me?.certifications.find((x) => x.id === cert.id)}
                          onChange={(next) => setCertifications((prev) => prev.map((x, j) => (j === i ? next : x)))}
                          onRemove={() => setCertifications((prev) => prev.filter((_, j) => j !== i))}
                        />
                      ))}
                    </div>
                  )}
                </GlassCard>
              </m.div>
            )}

            {/* ═══ PORTFOLIO ═══ */}
            {tab === 'portfolio' && (
              <m.div key="portfolio" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}>
                <GlassCard className="p-5 sm:p-6">
                  <SectionHeader
                    icon={<Images size={14} style={{ color: '#0067e0' }} />}
                    title="Portfolio"
                    subtitle="Transformations, sessions and clips — saved as you go, not on Save"
                  />
                  {/* Nothing here feeds the dirty baseline: every action is
                      its own request, which is why this section owns its
                      state and the rest of the page does not. */}
                  <PortfolioSection
                    resolveUrl={(p) => `${apiBase()}${p}`}
                    onChanged={refreshDerived}
                    notify={{ success: toast.success, error: toast.error }}
                  />
                </GlassCard>
              </m.div>
            )}

            {tab === 'security' && (
              <m.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Two-Factor Authentication */}
                <FadeUp>
                  <GlassCard className="p-6" glow>
                    <SectionHeader icon={<Fingerprint size={14} style={{ color: '#0067e0' }} />} title="Two-Factor Authentication" subtitle="Authenticator app (TOTP)" />

                    {me?.mfaEnabled ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                          <ShieldCheck size={14} style={{ color: '#059669' }} />
                          <span className="text-[12px] font-[640]" style={{ color: '#059669' }}>Two-factor authentication is active and protecting your account</span>
                        </div>
                        <button onClick={() => setDisableMfaOpen(true)}
                          className="self-start rounded-xl px-4 py-2 text-[12px] font-[700] transition-all"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)' }}>
                          Disable 2FA
                        </button>
                      </div>
                    ) : mfaSetup ? (
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
                          <div className="shrink-0 rounded-2xl p-3" style={{ background: '#fff', width: 168, height: 168 }}
                            dangerouslySetInnerHTML={{ __html: mfaQrSvg }} />
                          <div className="flex-1 space-y-2">
                            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
                              Scan with Google Authenticator, Authy, or any TOTP app. Can&apos;t scan? Enter this code manually:
                            </p>
                            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                              <code className="flex-1 truncate text-[11.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{mfaSetup.secret}</code>
                              <button onClick={() => { navigator.clipboard?.writeText(mfaSetup.secret).catch(() => {}); toast.success('Secret copied'); }}
                                className="flex h-6 w-6 items-center justify-center rounded-lg transition-opacity hover:opacity-70">
                                <Copy size={12} style={{ color: 'var(--text-muted)' }} />
                              </button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex-1">
                            <FloatInput tone="brand" upperLifted label="6-digit code" value={mfaCode} onChange={v => setMfaCode(v.replace(/\D/g, '').slice(0, 6))} />
                          </div>
                          <button onClick={verifyMfa} disabled={mfaCode.length !== 6 || mfaBusy}
                            className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12.5px] font-[720] text-white transition-all"
                            style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', opacity: (mfaCode.length !== 6 || mfaBusy) ? 0.55 : 1 }}>
                            {mfaBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                            Verify
                          </button>
                        </div>
                        <button onClick={() => setMfaSetup(null)} className="self-start text-[11.5px] font-[640]" style={{ color: 'var(--text-muted)' }}>
                          Cancel setup
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2.5 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)' }}>
                          <AlertTriangle size={14} style={{ color: '#d97706' }} />
                          <span className="text-[12px] font-[640]" style={{ color: '#d97706' }}>Two-factor authentication is not enabled</span>
                        </div>
                        <button onClick={startMfaSetup} disabled={mfaBusy}
                          className="flex items-center justify-center gap-2 self-start rounded-xl px-4 py-2.5 text-[12.5px] font-[720] text-white transition-all"
                          style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 14px rgba(0,103,224,0.30)' }}>
                          {mfaBusy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                          Set Up Two-Factor Authentication
                        </button>
                      </div>
                    )}
                  </GlassCard>
                </FadeUp>

                {/* Login Alerts + Sign out everywhere */}
                <FadeUp delay={0.05}>
                  <GlassCard className="p-6">
                    <SectionHeader icon={<Bell size={14} style={{ color: '#0067e0' }} />} title="Login Security" subtitle="Alerts and active session control" />
                    <div className="flex flex-col gap-3">
                      <SettingRow label="Login Alerts" description="Email me on new sign-ins" accent>
                        <Toggle
                          enabled={!!notifications?.email_logins}
                          disabled={!notifications}
                          onChange={v => toggleNotification('email_logins', v)}
                        />
                      </SettingRow>
                      <div className="flex items-center justify-between gap-4 rounded-2xl p-4"
                        style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.10)' }}>
                        <div>
                          <p className="text-[13px] font-[660]" style={{ color: 'var(--text-primary)' }}>Sign out everywhere</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Invalidates every active login, including this one</p>
                        </div>
                        <button onClick={() => setSignOutAllOpen(true)}
                          className="shrink-0 rounded-xl px-3 py-1.5 text-[11.5px] font-[700] transition-all"
                          style={{ background: 'rgba(239,68,68,0.08)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.18)' }}>
                          Sign out all
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </FadeUp>

                {/* Change Password */}
                <FadeUp delay={0.08}>
                  <GlassCard className="p-6 lg:col-span-2">
                    <SectionHeader icon={<Lock size={14} style={{ color: '#0067e0' }} />} title="Change Password" subtitle="Use a strong, unique password" />
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-3">
                        <FloatInput tone="brand" upperLifted label="Current Password" type={showCur ? 'text' : 'password'} value={currentPw} onChange={setCurrentPw}
                          suffix={eyeBtn(showCur, () => setShowCur(v => !v))} required />
                        <FloatInput tone="brand" upperLifted label="New Password" type={showNew ? 'text' : 'password'} value={newPw} onChange={setNewPw}
                          suffix={eyeBtn(showNew, () => setShowNew(v => !v))} required />
                        {newPw.length > 0 && (
                          <div>
                            <div className="flex gap-1 mb-1.5">
                              {[1, 2, 3, 4].map(i => (
                                <m.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                                  className="h-1.5 flex-1 rounded-full origin-left"
                                  style={{ background: i <= strength.score ? strength.color : 'var(--border-2)' }} />
                              ))}
                            </div>
                            <p className="text-right text-[11px] font-[660]" style={{ color: strength.color }}>{strength.label}</p>
                          </div>
                        )}
                        <FloatInput tone="brand" upperLifted label="Confirm New Password" type={showConf ? 'text' : 'password'} value={confirmPw} onChange={setConfirmPw}
                          suffix={
                            <div className="flex items-center gap-1.5">
                              {pwMatch && <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
                              {pwMismatch && <XCircle size={13} style={{ color: '#ef4444' }} />}
                              {eyeBtn(showConf, () => setShowConf(v => !v))}
                            </div>
                          } />
                        {pwMismatch && <p className="pl-1 text-[11px]" style={{ color: '#ef4444' }}>Passwords do not match</p>}
                      </div>

                      <div className="flex flex-col justify-between gap-4">
                        <div className="rounded-2xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <p className="mb-3 text-[10.5px] font-[760] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Requirements</p>
                          <div className="space-y-2.5">
                            {[
                              { label: 'At least 8 characters', ok: newPw.length >= 8 },
                              { label: 'Uppercase letter', ok: /[A-Z]/.test(newPw) },
                              { label: 'Number included', ok: /[0-9]/.test(newPw) },
                              { label: 'Special character', ok: /[^A-Za-z0-9]/.test(newPw) },
                            ].map(r => (
                              <div key={r.label} className="flex items-center gap-2.5">
                                <m.div animate={{ scale: r.ok ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                                  {r.ok
                                    ? <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                    : <AlertTriangle size={13} style={{ color: 'var(--text-disabled)', flexShrink: 0 }} />}
                                </m.div>
                                <span className="text-[12px]" style={{ color: r.ok ? 'var(--text-primary)' : 'var(--text-muted)' }}>{r.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {pwMsg && (
                          <div className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-[620]"
                            style={{
                              background: pwMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                              border: pwMsg.type === 'success' ? '1px solid rgba(16,185,129,0.20)' : '1px solid rgba(239,68,68,0.20)',
                              color: pwMsg.type === 'success' ? '#059669' : '#dc2626',
                            }}>
                            {pwMsg.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                            {pwMsg.text}
                          </div>
                        )}

                        <button onClick={handleChangePw} disabled={!currentPw || !newPw || !pwMatch || changingPw}
                          className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-[720] text-white transition-all"
                          style={{
                            background: 'linear-gradient(135deg,#0067e0,#0059ce)',
                            boxShadow: '0 4px 14px rgba(0,103,224,0.30)',
                            opacity: (!currentPw || !newPw || !pwMatch || changingPw) ? 0.55 : 1,
                          }}>
                          {changingPw ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                          {changingPw ? 'Updating…' : 'Update Password'}
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                </FadeUp>
              </m.div>
            )}

            {/* ═══ PREFERENCES ═══ */}
            {tab === 'preferences' && (
              <m.div key="preferences" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Theme */}
                <FadeUp>
                  <GlassCard className="p-6">
                    <SectionHeader icon={<Sun size={14} style={{ color: '#0067e0' }} />} title="Appearance" subtitle="Theme preference" />
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { id: 'light', label: 'Light', icon: <Sun size={18} /> },
                        { id: 'dark', label: 'Dark', icon: <Moon size={18} /> },
                        { id: 'system', label: 'System', icon: <Monitor size={18} /> },
                      ] as const).map(opt => (
                        <m.button key={opt.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}
                          onClick={() => setPreference('theme', opt.id)}
                          disabled={!preferences}
                          className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all disabled:opacity-50"
                          style={{
                            background: preferences?.theme === opt.id ? 'rgba(0,103,224,0.08)' : 'var(--bg-subtle)',
                            border: preferences?.theme === opt.id ? '1.5px solid rgba(0,103,224,0.30)' : '1px solid var(--border)',
                            boxShadow: preferences?.theme === opt.id ? '0 4px 12px rgba(0,103,224,0.12)' : 'none',
                            color: preferences?.theme === opt.id ? '#0067e0' : 'var(--text-muted)',
                          }}>
                          {opt.icon}
                          <span className="text-[11px] font-[660]">{opt.label}</span>
                        </m.button>
                      ))}
                    </div>
                  </GlassCard>
                </FadeUp>

                {/* Locale */}
                <FadeUp delay={0.04}>
                  <GlassCard className="p-6">
                    <SectionHeader icon={<Globe size={14} style={{ color: '#0067e0' }} />} title="Locale" subtitle="Timezone and date format" />
                    <div className="flex flex-col gap-2.5">
                      <SettingRow label="Language" description="Interface language">
                        <span className="text-[12.5px] font-[660]" style={{ color: 'var(--text-primary)' }}>English (India)</span>
                      </SettingRow>
                      {preferences && (
                        <>
                          <SelectRow label="Timezone" description="Your local timezone" value={preferences.timezone}
                            options={TIMEZONE_OPTIONS} onChange={v => setPreference('timezone', v)} />
                          <SelectRow label="Date Format" description="How dates display" value={preferences.dateFormat}
                            options={DATE_FORMAT_OPTIONS} onChange={v => setPreference('dateFormat', v)} />
                          <SettingRow label="Compact Mode" description="Denser spacing across the app">
                            <Toggle enabled={preferences.compactMode} onChange={v => setPreference('compactMode', v)} />
                          </SettingRow>
                        </>
                      )}
                    </div>
                  </GlassCard>
                </FadeUp>

                {/* Notifications */}
                <FadeUp delay={0.08}>
                  <GlassCard className="p-6 lg:col-span-2">
                    <SectionHeader icon={<Bell size={14} style={{ color: '#0067e0' }} />} title="Notification Preferences" subtitle="Choose how you want to be notified" />
                    {notifications ? (
                      <>
                        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
                          <div>
                            <p className="text-[13px] font-[660]" style={{ color: 'var(--text-primary)' }}>Digest Frequency</p>
                            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>How often batched notifications are sent</p>
                          </div>
                          <div className="flex gap-1.5 rounded-xl p-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                            {FREQUENCY_OPTIONS.map(f => (
                              <button key={f.value} onClick={() => setFrequency(f.value)}
                                className="rounded-[9px] px-3 py-1.5 text-[11px] font-[700] transition-all"
                                style={{
                                  background: notifications.frequency === f.value ? '#0067e0' : 'transparent',
                                  color: notifications.frequency === f.value ? '#fff' : 'var(--text-muted)',
                                }}>
                                {f.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {NOTIFICATION_ROWS.map(n => (
                            <SettingRow key={n.key} label={n.label} description={n.description}>
                              <Toggle enabled={notifications[n.key] as boolean} onChange={v => toggleNotification(n.key, v)} />
                            </SettingRow>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-10">
                        <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
                      </div>
                    )}
                  </GlassCard>
                </FadeUp>
              </m.div>
            )}

          </AnimatePresence>
        </div>

        {/* ── STICKY SAVE BAR ── */}
        <StickySaveBar dirty={isDirty || !!saveMsg} saving={saving} onSave={handleSave} onDiscard={handleDiscard} msg={saveMsg} />

        {/* ── RECOVERY CODES MODAL ── */}
        <Dialog open={!!recoveryCodes} onOpenChange={(open) => { if (!open) setRecoveryCodes(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save your recovery codes</DialogTitle>
            </DialogHeader>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Store these somewhere safe. Each code can be used once to get back into your account if you lose access to your authenticator app.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-[12px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
              {(recoveryCodes ?? []).map(code => (
                <code key={code} className="text-[12.5px] font-[700] tracking-wider" style={{ color: 'var(--text-primary)' }}>{code}</code>
              ))}
            </div>
            <DialogFooter>
              <button
                onClick={() => { navigator.clipboard?.writeText((recoveryCodes ?? []).join('\n')).catch(() => {}); toast.success('Recovery codes copied'); }}
                className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <Copy size={13} /> Copy all
              </button>
              <button onClick={() => setRecoveryCodes(null)}
                className="rounded-[10px] px-4 py-2 text-[12.5px] font-[700] text-white"
                style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)' }}>
                Done
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── DISABLE MFA CONFIRM ── */}
        <Dialog open={disableMfaOpen} onOpenChange={setDisableMfaOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Disable two-factor authentication?</DialogTitle>
            </DialogHeader>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              Your account will only be protected by your password. You can re-enable 2FA at any time.
            </p>
            <DialogFooter>
              <button onClick={() => setDisableMfaOpen(false)}
                className="rounded-[10px] px-4 py-2 text-[12.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button onClick={disableMfa} disabled={mfaBusy}
                className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-[700] text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', opacity: mfaBusy ? 0.6 : 1 }}>
                {mfaBusy ? <Loader2 size={13} className="animate-spin" /> : null}
                Disable 2FA
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── SIGN OUT EVERYWHERE CONFIRM ── */}
        <Dialog open={signOutAllOpen} onOpenChange={setSignOutAllOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sign out of all devices?</DialogTitle>
            </DialogHeader>
            <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
              This immediately ends every active login, including this one — you&apos;ll need to sign in again right after.
            </p>
            <DialogFooter>
              <button onClick={() => setSignOutAllOpen(false)}
                className="rounded-[10px] px-4 py-2 text-[12.5px] font-[700]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                Cancel
              </button>
              <button onClick={handleSignOutAll} disabled={signingOutAll}
                className="flex items-center gap-2 rounded-[10px] px-4 py-2 text-[12.5px] font-[700] text-white"
                style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', opacity: signingOutAll ? 0.6 : 1 }}>
                {signingOutAll ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                Sign out everywhere
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <style>{`
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
            }
            .overflow-x-auto::-webkit-scrollbar { display: none; }
          `}</style>
      </div>
    </Guard>
  );
}
