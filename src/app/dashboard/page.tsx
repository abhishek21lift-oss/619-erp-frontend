'use client';

import * as React from 'react';
import { RefreshCw, Sparkles, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ErrorBoundary from '@/components/ErrorBoundary';
import { DashboardAnalytics } from '@/components/premium/DashboardAnalytics';

export default function DashboardPage() {
  return (
    <Guard>
      <ErrorBoundary>
        <DashboardContent />
      </ErrorBoundary>
    </Guard>
  );
}

function DashboardContent() {
  const [spinning, setSpinning] = React.useState(false);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    setRefreshKey((k) => k + 1);
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <AppShell>
      <div className="mb-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[16px] bg-gradient-to-r from-[#8B5CF6] via-[#3B82F6] to-[#06B6D4] shadow-[0_8px_32px_rgba(139,92,246,0.20)]"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20" />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-[rgba(255,255,255,0.03)] blur-2xl -translate-x-1/2 translate-y-1/2" />
          <div className="relative flex items-center justify-between gap-3 px-5 py-4 sm:py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <LayoutDashboard size={16} strokeWidth={2} className="text-white" />
              </div>
              <div>
                <h1 className="text-[17px] sm:text-[20px] font-extrabold tracking-[-0.02em] text-white leading-none">
                  Dashboard
                </h1>
                <p className="text-[11px] text-white/60 mt-0.5 hidden sm:block">Your fitness studio at a glance</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/pt-os"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[rgba(139,92,246,0.3)] to-[rgba(99,102,241,0.3)] backdrop-blur-sm px-4 py-1.5 text-[13px] sm:text-[14px] font-extrabold text-white shadow-[0_4px_16px_rgba(139,92,246,0.20)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(139,92,246,0.35)] hover:-translate-y-0.5 leading-none border border-white/10"
              >
                <Sparkles size={14} strokeWidth={2.2} />
                PT OS
              </Link>
              <motion.button
                whileHover={{ scale: 1.06 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleRefresh}
                aria-label="Refresh dashboard"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white/70 backdrop-blur-sm outline-none transition-all duration-200 hover:bg-white/25 hover:text-white border border-white/10"
              >
                <RefreshCw size={13} strokeWidth={2.2} className={spinning ? 'animate-spin' : ''} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>

      <DashboardAnalytics refreshKey={refreshKey} />
    </AppShell>
  );
}
