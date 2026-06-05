'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Users, Dumbbell, TrendingUp, Zap, Activity, Sparkles, ArrowUpRight } from 'lucide-react';

interface PulseItem {
  icon: React.ElementType;
  value: string;
  label: string;
  sub: string;
  badge: string;
  gradient: string;
  glow: string;
  lightBg: string;
  accent: string;
}

const PULSE: PulseItem[] = [
  {
    icon: Users,
    value: '342',
    label: 'Active Members',
    sub: '87% retention rate',
    badge: '+12% vs last month',
    gradient: 'from-[#FF6B6B] via-[#EE5A24] to-[#C0392B]',
    glow: 'rgba(255,107,107,0.35)',
    lightBg: 'rgba(255,107,107,0.06)',
    accent: '#EE5A24',
  },
  {
    icon: Dumbbell,
    value: '18',
    label: 'PT Sessions Today',
    sub: '3 more than yesterday',
    badge: '+21%',
    gradient: 'from-[#F9A825] via-[#FF8F00] to-[#E65100]',
    glow: 'rgba(249,168,37,0.35)',
    lightBg: 'rgba(249,168,37,0.06)',
    accent: '#FF8F00',
  },
  {
    icon: TrendingUp,
    value: '₹2.4L',
    label: 'Revenue This Month',
    sub: '112% of target achieved',
    badge: 'On track',
    gradient: 'from-[#00B894] via-[#00A896] to-[#028090]',
    glow: 'rgba(0,184,148,0.35)',
    lightBg: 'rgba(0,184,148,0.06)',
    accent: '#00B894',
  },
  {
    icon: Zap,
    value: '89%',
    label: 'Studio Capacity',
    sub: 'Peak hours 6-9 AM',
    badge: 'High traffic',
    gradient: 'from-[#6C5CE7] via-[#5F27CD] to-[#341F97]',
    glow: 'rgba(108,92,231,0.35)',
    lightBg: 'rgba(108,92,231,0.06)',
    accent: '#6C5CE7',
  },
  {
    icon: Sparkles,
    value: '96',
    label: 'Satisfaction Score',
    sub: 'Based on 48 reviews',
    badge: 'Excellent',
    gradient: 'from-[#A8E063] via-[#56AB2F] to-[#3D7B1E]',
    glow: 'rgba(168,224,99,0.35)',
    lightBg: 'rgba(168,224,99,0.06)',
    accent: '#56AB2F',
  },
];

function PremiumPulseCard({ item, index }: { item: PulseItem; index: number }) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
      className="h-full"
    >
      <button
        type="button"
        className="group relative h-full w-full overflow-hidden rounded-2xl p-5 text-left transition-all duration-500 active:scale-[0.97]"
        style={{ background: item.lightBg }}
        onMouseEnter={e => {
          const el = e.currentTarget;
          el.style.boxShadow = `0 12px 40px ${item.glow}, 0 4px 12px rgba(0,0,0,0.05)`;
          el.style.transform = 'translateY(-3px)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        {/* Shine overlay */}
        <span
          className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.4) 48%, rgba(255,255,255,0.1) 50%, transparent 70%)`,
            backgroundSize: '300% 100%',
            animation: 'none',
          }}
        />

        {/* Decorative blurred circle */}
        <span
          className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-60 blur-2xl transition-all duration-500 group-hover:scale-150 group-hover:opacity-80"
          style={{ background: item.gradient }}
        />

        {/* Top row */}
        <div className="relative z-10 flex items-start justify-between">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-lg"
            style={{ background: item.gradient, boxShadow: `0 4px 16px ${item.glow}` }}
          >
            <Icon size={18} strokeWidth={1.5} />
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-white"
            style={{ background: item.gradient }}
          >
            {item.badge}
          </span>
        </div>

        {/* Value */}
        <div className="relative z-10 mt-5">
          <span className="block text-[26px] font-extrabold tracking-[-0.03em] text-[#1d1d1f] leading-none">
            {item.value}
          </span>
        </div>

        {/* Label + sub */}
        <div className="relative z-10 mt-2.5">
          <span className="block text-[13px] font-semibold text-[#1d1d1f]">{item.label}</span>
          <span className="block mt-0.5 text-[11px] text-[#86868b]">{item.sub}</span>
        </div>

        {/* CTA arrow */}
        <div className="relative z-10 mt-4 flex items-center gap-1 text-[11px] font-semibold transition-all duration-300 group-hover:gap-1.5" style={{ color: item.accent }}>
          <span>View details</span>
          <ArrowUpRight size={12} strokeWidth={2} />
        </div>

        {/* Decorative bottom gradient bar */}
        <span
          className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl transition-all duration-500 group-hover:h-[4px]"
          style={{ background: item.gradient }}
        />
      </button>
    </motion.div>
  );
}

export default function QuickActionsRail() {
  return (
    <section aria-label="Studio pulse" className="mt-6">
      <style>{`
        @keyframes pulse-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .shimmer-on-hover:hover span:first-of-type {
          animation: pulse-shimmer 1.8s ease-in-out infinite;
        }
      `}</style>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
            <Sparkles size={11} className="text-[#6C5CE7]" />
            Live Dashboard
          </div>
          <h2 className="mt-3 text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f]">
            Studio Pulse
          </h2>
          <p className="mt-0.5 text-[13px] text-[#86868b]">Your gym in vibrant color — every metric that matters</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(0,184,148,0.08)] px-3 py-1.5 text-[11px] font-semibold text-[#00B894] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00B894] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00B894]" />
          </span>
          Synced
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PULSE.map((item, i) => (
          <PremiumPulseCard key={item.label} item={item} index={i} />
        ))}
      </div>
    </section>
  );
}
