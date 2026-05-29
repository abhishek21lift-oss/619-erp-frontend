'use client';

import * as React from 'react';
import { RefreshCw, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

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
      {/* Minimal header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F1F5F9] border border-[rgba(11,11,15,0.04)] text-[#0B0B0F]">
              <LayoutDashboard size={15} strokeWidth={1.8} />
            </div>
            <div>
              <h1 className="text-[20px] sm:text-[22px] font-bold leading-tight tracking-[-0.025em] text-[#0B0B0F]">
                Dashboard ✨
              </h1>
              <p className="text-[12px] text-[#4A4E57] mt-0.5">
                Your premium command center
              </p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleRefresh}
            aria-label="Refresh dashboard"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F1F5F9] border border-[rgba(11,11,15,0.04)] text-[#4A4E57] outline-none transition-all duration-200 hover:bg-[#E2E8F0]"
          >
            <RefreshCw size={14} strokeWidth={2.2} className={spinning ? 'animate-spin text-[#3B82F6]' : ''} />
          </motion.button>
        </div>
      </div>

      {/* Premium Analytics Section */}
      <DashboardAnalytics />
    </AppShell>
  );
}


