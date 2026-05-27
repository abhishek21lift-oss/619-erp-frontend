'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MessageCirclePlus,
  ScanFace,
  UserRoundPlus,
  WalletCards,
  AlertTriangle,
  CalendarClock,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Priority = 'urgent' | 'good' | 'scheduled';

interface DonutCard {
  href: string;
  priority: Priority;
  icon: React.ReactNode;
  category: string;
  value: string;
  label: string;
  cta: string;
  color: string;
  ringColor: string;
  trackColor: string;
  progress: number;
}

const CARDS: DonutCard[] = [
  {
    href: '/finance/dues',
    priority: 'urgent',
    icon: <AlertTriangle strokeWidth={1.7} size={16} />,
    category: 'Attention needed',
    value: '23',
    label: 'Expiring this week',
    cta: 'Contact Members',
    color: '#dc2626',
    ringColor: '#dc2626',
    trackColor: 'rgba(220,38,38,0.08)',
    progress: 72,
  },
  {
    href: '/sales/enquiry',
    priority: 'urgent',
    icon: <MessageCirclePlus strokeWidth={1.7} size={16} />,
    category: 'Follow-up pending',
    value: '12',
    label: 'Leads waiting',
    cta: 'Review Leads',
    color: '#dc2626',
    ringColor: '#dc2626',
    trackColor: 'rgba(220,38,38,0.08)',
    progress: 55,
  },
  {
    href: '/finance/collection',
    priority: 'good',
    icon: <WalletCards strokeWidth={1.7} size={16} />,
    category: 'Revenue collected',
    value: '₹48K',
    label: '92% of target',
    cta: 'View Revenue',
    color: '#15803d',
    ringColor: '#15803d',
    trackColor: 'rgba(21,128,61,0.08)',
    progress: 92,
  },
  {
    href: '/checkin',
    priority: 'good',
    icon: <ScanFace strokeWidth={1.7} size={16} />,
    category: 'Attendance today',
    value: '128',
    label: '+18% vs last week',
    cta: 'View Attendance',
    color: '#2563eb',
    ringColor: '#2563eb',
    trackColor: 'rgba(37,99,235,0.08)',
    progress: 68,
  },
  {
    href: '/clients/new',
    priority: 'scheduled',
    icon: <UserRoundPlus strokeWidth={1.7} size={16} />,
    category: 'New memberships',
    value: '7',
    label: 'Joined this week',
    cta: 'Onboard Members',
    color: '#7c3aed',
    ringColor: '#7c3aed',
    trackColor: 'rgba(124,58,237,0.08)',
    progress: 40,
  },
  {
    href: '/finance/dues',
    priority: 'scheduled',
    icon: <CalendarClock strokeWidth={1.7} size={16} />,
    category: 'Renewals due',
    value: '18',
    label: 'Expire in 7 days',
    cta: 'Schedule Reminders',
    color: '#d97706',
    ringColor: '#d97706',
    trackColor: 'rgba(217,119,6,0.08)',
    progress: 60,
  },
];

function DonutRing({ progress, color, trackColor }: { progress: number; color: string; trackColor: string }) {
  const r = 26;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  return (
    <svg width={64} height={64} viewBox="0 0 64 64" className="shrink-0">
      <circle cx={32} cy={32} r={r} fill="none" stroke={trackColor} strokeWidth={5} />
      <circle
        cx={32} cy={32} r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  );
}

function DonutCard({ card, index }: { card: DonutCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={card.href}
        aria-label={card.label}
        className="group relative block rounded-2xl bg-white p-4 outline-none transition-all duration-300 hover:-translate-y-1 focus-visible:ring-2 focus-visible:ring-[#007AFF]"
        style={{
          boxShadow: '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)',
          transition: 'box-shadow 0.3s, transform 0.3s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 8px 28px rgba(0,0,0,0.06), 0 20px 48px rgba(0,0,0,0.04)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03), 0 4px 12px rgba(0,0,0,0.02)';
        }}
      >
        <div className="flex items-start gap-4">
          <DonutRing progress={card.progress} color={card.ringColor} trackColor={card.trackColor} />
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: card.trackColor, color: card.color }}
              >
                {card.icon}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                {card.category}
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-[20px] font-bold tracking-[-0.02em] text-[#1d1d1f] leading-none">{card.value}</span>
              <span className="text-[11px] text-[#86868b]">{card.label}</span>
            </div>
            <div className="mt-2.5 flex items-center gap-1 text-[12px] font-medium" style={{ color: card.color }}>
              {card.cta}
              <svg width={10} height={10} viewBox="0 0 10 10" fill="none" className="transition-transform duration-200 group-hover:translate-x-0.5">
                <path d="M1 5h7M5 2l3 3-3 3" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export default function QuickActionsRail() {
  const urgent    = CARDS.filter(c => c.priority === 'urgent');
  const good      = CARDS.filter(c => c.priority === 'good');
  const scheduled = CARDS.filter(c => c.priority === 'scheduled');

  let idx = 0;

  return (
    <section aria-label="Operational overview" className="mt-6">
      <div className="rounded-3xl bg-white px-5 py-6 sm:px-6 sm:py-7" style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.03), 0 4px 16px rgba(0,0,0,0.02)' }}>
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">Quick Actions</h2>
            <p className="mt-0.5 text-[13px] text-[#86868b]">Your gym at a glance</p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(21,128,61,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15803d]" />
            Live
          </span>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#dc2626]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">Needs attention</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {urgent.map(card => <DonutCard key={card.href + card.category} card={card} index={idx++} />)}
        </div>

        <div className="my-5 h-px bg-[rgba(0,0,0,0.04)]" />

        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#15803d]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">Performing well</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {good.map(card => <DonutCard key={card.href + card.category} card={card} index={idx++} />)}
        </div>

        <div className="my-5 h-px bg-[rgba(0,0,0,0.04)]" />

        <div className="mb-4 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">Scheduled</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {scheduled.map(card => <DonutCard key={card.href + card.category} card={card} index={idx++} />)}
        </div>
      </div>
    </section>
  );
}
