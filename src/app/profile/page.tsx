'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Guard from '@/components/Guard';
import {
  User, Mail, Phone, MapPin, Shield, Key, Bell, Camera,
  Edit3, Save, X, Check, CheckCircle2, RefreshCw, Lock,
  Activity, Users, TrendingUp, Zap, Crown, Star,
  Github, Globe, Calendar, Clock, AlertTriangle,
  Eye, EyeOff, ChevronRight, Sparkles, Award, Target,
  BarChart2, Wifi,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────── */
interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  bio: string;
  role: string;
  joinedDate: string;
  avatar: string | null;
  website: string;
  github: string;
}

interface NotifPref {
  key: string;
  label: string;
  desc: string;
  enabled: boolean;
  icon: React.ReactNode;
  color: string;
}

/* ─────────────────────────────────────────────────────────────
   STATIC DATA
───────────────────────────────────────────────────────────── */
const INIT_PROFILE: ProfileData = {
  name: 'Abhishek Katiyar',
  email: 'admin@619fitness.in',
  phone: '+91 98765 43210',
  location: 'Prayagraj, UP',
  bio: 'Founder & Super Admin of 619 ERP. Full-stack dev, powerlifter, and fitness educator. Building the future of gym management.',
  role: 'Super Admin',
  joinedDate: 'Jan 2024',
  avatar: null,
  website: '619fitness.in',
  github: 'abhishek21lift-oss',
};

const KPI_STATS = [
  { label: 'Total Members',  value: '847',  icon: <Users size={14} />,      color: '#6366f1', delta: '+12' },
  { label: 'Active Trainers',value: '12',   icon: <Zap size={14} />,        color: '#10b981', delta: '+2'  },
  { label: 'Revenue (MoM)',  value: '\u20b92.4L',icon: <TrendingUp size={14} />, color: '#f59e0b', delta: '+8%' },
  { label: 'System Uptime',  value: '99.6%',icon: <Wifi size={14} />,       color: '#0ea5e9', delta: '30d' },
];

const ACHIEVEMENTS = [
  { icon: <Award size={16} />,  label: 'System Builder',    desc: 'Deployed v1.0',         color: '#6366f1', unlocked: true  },
  { icon: <Star size={16} />,   label: 'First Launch',      desc: 'First live deploy',     color: '#f59e0b', unlocked: true  },
  { icon: <Shield size={16} />, label: 'Security Pro',      desc: 'MFA + role guards',     color: '#10b981', unlocked: true  },
  { icon: <Target size={16} />, label: 'Powerlifter',       desc: '200kg deadlift',        color: '#ef4444', unlocked: true  },
  { icon: <Crown size={16} />,  label: '1000 Members',      desc: 'Hit 1K milestone',      color: '#d97706', unlocked: false },
  { icon: <BarChart2 size={16}/>,label: 'Revenue Master',   desc: 'Hit \u20b95L/month',   color: '#8b5cf6', unlocked: false },
];

const ACTIVITY = [
  { action: 'Merged PR #47 \u2014 Premium profile redesign', time: '2 min ago',   icon: <Github size={11} />,  color: '#6366f1' },
  { action: '3 new member check-ins processed',              time: '14 min ago',  icon: <Users size={11} />,   color: '#10b981' },
  { action: 'Monthly revenue report generated',              time: '1 hour ago',  icon: <BarChart2 size={11}/>,color: '#f59e0b' },
  { action: 'Trainer Rahul schedule updated',                time: '3 hours ago', icon: <Calendar size={11} />,color: '#0ea5e9' },
  { action: 'Face recognition model retrained',              time: '1 day ago',   icon: <Sparkles size={11} />,color: '#8b5cf6' },
];

const INIT_NOTIFS: NotifPref[] = [
  { key: 'checkin',    label: 'Member Check-ins',      desc: 'Alert on every check-in',    enabled: true,  icon: <Users size={13} />,      color: '#10b981' },
  { key: 'renewal',   label: 'Renewal Reminders',      desc: 'Members expiring in 3 days', enabled: true,  icon: <Clock size={13} />,      color: '#f59e0b' },
  { key: 'payment',   label: 'Payment Alerts',         desc: 'New payment received',        enabled: true,  icon: <TrendingUp size={13} />, color: '#6366f1' },
  { key: 'security',  label: 'Security Alerts',        desc: 'Suspicious login activity',   enabled: true,  icon: <AlertTriangle size={13}/>,color: '#ef4444' },
  { key: 'deploy',    label: 'Deploy Notifications',   desc: 'Vercel deploy status',        enabled: false, icon: <Globe size={13} />,      color: '#0ea5e9' },
  { key: 'reports',   label: 'Weekly Reports',         desc: 'Summary every Monday',        enabled: false, icon: <BarChart2 size={13} />,  color: '#8b5cf6' },
];

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

