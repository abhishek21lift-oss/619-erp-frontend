'use client';

import React, { useState, useMemo, useId, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { ROLE_LABELS, roleLabel } from '@/lib/roles';
import { useToast } from '@/lib/toast';
import { identity } from '@/lib/palette';
import {
  Users, UserPlus, Shield, Key, Search, Filter, MoreHorizontal,
  Eye, EyeOff, ChevronDown, Check, X, Mail, Lock, User,
  Link2, ShieldCheck, Clock, Activity, AlertTriangle,
  CheckCircle2, Circle, Zap, Crown, Headphones, Briefcase,
  Sparkles, LogIn, RefreshCw, Trash2, Edit3, Copy, Fingerprint,
} from 'lucide-react';

/* ────────────────────────────────────────────────────────────────────
   TYPES
──────────────────────────────────────────────────────────────────── */
// The only role this screen hands out. It used to be
// 'admin' | 'coach' | 'receptionist' | 'manager', which was fiction twice over:
// `coach` and `receptionist` are not values users_role_check accepts, so they
// were translated on the way out and back on the way in, and no account has
// ever held any role but admin and super_admin.
type Role = 'admin';
type Status = 'active' | 'pending' | 'suspended';

interface Account {
  id: string;
  name: string;
  email: string;
  role: string;
  status: Status;
  linkedCoach?: string;
  lastLogin: string;
  avatar: string | null;
  mfa: boolean;
}

// Coaches loaded dynamically from API in CoachSelector

/* ────────────────────────────────────────────────────────────────────
   ROLE CONFIG
──────────────────────────────────────────────────────────────────── */
const ROLES: Record<Role, { label: string; icon: React.ReactNode; color: string; bg: string; desc: string; perms: string }> = {
  admin: {
    label: ROLE_LABELS.admin,
    icon: <Crown size={14} />,
    color: '#0067e0',
    bg: 'rgba(0,103,224,0.08)',
    desc: 'Owns and runs one studio',
    perms: 'Everything inside their studio',
  },
};

const STATUS_CFG: Record<Status, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Active',    color: '#059669', bg: 'rgba(5,150,105,0.08)',  dot: '#10b981' },
  pending:   { label: 'Pending',   color: '#d97706', bg: 'rgba(217,119,6,0.08)',  dot: '#f59e0b' },
  suspended: { label: 'Suspended', color: 'var(--text-muted)', bg: 'rgba(100,116,139,0.08)', dot: '#94a3b8' },
};

// Roles that can be DISPLAYED but not assigned from here. Only one: yours.
// The account list includes the platform operator, so its badge has to render;
// it just is not something the New Account form can create.
//
// The other five roles used to be listed here. They are gone because none has
// ever had an account and none is offered anywhere, so a badge for them was
// describing a state the product does not produce. The fallback below still
// renders any role that turns up, which is the safety net that matters.
const ROLE_BADGE_EXTRA: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  super_admin: { label: ROLE_LABELS.super_admin, color: '#0067e0', bg: 'rgba(0,103,224,0.10)', icon: <Crown size={14} /> },
};

function roleBadgeCfg(role: string) {
  return (
    ROLES[role as Role] ??
    ROLE_BADGE_EXTRA[role] ??
    // Falls back to roleLabel rather than the raw value, so a role that has a
    // name but no badge styling still reads as a word.
    { label: roleLabel(role) || 'User', color: '#64748b', bg: 'rgba(100,116,139,0.10)', icon: <User size={14} /> }
  );
}

function statusBadgeCfg(status: string) {
  return (
    STATUS_CFG[status as Status] ??
    { label: status || '—', color: '#64748b', bg: 'rgba(100,116,139,0.08)', dot: '#94a3b8' }
  );
}

/* ────────────────────────────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = identity;
function avatarColor(id: string) { return AVATAR_COLORS[parseInt(id) % AVATAR_COLORS.length]; }

/* ────────────────────────────────────────────────────────────────────
   PASSWORD STRENGTH
──────────────────────────────────────────────────────────────────── */
function pwStrength(pw: string): { score: number; label: string; color: string } {
  let s = 0;
  if (pw.length >= 8)  s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  if (s <= 1) return { score: s, label: 'Weak',   color: '#ef4444' };
  if (s <= 2) return { score: s, label: 'Fair',   color: '#f59e0b' };
  if (s <= 3) return { score: s, label: 'Good',   color: '#0067e0' };
  return           { score: s, label: 'Strong', color: '#10b981' };
}

