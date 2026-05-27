'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, Dumbbell, TrendingUp, Zap, Activity, Sparkles } from 'lucide-react';

const PULSE = [
  {
    icon: Users,
    value: '342',
    label: 'Active members',
    sub: '87% retention rate',
    gradient: 'from-rose-500 via-pink-500 to-purple-600',
    shadow: 'rgba(244,63,94,0.3)',
    bg: 'bg-rose-50',
  },
  {
    icon: Dumbbell,
    value: '18',
    label: 'PT sessions today',
    sub: '3 more than yesterday',
    gradient: 'from-amber-400 via-orange-500 to-red-500',
    shadow: 'rgba(245,158,11,0.3)',
    bg: 'bg-amber-50',
  },
  {
    icon: TrendingUp,
    value: '₹2.4L',
    label: 'Revenue this month',
    sub: '112% of target',
    gradient: 'from-emerald-400 via-teal-500 to-cyan-600',
    shadow: 'rgba(16,185,129,0.3)',
    bg: 'bg-emerald-50',
  },
  {
    icon: Zap,
    value: '89%',
    label: 'Studio capacity',
    sub: 'Peak hours 6-9 AM',
    gradient: 'from-violet-500 via-purple-600 to-indigo-700',
    shadow: 'rgba(139,92,246,0.3)',
    bg: 'bg-violet-50',
  },
  {
    icon: Activity,
    value: '12',
    label: 'New leads',
    sub: '4 hot prospects',
    gradient: 'from-sky-400 via-blue-500 to-indigo-600',
    shadow: 'rgba(56,189,248,0.3)',
    bg: 'bg-sky-50',
  },
  {
    icon: Sparkles,
    value: '96',
    label: 'Member satisfaction',
    sub: 'Based on 48 reviews',
    gradient: 'from-lime-400 via-green-500 to-emerald-600',
    shadow: 'rgba(132,204,22,0.3)',
    bg: 'bg-lime-50',
  },
];

export default function QuickActionsRail() {
  return (
    <section aria-label="Studio pulse" className="mt-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Studio Pulse</h2>
          <p className="mt-0.5 text-[13px] text-[#86868b]">Live metrics at a glance</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(21,128,61,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#15803d]" />
          Live
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PULSE.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }}
          >
            <button
              type="button"
              className="group relative w-full overflow-hidden rounded-2xl p-4 text-left transition-all duration-300 hover:-translate-y-1 active:scale-[0.98]"
              style={{
                boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.boxShadow = `0 8px 28px ${item.shadow}, 0 20px 48px rgba(0,0,0,0.04)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)';
              }}
            >
              {/* Gradient badge */}
              <div className={`absolute top-0 right-0 h-16 w-16 rounded-bl-2xl bg-gradient-to-br ${item.gradient} opacity-90 transition-transform duration-300 group-hover:scale-110`} style={{ filter: 'blur(0.5px)' }} />

              {/* Icon */}
              <span className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-white/90 text-[16px] backdrop-blur-sm shadow-sm`} style={{ color: item.shadow.replace('0.3', '1') }}>
                <item.icon size={16} strokeWidth={1.5} />
              </span>

              {/* Content */}
              <div className="relative z-10 mt-4">
                <span className="block text-[22px] font-bold tracking-[-0.02em] text-[#1d1d1f] leading-none">{item.value}</span>
                <span className="block mt-1 text-[12px] font-medium text-[#1d1d1f]/80">{item.label}</span>
                <span className="block mt-0.5 text-[10px] text-[#86868b]">{item.sub}</span>
              </div>

              {/* Shimmer hover */}
              <span className="absolute inset-0 rounded-2xl bg-white/0 transition-all duration-300 group-hover:bg-white/10" />
            </button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
