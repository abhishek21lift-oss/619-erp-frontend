'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Settings, Mail, Phone, MapPin, Clock, Activity, Shield,
  Bell, Smartphone, Laptop, Monitor, Moon, Sun, Globe,
  ChevronRight, CheckCircle2, XCircle, Lock, Key, Eye, EyeOff,
  RefreshCw, LogOut, ShieldCheck, AlertTriangle, Sparkles,
  History, Calendar, Fingerprint, Copy, Edit3,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { StatusPill } from '@/components/premium/StatusPill';
import { PremiumTable } from '@/components/premium/PremiumTable';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
interface ActivityItem {
  id: string;
  action: string;
  detail: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

interface Device {
  id: string;
  name: string;
  type: string;
  browser: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  ip: string;
  loginTime: string;
  expiresIn: string;
  active: boolean;
}

/* ────────────────────────────────────────────────────────────────────
   DEMO DATA
──────────────────────────────────────────────────────────────────── */
const PROFILE = {
  name: 'Abhishek Katiyar',
  email: 'abhishek@619fitness.com',
  role: 'Admin',
  phone: '+91 98765 43210',
  location: 'Lucknow, Uttar Pradesh',
  timezone: 'Asia/Kolkata (IST +05:30)',
  memberSince: 'January 2023',
};

const ACTIVITY_HISTORY: ActivityItem[] = [
  { id: 'a1', action: 'Login', detail: 'Authenticated from Chrome on Windows', timestamp: '2 mins ago', icon: <LogOut size={12} />, color: '#10b981' },
  { id: 'a2', action: 'Setting Change', detail: 'Updated studio branding preferences', timestamp: '1 hr ago', icon: <Settings size={12} />, color: '#6366f1' },
  { id: 'a3', action: 'Member Created', detail: 'Added new member: Arjun Mehta', timestamp: '3 hrs ago', icon: <User size={12} />, color: '#0ea5e9' },
  { id: 'a4', action: 'Password Change', detail: 'Account password was updated', timestamp: '2 days ago', icon: <Key size={12} />, color: '#f59e0b' },
  { id: 'a5', action: 'MFA Updated', detail: 'Two-factor authentication enabled', timestamp: '5 days ago', icon: <Shield size={12} />, color: '#8b5cf6' },
  { id: 'a6', action: 'MFA Updated', detail: 'Two-factor authentication enabled', timestamp: '5 days ago', icon: <Shield size={12} />, color: '#8b5cf6' },
];

const DEVICES: Device[] = [
  { id: 'd1', name: 'Windows PC', type: 'Desktop', browser: 'Chrome 124', ip: '103.95.42.18', lastActive: 'Now', current: true },
  { id: 'd2', name: 'iPhone 15 Pro', type: 'Mobile', browser: 'Safari 17', ip: '103.95.42.18', lastActive: '2 hrs ago', current: false },
  { id: 'd3', name: 'MacBook Air', type: 'Laptop', browser: 'Chrome 123', ip: '203.95.42.10', lastActive: 'Yesterday', current: false },
];

const SESSIONS: Session[] = [
  { id: 's1', device: 'Windows PC · Chrome', browser: 'Chrome 124', ip: '103.95.42.18', loginTime: '09:42 AM', expiresIn: 'Active', active: true },
  { id: 's2', device: 'iPhone 15 Pro · Safari', browser: 'Safari 17', ip: '103.95.42.18', loginTime: '07:30 AM', expiresIn: '2 hrs', active: false },
  { id: 's3', device: 'MacBook Air · Chrome', browser: 'Chrome 123', ip: '203.95.42.10', loginTime: 'Yesterday', expiresIn: 'Expired', active: false },
];

/* ────────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────────── */
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

/* ────────────────────────────────────────────────────────────────────
   FLOAT INPUT
──────────────────────────────────────────────────────────────────── */
function FloatInput({ label, type = 'text', value, onChange, placeholder = ' ', suffix, required, disabled }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; suffix?: React.ReactNode; required?: boolean; disabled?: boolean;
}) {
  const id = React.useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? 'rgba(255,255,255,0.95)' : 'rgba(248,250,252,0.9)',
          border: focused ? '1.5px solid rgba(99,102,241,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <label htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#6366f1' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}{required && ' *'}
        </label>
        <input id={id} type={type} value={value} placeholder={lifted ? placeholder : ''}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          disabled={disabled}
          className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none disabled:cursor-not-allowed"
          style={{ color: 'rgb(15,23,42)', caretColor: '#6366f1' }}
        />
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   TOGGLE
──────────────────────────────────────────────────────────────────── */
function Toggle({ enabled, onChange, label }: { enabled: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <div className="flex items-center gap-3">
      {label && <span className="text-[12.5px] font-[500]" style={{ color: 'rgb(100,116,139)' }}>{label}</span>}
      <button onClick={() => onChange(!enabled)}
        className="relative h-6 w-10 rounded-full transition-all"
        style={{
          background: enabled ? 'rgba(99,102,241,0.85)' : 'rgba(15,23,42,0.12)',
          boxShadow: enabled ? '0 0 12px rgba(99,102,241,0.25)' : 'none',
        }}
      >
        <motion.span animate={{ x: enabled ? 17 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow-sm"
          style={{ boxShadow: '0 1px 4px rgba(15,23,42,0.15)' }}
        />
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SEGMENTED CONTROL
──────────────────────────────────────────────────────────────────── */
function Segmented<T extends string>({ value, onChange, options }: {
  value: T; onChange: (v: T) => void; options: { id: T; label: string; icon?: React.ReactNode }[];
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-[11px] p-0.5" style={{ background: 'rgba(15,23,42,0.06)' }}>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} onClick={() => onChange(o.id)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[11.5px] font-[660] rounded-[9px] transition-all"
            style={{
              background: active ? 'rgba(255,255,255,0.95)' : 'transparent',
              color: active ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
              boxShadow: active ? '0 1px 3px rgba(15,23,42,0.08)' : 'none',
            }}>
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SETTING ROW
──────────────────────────────────────────────────────────────────── */
function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{label}</p>
        {description && <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SECTION CARD
──────────────────────────────────────────────────────────────────── */
function SectionCard({ title, subtitle, icon, children }: {
  title: string; subtitle: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] p-5"
      style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
          {icon}
        </div>
        <div>
          <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>{title}</p>
          <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PROFILE CARD
──────────────────────────────────────────────────────────────────── */
function ProfileCard() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-[22px] p-6 text-center"
      style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 4px 24px rgba(15,23,42,0.07)' }}>
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[18px] text-[26px] font-[800] text-white"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}>
        {initials(PROFILE.name)}
      </div>
      <h2 className="mt-4 text-[20px] font-[800] tracking-[-0.02em]" style={{ color: 'rgb(15,23,42)' }}>{PROFILE.name}</h2>
      <div className="mt-1 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-[660]"
          style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
          <ShieldCheck size={10} /> {PROFILE.role}
        </span>
      </div>
      <div className="mt-4 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>
          <Mail size={12} /> {PROFILE.email}
        </div>
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>
          <Phone size={12} /> {PROFILE.phone}
        </div>
        <div className="flex items-center gap-2 text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>
          <MapPin size={12} /> {PROFILE.location}
        </div>
      </div>
      <div className="mt-5 flex justify-center gap-2">
        <PremiumButton tone="primary" size="sm" icon={<Edit3 size={12} />}>Edit Profile</PremiumButton>
        <PremiumButton tone="secondary" size="sm" icon={<Copy size={12} />}>Share</PremiumButton>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const [tab, setTab] = useState<'overview' | 'security'>('overview');

  const [name, setName] = useState(PROFILE.name);
  const [email, setEmail] = useState(PROFILE.email);
  const [phone, setPhone] = useState(PROFILE.phone);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [mfaEnabled, setMfaEnabled] = useState(true);

  const [themePref, setThemePref] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState('English');
  const [timezone, setTimezone] = useState('Asia/Kolkata (IST +05:30)');

  const [emailNotif, setEmailNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);

  const strength = useMemo(() => pwStrength(newPw), [newPw]);
  const match = confirmPw.length > 0 && newPw === confirmPw;
  const mismatch = confirmPw.length > 0 && newPw !== confirmPw;

  const pwSuffix = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle}
      className="flex h-6 w-6 items-center justify-center rounded-[7px] transition hover:bg-slate-100">
      {show ? <EyeOff size={13} style={{ color: 'rgb(148,163,184)' }} /> : <Eye size={13} style={{ color: 'rgb(148,163,184)' }} />}
    </button>
  );

  return (
    <Guard>
      <AppShell>
        <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
          {/* ── PAGE HEADER ── */}
          <div className="border-b" style={{ background: 'rgba(255,255,255,0.78)', backdropFilter: 'blur(20px)', borderColor: 'rgba(15,23,42,0.07)' }}>
            <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
              <div className="flex items-center gap-1.5 text-[11px] font-[500] mb-3" style={{ color: 'rgb(148,163,184)' }}>
                <span>Settings</span>
                <ChevronRight size={10} />
                <span style={{ color: 'rgb(100,116,139)' }}>My Profile</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                  <User size={16} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>My Profile</h1>
                  <p className="mt-0.5 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Executive profile workspace</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── MAIN CONTENT ── */}
          <div className="mx-auto max-w-screen-xl px-5 py-6 sm:px-8">
            {/* Segmented tabs */}
            <div className="mb-6 inline-flex overflow-hidden rounded-[13px] p-1"
              style={{ background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
              {([
                { id: 'overview', label: 'Overview', icon: <User size={13} /> },
                { id: 'security', label: 'Security', icon: <Lock size={13} /> },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="relative flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-[680] transition-all"
                  style={{
                    background: tab === t.id ? 'rgba(255,255,255,0.95)' : 'transparent',
                    color: tab === t.id ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                    boxShadow: tab === t.id ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
                  }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {tab === 'overview' ? (
                <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">

                  {/* LEFT: Profile Card */}
                  <div className="flex flex-col gap-5">
                    <ProfileCard />

                    {/* Quick Stats */}
                    <div className="rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 6px rgba(15,23,42,0.05)' }}>
                      <div className="flex items-center gap-2 mb-4">
                        <Activity size={14} style={{ color: '#6366f1' }} />
                        <p className="text-[12.5px] font-[720] tracking-[0.01em] uppercase" style={{ color: 'rgb(100,116,139)' }}>Account Stats</p>
                      </div>
                      <div className="space-y-3">
                        {[
                          { label: 'Member Since', value: PROFILE.memberSince, color: '#6366f1' },
                          { label: 'Login Sessions', value: '3 active', color: '#10b981' },
                          { label: 'Devices', value: '3 connected', color: '#0ea5e9' },
                          { label: 'Security Score', value: '92/100', color: '#8b5cf6' },
                        ].map(item => (
                          <div key={item.label} className="flex items-center justify-between">
                            <span className="text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>{item.label}</span>
                            <span className="text-[12.5px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT: Activity, Devices, Sessions */}
                  <div className="flex flex-col gap-5">
                    {/* Personal Info */}
                    <SectionCard title="Personal Information" subtitle="Your profile details" icon={<User size={13} style={{ color: '#6366f1' }} />}>
                      <div className="flex flex-col gap-3">
                        <FloatInput label="Full Name" value={name} onChange={setName} required />
                        <FloatInput label="Email Address" type="email" value={email} onChange={setEmail} required />
                        <FloatInput label="Phone Number" value={phone} onChange={setPhone} required />
                      </div>
                    </SectionCard>

                    {/* Notification Preferences */}
                    <SectionCard title="Notification Preferences" subtitle="Email, push & SMS settings" icon={<Bell size={13} style={{ color: '#6366f1' }} />}>
                      <div className="flex flex-col gap-1">
                        <SettingRow label="Email Notifications" description="Account alerts via email">
                          <Toggle enabled={emailNotif} onChange={setEmailNotif} />
                        </SettingRow>
                        <SettingRow label="Push Notifications" description="In-app and browser alerts">
                          <Toggle enabled={pushNotif} onChange={setPushNotif} />
                        </SettingRow>
                        <SettingRow label="SMS Notifications" description="Text message alerts">
                          <Toggle enabled={smsNotif} onChange={setSmsNotif} />
                        </SettingRow>
                      </div>
                    </SectionCard>

                    {/* Personalization */}
                    <SectionCard title="Personalization" subtitle="Theme, language & timezone" icon={<Moon size={13} style={{ color: '#6366f1' }} />}>
                      <div className="flex flex-col gap-4">
                        <div>
                          <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Theme Preference</p>
                          <Segmented value={themePref} onChange={setThemePref} options={[
                            { id: 'light', label: 'Light', icon: <Sun size={12} /> },
                            { id: 'dark', label: 'Dark', icon: <Moon size={12} /> },
                          ]} />
                        </div>
                        <SettingRow label="Language" description="Interface language">
                          <span className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{language}</span>
                        </SettingRow>
                        <SettingRow label="Timezone" description="Your local timezone">
                          <span className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{timezone}</span>
                        </SettingRow>
                      </div>
                    </SectionCard>

                    {/* Activity History */}
                    <SectionCard title="Activity History" subtitle="Recent account activity" icon={<History size={13} style={{ color: '#6366f1' }} />}>
                      <div className="relative">
                        <div className="absolute left-[15px] top-2 bottom-2 w-px" style={{ background: 'rgba(15,23,42,0.08)' }} />
                        <div className="flex flex-col gap-4">
                          {ACTIVITY_HISTORY.map(item => (
                            <div key={item.id} className="relative flex items-start gap-3 pl-8">
                              <div className="absolute left-[9px] flex h-[13px] w-[13px] items-center justify-center rounded-full"
                                style={{ background: `${item.color}18`, color: item.color }}>
                                {item.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-[12.5px] font-[640]" style={{ color: 'rgb(15,23,42)' }}>{item.action}</p>
                                <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{item.detail}</p>
                              </div>
                              <span className="shrink-0 text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{item.timestamp}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </SectionCard>

                    {/* Connected Devices */}
                    <SectionCard title="Connected Devices" subtitle="Active login devices" icon={<Smartphone size={13} style={{ color: '#6366f1' }} />}>
                      <div className="flex flex-col gap-2.5">
                        {DEVICES.map(device => (
                          <div key={device.id} className="flex items-center gap-3 rounded-[14px] px-4 py-3"
                            style={{ background: device.current ? 'rgba(99,102,241,0.06)' : 'rgba(248,250,252,0.9)', border: device.current ? '1px solid rgba(99,102,241,0.15)' : '1px solid rgba(15,23,42,0.06)' }}>
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]" style={{ background: device.current ? 'rgba(99,102,241,0.10)' : 'rgba(15,23,42,0.05)' }}>
                              {device.type === 'Desktop' ? <Monitor size={15} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />
                                : device.type === 'Laptop' ? <Laptop size={15} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />
                                : <Smartphone size={15} style={{ color: device.current ? '#6366f1' : 'rgb(148,163,184)' }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-[12.5px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{device.name}</p>
                                {device.current && (
                                  <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-[700]"
                                    style={{ background: 'rgba(16,185,129,0.10)', color: '#059669' }}>
                                    Current
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>{device.browser} · {device.ip}</p>
                            </div>
                            <span className="shrink-0 text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{device.lastActive}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>

                    {/* Login Sessions */}
                    <SectionCard title="Login Sessions" subtitle="Active & recent sessions" icon={<LogOut size={13} style={{ color: '#6366f1' }} />}>
                      <div className="flex flex-col gap-2">
                        {SESSIONS.map(session => (
                          <div key={session.id} className="flex items-center gap-3 rounded-[12px] px-4 py-3"
                            style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.06)' }}>
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: session.active ? 'rgba(16,185,129,0.10)' : 'rgba(107,114,128,0.08)' }}>
                              {session.active ? <CheckCircle2 size={14} style={{ color: '#10b981' }} /> : <XCircle size={14} style={{ color: '#9ca3af' }} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[12px] font-[640]" style={{ color: 'rgb(15,23,42)' }}>{session.device}</p>
                              <p className="text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>IP: {session.ip} · {session.loginTime}</p>
                            </div>
                            <span className="text-[10.5px] font-[660]" style={{ color: session.active ? '#059669' : 'rgb(148,163,184)' }}>{session.expiresIn}</span>
                          </div>
                        ))}
                      </div>
                    </SectionCard>
                  </div>
                </motion.div>
              ) : (
                /* ── SECURITY TAB ── */
                <motion.div key="security" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mx-auto max-w-[560px] flex flex-col gap-5">

                  {/* Change Password */}
                  <SectionCard title="Change Password" subtitle="Update your account password" icon={<Lock size={13} style={{ color: '#6366f1' }} />}>
                    <div className="flex flex-col gap-3">
                      <FloatInput label="Current Password" type={showCur ? 'text' : 'password'} value={currentPw} onChange={setCurrentPw}
                        suffix={pwSuffix(showCur, () => setShowCur(v => !v))} required />
                      <FloatInput label="New Password" type={showNew ? 'text' : 'password'} value={newPw} onChange={setNewPw}
                        suffix={pwSuffix(showNew, () => setShowNew(v => !v))} required />

                      {newPw.length > 0 && (
                        <div>
                          <div className="flex gap-1 mb-1.5">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                                style={{ background: i <= strength.score ? strength.color : 'rgba(15,23,42,0.08)' }} />
                            ))}
                          </div>
                          <p className="text-right text-[11px] font-[660]" style={{ color: strength.color }}>{strength.label}</p>
                        </div>
                      )}

                      <div className="relative">
                        <FloatInput label="Confirm New Password" type={showConf ? 'text' : 'password'} value={confirmPw} onChange={setConfirmPw}
                          suffix={
                            <div className="flex items-center gap-1.5">
                              {match && <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
                              {mismatch && <XCircle size={13} style={{ color: '#ef4444' }} />}
                              {pwSuffix(showConf, () => setShowConf(v => !v))}
                            </div>
                          }
                        />
                        {mismatch && <p className="mt-1 pl-1 text-[11px]" style={{ color: '#ef4444' }}>Passwords do not match</p>}
                      </div>

                      <div className="rounded-[13px] p-4" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(15,23,42,0.07)' }}>
                        <p className="mb-2.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Requirements</p>
                        <div className="space-y-2">
                          {[
                            { label: 'At least 8 characters', ok: newPw.length >= 8 },
                            { label: 'At least one uppercase letter', ok: /[A-Z]/.test(newPw) },
                            { label: 'At least one number', ok: /[0-9]/.test(newPw) },
                            { label: 'At least one special character', ok: /[^A-Za-z0-9]/.test(newPw) },
                          ].map(r => (
                            <div key={r.label} className="flex items-center gap-2">
                              {r.ok
                                ? <CheckCircle2 size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                                : <AlertTriangle size={12} style={{ color: 'rgb(148,163,184)', flexShrink: 0 }} />}
                              <span className="text-[12px]" style={{ color: r.ok ? 'rgb(30,30,40)' : 'rgb(148,163,184)' }}>{r.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <PremiumButton tone="primary" size="md" className="w-full justify-center mt-1"
                        disabled={!currentPw || !newPw || !match}
                        icon={<Key size={14} />}>
                        Update Password
                      </PremiumButton>
                    </div>
                  </SectionCard>

                  {/* MFA */}
                  <SectionCard title="Two-Factor Authentication" subtitle="Add an extra layer of security" icon={<Shield size={13} style={{ color: '#6366f1' }} />}>
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>MFA via Authenticator App</p>
                        <p className="text-[11px] mt-0.5" style={{ color: 'rgb(148,163,184)' }}>Use Google Authenticator or Authy</p>
                      </div>
                      <Toggle enabled={mfaEnabled} onChange={setMfaEnabled} />
                    </div>
                    {mfaEnabled && (
                      <div className="mt-4 rounded-[13px] px-4 py-3 flex items-center gap-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                        <ShieldCheck size={14} style={{ color: '#059669' }} />
                        <span className="text-[12px] font-[640]" style={{ color: '#059669' }}>Two-factor authentication is active</span>
                      </div>
                    )}
                  </SectionCard>

                  {/* Recent Security */}
                  <div className="rounded-[18px] p-5" style={{ background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 6px rgba(15,23,42,0.05)' }}>
                    <div className="flex items-center gap-2 mb-4">
                      <Shield size={14} style={{ color: '#6366f1' }} />
                      <p className="text-[12.5px] font-[720] tracking-[0.01em] uppercase" style={{ color: 'rgb(100,116,139)' }}>Security Overview</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: 'Last password change', value: '42 days ago', color: '#6366f1' },
                        { label: 'Active sessions', value: '3 devices', color: '#10b981' },
                        { label: 'MFA status', value: 'Enabled', color: '#0ea5e9' },
                        { label: 'Pending alerts', value: 'None', color: '#f59e0b' },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="flex h-2 w-2 rounded-full" style={{ background: item.color }} />
                            <span className="text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>{item.label}</span>
                          </div>
                          <span className="text-[12.5px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <style>{`
            @media (prefers-reduced-motion: reduce) {
              *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
            }
          `}</style>
        </div>
      </AppShell>
    </Guard>
  );
}