/* ────────────────────────────────────────────────────────────────────
   AVATAR
──────────────────────────────────────────────────────────────────── */
function Avatar({ name, id, size = 40 }: { name: string; id: string; size?: number }) {
  const color = avatarColor(id);
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[12px] text-white font-[700]"
      style={{ width: size, height: size, background: `linear-gradient(135deg,${color},${color}cc)`, fontSize: size * 0.34 }}
    >
      {initials(name)}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ROLE BADGE
──────────────────────────────────────────────────────────────────── */
function RoleBadge({ role }: { role: string }) {
  const cfg = roleBadgeCfg(role);
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-[660]"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}20` }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   STATUS BADGE
──────────────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Status }) {
  const cfg = statusBadgeCfg(status);
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-[600]"
      style={{ background: cfg.bg, color: cfg.color }}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────
   KPI CHIP
──────────────────────────────────────────────────────────────────── */
function KpiChip({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] px-4 py-3"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
      <div className="flex h-7 w-7 items-center justify-center rounded-[9px]"
        style={{ background: `${color}12`, color }}>
        {icon}
      </div>
      <div>
        <p className="text-[18px] font-[780] tracking-[-0.02em] leading-none" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
        <p className="mt-0.5 text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   FLOATING LABEL INPUT
──────────────────────────────────────────────────────────────────── */
function FloatInput({
  label, type = 'text', value, onChange, placeholder = ' ', suffix, required,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  suffix?: React.ReactNode; required?: boolean;
}) {
  const id = useId();
  const [focused, setFocused] = useState(false);
  const lifted = focused || value.length > 0;
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden rounded-[13px] transition-all"
        style={{
          background: focused ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: focused ? '1.5px solid rgba(0,103,224,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: focused ? '0 0 0 3px rgba(0,103,224,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
          transition: 'all 180ms cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <label
          htmlFor={id}
          className="pointer-events-none absolute left-4 font-[500] transition-all"
          style={{
            top: lifted ? 8 : 18,
            fontSize: lifted ? 10 : 13,
            color: lifted ? (focused ? '#0067e0' : 'rgb(148,163,184)') : 'rgb(148,163,184)',
            transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          {label}{required && ' *'}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          placeholder={lifted ? placeholder : ''}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className="w-full bg-transparent px-4 pb-3 pt-7 text-[13.5px] font-[500] outline-none"
          style={{ color: 'rgb(15,23,42)', caretColor: '#0067e0' }}
        />
        {suffix && <div className="absolute right-4 top-1/2 -translate-y-1/2">{suffix}</div>}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ROLE SELECTOR CARDS
──────────────────────────────────────────────────────────────────── */
function RoleSelector({ value, onChange }: { value: Role; onChange: (r: Role) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, cfg]) => {
        const active = value === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className="relative rounded-[13px] p-3 text-left transition-all"
            style={{
              background: active ? cfg.bg : 'var(--bg-subtle)',
              border: active ? `1.5px solid ${cfg.color}35` : '1.5px solid rgba(15,23,42,0.08)',
              boxShadow: active ? `0 0 0 2px ${cfg.color}14` : 'none',
            }}
          >
            {active && (
              <span className="absolute right-2.5 top-2.5 flex h-4 w-4 items-center justify-center rounded-full"
                style={{ background: cfg.color }}>
                <Check size={9} color="white" strokeWidth={3} />
              </span>
            )}
            <div className="flex h-6 w-6 items-center justify-center rounded-[8px]" style={{ background: cfg.bg, color: cfg.color }}>
              {cfg.icon}
            </div>
            <p className="mt-2 text-[12px] font-[700]" style={{ color: active ? cfg.color : 'rgb(15,23,42)' }}>{cfg.label}</p>
            <p className="mt-0.5 text-[10.5px]" style={{ color: 'rgb(148,163,184)' }}>{cfg.desc}</p>
            <p className="mt-1 text-[10px] font-[600]" style={{ color: active ? cfg.color : 'rgb(148,163,184)', opacity: 0.85 }}>{cfg.perms}</p>
          </button>
        );
      })}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   COACH SELECTOR
──────────────────────────────────────────────────────────────────── */
function CoachSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [coaches, setCoaches] = useState<string[]>([]);
  useEffect(() => {
    api.trainers.list().then(trainers => {
      setCoaches(trainers.map(t => t.name));
    }).catch(() => {});
  }, []);
  const filtered = coaches.filter((c) => c.toLowerCase().includes(q.toLowerCase()));
  const idx = coaches.findIndex((c) => c === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 rounded-[13px] px-4 py-3.5 text-left transition-all"
        style={{
          background: open ? 'var(--bg-card)' : 'var(--bg-subtle)',
          border: open ? '1.5px solid rgba(0,103,224,0.40)' : '1.5px solid rgba(15,23,42,0.09)',
          boxShadow: open ? '0 0 0 3px rgba(0,103,224,0.08)' : '0 1px 2px rgba(15,23,42,0.04)',
        }}
      >
        {value ? (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] text-[11px] font-[700] text-white"
              style={{ background: AVATAR_COLORS[idx >= 0 ? idx % AVATAR_COLORS.length : 0] }}>
              {initials(value)}
            </div>
            <div className="flex-1">
              <p className="text-[12px] text-slate-400">Linked Coach</p>
              <p className="text-[13.5px] font-[620]" style={{ color: 'rgb(15,23,42)' }}>{value}</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: 'rgba(0,103,224,0.08)' }}>
              <Link2 size={14} color="#0067e0" />
            </div>
            <span className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Link a coach profile (optional)</span>
          </>
        )}
        <ChevronDown size={14} style={{ color: 'rgb(148,163,184)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms' }} />
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            data-no-pull-refresh className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-[14px] p-1"
            style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
          >
            <div className="flex items-center gap-2 rounded-[10px] px-3 py-2 mb-1" style={{ background: 'var(--bg-subtle)' }}>
              <Search size={12} style={{ color: 'rgb(148,163,184)' }} />
              <input aria-label="Search coaches" value={q} onChange={(e) => setQ(e.target.value)}
                placeholder="Search coaches…" className="flex-1 bg-transparent text-[12px] outline-none" style={{ color: 'rgb(15,23,42)' }} />
            </div>
            {value && (
              <button onClick={() => { onChange(''); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[12.5px] text-red-400 transition hover:bg-red-50">
                <X size={12} /> Clear link
              </button>
            )}
            {filtered.map((c, i) => (
              <button key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 transition hover:bg-slate-50"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[11px] font-[700] text-white"
                  style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{initials(c)}</div>
                <span className="text-[12.5px] font-[580]" style={{ color: 'rgb(15,23,42)' }}>{c}</span>
                {value === c && <Check size={12} className="ml-auto" style={{ color: '#0067e0' }} />}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   ACCOUNT CARD
──────────────────────────────────────────────────────────────────── */
function AccountCard({ account, onAction }: { account: Account; onAction: (id: string, action: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <m.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="group relative flex items-center gap-4 rounded-[18px] px-5 py-4 transition-all"
      style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}
      whileHover={{ boxShadow: '0 4px 20px rgba(15,23,42,0.09)', borderColor: 'rgba(15,23,42,0.11)' }}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <Avatar name={account.name} id={account.id} size={44} />
        {account.status === 'active' && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full"
            style={{ background: '#10b981', border: '2px solid white' }} />
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[14px] font-[720] tracking-[-0.01em]" style={{ color: 'rgb(15,23,42)' }}>{account.name}</p>
          <RoleBadge role={account.role} />
          <StatusBadge status={account.status} />
          {account.mfa && (
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[660]" style={{ background: 'rgba(16,185,129,0.08)', color: '#059669' }}>
              <ShieldCheck size={9} /> MFA
            </span>
          )}
        </div>
        <p className="mt-0.5 text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>{account.email}</p>
        {account.linkedCoach && (
          <p className="mt-0.5 flex items-center gap-1 text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>
            <Link2 size={10} /> Coach: {account.linkedCoach}
          </p>
        )}
      </div>

      {/* Last login */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Last login</p>
        <p className="text-[12.5px] font-[600]" style={{ color: 'rgb(100,116,139)' }}>{account.lastLogin}</p>
      </div>

      {/* Actions */}
      <div className="relative shrink-0">
        <button
          onClick={() => setMenuOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-[10px] opacity-0 transition-all group-hover:opacity-100"
          style={{ background: 'var(--border)' }}
          aria-label="More actions"
        >
          <MoreHorizontal size={15} style={{ color: 'rgb(100,116,139)' }} />
        </button>
        <AnimatePresence>
          {menuOpen && (
            <m.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              data-no-pull-refresh className="absolute right-0 top-10 z-50 min-w-[180px] overflow-hidden rounded-[14px] p-1"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.14)' }}
            >
              {[
                { icon: <Edit3 size={13} />,   label: 'Edit Account',      action: 'edit',     color: 'rgb(15,23,42)' },
                { icon: <Key size={13} />,      label: 'Reset Password',    action: 'reset-pw', color: 'rgb(15,23,42)' },
                { icon: <RefreshCw size={13} />,label: 'Toggle Status',     action: 'toggle',   color: 'rgb(15,23,42)' },
                { icon: <Copy size={13} />,     label: 'Copy Email',        action: 'copy',     color: 'rgb(15,23,42)' },
                { icon: <Trash2 size={13} />,   label: 'Delete Account',    action: 'delete',   color: '#ef4444' },
              ].map((item) => (
                <button key={item.action}
                  onClick={() => { onAction(account.id, item.action); setMenuOpen(false); }}
                  className="flex w-full items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[580] transition-colors hover:bg-slate-50"
                  style={{ color: item.color }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </m.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   EMPTY STATE
──────────────────────────────────────────────────────────────────── */
function EmptyAccounts({ onAdd }: { onAdd: () => void }) {
  return (
    <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[22px]"
        style={{ background: 'rgba(0,103,224,0.08)' }}>
        <Users size={28} style={{ color: '#0067e0' }} />
      </div>
      <p className="text-[16px] font-[720]" style={{ color: 'rgb(15,23,42)' }}>No accounts yet</p>
      <p className="mt-1.5 text-[13px] max-w-[260px]" style={{ color: 'rgb(148,163,184)' }}>Create your first staff account to get started with access management.</p>
      <button onClick={onAdd}
        className="mt-5 flex items-center gap-2 rounded-[13px] px-5 py-2.5 text-[13px] font-[700] text-white transition-all hover:brightness-105 active:scale-95"
        style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 16px rgba(0,103,224,0.30)' }}>
        <UserPlus size={14} /> Create Account
      </button>
    </m.div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   SECURITY WIDGET
──────────────────────────────────────────────────────────────────── */
function SecurityWidget() {
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  useEffect(() => {
    api.activity.sessions().then(s => setSessionCount(Array.isArray(s) ? s.length : null)).catch(() => {});
  }, []);
  const items = [
    { icon: <Activity size={13} />,       label: 'Active sessions',   value: sessionCount !== null ? String(sessionCount) : '—', color: '#10b981' },
    { icon: <ShieldCheck size={13} />,    label: 'MFA enabled',       value: 'Enabled',       color: '#0067e0' },
    { icon: <AlertTriangle size={13} />,  label: 'Suspicious alerts', value: 'None',          color: '#f59e0b' },
  ];
  return (
    <div className="rounded-[18px] p-5" style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.07)', boxShadow: '0 1px 6px rgba(15,23,42,0.05)' }}>
      <div className="flex items-center gap-2 mb-4">
        <Shield size={14} style={{ color: '#0067e0' }} />
        <p className="text-[12.5px] font-[720] tracking-[0.01em] uppercase" style={{ color: 'rgb(100,116,139)' }}>Security Overview</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-[12.5px]" style={{ color: 'rgb(100,116,139)' }}>{item.label}</span>
            </div>
            <span className="text-[12.5px] font-[680]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CREATE ACCOUNT PANEL
──────────────────────────────────────────────────────────────────── */
function CreateAccountPanel({ onCreated }: { onCreated: (a: Account) => void }) {
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [role,     setRole]     = useState<Role>('admin');
  const [coach,    setCoach]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const strength = useMemo(() => pwStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) return;
    setSaving(true);
    setError('');
    try {
      const result = await api.auth.createUser({ name, email, password, role });
      const account: Account = {
        id: result.user.id,
        name, email, role, status: 'active',
        linkedCoach: coach || undefined,
        lastLogin: 'Never', avatar: null, mfa: false,
      };
      onCreated(account);
      setDone(true);
      setTimeout(() => {
        setDone(false);
        setName(''); setEmail(''); setPassword(''); setRole('admin'); setCoach('');
      }, 1800);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Avatar preview */}
      <div className="flex items-center gap-3">
        <m.div
          layout
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[14px] font-[700] text-white"
          style={{
            background: name
              ? `linear-gradient(135deg,${ROLES[role].color},${ROLES[role].color}bb)`
              : 'var(--border)',
          }}
        >
          {name ? initials(name) : <User size={16} style={{ color: 'rgb(148,163,184)' }} />}
        </m.div>
        <div>
          <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>
            {name || 'New Account'}
          </p>
          <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>
            {email || 'email@619fitness.com'}
          </p>
        </div>
      </div>

      <FloatInput label="Full Name" value={name} onChange={setName} required />
      <FloatInput label="Email Address" type="email" value={email} onChange={setEmail} required />

      {/* Password */}
      <FloatInput
        label="Password"
        type={showPw ? 'text' : 'password'}
        value={password}
        onChange={setPassword}
        required
        suffix={
          <button type="button" onClick={() => setShowPw((v) => !v)}
            className="flex h-6 w-6 items-center justify-center rounded-[7px] transition hover:bg-slate-100"
            aria-label={showPw ? 'Hide password' : 'Show password'}>
            {showPw ? <EyeOff size={13} style={{ color: 'rgb(148,163,184)' }} /> : <Eye size={13} style={{ color: 'rgb(148,163,184)' }} />}
          </button>
        }
      />

      {/* Strength meter */}
      {password.length > 0 && (
        <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <div className="flex gap-1 mb-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= strength.score ? strength.color : 'var(--border-2)' }} />
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px]" style={{ color: 'rgb(148,163,184)' }}>Password strength</p>
            <p className="text-[11px] font-[660]" style={{ color: strength.color }}>{strength.label}</p>
          </div>
        </m.div>
      )}

      {/* Role */}
      <div>
        <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Select Role</p>
        <RoleSelector value={role} onChange={setRole} />
      </div>

      {/* Coach link */}
      <div>
        <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Link Coach Profile</p>
        <CoachSelector value={coach} onChange={setCoach} />
      </div>

      {/* Submit */}
      {error && (
        <p className="rounded-[10px] px-3 py-2 text-[12.5px] font-[600]"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.20)' }}>
          {error}
        </p>
      )}
      <m.button
        type="submit"
        disabled={saving || done}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[14px] font-[750] text-white transition-all"
        style={{
          background: done
            ? 'linear-gradient(135deg,#10b981,#34d399)'
            : 'linear-gradient(135deg,#0067e0,#0059ce,#0059ce)',
          boxShadow: done
            ? '0 4px 20px rgba(16,185,129,0.30)'
            : '0 4px 20px rgba(0,103,224,0.30)',
          opacity: saving ? 0.75 : 1,
        }}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <m.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <CheckCircle2 size={15} /> Account Created
            </m.span>
          ) : saving ? (
            <m.span key="saving" className="flex items-center gap-2">
              <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                <RefreshCw size={14} />
              </m.span>
              Creating…
            </m.span>
          ) : (
            <m.span key="idle" className="flex items-center gap-2">
              <UserPlus size={14} /> Create Account
            </m.span>
          )}
        </AnimatePresence>
      </m.button>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────────
   CHANGE PASSWORD PANEL
──────────────────────────────────────────────────────────────────── */
function ChangePasswordPanel() {
  const [cur,   setCur]   = useState('');
  const [next,  setNext]  = useState('');
  const [sessionCount, setSessionCount] = useState<number | null>(null);
  useEffect(() => {
    api.activity.sessions().then(s => setSessionCount(Array.isArray(s) ? s.length : null)).catch(() => {});
  }, []);
  const [conf,  setConf]  = useState('');
  const [showCur,  setShowCur]  = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [done,     setDone]     = useState(false);

  const strength = useMemo(() => pwStrength(next), [next]);
  const match = conf.length > 0 && next === conf;
  const mismatch = conf.length > 0 && next !== conf;

  const reqs = [
    { label: 'At least 8 characters',          ok: next.length >= 8 },
    { label: 'At least one uppercase letter',  ok: /[A-Z]/.test(next) },
    { label: 'At least one number',            ok: /[0-9]/.test(next) },
    { label: 'At least one special character', ok: /[^A-Za-z0-9]/.test(next) },
  ];

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cur || !next || !match) return;
    setSaving(true);
    setError('');
    try {
      await api.auth.changePassword(cur, next);
      setDone(true);
      setTimeout(() => { setDone(false); setCur(''); setNext(''); setConf(''); }, 2200);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const pwSuffix = (show: boolean, toggle: () => void) => (
    <button type="button" onClick={toggle}
      className="flex h-6 w-6 items-center justify-center rounded-[7px] transition hover:bg-slate-100"
      aria-label={show ? 'Hide' : 'Show'}>
      {show ? <EyeOff size={13} style={{ color: 'rgb(148,163,184)' }} /> : <Eye size={13} style={{ color: 'rgb(148,163,184)' }} />}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <FloatInput label="Current Password" type={showCur  ? 'text' : 'password'} value={cur}  onChange={setCur}  suffix={pwSuffix(showCur,  () => setShowCur(v => !v))}  required />
      <FloatInput label="New Password"     type={showNext ? 'text' : 'password'} value={next} onChange={setNext} suffix={pwSuffix(showNext, () => setShowNext(v => !v))} required />

      {/* Strength */}
      {next.length > 0 && (
        <div>
          <div className="flex gap-1 mb-1.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{ background: i <= strength.score ? strength.color : 'var(--border-2)' }} />
            ))}
          </div>
          <p className="text-right text-[11px] font-[660]" style={{ color: strength.color }}>{strength.label}</p>
        </div>
      )}

      {/* Confirm */}
      <div className="relative">
        <FloatInput
          label="Confirm New Password"
          type={showConf ? 'text' : 'password'}
          value={conf}
          onChange={setConf}
          suffix={
            <div className="flex items-center gap-1.5">
              {match && <CheckCircle2 size={13} style={{ color: '#10b981' }} />}
              {mismatch && <X size={13} style={{ color: '#ef4444' }} />}
              {pwSuffix(showConf, () => setShowConf(v => !v))}
            </div>
          }
        />
        {mismatch && (
          <p className="mt-1 pl-1 text-[11px]" style={{ color: '#ef4444' }}>Passwords do not match</p>
        )}
      </div>

      {/* Requirements card */}
      <div className="rounded-[13px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.07)' }}>
        <p className="mb-2.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Password Requirements</p>
        <div className="space-y-2">
          {reqs.map((r) => (
            <div key={r.label} className="flex items-center gap-2">
              {r.ok
                ? <CheckCircle2 size={12} style={{ color: '#10b981', flexShrink: 0 }} />
                : <Circle size={12} style={{ color: 'rgb(148,163,184)', flexShrink: 0 }} />}
              <span className="text-[12px]" style={{ color: r.ok ? 'rgb(15,23,42)' : 'rgb(148,163,184)' }}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent changes */}
      <div className="rounded-[13px] p-4" style={{ background: 'var(--bg-subtle)', border: '1px solid rgba(15,23,42,0.07)' }}>
        <p className="mb-2.5 text-[11px] font-[700] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>Recent Security</p>
        {[
          { label: 'Active sessions', value: sessionCount !== null ? `${sessionCount} device${sessionCount !== 1 ? 's' : ''}` : '—' },
          { label: '2FA status',      value: 'Enabled' },
        ].map((item) => (
          <div key={item.label} className="flex justify-between py-1.5">
            <span className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>{item.label}</span>
            <span className="text-[12px] font-[650]" style={{ color: 'rgb(15,23,42)' }}>{item.value}</span>
          </div>
        ))}
      </div>

      {error && (
        <p className="rounded-[10px] px-3 py-2 text-[12.5px] font-[600]"
          style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.20)' }}>
          {error}
        </p>
      )}

      <m.button
        type="submit"
        disabled={saving || done || !cur || !next || !match}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        className="mt-1 flex w-full items-center justify-center gap-2 rounded-[14px] py-3.5 text-[14px] font-[750] text-white transition-all"
        style={{
          background: done
            ? 'linear-gradient(135deg,#10b981,#34d399)'
            : 'linear-gradient(135deg,#0050ad,#0067e0)',
          boxShadow: done ? '0 4px 20px rgba(16,185,129,0.30)' : '0 4px 20px rgba(0,103,224,0.25)',
          opacity: (saving || (!cur || !next || !match)) ? 0.6 : 1,
        }}
      >
        <AnimatePresence mode="wait">
          {done ? (
            <m.span key="done" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <CheckCircle2 size={15} /> Password Updated
            </m.span>
          ) : saving ? (
            <m.span key="saving" className="flex items-center gap-2">
              <m.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}>
                <RefreshCw size={14} />
              </m.span>
              Updating…
            </m.span>
          ) : (
            <m.span key="idle" className="flex items-center gap-2">
              <Lock size={14} /> Update Password
            </m.span>
          )}
        </AnimatePresence>
      </m.button>
    </form>
  );
}

/* ────────────────────────────────────────────────────────────────────
   PAGE
──────────────────────────────────────────────────────────────────── */
function AccountManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  // Managing login accounts is a platform-operator power — only the super admin
  // can see/use it. Studio admins get just their own "Change Password" tab.
  const isSuperAdmin = user?.role === 'super_admin';
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsLoading, setAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState('');
  const [tab, setTab] = useState<'accounts' | 'password'>('accounts');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<Role | 'all'>('all');
  const [filterOpen, setFilterOpen] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setAccountsLoading(true);
    setAccountsError('');
    try {
      const res = await api.accounts.list();
      const raw = Array.isArray(res) ? res : Array.isArray((res as any)?.data) ? (res as any).data : (res as any)?.users ?? [];
      const mapped: Account[] = raw.map((u: any) => ({
        id: u.id ?? u.user_id,
        name: u.name ?? '',
        email: u.email ?? '',
        // Kept verbatim. This used to translate trainer→coach and
        // reception→receptionist, and default to 'receptionist', so an
        // account with no role displayed as a role that does not exist.
        role: u.role || '',
        status: (u.status || u.is_active === false ? 'suspended' : 'active') as Status,
        linkedCoach: u.linked_coach || undefined,
        lastLogin: u.last_login || 'Never',
        avatar: u.avatar_url ?? null,
        mfa: !!u.mfa_enabled,
      }));
      setAccounts(mapped);
    } catch (err: unknown) {
      setAccountsError(err instanceof Error ? err.message : 'Failed to load accounts');
      setAccounts([]);
    } finally {
      setAccountsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) fetchAccounts();
    else { setAccountsLoading(false); setTab('password'); }
  }, [fetchAccounts, isSuperAdmin]);

  const filtered = useMemo(() => {
    return accounts
      .filter((a) => filterRole === 'all' || a.role === filterRole)
      .filter((a) =>
        !search ||
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase()),
      );
  }, [accounts, filterRole, search]);

  const stats = useMemo(() => ({
    total:   accounts.length,
    active:  accounts.filter((a) => a.status === 'active').length,
    admins:  accounts.filter((a) => a.role === 'admin').length,
    pending: accounts.filter((a) => a.status === 'pending').length,
  }), [accounts]);

  const handleAction = async (id: string, action: string) => {
    if (action === 'delete') {
      try {
        await api.accounts.delete(id);
        setAccounts((prev) => prev.filter((a) => a.id !== id));
        toast.success('Account deleted');
      } catch { toast.error('Failed to delete account'); }
    } else if (action === 'toggle') {
      try {
        const res = await api.accounts.toggleStatus(id);
        const active = (res as any)?.is_active ?? false;
        setAccounts((prev) => prev.map((a) =>
          a.id === id ? { ...a, status: active ? 'active' : 'suspended' } : a,
        ));
        toast.success(active ? 'Account activated' : 'Account suspended');
      } catch { toast.error('Failed to toggle status'); }
    } else if (action === 'copy') {
      const account = accounts.find((a) => a.id === id);
      if (account) navigator.clipboard?.writeText(account.email).catch(() => {});
    }
  };

  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div className="border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-screen-xl py-6">
          {/* Title row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(0,103,224,0.10)' }}>
                  <Users size={16} style={{ color: '#0067e0' }} />
                </div>
                <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>{isSuperAdmin ? 'Account Management' : 'Security'}</h1>
              </div>
              <p className="mt-1.5 ml-0 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>{isSuperAdmin ? 'Manage staff login access, permissions, and security settings.' : 'Change your password and set up Face ID / passkeys.'}</p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5">
              <Link
                href="/settings/passkeys"
                className="flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-[740] transition-all hover:brightness-105 active:scale-95"
                style={{ background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.20)' }}
              >
                <Fingerprint size={14} /> Set Up Face ID / Passkey
              </Link>
              {isSuperAdmin && (
                <button
                  onClick={() => setTab('accounts')}
                  className="flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-[740] text-white transition-all hover:brightness-105 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)', boxShadow: '0 4px 16px rgba(0,103,224,0.28)' }}
                >
                  <UserPlus size={14} /> New Account
                </button>
              )}
            </div>
          </div>

          {/* KPI chips — account stats are only meaningful to the platform admin */}
          {isSuperAdmin && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <KpiChip label="Total Accounts"     value={stats.total}   icon={<Users size={13} />}       color="#0067e0" />
              <KpiChip label="Active Users"       value={stats.active}  icon={<Activity size={13} />}    color="#10b981" />
              <KpiChip label="Trainers"           value={stats.admins}  icon={<Crown size={13} />}       color="#f59e0b" />
              <KpiChip label="Pending Invitations" value={stats.pending} icon={<Sparkles size={13} />}   color="#0067e0" />
            </div>
          )}
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-screen-xl py-6">
        {/* Segmented tab control */}
        <div className="mb-6 inline-flex overflow-hidden rounded-[13px] p-1"
          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.05)' }}>
          {([
            { id: 'accounts', label: 'Login Accounts', icon: <LogIn size={13} /> },
            { id: 'password', label: 'Change Password', icon: <Key size={13} /> },
          ] as const).filter((t) => t.id !== 'accounts' || isSuperAdmin).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="relative flex items-center gap-2 rounded-[10px] px-4 py-2 text-[13px] font-[680] transition-all"
              style={{
                background: tab === t.id ? 'var(--bg-card)' : 'transparent',
                color: tab === t.id ? 'rgb(15,23,42)' : 'rgb(148,163,184)',
                boxShadow: tab === t.id ? '0 1px 4px rgba(15,23,42,0.08)' : 'none',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── LOGIN ACCOUNTS TAB ── */}
        <AnimatePresence mode="wait">
          {tab === 'accounts' && isSuperAdmin ? (
            <m.div key="accounts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">

              {/* LEFT: Create Account */}
              <div className="flex flex-col gap-5">
                <div className="rounded-[22px] p-6"
                  style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                  <div className="mb-5 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(0,103,224,0.10)' }}>
                      <UserPlus size={13} style={{ color: '#0067e0' }} />
                    </div>
                    <div>
                      <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Create Account</p>
                      <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>Add a new staff login</p>
                    </div>
                  </div>
                  <CreateAccountPanel onCreated={(a) => setAccounts((prev) => [a, ...prev])} />
                </div>

                <SecurityWidget />
              </div>

              {/* RIGHT: All Accounts */}
              <div className="flex flex-col gap-4">
                {/* Toolbar */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="relative flex flex-1 min-w-[200px] items-center gap-2.5 rounded-[13px] px-3.5 py-2.5"
                    style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.08)', boxShadow: '0 1px 4px rgba(15,23,42,0.04)' }}>
                    <Search size={13} style={{ color: 'rgb(148,163,184)', flexShrink: 0 }} />
                    <input aria-label="Search accounts" value={search} onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search accounts…"
                      className="flex-1 bg-transparent text-[13px] font-[500] outline-none" style={{ color: 'rgb(15,23,42)' }} />
                    {search && (
                      <button onClick={() => setSearch('')}>
                        <X size={12} style={{ color: 'rgb(148,163,184)' }} />
                      </button>
                    )}
                  </div>

                  {/* Filter dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setFilterOpen((o) => !o)}
                      className="flex items-center gap-2 rounded-[13px] px-3.5 py-2.5 text-[13px] font-[640] transition-all"
                      style={{
                        background: filterRole !== 'all' ? 'rgba(0,103,224,0.08)' : 'var(--bg-card)',
                        border: filterRole !== 'all' ? '1.5px solid rgba(0,103,224,0.22)' : '1px solid rgba(15,23,42,0.08)',
                        color: filterRole !== 'all' ? '#0067e0' : 'rgb(100,116,139)',
                        boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                      }}
                    >
                      <Filter size={13} />
                      {filterRole === 'all' ? 'All Roles' : ROLES[filterRole].label}
                      <ChevronDown size={12} style={{ transform: filterOpen ? 'rotate(180deg)' : undefined, transition: 'transform 200ms' }} />
                    </button>
                    <AnimatePresence>
                      {filterOpen && (
                        <m.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.12 }}
                          data-no-pull-refresh className="absolute right-0 top-12 z-50 min-w-[160px] overflow-hidden rounded-[14px] p-1"
                          style={{ background: 'var(--bg-card)', border: '1px solid rgba(15,23,42,0.09)', boxShadow: '0 12px 32px rgba(15,23,42,0.12)' }}
                        >
                          <button onClick={() => { setFilterRole('all'); setFilterOpen(false); }}
                            className="flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[600] transition hover:bg-slate-50"
                            style={{ color: 'rgb(15,23,42)' }}>
                            All Roles {filterRole === 'all' && <Check size={12} style={{ color: '#0067e0' }} />}
                          </button>
                          {(Object.entries(ROLES) as [Role, typeof ROLES[Role]][]).map(([key, cfg]) => (
                            <button key={key} onClick={() => { setFilterRole(key); setFilterOpen(false); }}
                              className="flex w-full items-center justify-between rounded-[10px] px-3.5 py-2.5 text-[12.5px] font-[600] transition hover:bg-slate-50"
                              style={{ color: 'rgb(15,23,42)' }}>
                              <span className="flex items-center gap-2">
                                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                                {cfg.label}
                              </span>
                              {filterRole === key && <Check size={12} style={{ color: '#0067e0' }} />}
                            </button>
                          ))}
                        </m.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Account count */}
                <div className="flex items-center justify-between">
                  <p className="text-[12.5px]" style={{ color: 'rgb(148,163,184)' }}>
                    {accountsLoading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'account' : 'accounts'}`}
                    {!accountsLoading && filterRole !== 'all' && ` · ${ROLES[filterRole].label}`}
                  </p>
                  {!accountsLoading && (
                    <button onClick={fetchAccounts}
                      className="flex items-center gap-1 rounded-[9px] px-2.5 py-1.5 text-[11px] font-[600] transition-all hover:shadow-sm"
                      style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.06)', color: 'rgb(71,85,105)' }}>
                      <RefreshCw size={11} /> Refresh
                    </button>
                  )}
                </div>

                {/* Cards */}
                <div className="flex flex-col gap-2.5">
                  <AnimatePresence>
                    {accountsLoading ? (
                      <div className="flex items-center justify-center py-16">
                        <m.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="h-8 w-8 rounded-full"
                          style={{ border: '2.5px solid rgba(0,103,224,0.15)', borderTopColor: '#0067e0' }} />
                      </div>
                    ) : accountsError ? (
                      <div className="flex flex-col items-center py-16 text-center">
                        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-[16px]" style={{ background: 'rgba(239,68,68,0.10)' }}>
                          <AlertTriangle size={20} style={{ color: '#ef4444' }} />
                        </div>
                        <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>{accountsError}</p>
                        <button onClick={fetchAccounts}
                          className="mt-3 flex items-center gap-2 rounded-[11px] px-4 py-2 text-[12px] font-[700] text-white"
                          style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)' }}>
                          <RefreshCw size={12} /> Retry
                        </button>
                      </div>
                    ) : filtered.length === 0
                      ? <EmptyAccounts onAdd={() => setTab('accounts')} />
                      : filtered.map((a) => (
                          <AccountCard key={a.id} account={a} onAction={handleAction} />
                        ))}
                  </AnimatePresence>
                </div>
              </div>
            </m.div>
          ) : (
            /* ── CHANGE PASSWORD TAB ── */
            <m.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mx-auto max-w-[520px]">
              <div className="rounded-[22px] p-6"
                style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
                <div className="mb-5 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(0,103,224,0.10)' }}>
                    <Lock size={13} style={{ color: '#0067e0' }} />
                  </div>
                  <div>
                    <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Change Password</p>
                    <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>Update your admin account password</p>
                  </div>
                </div>
                <ChangePasswordPanel />
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Suppress reduced-motion jank */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration:.01ms!important; transition-duration:.01ms!important }
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  // Account Management is a platform-operator power. Only the super admin can
  // reach it; studio admins are redirected home (they manage their own login
  // from My Profile). Server-side, the account endpoints are already
  // super-admin-only, so this is the matching client-side gate.
  return (
    <Guard role="super_admin">
      <AccountManagementPage />
    </Guard>
  );
}
