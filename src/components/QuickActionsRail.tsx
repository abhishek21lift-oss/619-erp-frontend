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
  ArrowRight,
} from 'lucide-react';
import { motion } from 'framer-motion';

type Priority = 'urgent' | 'good' | 'scheduled';

interface OperationalCard {
  href: string;
  priority: Priority;
  icon: React.ReactNode;
  category: string;
  insight: string;
  context: string;
  cta: string;
  color: string;
  iconBg: string;
}

const CARDS: OperationalCard[] = [
  {
    href: '/finance/dues',
    priority: 'urgent',
    icon: <AlertTriangle strokeWidth={1.7} size={15} />,
    category: 'Attention needed',
    insight: '23 memberships expiring this week',
    context: '5 of them are high-value long-term members.',
    cta: 'Contact Members',
    color: '#dc2626',
    iconBg: 'rgba(220,38,38,0.08)',
  },
  {
    href: '/sales/enquiry',
    priority: 'urgent',
    icon: <MessageCirclePlus strokeWidth={1.7} size={15} />,
    category: 'Follow-up pending',
    insight: '12 new leads need a response',
    context: '3 high-intent prospects have been waiting 24 h+.',
    cta: 'Review Leads',
    color: '#dc2626',
    iconBg: 'rgba(220,38,38,0.08)',
  },
  {
    href: '/finance/collection',
    priority: 'good',
    icon: <WalletCards strokeWidth={1.7} size={15} />,
    category: 'Revenue collected',
    insight: '₹48,000 received this month',
    context: 'On track — 92% of monthly target met.',
    cta: 'View Revenue',
    color: '#15803d',
    iconBg: 'rgba(21,128,61,0.08)',
  },
  {
    href: '/checkin',
    priority: 'good',
    icon: <ScanFace strokeWidth={1.7} size={15} />,
    category: 'Attendance today',
    insight: '128 members checked in so far',
    context: '18% higher than same day last week.',
    cta: 'View Attendance',
    color: '#2563eb',
    iconBg: 'rgba(37,99,235,0.08)',
  },
  {
    href: '/clients/new',
    priority: 'scheduled',
    icon: <UserRoundPlus strokeWidth={1.7} size={15} />,
    category: 'New memberships',
    insight: '7 members joined this week',
    context: 'Onboarding call pending for 2 of them.',
    cta: 'Onboard Members',
    color: '#7c3aed',
    iconBg: 'rgba(124,58,237,0.08)',
  },
  {
    href: '/finance/dues',
    priority: 'scheduled',
    icon: <CalendarClock strokeWidth={1.7} size={15} />,
    category: 'Renewals due',
    insight: '18 plans expire in the next 7 days',
    context: 'Sending early reminders improves renewal rate.',
    cta: 'Schedule Reminders',
    color: '#d97706',
    iconBg: 'rgba(217,119,6,0.08)',
  },
];

const PRIORITY_META: Record<Priority, { label: string; dotColor: string }> = {
  urgent:    { label: 'Needs attention', dotColor: '#dc2626' },
  good:      { label: 'Performing well', dotColor: '#15803d' },
  scheduled: { label: 'Scheduled',       dotColor: '#7c3aed' },
};

function OpsCard({ card, index }: { card: OperationalCard; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: index * 0.055, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        href={card.href}
        aria-label={card.insight}
        className="group block rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_6px_rgba(0,0,0,0.03)] outline-none transition-all duration-200 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06),0_8px_24px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-[#007AFF]"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: card.iconBg, color: card.color }}
            >
              {card.icon}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#86868b]">
              {card.category}
            </span>
          </div>
          <span className="h-[7px] w-[7px] rounded-full shrink-0" style={{ background: card.color, opacity: 0.6 }} />
        </div>

        <p className="mt-3 text-[15px] font-semibold leading-snug tracking-[-0.01em] text-[#1d1d1f]">
          {card.insight}
        </p>
        <p className="mt-1 text-[13px] leading-relaxed text-[#86868b]">
          {card.context}
        </p>

        <div className="mt-3 flex items-center gap-1 text-[13px] font-medium" style={{ color: card.color }}>
          {card.cta}
          <ArrowRight size={12} strokeWidth={2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </div>
      </Link>
    </motion.div>
  );
}

function GroupLabel({ label, dotColor }: { label: string; dotColor: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} />
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
        {label}
      </span>
    </div>
  );
}

export default function QuickActionsRail() {
  const urgent    = CARDS.filter(c => c.priority === 'urgent');
  const good      = CARDS.filter(c => c.priority === 'good');
  const scheduled = CARDS.filter(c => c.priority === 'scheduled');

  let idx = 0;

  return (
    <section aria-label="Operational overview" className="mt-6">
      <div className="rounded-3xl bg-white px-5 py-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] sm:px-6 sm:py-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-[17px] font-semibold tracking-tight text-[#1d1d1f]">
              Quick Actions
            </h2>
            <p className="mt-0.5 text-[13px] text-[#86868b]">
              Your gym at a glance
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(21,128,61,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#15803d]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#15803d]" />
            Live
          </span>
        </div>

        <GroupLabel label="Needs attention" dotColor="#dc2626" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {urgent.map((card) => (
            <OpsCard key={card.href + card.category} card={card} index={idx++} />
          ))}
        </div>

        <div className="my-5 h-px bg-[rgba(0,0,0,0.04)]" />

        <GroupLabel label="Performing well" dotColor="#15803d" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {good.map((card) => (
            <OpsCard key={card.href + card.category} card={card} index={idx++} />
          ))}
        </div>

        <div className="my-5 h-px bg-[rgba(0,0,0,0.04)]" />

        <GroupLabel label="Scheduled" dotColor="#7c3aed" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {scheduled.map((card) => (
            <OpsCard key={card.href + card.category} card={card} index={idx++} />
          ))}
        </div>
      </div>
    </section>
  );
}
