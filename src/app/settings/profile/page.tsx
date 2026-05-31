'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  User, Mail, Phone, MapPin, Clock, Activity, Shield,
  Bell, Smartphone, Laptop, Monitor, Moon, Sun, Globe,
  ChevronRight, CheckCircle2, XCircle, Lock, Key, Eye, EyeOff,
  RefreshCw, LogOut, ShieldCheck, AlertTriangle, Sparkles,
  History, Fingerprint, Copy, Edit3, Loader2, Settings,
  Zap, Star, TrendingUp, Calendar, Wifi, WifiOff,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { api } from '@/lib/api';

/* ─────────────────────────────────────────
   TYPES
───────────────────────────────────────── */
interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface Device {
  id: string;
  name: string;
  type: 'Desktop' | 'Mobile' | 'Laptop';
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  current: boolean;
  trusted: boolean;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  loginTime: string;
  expiresIn: string;
  active: boolean;
  risk: 'low' | 'medium' | 'high';
}

/* ─────────────────────────────────────────
   DEMO DATA
───────────────────────────────────────── */
const ACTIVITY: ActivityItem[] = [
  { id: 'a1', action: 'Login successful', detail: 'Chrome on Windows · Delhi, IN', timestamp: '2 min ago', icon: <LogOut size={11} />, color: '#10b981', bgColor: 'rgba(16,185,129,0.12)' },
  { id: 'a2', action: 'Settings updated', detail: 'Studio branding preferences changed', timestamp: '1 hr ago', icon: <Settings size={11} />, color: '#6366f1', bgColor: 'rgba(99,102,241,0.12)' },
  { id: 'a3', action: 'Member created', detail: 'Added new member: Arjun Mehta', timestamp: '3 hrs ago', icon: <User size={11} />, color: '#0ea5e9', bgColor: 'rgba(14,165,233,0.12)' },
  { id: 'a4', action: 'Password changed', detail: 'Account password was updated securely', timestamp: '2 days ago', icon: <Key size={11} />, color: '#f59e0b', bgColor: 'rgba(245,158,11,0.12)' },
  { id: 'a5', action: '2FA enabled', detail: 'Two-factor auth via Authenticator', timestamp: '5 days ago', icon: <Shield size={11} />, color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.12)' },
  { id: 'a6', action: 'New device', detail: 'iPhone 15 Pro added to trusted devices', timestamp: '1 week ago', icon: <Smartphone size={11} />, color: '#06b6d4', bgColor: 'rgba(6,182,212,0.12)' },
];

const DEVICES: Device[] = [
  { id: 'd1', name: 'Windows PC', type: 'Desktop', browser: 'Chrome 124', ip: '103.95.42.18', location: 'Delhi, IN', lastActive: 'Now', current: true, trusted: true },
  { id: 'd2', name: 'iPhone 15 Pro', type: 'Mobile', browser: 'Safari 17', ip: '103.95.42.18', location: 'Delhi, IN', lastActive: '2 hrs ago', current: false, trusted: true },
  { id: 'd3', name: 'MacBook Air', type: 'Laptop', browser: 'Chrome 123', ip: '203.95.42.10', location: 'Mumbai, IN', lastActive: 'Yesterday', current: false, trusted: false },
];

const SESSIONS: Session[] = [
  { id: 's1', device: 'Windows PC · Chrome', browser: 'Chrome 124', ip: '103.95.42.18', loginTime: '09:42 AM', expiresIn: 'Active', active: true, risk: 'low' },
  { id: 's2', device: 'iPhone 15 Pro · Safari', browser: 'Safari 17', ip: '103.95.42.18', loginTime: '07:30 AM', expiresIn: '2 hrs', active: true, risk: 'low' },
  { id: 's3', device: 'MacBook Air · Chrome', browser: 'Chrome 123', ip: '203.95.42.10', loginTime: 'Yesterday', expiresIn: 'Expired', active: false, risk: 'medium' },
];

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
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

/* ─────────────────────────────────────────
   FADE-UP WRAPPER
───────────────────────────────────────── */
function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
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
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.9)',
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
        <p className="text-[14px] font-[780] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{title}</p>
        <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{subtitle}</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   FLOAT INPUT (GLASS)
