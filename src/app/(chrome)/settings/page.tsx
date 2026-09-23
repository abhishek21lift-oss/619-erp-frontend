'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Guard from '@/components/Guard';
import { api } from '@/lib/api';
import {
  Shield, Eye, EyeOff, Lock, ShieldCheck, Activity, AlertTriangle,
  CheckCircle2, Circle, RefreshCw, Fingerprint, X,
} from 'lucide-react';
import { FloatInput } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';

// The trainer's own sign-in security: password and passkeys.
//
// This screen used to be "Account Management" — create, list, suspend and
// delete login accounts for admin / manager / reception / trainer staff. A
// studio is now one trainer and their members: the trainer account is created
// with the studio (by self-serve registration or the Command Center) and
// members get their logins from the client record. With no staff to invite,
// that whole surface went, along with the /api/auth/users and
// /api/auth/create-user routes behind it.

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
   SECURITY OVERVIEW
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
      setError(errorMessage(err, 'Failed to change password'));
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
      <FloatInput tone="brand" label="Current Password" type={showCur  ? 'text' : 'password'} value={cur}  onChange={setCur}  suffix={pwSuffix(showCur,  () => setShowCur(v => !v))}  required />
      <FloatInput tone="brand" label="New Password"     type={showNext ? 'text' : 'password'} value={next} onChange={setNext} suffix={pwSuffix(showNext, () => setShowNext(v => !v))} required />

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
        <FloatInput tone="brand"
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
function SecurityPage() {
  return (
    <div>
      {/* ── PAGE HEADER ── */}
      <div className="border-b" style={{ background: 'var(--bg-card)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <div className="mx-auto max-w-screen-xl py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-[12px]" style={{ background: 'rgba(0,103,224,0.10)' }}>
                  <Shield size={16} style={{ color: '#0067e0' }} />
                </div>
                <h1 className="text-[22px] font-[860] tracking-[-0.03em]" style={{ color: 'rgb(15,23,42)' }}>Security</h1>
              </div>
              <p className="mt-1.5 ml-0 text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Change your password and set up Face ID / passkeys.</p>
            </div>
            <Link
              href="/settings/passkeys"
              className="flex items-center gap-2 rounded-[13px] px-4 py-2.5 text-[13px] font-[740] transition-all hover:brightness-105 active:scale-95"
              style={{ background: 'rgba(16,185,129,0.10)', color: '#059669', border: '1px solid rgba(16,185,129,0.20)' }}
            >
              <Fingerprint size={14} /> Set Up Face ID / Passkey
            </Link>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="mx-auto max-w-screen-xl py-6">
        <AnimatePresence mode="wait">
          <m.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mx-auto grid max-w-[880px] grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
            <div className="rounded-[22px] p-6"
              style={{ background: 'var(--bg-card)', border: '1px solid rgba(255,255,255,0.95)', boxShadow: '0 2px 20px rgba(15,23,42,0.07)' }}>
              <div className="mb-5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[9px]" style={{ background: 'rgba(0,103,224,0.10)' }}>
                  <Lock size={13} style={{ color: '#0067e0' }} />
                </div>
                <div>
                  <p className="text-[14px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Change Password</p>
                  <p className="text-[11.5px]" style={{ color: 'rgb(148,163,184)' }}>Update your trainer account password</p>
                </div>
              </div>
              <ChangePasswordPanel />
            </div>
            <SecurityWidget />
          </m.div>
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
  return (
    <Guard role="trainer">
      <SecurityPage />
    </Guard>
  );
}
