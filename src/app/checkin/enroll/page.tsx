'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, Shield, Fingerprint, ScanFace, CheckCircle2, XCircle,
  Plus, Trash2, ChevronRight, AlertTriangle, Clock, RefreshCw,
  Monitor, Laptop, Tablet, Phone,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { PremiumButton } from '@/components/premium/PremiumButton';
import { api } from '@/lib/api';
import { isWebAuthnSupported, isPlatformAuthenticatorAvailable, registerCredential } from '@/lib/webauthn';

interface Credential {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
}

const DEVICE_ICONS: Record<string, React.ReactNode> = {
  iPhone: <Phone size={16} />,
  iPad: <Tablet size={16} />,
  Mac: <Monitor size={16} />,
  Windows: <Laptop size={16} />,
  Android: <Smartphone size={16} />,
};

function deviceIcon(name: string) {
  for (const [key, icon] of Object.entries(DEVICE_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) return icon;
  }
  return <Smartphone size={16} />;
}

function deviceType(name: string) {
  if (name.toLowerCase().includes('iphone')) return 'Face ID / Touch ID';
  if (name.toLowerCase().includes('android')) return 'Face Unlock / Fingerprint';
  if (name.toLowerCase().includes('mac')) return 'Touch ID';
  if (name.toLowerCase().includes('windows')) return 'Windows Hello';
  return 'Passkey';
}