/* ─────────────────────────────────────────────────────────────
   AVATAR
───────────────────────────────────────────────────────────── */
function AvatarBlock({ name, onUpload }: { name: string; onUpload: () => void }) {
  return (
    <div className="relative w-fit">
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[28px] text-[28px] font-[860] text-white select-none"
        style={{
          background: 'linear-gradient(135deg,#3730a3,#6366f1,#8b5cf6)',
          boxShadow: '0 8px 32px rgba(99,102,241,0.35)',
          letterSpacing: '-0.02em',
        }}
      >
        {initials(name)}
      </div>
      <button
        onClick={onUpload}
        className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full transition-all hover:scale-110 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', boxShadow: '0 2px 10px rgba(99,102,241,0.40)', border: '2px solid white' }}
        aria-label="Upload avatar"
      >
        <Camera size={13} color="white" />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   FLOAT INPUT
───────────────────────────────────────────────────────────── */
function FloatInput({
  label, value, onChange, type = 'text', disabled = false, icon,
}: {
  label: string; value: string; onChange?: (v: string) => void;
  type?: string; disabled?: boolean; icon?: React.ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;

  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[14px] transition-all"
        style={{
          background: disabled ? 'rgba(248,250,252,0.6)' : (focused ? 'rgba(255,255,255,0.95)' : 'rgba(248,250,252,0.9)'),
          border: disabled ? '1.5px solid rgba(15,23,42,0.06)' : (focused ? '1.5px solid rgba(99,102,241,0.40)' : '1.5px solid rgba(15,23,42,0.09)'),
          boxShadow: focused ? '0 0 0 3px rgba(99,102,241,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: focused ? '#6366f1' : 'rgb(148,163,184)', transition: 'color 150ms' }}>
            {icon}
          </div>
        )}
        <label
          className="pointer-events-none absolute font-[500] transition-all"
          style={{
            left: icon ? 44 : 16,
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#6366f1' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}
        </label>
        <input
          type={type}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent pb-3 pt-7 text-[13.5px] font-[520] outline-none"
          style={{
            paddingLeft: icon ? 44 : 16,
            paddingRight: 16,
            color: disabled ? 'rgb(148,163,184)' : 'rgb(15,23,42)',
            caretColor: '#6366f1',
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   KPI CARD
───────────────────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, delta }: { label: string; value: string; icon: React.ReactNode; color: string; delta: string }) {
  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: '0 8px 28px rgba(15,23,42,0.10)' }}
      className="flex flex-col gap-3 rounded-[18px] p-4"
      style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 6px rgba(15,23,42,0.05)', transition: 'all 200ms' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: `${color}14`, color }}>
          {icon}
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10.5px] font-[660]" style={{ background: `${color}10`, color }}>
          {delta}
        </span>
      </div>
      <div>
        <p className="text-[22px] font-[840] tracking-[-0.03em] leading-none" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
        <p className="mt-1 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      </div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────
   NOTIF TOGGLE ROW
───────────────────────────────────────────────────────────── */
function NotifRow({ pref, onToggle }: { pref: NotifPref; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid rgba(15,23,42,0.05)' }}>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: `${pref.color}12`, color: pref.color }}>
          {pref.icon}
        </div>
        <div>
          <p className="text-[13px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{pref.label}</p>
          <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{pref.desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className="relative h-6 w-11 rounded-full transition-all duration-200"
        style={{ background: pref.enabled ? pref.color : 'rgba(15,23,42,0.12)' }}
        aria-label={`Toggle ${pref.label}`}
      >
        <span
          className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all duration-200"
          style={{
            left: pref.enabled ? 'calc(100% - 22px)' : 2,
            boxShadow: '0 1px 4px rgba(15,23,42,0.20)',
          }}
        />
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PASSWORD CHANGE MINI FORM
───────────────────────────────────────────────────────────── */
function PasswordSection() {
  const [cur,  setCur]  = useState('');
  const [next, setNext] = useState('');
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!cur || !next) return;
    setSaving(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSaving(false);
    setDone(true);
    setTimeout(() => { setDone(false); setCur(''); setNext(''); }, 2000);
  };

  return (
    <div className="flex flex-col gap-3">
      <FloatInput label="Current Password" type={show ? 'text' : 'password'} value={cur} onChange={setCur} icon={<Lock size={14} />} />
      <FloatInput label="New Password"     type={show ? 'text' : 'password'} value={next} onChange={setNext} icon={<Key size={14} />} />
      <div className="flex items-center justify-between">
        <button onClick={() => setShow(v => !v)} className="flex items-center gap-1.5 text-[12px]" style={{ color: 'rgb(148,163,184)' }}>
          {show ? <EyeOff size={12} /> : <Eye size={12} />} {show ? 'Hide' : 'Show'} passwords
        </button>
        <motion.button
          onClick={handleSave}
          disabled={!cur || !next || saving}
          whileTap={{ scale: 0.97 }}
          className="flex items-center gap-2 rounded-[12px] px-4 py-2 text-[12.5px] font-[700] text-white transition-all"
          style={{
            background: done ? 'linear-gradient(135deg,#10b981,#34d399)' : 'linear-gradient(135deg,#1e3a5f,#0ea5e9)',
            boxShadow: done ? '0 4px 16px rgba(16,185,129,0.25)' : '0 4px 16px rgba(14,165,233,0.25)',
            opacity: (!cur || !next) ? 0.5 : 1,
          }}
        >
          <AnimatePresence mode="wait">
            {done ? (
              <motion.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Updated
              </motion.span>
            ) : saving ? (
              <motion.span key="saving" className="flex items-center gap-1.5">
                <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                  <RefreshCw size={12} />
                </motion.span> Saving\u2026
              </motion.span>
            ) : (
              <motion.span key="idle" className="flex items-center gap-1.5">
                <Lock size={12} /> Update
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   SECTION CARD WRAPPER
───────────────────────────────────────────────────────────── */
function SectionCard({ title, icon, color, children, action }: {
  title: string; icon: React.ReactNode; color: string;
  children: React.ReactNode; action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[22px] p-6" style={{ background: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: `${color}12`, color }}>
            {icon}
          </div>
          <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>{title}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────── */
function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData>(INIT_PROFILE);
  const [draft, setDraft]     = useState<ProfileData>(INIT_PROFILE);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [notifs, setNotifs]   = useState<NotifPref[]>(INIT_NOTIFS);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const handleSave = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 900));
    setProfile(draft);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2200);
  };

  const handleDiscard = () => {
    setDraft(profile);
    setEditing(false);
  };

  const toggleNotif = (key: string) => {
    setNotifs((prev) => prev.map((n) => n.key === key ? { ...n, enabled: !n.enabled } : n));
  };

  return (
    <div className="min-h-screen pb-16" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>

      {/* UNSAVED BANNER */}
      <AnimatePresence>
        {editing && dirty && (
          <motion.div
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="sticky top-0 z-50 flex items-center justify-between px-6 py-3"
            style={{ background: 'rgba(99,102,241,0.94)', backdropFilter: 'blur(12px)' }}
          >
            <p className="text-[13px] font-[660] text-white">You have unsaved changes</p>
            <div className="flex items-center gap-3">
              <button onClick={handleDiscard} className="flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-[12.5px] font-[700] text-white/80 transition hover:text-white">
                <X size={13} /> Discard
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 rounded-[10px] px-4 py-1.5 text-[12.5px] font-[760] transition"
                style={{ background: 'rgba(255,255,255,0.20)', color: 'white', border: '1px solid rgba(255,255,255,0.30)' }}>
                {saving ? <><RefreshCw size={12} className="animate-spin" /> Saving\u2026</> : <><Save size={12} /> Save Changes</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HERO COVER */}
      <div
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg,#0f0c29,#302b63,#24243e)',
          minHeight: 200,
        }}
      >
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.4) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.4) 1px,transparent 1px)',
          backgroundSize: '40px 40px',
        }} />
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#6366f1,transparent 70%)' }} />
        <div className="absolute -right-10 top-0 h-48 w-48 rounded-full opacity-15" style={{ background: 'radial-gradient(circle,#8b5cf6,transparent 70%)' }} />

        <div className="relative mx-auto max-w-screen-xl px-6 py-10 sm:px-10">
          <div className="flex flex-wrap items-end gap-6">
            <AvatarBlock name={profile.name} onUpload={() => {}} />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[28px] font-[880] tracking-[-0.03em] text-white">{profile.name}</h1>
                <span className="flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-[760]"
                  style={{ background: 'rgba(99,102,241,0.30)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.30)' }}>
                  <Crown size={10} /> {profile.role}
                </span>
              </div>
              <p className="mt-1 text-[13.5px] text-white/60">{profile.email}</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <span className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <MapPin size={11} /> {profile.location}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <Calendar size={11} /> Since {profile.joinedDate}
                </span>
                <span className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <Activity size={11} /> Active now
                </span>
              </div>
            </div>
            <motion.button
              onClick={() => setEditing((v) => !v)}
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 rounded-[13px] px-5 py-2.5 text-[13px] font-[740] transition-all"
              style={{
                background: editing ? 'rgba(239,68,68,0.20)' : 'rgba(255,255,255,0.15)',
                color: editing ? '#fca5a5' : 'white',
                border: editing ? '1px solid rgba(239,68,68,0.30)' : '1px solid rgba(255,255,255,0.25)',
                backdropFilter: 'blur(10px)',
              }}
            >
              {editing ? <><X size={14} /> Cancel</> : <><Edit3 size={14} /> Edit Profile</>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* KPI STRIP */}
      <div className="mx-auto max-w-screen-xl px-6 sm:px-10">
        <div className="-mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {KPI_STATS.map((k) => (
            <KpiCard key={k.label} {...k} />
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div className="mx-auto mt-6 max-w-screen-xl px-6 sm:px-10">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_360px]">

          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Bio & Info */}
            <SectionCard
              title="Profile Information"
              icon={<User size={15} />}
              color="#6366f1"
              action={
                saved ? (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5 text-[12px] font-[660]" style={{ color: '#10b981' }}>
                    <CheckCircle2 size={13} /> Saved
                  </motion.span>
                ) : undefined
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <FloatInput label="Full Name"   value={draft.name}     onChange={(v) => setDraft(d => ({ ...d, name: v }))}     disabled={!editing} icon={<User size={14} />} />
                <FloatInput label="Email"       value={draft.email}    onChange={(v) => setDraft(d => ({ ...d, email: v }))}    disabled={!editing} icon={<Mail size={14} />} />
                <FloatInput label="Phone"       value={draft.phone}    onChange={(v) => setDraft(d => ({ ...d, phone: v }))}    disabled={!editing} icon={<Phone size={14} />} />
                <FloatInput label="Location"    value={draft.location} onChange={(v) => setDraft(d => ({ ...d, location: v }))} disabled={!editing} icon={<MapPin size={14} />} />
                <FloatInput label="Website"     value={draft.website}  onChange={(v) => setDraft(d => ({ ...d, website: v }))}  disabled={!editing} icon={<Globe size={14} />} />
                <FloatInput label="GitHub"      value={draft.github}   onChange={(v) => setDraft(d => ({ ...d, github: v }))}   disabled={!editing} icon={<Github size={14} />} />
              </div>
              <div className="mt-3">
                <label className="mb-1.5 block text-[11px] font-[640] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Bio</label>
                <textarea
                  value={draft.bio}
                  disabled={!editing}
                  onChange={(e) => setDraft(d => ({ ...d, bio: e.target.value }))}
                  rows={3}
                  className="w-full resize-none rounded-[14px] px-4 py-3 text-[13.5px] font-[500] outline-none transition-all"
                  style={{
                    background: editing ? 'rgba(248,250,252,0.9)' : 'rgba(248,250,252,0.6)',
                    border: editing ? '1.5px solid rgba(15,23,42,0.09)' : '1.5px solid rgba(15,23,42,0.06)',
                    color: editing ? 'rgb(15,23,42)' : 'rgb(100,116,139)',
                  }}
                />
              </div>
              {editing && (
                <motion.button
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={handleSave}
                  disabled={saving || !dirty}
                  whileTap={{ scale: 0.98 }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-[14px] py-3 text-[14px] font-[760] text-white transition-all"
                  style={{
                    background: saving ? 'rgba(99,102,241,0.7)' : 'linear-gradient(135deg,#3730a3,#6366f1,#8b5cf6)',
                    boxShadow: '0 4px 20px rgba(99,102,241,0.30)',
                    opacity: !dirty ? 0.5 : 1,
                  }}
                >
                  {saving
                    ? <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><RefreshCw size={14} /></motion.span> Saving\u2026</>
                    : <><Save size={14} /> Save Profile</>
                  }
                </motion.button>
              )}
            </SectionCard>

            {/* Activity */}
            <SectionCard title="Recent Activity" icon={<Activity size={15} />} color="#10b981">
              <div className="flex flex-col">
                {ACTIVITY.map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-start gap-3 py-3"
                    style={{ borderBottom: i < ACTIVITY.length - 1 ? '1px solid rgba(15,23,42,0.05)' : undefined }}
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]" style={{ background: `${item.color}12`, color: item.color }}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-[580]" style={{ color: 'rgb(30,30,40)' }}>{item.action}</p>
                      <p className="mt-0.5 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>{item.time}</p>
                    </div>
                    <ChevronRight size={13} style={{ color: 'rgb(200,210,220)', flexShrink: 0, marginTop: 2 }} />
                  </motion.div>
                ))}
              </div>
            </SectionCard>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex flex-col gap-5">

            {/* Achievements */}
            <SectionCard title="Achievements" icon={<Award size={15} />} color="#f59e0b">
              <div className="grid grid-cols-3 gap-2">
                {ACHIEVEMENTS.map((a, i) => (
                  <motion.div
                    key={i}
                    whileHover={a.unlocked ? { scale: 1.04 } : {}}
                    className="flex flex-col items-center gap-1.5 rounded-[14px] p-3 text-center transition-all"
                    style={{
                      background: a.unlocked ? `${a.color}0d` : 'rgba(15,23,42,0.03)',
                      border: a.unlocked ? `1px solid ${a.color}20` : '1px solid rgba(15,23,42,0.06)',
                      opacity: a.unlocked ? 1 : 0.45,
                      filter: a.unlocked ? 'none' : 'grayscale(1)',
                    }}
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-[10px]" style={{ background: a.unlocked ? `${a.color}18` : 'rgba(15,23,42,0.06)', color: a.unlocked ? a.color : 'rgb(148,163,184)' }}>
                      {a.icon}
                    </div>
                    <p className="text-[10.5px] font-[680] leading-tight" style={{ color: a.unlocked ? 'rgb(30,30,40)' : 'rgb(148,163,184)' }}>{a.label}</p>
                    <p className="text-[9.5px] leading-tight" style={{ color: 'rgb(180,190,200)' }}>{a.desc}</p>
                  </motion.div>
                ))}
              </div>
            </SectionCard>

            {/* Notifications */}
            <SectionCard title="Notifications" icon={<Bell size={15} />} color="#8b5cf6">
              <div className="flex flex-col">
                {notifs.map((n) => (
                  <NotifRow key={n.key} pref={n} onToggle={() => toggleNotif(n.key)} />
                ))}
              </div>
            </SectionCard>

            {/* Security */}
            <SectionCard title="Security" icon={<Shield size={15} />} color="#0ea5e9">
              <div className="mb-4 flex flex-wrap gap-2">
                {[
                  { label: 'MFA Enabled',    color: '#10b981' },
                  { label: 'Role: Admin',     color: '#6366f1' },
                  { label: 'Guard Active',    color: '#0ea5e9' },
                ].map((b) => (
                  <span key={b.label} className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[660]"
                    style={{ background: `${b.color}10`, color: b.color, border: `1px solid ${b.color}20` }}>
                    <Check size={9} strokeWidth={3} /> {b.label}
                  </span>
                ))}
              </div>
              <PasswordSection />
            </SectionCard>

          </div>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
        }
        textarea:focus { outline: none; border-color: rgba(99,102,241,0.40) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08) !important; }
      `}</style>
    </div>
  );
}

export default function Page() {
  return (
    <Guard>
      <ProfilePage />
    </Guard>
  );
}
