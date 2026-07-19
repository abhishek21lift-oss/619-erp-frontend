'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { m, AnimatePresence, useInView } from 'framer-motion';
import qrcode from 'qrcode-generator';
import {
  User, Mail, Phone, MapPin, Activity, Shield,
  Bell, Smartphone, Monitor, Tablet, Moon, Sun, Globe,
  ChevronRight, CheckCircle2, XCircle, Lock, Key, Eye, EyeOff,
  RefreshCw, LogOut, ShieldCheck, AlertTriangle,
  History, Fingerprint, Copy, Loader2, Settings,
  Zap, Calendar, Wifi, Camera, FileSignature, Dumbbell, ClipboardList,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui';
import { api } from '@/lib/api';
import type { ProfileMe, NotificationPreferences, UserPreferences, ProfileDevice, ProfileSession, ActivityEvent } from '@/lib/api';
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
  if (s <= 3) return { score: s, label: 'Good', color: '#3b82f6' };
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
    profile:           { icon: <User size={11} />,          color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
    parq:               { icon: <ShieldCheck size={11} />,   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    informed_consent:   { icon: <FileSignature size={11} />, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
    workout:            { icon: <Dumbbell size={11} />,      color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
    workout_log:        { icon: <ClipboardList size={11} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  };
  return map[category] ?? { icon: <Activity size={11} />, color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
}

function deviceIcon(type: string, size = 16, color = '#6366f1') {
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
          ? '0 4px 32px rgba(99,102,241,0.10), 0 1px 0 rgba(255,255,255,0.9) inset'
          : '0 2px 20px rgba(15,23,42,0.07), 0 1px 0 rgba(255,255,255,0.9) inset',
        ...style,
      }}
    >
      {children}
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
        style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.10))' }}
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
function FloatInput({
  label, type = 'text', value, onChange, suffix, required, disabled, multiline,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void;
  suffix?: React.ReactNode; required?: boolean; disabled?: boolean; multiline?: boolean;
}) {
  const id = React.useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  const Field = multiline ? 'textarea' : 'input';
  return (
    <div className="relative">
      <m.div
        animate={{
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12), 0 2px 8px rgba(99,102,241,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
        transition={{ duration: 0.2 }}
        className="relative rounded-[14px] overflow-hidden"
        style={{
          background: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: `1.5px solid ${focused ? 'rgba(99,102,241,0.45)' : 'var(--border-2)'}`,
          opacity: disabled ? 0.55 : 1,
          transition: 'background 180ms, border-color 180ms',
        }}
      >
        <label htmlFor={id}
          className="pointer-events-none absolute left-4 font-[560] transition-all"
          style={{
            top: lifted ? 8 : (multiline ? 14 : 18),
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#6366f1' : 'var(--text-disabled)') : 'var(--text-disabled)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
            letterSpacing: lifted ? '0.03em' : '0',
            textTransform: lifted ? 'uppercase' : 'none',
          }}
        >
          {label}{required && ' *'}
        </label>
        <Field
          id={id} type={multiline ? undefined : type} value={value}
          rows={multiline ? 3 : undefined}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[560] outline-none disabled:cursor-not-allowed resize-none"
          style={{ color: 'var(--text-primary)', caretColor: '#6366f1' }}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </m.div>
    </div>
  );
}

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
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : 'var(--border-3)',
        boxShadow: enabled ? '0 0 16px rgba(99,102,241,0.30)' : 'none',
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
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(99,102,241,0.14)' }}
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
        background: accent ? 'rgba(99,102,241,0.05)' : 'var(--bg-subtle)',
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
      <select
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
    <div className="min-h-screen" style={{ background: 'var(--bg-subtle)' }}>
      <div className="mx-auto max-w-screen-xl px-5 py-8 sm:px-8">
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
  return (
    <AnimatePresence>
      {dirty && (
        <m.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed above-bottom-nav left-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{
            transform: 'translateX(-50%)',
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
              <span className="text-[12.5px] font-[500]" style={{ color: 'var(--text-secondary)' }}>Unsaved changes</span>
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
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  color: 'white',
                  boxShadow: '0 2px 12px rgba(99,102,241,0.40)',
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
  const { logout } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<'overview' | 'security' | 'preferences'>('overview');

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
  const originalRef = useRef({ name: '', email: '', phone: '', location: '', bio: '' });
  const isDirty = name !== originalRef.current.name
    || email !== originalRef.current.email
    || phone !== originalRef.current.phone
    || location !== originalRef.current.location
    || bio !== originalRef.current.bio;

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Avatar */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

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
      .then(row => {
        setMe(row);
        setName(row.name); setEmail(row.email); setPhone(row.phone);
        setLocation(row.location); setBio(row.bio);
        originalRef.current = { name: row.name, email: row.email, phone: row.phone, location: row.location, bio: row.bio };
      })
      .catch(err => setPageError(err instanceof Error ? err.message : 'Could not load profile'))
      .finally(() => setPageLoading(false));
    api.profile.notifications.get().then(setNotifications).catch(() => {});
    api.profile.preferences.get().then(setPreferences).catch(() => {});
  }, []);

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
      const row = await api.profile.updateMe({ name, email, phone, location, bio });
      setMe(row);
      originalRef.current = { name: row.name, email: row.email, phone: row.phone, location: row.location, bio: row.bio };
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
    setSaveMsg(null);
  };

  /* ── Avatar upload ── */
  const handleAvatarPick = () => avatarInputRef.current?.click();
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      toast.error('Only PNG, JPG, WEBP, or GIF images are allowed');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setAvatarUploading(true);
    try {
      const { avatarUrl } = await api.profile.uploadAvatar(file);
      setMe(prev => prev ? { ...prev, avatarUrl } : prev);
      toast.success('Profile photo updated');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setAvatarUploading(false);
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

  /* ── Preferences (write-through) ── */
  // Mirrors AppShell's own dark-mode toggle exactly (same localStorage key/
  // format and DOM side effects) so the two controls stay in sync.
  const applyThemeLive = (theme: 'light' | 'dark' | 'system') => {
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    localStorage.setItem('619-theme', resolved);
    document.documentElement.setAttribute('data-theme', resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
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

  if (pageLoading) return <Guard><AppShell><ProfileSkeleton /></AppShell></Guard>;

  if (pageError) {
    return (
      <Guard><AppShell>
        <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--bg-subtle)' }}>
          <GlassCard className="p-10 text-center max-w-sm mx-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            </div>
            <p className="text-[16px] font-[760]" style={{ color: 'var(--text-primary)' }}>Failed to load profile</p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{pageError}</p>
            <button
              onClick={loadProfile}
              className="mt-6 flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-[700] text-white mx-auto"
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </GlassCard>
        </div>
      </AppShell></Guard>
    );
  }

  const displayName = me?.name || 'User';
  const roleLabel = me?.role ? me.role.charAt(0).toUpperCase() + me.role.slice(1) : '—';

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'var(--bg-subtle)' }}>

          {/* ── BREADCRUMB + TITLE ── */}
          <div className="border-b" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
            <div className="mx-auto max-w-screen-xl px-5 py-5 sm:px-8">
              <div className="mb-3 flex items-center gap-1.5 text-[11px] font-[500]" style={{ color: 'var(--text-muted)' }}>
                <span>Settings</span>
                <ChevronRight size={10} />
                <span style={{ color: '#6366f1' }}>My Profile</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[13px]"
                  style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))' }}>
                  <User size={17} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[880] tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>My Profile</h1>
                  <p className="text-[12.5px]" style={{ color: 'var(--text-muted)' }}>Account, security &amp; preferences</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-7 sm:px-8">

            {/* ── HERO ── */}
            <FadeUp>
              <div className="relative overflow-hidden rounded-3xl mb-7 p-6 sm:p-8"
                style={{
                  background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 40%,#8b5cf6 70%,#a78bfa 100%)',
                  boxShadow: '0 12px 48px rgba(99,102,241,0.32)',
                }}>
                <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
                <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif"
                      className="hidden" onChange={handleAvatarFile} />
                    <button
                      onClick={handleAvatarPick}
                      disabled={avatarUploading}
                      className="group relative flex h-[76px] w-[76px] items-center justify-center overflow-hidden rounded-[22px] text-[28px] font-[880] text-white transition-transform hover:scale-[1.04]"
                      style={{
                        background: me?.avatarUrl ? undefined : 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(16px)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {me?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${apiBase()}${me.avatarUrl}`} alt={displayName} className="h-full w-full object-cover" />
                      ) : initials(displayName)}
                      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ background: 'rgba(15,23,42,0.55)' }}>
                        {avatarUploading ? <Loader2 size={18} className="animate-spin text-white" /> : <Camera size={18} className="text-white" />}
                      </span>
                    </button>
                  </div>

                  {/* Identity */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <h2 className="text-[26px] font-[880] tracking-[-0.03em] text-white">{displayName}</h2>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-[760]"
                        style={{ background: 'rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.25)' }}>
                        <ShieldCheck size={10} /> {roleLabel}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                        <Mail size={11} /> {me?.email}
                      </span>
                      {me?.phone && (
                        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                          <Phone size={11} /> {me.phone}
                        </span>
                      )}
                      {me?.location && (
                        <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                          <MapPin size={11} /> {me.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgba(255,255,255,0.80)' }}>
                        <Calendar size={11} /> Since {fmtDate(me?.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* ── QUICK STATS ── */}
            <FadeUp delay={0.06}>
              <div className="mb-7 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {[
                    { icon: <Calendar size={16} style={{ color: '#6366f1' }} />, label: 'Member Since', value: fmtDate(me?.createdAt), gradient: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.06))' },
                    { icon: <Shield size={16} style={{ color: me?.mfaEnabled ? '#10b981' : '#f59e0b' }} />, label: 'Two-Factor Auth', value: me?.mfaEnabled ? 'Enabled' : 'Disabled', gradient: me?.mfaEnabled ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.06))' : 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.06))' },
                    { icon: <ShieldCheck size={16} style={{ color: '#0ea5e9' }} />, label: 'Role', value: roleLabel, gradient: 'linear-gradient(135deg,rgba(14,165,233,0.15),rgba(14,165,233,0.06))' },
                    { icon: <History size={16} style={{ color: '#8b5cf6' }} />, label: 'All-Time Actions', value: String(activityTotal), gradient: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(139,92,246,0.06))' },
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
              <div className="mb-7 inline-flex overflow-x-auto rounded-2xl p-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)', scrollbarWidth: 'none' }}>
                {([
                  { id: 'overview', label: 'Overview', icon: <User size={13} /> },
                  { id: 'security', label: 'Security', icon: <Lock size={13} /> },
                  { id: 'preferences', label: 'Preferences', icon: <Settings size={13} /> },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="relative flex shrink-0 items-center gap-2 rounded-[13px] px-4 py-2.5 text-[12.5px] font-[680] transition-all"
                    style={{
                      background: tab === t.id ? 'rgba(99,102,241,1)' : 'transparent',
                      color: tab === t.id ? 'white' : 'var(--text-muted)',
                      boxShadow: tab === t.id ? '0 2px 8px rgba(99,102,241,0.35)' : 'none',
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

                  {/* Personal Information */}
                  <FadeUp>
                    <GlassCard className="p-6">
                      <SectionHeader icon={<User size={14} style={{ color: '#6366f1' }} />} title="Personal Information" subtitle="Your name, contact and bio" />
                      <div className="flex flex-col gap-3">
                        <FloatInput label="Full Name" value={name} onChange={setName} required />
                        <FloatInput label="Email Address" type="email" value={email} onChange={setEmail} required />
                        <FloatInput label="Phone Number" value={phone} onChange={setPhone} />
                        <FloatInput label="Location" value={location} onChange={setLocation} />
                        <FloatInput label="Bio" value={bio} onChange={setBio} multiline />
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Activity Timeline */}
                  <FadeUp delay={0.05}>
                    <GlassCard className="p-6">
                      <SectionHeader icon={<History size={14} style={{ color: '#6366f1' }} />} title="Activity Timeline" subtitle="Recent account events" />
                      {activityLoading ? (
                        <div className="flex items-center justify-center py-10">
                          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-disabled)' }} />
                        </div>
                      ) : activityItems.length === 0 ? (
                        <p className="py-6 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>No recent activity recorded</p>
                      ) : (
                        <div className="relative pl-5">
                          <div className="absolute left-[9px] top-2 bottom-2 w-px"
                            style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05))' }} />
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
                      <SectionHeader icon={<Wifi size={14} style={{ color: '#6366f1' }} />} title="Current Session" subtitle="This device, right now" />
                      {!device || !session ? (
                        <p className="text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>Session info unavailable.</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center gap-3 rounded-2xl p-4"
                            style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.18)' }}>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.10))' }}>
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
              {tab === 'security' && (
                <m.div key="security" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                  {/* Two-Factor Authentication */}
                  <FadeUp>
                    <GlassCard className="p-6" glow>
                      <SectionHeader icon={<Fingerprint size={14} style={{ color: '#6366f1' }} />} title="Two-Factor Authentication" subtitle="Authenticator app (TOTP)" />

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
                              <FloatInput label="6-digit code" value={mfaCode} onChange={v => setMfaCode(v.replace(/\D/g, '').slice(0, 6))} />
                            </div>
                            <button onClick={verifyMfa} disabled={mfaCode.length !== 6 || mfaBusy}
                              className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12.5px] font-[720] text-white transition-all"
                              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: (mfaCode.length !== 6 || mfaBusy) ? 0.55 : 1 }}>
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
                            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 4px 14px rgba(99,102,241,0.30)' }}>
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
                      <SectionHeader icon={<Bell size={14} style={{ color: '#6366f1' }} />} title="Login Security" subtitle="Alerts and active session control" />
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
                      <SectionHeader icon={<Lock size={14} style={{ color: '#6366f1' }} />} title="Change Password" subtitle="Use a strong, unique password" />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-3">
                          <FloatInput label="Current Password" type={showCur ? 'text' : 'password'} value={currentPw} onChange={setCurrentPw}
                            suffix={eyeBtn(showCur, () => setShowCur(v => !v))} required />
                          <FloatInput label="New Password" type={showNew ? 'text' : 'password'} value={newPw} onChange={setNewPw}
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
                          <FloatInput label="Confirm New Password" type={showConf ? 'text' : 'password'} value={confirmPw} onChange={setConfirmPw}
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
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              boxShadow: '0 4px 14px rgba(99,102,241,0.30)',
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
                      <SectionHeader icon={<Sun size={14} style={{ color: '#6366f1' }} />} title="Appearance" subtitle="Theme preference" />
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
                              background: preferences?.theme === opt.id ? 'rgba(99,102,241,0.08)' : 'var(--bg-subtle)',
                              border: preferences?.theme === opt.id ? '1.5px solid rgba(99,102,241,0.30)' : '1px solid var(--border)',
                              boxShadow: preferences?.theme === opt.id ? '0 4px 12px rgba(99,102,241,0.12)' : 'none',
                              color: preferences?.theme === opt.id ? '#6366f1' : 'var(--text-muted)',
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
                      <SectionHeader icon={<Globe size={14} style={{ color: '#6366f1' }} />} title="Locale" subtitle="Timezone and date format" />
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
                      <SectionHeader icon={<Bell size={14} style={{ color: '#6366f1' }} />} title="Notification Preferences" subtitle="Choose how you want to be notified" />
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
                                    background: notifications.frequency === f.value ? '#6366f1' : 'transparent',
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
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
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
      </AppShell>
    </Guard>
  );
}