───────────────────────────────────────── */
function FloatInput({
  label, type = 'text', value, onChange, suffix, required, disabled,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void;
  suffix?: React.ReactNode; required?: boolean; disabled?: boolean;
}) {
  const id = React.useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <motion.div
        animate={{
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.12), 0 2px 8px rgba(99,102,241,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
        transition={{ duration: 0.2 }}
        className="relative rounded-[14px] overflow-hidden"
        style={{
          background: focused ? 'var(--bg-card)' : 'rgba(248,250,252,0.88)',
          border: `1.5px solid ${focused ? 'rgba(99,102,241,0.45)' : 'var(--border-2)'}`,
          opacity: disabled ? 0.55 : 1,
          transition: 'background 180ms, border-color 180ms',
        }}
      >
        <label htmlFor={id}
          className="pointer-events-none absolute left-4 font-[560] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#6366f1' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
            letterSpacing: lifted ? '0.03em' : '0',
            textTransform: lifted ? 'uppercase' : 'none',
          }}
        >
          {label}{required && ' *'}
        </label>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[560] outline-none disabled:cursor-not-allowed"
          style={{ color: 'rgb(15,23,42)', caretColor: '#6366f1' }}
        />
        {suffix && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────
   IOS TOGGLE
───────────────────────────────────────── */
function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!enabled)}
      className="relative flex-shrink-0"
      style={{
        width: 44, height: 26,
        borderRadius: 999,
        background: enabled
          ? 'linear-gradient(135deg,#6366f1,#8b5cf6)'
          : 'var(--border-3)',
        boxShadow: enabled ? '0 0 16px rgba(99,102,241,0.30)' : 'none',
        border: 'none',
        cursor: 'pointer',
        transition: 'background 250ms, box-shadow 250ms',
      }}
    >
      <motion.span
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
   SECURITY RING
───────────────────────────────────────── */
function SecurityRing({ score }: { score: number }) {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const label = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : 'Needs Work';
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: 100, height: 100 }}>
        <svg width="100" height="100" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(15,23,42,0.07)" strokeWidth="8" />
          <motion.circle
            cx="50" cy="50" r={r} fill="none"
            stroke={color} strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[22px] font-[820] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)', lineHeight: 1 }}>{score}</span>
          <span className="text-[9px] font-[660] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>/ 100</span>
        </div>
      </div>
      <span className="text-[11px] font-[680]" style={{ color }}>{label}</span>
    </div>
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
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(99,102,241,0.14)' }}
      whileTap={{ scale: 0.97 }}
      className="flex-shrink-0 rounded-2xl p-4"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid rgba(255,255,255,0.95)',
        boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
        minWidth: 120,
        cursor: 'default',
      }}
    >
      <div
        className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <p className="text-[16px] font-[820] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
      <p className="mt-0.5 text-[10.5px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
    </motion.div>
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
        background: accent ? 'rgba(99,102,241,0.04)' : 'rgba(248,250,252,0.7)',
        border: '1px solid rgba(15,23,42,0.05)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        {description && (
          <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ─────────────────────────────────────────
   SKELETON
