'use client';
/**
 * Check In Hub
 *
 * Unified entry point for all attendance check-in methods.
 * Face Recognition loads the heavy face-api.js component inline (no navigation).
 * QR Scanner and Self Check-In navigate to their dedicated pages.
 */
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { ScanFace, QrCode, Fingerprint, ChevronRight, Monitor } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import Link from 'next/link';

const FaceCheckIn = dynamic(() => import('./CheckInContent'), {
  ssr: false,
  loading: () => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 260, flexDirection: 'column', gap: 12, color: '#94a3b8', fontSize: 14 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.9s linear infinite' }}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <span>Loading face recognition…</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  ),
});

type Method = 'face' | 'qr' | 'passkey' | null;

const METHODS = [
  {
    id: 'face' as Method,
    label: 'Face Recognition',
    desc: 'Camera-based check-in — no ID needed',
    icon: ScanFace,
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.10)',
    roles: 'All users',
    inline: true,
  },
  {
    id: 'qr' as Method,
    label: 'QR Scanner',
    desc: 'Scan a member\'s QR code with your camera',
    icon: QrCode,
    color: '#10b981',
    bg: 'rgba(16,185,129,0.10)',
    roles: 'Admin · Manager · Trainer',
    inline: false,
    href: '/checkin/qr-scanner',
  },
  {
    id: 'passkey' as Method,
    label: 'Self Check-In',
    desc: 'GPS + Face ID / Touch ID / passkey',
    icon: Fingerprint,
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.10)',
    roles: 'Members',
    inline: false,
    href: '/checkin/mark',
  },
];

export default function CheckInHubPage() {
  return (
    <Guard>
      <AppShell>
        <CheckInHub />
      </AppShell>
    </Guard>
  );
}

function CheckInHub() {
  const [active, setActive] = useState<Method>(null);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(145deg,#f8fafc 0%,#f1f5f9 50%,#fafafe 100%)' }}>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#0f0a1e 0%,#1a0a2e 30%,#0f172a 100%)', padding: '36px 32px 32px', borderRadius: '0 0 36px 36px' }}>
        <div className="pointer-events-none absolute inset-0" style={{ maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)' }}>
          <motion.div className="absolute -top-16 -left-8 w-64 h-64 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #6366f1, transparent 70%)' }}
            animate={{ x: [0, 25, -15, 0], y: [0, -30, 10, 0] }} transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }} />
          <motion.div className="absolute -bottom-16 -right-8 w-72 h-72 rounded-full opacity-15"
            style={{ background: 'radial-gradient(circle, #10b981, transparent 70%)' }}
            animate={{ x: [0, -20, 15, 0], y: [0, 20, -8, 0] }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }} />
        </div>
        <div className="relative z-10 mx-auto" style={{ maxWidth: 900 }}>
          <div className="flex items-center gap-4">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center w-[48px] h-[48px] rounded-[14px]"
              style={{ background: 'linear-gradient(135deg,#6366f1,#10b981)', boxShadow: '0 8px 28px rgba(99,102,241,0.3)' }}>
              <ScanFace size={20} color="#fff" />
            </motion.div>
            <div>
              <motion.h1 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="text-[24px] font-[860] tracking-[-0.03em]"
                style={{ background: 'linear-gradient(135deg,#c7d2fe,#6ee7b7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Check In
              </motion.h1>
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
                className="text-[12px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Choose a check-in method below
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto px-5 py-6 sm:px-8" style={{ maxWidth: 900 }}>
        {/* Method Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {METHODS.map((m, i) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                {m.inline ? (
                  <button
                    onClick={() => setActive(isActive ? null : m.id)}
                    className="w-full text-left rounded-[18px] p-5 transition-all"
                    style={{
                      background: isActive ? `${m.color}10` : 'white',
                      border: `1.5px solid ${isActive ? m.color : '#e2e8f0'}`,
                      boxShadow: isActive ? `0 4px 20px ${m.color}20` : '0 1px 6px rgba(0,0,0,0.04)',
                    }}
                  >
                    <MethodCardInner m={m} isActive={isActive} />
                  </button>
                ) : (
                  <Link href={m.href!} className="block rounded-[18px] p-5 transition-all"
                    style={{ background: 'white', border: '1.5px solid #e2e8f0', boxShadow: '0 1px 6px rgba(0,0,0,0.04)', textDecoration: 'none' }}>
                    <MethodCardInner m={m} isActive={false} />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Inline face recognition panel */}
        <AnimatePresence>
          {active === 'face' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden rounded-[22px]"
              style={{ background: 'white', border: '1px solid #e2e8f0', boxShadow: '0 2px 20px rgba(0,0,0,0.07)' }}
            >
              <FaceCheckIn />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Admin shortcut row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="mt-6 flex flex-wrap gap-3">
          <Link href="/checkin/dashboard"
            className="flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[12px] font-[600] transition-all hover:bg-white"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0', color: 'rgb(71,85,105)', textDecoration: 'none' }}>
            <Monitor size={13} />
            Live Dashboard
            <ChevronRight size={12} style={{ color: 'rgb(148,163,184)' }} />
          </Link>
          <Link href="/settings/biometric"
            className="flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[12px] font-[600] transition-all hover:bg-white"
            style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid #e2e8f0', color: 'rgb(71,85,105)', textDecoration: 'none' }}>
            <Fingerprint size={13} />
            Enroll / Settings
            <ChevronRight size={12} style={{ color: 'rgb(148,163,184)' }} />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

function MethodCardInner({ m, isActive }: { m: typeof METHODS[0]; isActive: boolean }) {
  const Icon = m.icon;
  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[12px]" style={{ background: m.bg, color: m.color }}>
          <Icon size={18} />
        </div>
        {!m.inline && <ChevronRight size={15} style={{ color: 'rgb(148,163,184)', marginTop: 2 }} />}
        {m.inline && (
          <span className="text-[10px] font-[700] px-2 py-0.5 rounded-full" style={{
            background: isActive ? `${m.color}20` : '#f1f5f9',
            color: isActive ? m.color : 'rgb(148,163,184)',
          }}>
            {isActive ? 'ACTIVE' : 'TAP TO START'}
          </span>
        )}
      </div>
      <p className="text-[14px] font-[760] mb-1" style={{ color: 'rgb(15,23,42)' }}>{m.label}</p>
      <p className="text-[11.5px] mb-2" style={{ color: 'rgb(148,163,184)' }}>{m.desc}</p>
      <p className="text-[10.5px] font-[600]" style={{ color: m.color }}>{m.roles}</p>
    </>
  );
}