function fmtDate(d: string | null) {
  if (!d) return '\u2014';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function EnrollPage() {
  return (
    <Guard>
      <AppShell>
        <EnrollContent />
      </AppShell>
    </Guard>
  );
}

function EnrollContent() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [platformAuth, setPlatformAuth] = useState(false);
  const [memberId, setMemberId] = useState('');
  const [memberName, setMemberName] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showEnrollForm, setShowEnrollForm] = useState(false);

  useEffect(() => {
    isWebAuthnSupported() ? setSupported(true) : setSupported(false);
    isPlatformAuthenticatorAvailable().then(setPlatformAuth);
    const ua = navigator.userAgent;
    setDeviceName(ua.includes('iPhone') ? 'My iPhone' : ua.includes('Android') ? 'My Phone' : ua.includes('Mac') ? 'My Mac' : 'My Device');
    const stored = localStorage.getItem('619_member_context');
    if (stored) {
      try {
        const ctx = JSON.parse(stored);
        if (ctx.id) setMemberId(ctx.id);
        if (ctx.name) setMemberName(ctx.name);
      } catch {}
    }
  }, []);

  const loadCredentials = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const res = await api.webauthn.listCredentials(memberId) as any;
      setCredentials(res?.credentials ?? []);
    } catch { setCredentials([]); }
    finally { setLoading(false); }
  }, [memberId]);

  useEffect(() => {
    if (memberId) loadCredentials();
  }, [memberId, loadCredentials]);

  const handleEnroll = async () => {
    if (!memberId || !memberName) { setStatus({ type: 'error', msg: 'Member ID and Name are required.' }); return; }
    setEnrolling(true);
    setStatus(null);
    try {
      const beginRes = await api.webauthn.registerBegin(memberId) as any;
      const credential = await registerCredential({
        challenge: beginRes.challenge,
        rp: beginRes.rp,
        user: beginRes.user,
        pubKeyCredParams: beginRes.pubKeyCredParams,
      });
      const completeRes = await api.webauthn.registerComplete({
        memberId, deviceName,
        credentialId: credential.credentialId,
        rawId: credential.rawId,
        attestationObject: credential.response.attestationObject,
        clientDataJSON: credential.response.clientDataJSON,
      }) as any;
      if (completeRes?.success) {
        setStatus({ type: 'success', msg: 'Passkey enrolled successfully!' });
        setShowEnrollForm(false);
        loadCredentials();
      } else {
        setStatus({ type: 'error', msg: 'Failed to enroll passkey.' });
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError') setStatus({ type: 'error', msg: 'Enrollment cancelled.' });
      else setStatus({ type: 'error', msg: err?.message || 'Enrollment failed.' });
    }
    finally { setEnrolling(false); }
  };

  const handleRemove = async (credId: string) => {
    try {
      await api.webauthn.removeCredential(credId);
      setCredentials((prev) => prev.filter((c) => c.id !== credId));
    } catch {}
  };

  if (supported === false) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-[18px]" style={{ background: 'rgba(239,68,68,0.1)' }}>
              <XCircle size={28} style={{ color: '#ef4444' }} />
            </div>
          </div>
          <h2 className="text-[20px] font-[800] mb-2" style={{ color: 'rgb(15,23,42)' }}>WebAuthn Not Supported</h2>
          <p className="text-[13px]" style={{ color: 'rgb(148,163,184)' }}>Your browser does not support passkeys. Please use a modern browser on a supported device (iPhone, iPad, Mac, Android, or Windows with Hello).</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0a1e 0%,#1a0a2e 30%,#0f172a 100%)', padding: '36px 32px 32px', borderRadius: '0 0 36px 36px' }}>
        <div className="pointer-events-none absolute inset-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}>
          <motion.div className="absolute -top-16 -left-8 w-64 h-64 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
            animate={{ x: [0, 25, -15, 0], y: [0, -30, 10, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-16 -right-8 w-72 h-72 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative z-10 mx-auto" style={{ maxWidth: 900 }}>
          <div className="flex items-center gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center w-[48px] h-[48px] rounded-[14px]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', boxShadow: '0 8px 28px rgba(99,102,241,0.3)' }}>
              <Shield size={20} color="#fff" />
            </motion.div>
            <div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-[24px] font-[860] tracking-[-0.03em]"
                style={{ background: 'linear-gradient(135deg,#c7d2fe,#6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Face Enrollment
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Register your passkey for biometric attendance
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 900 }}>
        {/* Member Context */}
        {!memberId && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-[18px] p-5 mb-5" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)' }}>
            <p className="text-[13px] font-[600] mb-2" style={{ color: 'rgb(15,23,42)' }}>Member Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={memberId} onChange={(e) => setMemberId(e.target.value)} placeholder="Member ID"
                className="rounded-[11px] px-3.5 py-2.5 text-[13px] outline-none" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(15,23,42)', fontFamily: 'inherit' }} />
              <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="Member Name"
                className="rounded-[11px] px-3.5 py-2.5 text-[13px] outline-none" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(15,23,42)', fontFamily: 'inherit' }} />
            </div>
          </motion.div>
        )}

        {/* Status */}
        <AnimatePresence>
          {status && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="rounded-[13px] p-3.5 mb-5 flex items-center gap-2.5 text-[13px] font-[500]"
              style={{ background: status.type === 'success' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${status.type === 'success' ? '#bbf7d0' : '#fecdd3'}`, color: status.type === 'success' ? '#166534' : '#9f1239' }}>
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
              {status.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enroll Card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-[22px] p-6 mb-5 relative overflow-hidden" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg,#6366f1,#10b981)' }} />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                <Shield size={18} style={{ color: '#6366f1' }} />
              </div>
              <div>
                <h2 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Register a Passkey</h2>
                <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>Use Face ID, Touch ID, or device passkey</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ background: 'rgba(99,102,241,0.10)' }}>
                <ScanFace size={15} style={{ color: '#6366f1' }} />
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-[8px]" style={{ background: 'rgba(16,185,129,0.10)' }}>
                <Fingerprint size={15} style={{ color: '#10b981' }} />
              </div>
            </div>
          </div>

          {!showEnrollForm ? (
            <PremiumButton tone="primary" glow icon={<Plus size={14} />} onClick={() => setShowEnrollForm(true)}>
              Enroll New Passkey
            </PremiumButton>
          ) : (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
              <div className="space-y-3 mb-4">
                <input value={deviceName} onChange={(e) => setDeviceName(e.target.value)} placeholder="Device name (e.g. My iPhone)"
                  className="w-full rounded-[11px] px-3.5 py-2.5 text-[13px] outline-none" style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', color: 'rgb(15,23,42)', fontFamily: 'inherit' }} />
              </div>
              <div className="rounded-[13px] p-3.5 mb-4 text-[12px] leading-relaxed" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: 'rgb(71,85,105)' }}>
                <strong style={{ color: '#6366f1' }}>How it works:</strong> Your browser will prompt you to use Face ID, Touch ID, or your device passkey. No face images or biometric data are stored on our servers.
              </div>
              <div className="flex gap-2">
                <PremiumButton tone="primary" glow icon={<Shield size={14} />} onClick={handleEnroll} loading={enrolling} disabled={enrolling || !memberId || !deviceName}>
                  Register Passkey
                </PremiumButton>
                <PremiumButton tone="secondary" onClick={() => setShowEnrollForm(false)}>
                  Cancel
                </PremiumButton>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Registered Credentials */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="rounded-[22px] p-6" style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: 'rgba(16,185,129,0.10)' }}>
              <Smartphone size={18} style={{ color: '#10b981' }} />
            </div>
            <div>
              <h2 className="text-[16px] font-[760]" style={{ color: 'rgb(15,23,42)' }}>Registered Devices</h2>
              <p className="text-[12px]" style={{ color: 'rgb(148,163,184)' }}>{credentials.length} device{credentials.length !== 1 ? 's' : ''} enrolled</p>
            </div>
            {memberId && (
              <button onClick={loadCredentials} className="ml-auto flex h-8 w-8 items-center justify-center rounded-[8px] transition-all hover:bg-slate-100" style={{ color: 'rgb(148,163,184)' }}>
                <RefreshCw size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 rounded-[13px] animate-pulse" style={{ background: '#f1f5f9' }} />
              ))}
            </div>
          ) : credentials.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[12px]" style={{ background: 'rgba(148,163,184,0.10)' }}>
                  <Shield size={22} style={{ color: 'rgb(148,163,184)' }} />
                </div>
              </div>
              <p className="text-[13px] font-[600]" style={{ color: 'rgb(148,163,184)' }}>No passkeys registered yet</p>
              <p className="text-[12px] mt-1" style={{ color: 'rgb(203,213,225)' }}>Click above to enroll your first passkey</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {credentials.map((cred) => (
                <motion.div key={cred.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 rounded-[14px] p-3.5 transition-all hover:bg-slate-50"
                  style={{ border: '1px solid #f1f5f9' }}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: 'rgba(99,102,241,0.10)', color: '#6366f1' }}>
                    {deviceIcon(cred.deviceName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-[660]" style={{ color: 'rgb(15,23,42)' }}>{cred.deviceName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px]" style={{ color: 'rgb(148,163,184)' }}>
                      <span>Type: {deviceType(cred.deviceName)}</span>
                      <span>Enrolled: {fmtDate(cred.createdAt)}</span>
                      {cred.lastUsedAt && <span>Last used: {fmtDate(cred.lastUsedAt)}</span>}
                    </div>
                  </div>
                  <button onClick={() => handleRemove(cred.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-[8px] transition-all hover:bg-red-50"
                    style={{ color: 'rgb(203,213,225)' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgb(203,213,225)'}>
                    <Trash2 size={13} />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