───────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc,#f1f5f9 50%,#fafafe)' }}>
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
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          className="fixed bottom-6 left-1/2 z-50 flex items-center gap-3 rounded-2xl px-5 py-3"
          style={{
            transform: 'translateX(-50%)',
            background: 'rgba(15,23,42,0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.24)',
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
              <span className="text-[12.5px] font-[500]" style={{ color: 'rgba(255,255,255,0.6)' }}>Unsaved changes</span>
              <button
                onClick={onDiscard}
                className="rounded-xl px-3 py-1.5 text-[12px] font-[620] transition-colors"
                style={{ color: 'rgba(255,255,255,0.55)', background: 'rgba(255,255,255,0.08)' }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────
   PAGE
───────────────────────────────────────── */
export default function ProfilePage() {
  const [tab, setTab] = useState<'overview' | 'security' | 'preferences'>('overview');

  /* API state */
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'Admin',
    phone: '+91 98765 43210',
    location: 'Lucknow, Uttar Pradesh',
    jobTitle: 'Gym Manager',
    memberSince: 'January 2023',
  });

  /* Form dirty tracking */
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [jobTitle, setJobTitle] = useState('Gym Manager');
  const originalRef = useRef({ name: '', email: '', phone: '+91 98765 43210', jobTitle: 'Gym Manager' });
  const isDirty = name !== originalRef.current.name
    || email !== originalRef.current.email
    || phone !== originalRef.current.phone
    || jobTitle !== originalRef.current.jobTitle;

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Security */
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(true);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [changingPw, setChangingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Preferences */
  const [themePref, setThemePref] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('English (India)');
  const [timezone, setTimezone] = useState('Asia/Kolkata · IST +05:30');
  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [mktNotif, setMktNotif] = useState(false);
  const [prodNotif, setProdNotif] = useState(true);

  const strength = useMemo(() => pwStrength(newPw), [newPw]);
  const pwMatch = confirmPw.length > 0 && newPw === confirmPw;
  const pwMismatch = confirmPw.length > 0 && newPw !== confirmPw;

  const eyeBtn = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle}
      className="flex h-6 w-6 items-center justify-center rounded-lg transition-colors hover:bg-slate-100">
      {show
        ? <EyeOff size={13} style={{ color: 'rgb(148,163,184)' }} />
        : <Eye size={13} style={{ color: 'rgb(148,163,184)' }} />}
    </button>
  );

  /* Fetch profile */
  const loadProfile = useCallback(() => {
    setPageLoading(true);
    setPageError(null);
    api.auth.me()
      .then(res => {
        if (res?.user) {
          const u = res.user;
          const n = u.name ?? '';
          const e = u.email ?? '';
          const r = u.role ? u.role.charAt(0).toUpperCase() + u.role.slice(1) : 'Admin';
          setProfile(prev => ({ ...prev, name: n, email: e, role: r }));
          setName(n);
          setEmail(e);
          originalRef.current = { ...originalRef.current, name: n, email: e };
        }
      })
      .catch(err => setPageError(err.message ?? 'Could not load profile'))
      .finally(() => setPageLoading(false));
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  /* Save profile */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      await api.settings.update({ name, email, phone });
      setProfile(prev => ({ ...prev, name, email, phone, jobTitle }));
      originalRef.current = { name, email, phone, jobTitle };
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
    setName(o.name);
    setEmail(o.email);
    setPhone(o.phone);
    setJobTitle(o.jobTitle);
    setSaveMsg(null);
  };

  /* Change password */
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

  if (pageLoading) return <Guard><AppShell><Skeleton /></AppShell></Guard>;

  if (pageError) {
    return (
      <Guard><AppShell>
        <div className="flex min-h-screen items-center justify-center" style={{ background: 'linear-gradient(145deg,#f8fafc,#f1f5f9 50%,#fafafe)' }}>
          <GlassCard className="p-10 text-center max-w-sm mx-4">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
              <AlertTriangle size={24} style={{ color: '#ef4444' }} />
            </div>
            <p className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Failed to load profile</p>
            <p className="mt-1 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>{pageError}</p>
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

  const displayName = profile.name || 'User';

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(150deg,#f8f7ff 0%,#f1f5f9 40%,#fafafe 100%)' }}>

          {/* ── BREADCRUMB + TITLE ── */}
          <div
            className="border-b"
            style={{
              background: 'var(--bg-card)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              borderColor: 'var(--border)',
            }}
          >
            <div className="mx-auto max-w-screen-xl px-5 py-5 sm:px-8">
              <div className="mb-3 flex items-center gap-1.5 text-[11px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>
                <span>Settings</span>
                <ChevronRight size={10} />
                <span style={{ color: 'rgb(99,102,241)' }}>My Profile</span>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[13px]"
                  style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.12),rgba(139,92,246,0.08))' }}
                >
                  <User size={17} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[880] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>My Profile</h1>
                  <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>Executive workspace · {displayName}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-7 sm:px-8">

            {/* ── HERO ── */}
            <FadeUp>
              <div
                className="relative overflow-hidden rounded-3xl mb-7 p-6 sm:p-8"
                style={{
                  background: 'linear-gradient(135deg,#6366f1 0%,#7c3aed 40%,#8b5cf6 70%,#a78bfa 100%)',
                  boxShadow: '0 12px 48px rgba(99,102,241,0.32)',
                }}
              >
                {/* ambient blobs */}
                <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)', filter: 'blur(40px)' }} />
                <div className="pointer-events-none absolute -bottom-12 -left-8 h-48 w-48 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.05)', filter: 'blur(32px)' }} />

                <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                  {/* Avatar */}
                  <motion.div
                    whileHover={{ scale: 1.04 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    className="relative shrink-0"
                  >
                    <div
                      className="flex h-[76px] w-[76px] items-center justify-center rounded-[22px] text-[28px] font-[880] text-white"
                      style={{
                        background: 'rgba(255,255,255,0.18)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '2px solid rgba(255,255,255,0.35)',
                        boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      {initials(displayName)}
                    </div>
                    {/* online dot */}
                    <div
                      className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full"
                      style={{ background: '#10b981', border: '2.5px solid #7c3aed', boxShadow: '0 0 8px rgba(16,185,129,0.5)' }}
                    />
                  </motion.div>

                  {/* Identity */}
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                      <h2 className="text-[26px] font-[880] tracking-[-0.03em] text-white">{displayName}</h2>
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-[760]"
                        style={{ background: 'rgba(255,255,255,0.18)', color: 'var(--text-primary)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)' }}
                      >
                        <ShieldCheck size={10} /> {profile.role}
                      </span>
                    </div>
                    <p className="mt-1 text-[13.5px] font-[500]" style={{ color: 'var(--text-primary)' }}>{profile.jobTitle} · 619 Fitness Studio</p>
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:justify-start">
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                        <Mail size={11} /> {profile.email}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                        <MapPin size={11} /> {profile.location}
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--text-primary)' }}>
                        <Calendar size={11} /> Since {profile.memberSince}
                      </span>
                    </div>
                    <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
                      <button
                        onClick={() => setTab('overview')}
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-[700] transition-all"
                        style={{
                          background: 'var(--bg-card)',
                          color: '#6366f1',
                          boxShadow: '0 2px 10px rgba(0,0,0,0.12)',
                        }}
                      >
                        <Edit3 size={12} /> Edit Profile
                      </button>
                      <button
                        className="flex items-center gap-2 rounded-xl px-4 py-2 text-[12.5px] font-[700] transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.14)',
                          color: 'white',
                          border: '1px solid rgba(255,255,255,0.25)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        <Copy size={12} /> Share Profile
                      </button>
                    </div>
                  </div>

                  {/* Security ring - desktop */}
                  <div className="hidden sm:block">
                    <SecurityRing score={92} />
                  </div>
                </div>
              </div>
            </FadeUp>

            {/* ── QUICK STATS ── */}
            <FadeUp delay={0.06}>
              <div className="mb-7 overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                  {[
                    { icon: <Calendar size={16} style={{ color: '#6366f1' }} />, label: 'Member Since', value: 'Jan 2023', gradient: 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(99,102,241,0.06))' },
                    { icon: <Shield size={16} style={{ color: '#10b981' }} />, label: 'Security Score', value: '92 / 100', gradient: 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.06))' },
                    { icon: <Monitor size={16} style={{ color: '#0ea5e9' }} />, label: 'Active Devices', value: '3', gradient: 'linear-gradient(135deg,rgba(14,165,233,0.15),rgba(14,165,233,0.06))' },
                    { icon: <Zap size={16} style={{ color: '#8b5cf6' }} />, label: 'Login Sessions', value: '2 active', gradient: 'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(139,92,246,0.06))' },
                    { icon: <TrendingUp size={16} style={{ color: '#f59e0b' }} />, label: 'Actions Today', value: '14', gradient: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.06))' },
                    { icon: <Star size={16} style={{ color: '#ec4899' }} />, label: 'Account Status', value: 'Premium', gradient: 'linear-gradient(135deg,rgba(236,72,153,0.15),rgba(236,72,153,0.06))' },
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
              <div
                className="mb-7 inline-flex overflow-hidden rounded-2xl p-1"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid rgba(15,23,42,0.08)',
                  boxShadow: '0 1px 4px rgba(15,23,42,0.05)',
                }}
              >
                {([
                  { id: 'overview', label: 'Overview', icon: <User size={13} /> },
                  { id: 'security', label: 'Security', icon: <Lock size={13} /> },
                  { id: 'preferences', label: 'Preferences', icon: <Settings size={13} /> },
                ] as const).map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className="relative flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[12.5px] font-[680] transition-all"
                    style={{
                      background: tab === t.id ? 'rgba(99,102,241,1)' : 'transparent',
                      color: tab === t.id ? 'white' : 'rgb(148,163,184)',
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
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                >
                  {/* Personal Information */}
                  <FadeUp>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<User size={14} style={{ color: '#6366f1' }} />}
                        title="Personal Information"
                        subtitle="Your name, contact and role details"
                      />
                      <div className="flex flex-col gap-3">
                        <FloatInput label="Full Name" value={name} onChange={setName} required />
                        <FloatInput label="Email Address" type="email" value={email} onChange={setEmail} required />
                        <FloatInput label="Phone Number" value={phone} onChange={setPhone} required />
                        <FloatInput label="Job Title" value={jobTitle} onChange={setJobTitle} />
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Activity Timeline */}
                  <FadeUp delay={0.05}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<History size={14} style={{ color: '#6366f1' }} />}
                        title="Activity Timeline"
                        subtitle="Recent account events"
                      />
                      <div className="relative pl-5">
                        {/* vertical line */}
                        <div
                          className="absolute left-[9px] top-2 bottom-2 w-px"
                          style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05))' }}
                        />
                        <div className="flex flex-col gap-4">
                          {ACTIVITY.map((item, i) => (
                            <motion.div
                              key={item.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.06, duration: 0.35 }}
                              className="relative flex items-start gap-3"
                            >
                              {/* dot */}
                              <div
                                className="absolute -left-5 flex h-4 w-4 items-center justify-center rounded-full"
                                style={{ background: item.bgColor, color: item.color, top: 2 }}
                              >
                                {item.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{item.action}</p>
                                <p className="text-[11px] leading-relaxed" style={{ color: 'rgb(148,163,184)' }}>{item.detail}</p>
                              </div>
                              <span className="shrink-0 whitespace-nowrap text-[10px] font-[500]" style={{ color: 'rgb(148,163,184)', paddingTop: 2 }}>
                                {item.timestamp}
                              </span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Connected Devices */}
                  <FadeUp delay={0.08}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<Smartphone size={14} style={{ color: '#6366f1' }} />}
                        title="Connected Devices"
                        subtitle="All devices with access to your account"
                      />
                      <div className="flex flex-col gap-3">
                        {DEVICES.map(device => (
                          <motion.div
                            key={device.id}
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.15 }}
                            className="flex items-center gap-3 rounded-2xl p-4"
                            style={{
                              background: device.current ? 'rgba(99,102,241,0.05)' : 'rgba(248,250,252,0.85)',
                              border: device.current ? '1px solid rgba(99,102,241,0.18)' : '1px solid rgba(15,23,42,0.06)',
                            }}
                          >
                            <div
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                background: device.current
                                  ? 'linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.10))'
                                  : 'var(--border)',
                              }}
                            >
                              {device.type === 'Desktop'
                                ? <Monitor size={16} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />
                                : device.type === 'Laptop'
                                ? <Laptop size={16} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />
                                : <Smartphone size={16} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{device.name}</p>
                                {device.current && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-[760] uppercase"
                                    style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}
                                  >
                                    <Wifi size={7} /> Current
                                  </span>
                                )}
                                {device.trusted && !device.current && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-[660]"
                                    style={{ background: 'rgba(99,102,241,0.08)', color: '#6366f1' }}
                                  >
                                    <ShieldCheck size={7} /> Trusted
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                                {device.browser} · {device.ip} · {device.location}
                              </p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <span className="text-[10.5px] font-[500]" style={{ color: 'rgb(148,163,184)' }}>{device.lastActive}</span>
                              {!device.current && (
                                <button
                                  className="rounded-lg px-2.5 py-1 text-[10px] font-[660] transition-colors"
                                  style={{ background: 'rgba(239,68,68,0.07)', color: '#dc2626' }}
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Login Sessions */}
                  <FadeUp delay={0.10}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<LogOut size={14} style={{ color: '#6366f1' }} />}
                        title="Login Sessions"
                        subtitle="Active and recent sessions"
                      />
                      <div className="flex flex-col gap-2.5">
                        {SESSIONS.map(session => (
                          <div
                            key={session.id}
                            className="flex items-center gap-3 rounded-2xl p-4"
                            style={{
                              background: 'rgba(248,250,252,0.85)',
                              border: '1px solid rgba(15,23,42,0.06)',
                            }}
                          >
                            <div
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                              style={{
                                background: session.active ? 'rgba(16,185,129,0.10)' : 'rgba(107,114,128,0.08)',
                              }}
                            >
                              {session.active
                                ? <Wifi size={14} style={{ color: '#10b981' }} />
                                : <WifiOff size={14} style={{ color: '#9ca3af' }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12.5px] font-[640]" style={{ color: 'rgb(15,23,42)' }}>{session.device}</p>
                              <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>IP {session.ip} · {session.loginTime}</p>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1.5">
                              <span
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-[700]"
                                style={{
                                  background: session.active ? 'rgba(16,185,129,0.10)' : 'rgba(107,114,128,0.08)',
                                  color: session.active ? '#059669' : '#9ca3af',
                                }}
                              >
                                {session.expiresIn}
                              </span>
                              {session.risk !== 'low' && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[8.5px] font-[700] uppercase"
                                  style={{
                                    background: session.risk === 'high' ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
                                    color: session.risk === 'high' ? '#dc2626' : '#d97706',
                                  }}
                                >
                                  <AlertTriangle size={7} /> {session.risk} risk
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <button
                        className="mt-4 w-full rounded-xl py-2.5 text-[12px] font-[700] transition-colors"
                        style={{ background: 'rgba(239,68,68,0.06)', color: '#dc2626', border: '1px solid rgba(239,68,68,0.12)' }}
                      >
                        Revoke all other sessions
                      </button>
                    </GlassCard>
                  </FadeUp>

                </motion.div>
              )}

              {/* ═══ SECURITY ═══ */}
              {tab === 'security' && (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                >
                  {/* Security Overview */}
                  <FadeUp>
                    <GlassCard className="p-6" glow>
                      <SectionHeader
                        icon={<Shield size={14} style={{ color: '#6366f1' }} />}
                        title="Security Overview"
                        subtitle="Health of your account protection"
                      />
                      <div className="flex items-center gap-6 mb-6">
                        <SecurityRing score={92} />
                        <div className="flex-1 space-y-3">
                          {[
                            { label: 'Last password change', value: '42 days ago', dot: '#6366f1' },
                            { label: 'Active sessions', value: '2 devices', dot: '#10b981' },
                            { label: '2FA status', value: 'Enabled', dot: '#10b981' },
                            { label: 'Pending alerts', value: 'None', dot: '#6366f1' },
                          ].map(item => (
                            <div key={item.label} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: item.dot }} />
                                <span className="text-[12px]" style={{ color: 'rgb(100,116,139)' }}>{item.label}</span>
                              </div>
                              <span className="text-[12px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* 2FA + Login Alerts */}
                  <FadeUp delay={0.05}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<Fingerprint size={14} style={{ color: '#6366f1' }} />}
                        title="Authentication"
                        subtitle="Two-factor and login alerts"
                      />
                      <div className="flex flex-col gap-3">
                        <SettingRow
                          label="Two-Factor Authentication"
                          description="Authenticator app (Google / Authy)"
                          accent
                        >
                          <Toggle enabled={mfaEnabled} onChange={setMfaEnabled} />
                        </SettingRow>
                        <SettingRow label="Login Alerts" description="Email me on new device sign-in">
                          <Toggle enabled={loginAlerts} onChange={setLoginAlerts} />
                        </SettingRow>
                      </div>
                      {mfaEnabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 flex items-center gap-2.5 rounded-xl px-4 py-3"
                          style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}
                        >
                          <ShieldCheck size={14} style={{ color: '#059669' }} />
                          <span className="text-[12px] font-[640]" style={{ color: '#059669' }}>Two-factor authentication is active and protecting your account</span>
                        </motion.div>
                      )}
                    </GlassCard>
                  </FadeUp>

                  {/* Change Password */}
                  <FadeUp delay={0.08}>
                    <GlassCard className="p-6 lg:col-span-2">
                      <SectionHeader
                        icon={<Lock size={14} style={{ color: '#6366f1' }} />}
                        title="Change Password"
                        subtitle="Use a strong, unique password"
                      />
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="flex flex-col gap-3">
                          <FloatInput
                            label="Current Password"
                            type={showCur ? 'text' : 'password'}
                            value={currentPw} onChange={setCurrentPw}
                            suffix={eyeBtn(showCur, () => setShowCur(v => !v))}
                            required
                          />
                          <FloatInput
                            label="New Password"
                            type={showNew ? 'text' : 'password'}
                            value={newPw} onChange={setNewPw}
                            suffix={eyeBtn(showNew, () => setShowNew(v => !v))}
                            required
                          />
                          {newPw.length > 0 && (
                            <div>
                              <div className="flex gap-1 mb-1.5">
                                {[1, 2, 3, 4].map(i => (
                                  <motion.div key={i}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    className="h-1.5 flex-1 rounded-full origin-left"
                                    style={{ background: i <= strength.score ? strength.color : 'var(--border-2)' }}
                                  />
                                ))}
                              </div>
                              <p className="text-right text-[11px] font-[660]" style={{ color: strength.color }}>{strength.label}</p>
                            </div>
                          )}
                          <FloatInput
                            label="Confirm New Password"
                            type={showConf ? 'text' : 'password'}
                            value={confirmPw} onChange={setConfirmPw}
                            suffix={
                              <div className="flex items-center gap-1.5">
                                {pwMatch && <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
                                {pwMismatch && <XCircle size={13} style={{ color: '#ef4444' }} />}
                                {eyeBtn(showConf, () => setShowConf(v => !v))}
                              </div>
                            }
                          />
                          {pwMismatch && (
                            <p className="pl-1 text-[11px]" style={{ color: '#ef4444' }}>Passwords do not match</p>
                          )}
                        </div>

                        <div className="flex flex-col justify-between gap-4">
                          <div className="rounded-2xl p-4" style={{ background: 'rgba(248,250,252,0.90)', border: '1px solid rgba(15,23,42,0.07)' }}>
                            <p className="mb-3 text-[10.5px] font-[760] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Requirements</p>
                            <div className="space-y-2.5">
                              {[
                                { label: 'At least 8 characters', ok: newPw.length >= 8 },
                                { label: 'Uppercase letter', ok: /[A-Z]/.test(newPw) },
                                { label: 'Number included', ok: /[0-9]/.test(newPw) },
                                { label: 'Special character', ok: /[^A-Za-z0-9]/.test(newPw) },
                              ].map(r => (
                                <div key={r.label} className="flex items-center gap-2.5">
                                  <motion.div animate={{ scale: r.ok ? 1.1 : 1 }} transition={{ type: 'spring', stiffness: 500 }}>
                                    {r.ok
                                      ? <CheckCircle2 size={13} style={{ color: '#10b981', flexShrink: 0 }} />
                                      : <AlertTriangle size={13} style={{ color: 'rgba(15,23,42,0.20)', flexShrink: 0 }} />}
                                  </motion.div>
                                  <span className="text-[12px]" style={{ color: r.ok ? 'rgb(15,23,42)' : 'rgb(148,163,184)' }}>{r.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {pwMsg && (
                            <div
                              className="flex items-center gap-2 rounded-xl px-4 py-3 text-[12px] font-[620]"
                              style={{
                                background: pwMsg.type === 'success' ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                                border: pwMsg.type === 'success' ? '1px solid rgba(16,185,129,0.20)' : '1px solid rgba(239,68,68,0.20)',
                                color: pwMsg.type === 'success' ? '#059669' : '#dc2626',
                              }}
                            >
                              {pwMsg.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                              {pwMsg.text}
                            </div>
                          )}

                          <button
                            onClick={handleChangePw}
                            disabled={!currentPw || !newPw || !pwMatch || changingPw}
                            className="flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-[720] text-white transition-all"
                            style={{
                              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                              boxShadow: '0 4px 14px rgba(99,102,241,0.30)',
                              opacity: (!currentPw || !newPw || !pwMatch || changingPw) ? 0.55 : 1,
                            }}
                          >
                            {changingPw ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                            {changingPw ? 'Updating…' : 'Update Password'}
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </FadeUp>
                </motion.div>
              )}

              {/* ═══ PREFERENCES ═══ */}
              {tab === 'preferences' && (
                <motion.div
                  key="preferences"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-2"
                >
                  {/* Theme */}
                  <FadeUp>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<Sun size={14} style={{ color: '#6366f1' }} />}
                        title="Appearance"
                        subtitle="Theme and visual preferences"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {([
                          { id: 'light', label: 'Light', icon: <Sun size={18} /> },
                          { id: 'dark', label: 'Dark', icon: <Moon size={18} /> },
                          { id: 'system', label: 'System', icon: <Monitor size={18} /> },
                        ] as const).map(opt => (
                          <motion.button
                            key={opt.id}
                            whileHover={{ y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setThemePref(opt.id)}
                            className="flex flex-col items-center gap-2 rounded-2xl p-4 text-center transition-all"
                            style={{
                              background: themePref === opt.id ? 'rgba(99,102,241,0.08)' : 'rgba(248,250,252,0.85)',
                              border: themePref === opt.id ? '1.5px solid rgba(99,102,241,0.30)' : '1px solid rgba(15,23,42,0.07)',
                              boxShadow: themePref === opt.id ? '0 4px 12px rgba(99,102,241,0.12)' : 'none',
                              color: themePref === opt.id ? '#6366f1' : 'rgb(148,163,184)',
                            }}
                          >
                            {opt.icon}
                            <span className="text-[11px] font-[660]">{opt.label}</span>
                            {themePref === opt.id && (
                              <motion.div
                                layoutId="theme-dot"
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ background: '#6366f1' }}
                              />
                            )}
                          </motion.button>
                        ))}
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Notifications */}
                  <FadeUp delay={0.05}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<Bell size={14} style={{ color: '#6366f1' }} />}
                        title="Notification Preferences"
                        subtitle="Choose how you want to be notified"
                      />
                      <div className="flex flex-col gap-2.5">
                        {[
                          { label: 'Email Notifications', desc: 'Alerts and summaries via email', val: emailNotif, set: setEmailNotif },
                          { label: 'Push Notifications', desc: 'Browser and in-app alerts', val: pushNotif, set: setPushNotif },
                          { label: 'SMS Alerts', desc: 'Text messages for critical events', val: smsNotif, set: setSmsNotif },
                          { label: 'Marketing Updates', desc: 'Product news and offers', val: mktNotif, set: setMktNotif },
                          { label: 'Product Updates', desc: 'New features and improvements', val: prodNotif, set: setProdNotif },
                        ].map(n => (
                          <SettingRow key={n.label} label={n.label} description={n.desc}>
                            <Toggle enabled={n.val} onChange={n.set} />
                          </SettingRow>
                        ))}
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Language + Timezone */}
                  <FadeUp delay={0.08}>
                    <GlassCard className="p-6">
                      <SectionHeader
                        icon={<Globe size={14} style={{ color: '#6366f1' }} />}
                        title="Locale"
                        subtitle="Language and timezone settings"
                      />
                      <div className="flex flex-col gap-2.5">
                        <SettingRow label="Language" description="Interface language">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{language}</span>
                            <ChevronRight size={12} style={{ color: 'rgb(148,163,184)' }} />
                          </div>
                        </SettingRow>
                        <SettingRow label="Timezone" description="Your local timezone">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{timezone.split(' · ')[0]}</span>
                            <ChevronRight size={12} style={{ color: 'rgb(148,163,184)' }} />
                          </div>
                        </SettingRow>
                        <SettingRow label="Date Format" description="How dates display in the app">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>DD/MM/YYYY</span>
                            <ChevronRight size={12} style={{ color: 'rgb(148,163,184)' }} />
                          </div>
                        </SettingRow>
                      </div>
                    </GlassCard>
                  </FadeUp>

                  {/* Danger Zone */}
                  <FadeUp delay={0.10}>
                    <GlassCard className="p-6" style={{ border: '1px solid rgba(239,68,68,0.12)' }}>
                      <SectionHeader
                        icon={<AlertTriangle size={14} style={{ color: '#ef4444' }} />}
                        title="Danger Zone"
                        subtitle="Irreversible account actions"
                      />
                      <div className="flex flex-col gap-3">
                        <div
                          className="flex items-center justify-between gap-4 rounded-2xl p-4"
                          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.10)' }}
                        >
                          <div>
                            <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Log out all devices</p>
                            <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Revoke all active sessions immediately</p>
                          </div>
                          <button
                            className="rounded-xl px-3 py-1.5 text-[11.5px] font-[700] transition-all"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626',
                              border: '1px solid rgba(239,68,68,0.18)',
                            }}
                          >
                            Sign out all
                          </button>
                        </div>
                        <div
                          className="flex items-center justify-between gap-4 rounded-2xl p-4"
                          style={{ background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.10)' }}
                        >
                          <div>
                            <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>Delete account</p>
                            <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Permanently remove your account and data</p>
                          </div>
                          <button
                            className="rounded-xl px-3 py-1.5 text-[11.5px] font-[700] transition-all"
                            style={{
                              background: 'rgba(239,68,68,0.08)',
                              color: '#dc2626',
                              border: '1px solid rgba(239,68,68,0.18)',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  </FadeUp>

                </motion.div>
              )}

            </AnimatePresence>
          </div>

          {/* ── STICKY SAVE BAR ── */}
          <StickySaveBar
            dirty={isDirty || !!saveMsg}
            saving={saving}
            onSave={handleSave}
            onDiscard={handleDiscard}
            msg={saveMsg}
          />

          <style>{`
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
            }
            /* scrollbar suppression for stat chips row */
            .overflow-x-auto::-webkit-scrollbar { display: none; }
            .overflow-x-auto { -ms-overflow-style: none; scrollbar-width: none; }
          `}</style>
        </div>
      </AppShell>
    </Guard>
  );
}
