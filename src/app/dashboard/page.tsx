'use client';

import * as React from 'react';
import { RefreshCw, Dumbbell } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';

import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import { DashboardAnalytics } from '@/components/premium/DashboardAnalytics';


export default function DashboardPage() {
  return (
    <Guard>
      <DashboardContent />
    </Guard>
  );
}

function DashboardContent() {
  const [spinning, setSpinning] = React.useState(false);

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    setTimeout(() => setSpinning(false), 800);
  };

  return (
    <AppShell>
      {/* Colorful header bar */}
      <div className="mb-6">
        <div className="relative overflow-hidden rounded-[14px] bg-gradient-to-r from-[#3B82F6] via-[#8B5CF6] to-[#06B6D4] shadow-[0_4px_20px_rgba(59,130,246,0.18)]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex items-center gap-3">
              <h1 className="text-[17px] sm:text-[19px] font-extrabold tracking-[-0.02em] text-white leading-none uppercase">
                Dashboard
              </h1>
              <Link
                href="/pt-os"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] px-4 py-1.5 text-[13px] sm:text-[14px] font-extrabold text-white/95 shadow-[0_4px_16px_rgba(245,158,11,0.30)] transition-all duration-200 hover:shadow-[0_6px_24px_rgba(245,158,11,0.45)] hover:-translate-y-0.5 leading-none"
              >
                <Dumbbell size={14} strokeWidth={2.2} />
                PT SYSTEM
              </Link>
            </div>
            <motion.button
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              aria-label="Refresh dashboard"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/15 text-white/70 backdrop-blur-sm outline-none transition-all duration-200 hover:bg-white/25 hover:text-white"
            >
              <RefreshCw size={13} strokeWidth={2.2} className={spinning ? 'animate-spin' : ''} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Premium Analytics Section */}
      <DashboardAnalytics />
    </AppShell>
  );
}


