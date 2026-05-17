// src/components/QuickActionsRail.tsx
//
// Premium horizontal Quick Actions rail for the 619 Fitness dashboard.
// Six colourful glassmorphism mini-cards in a single scrollable row.
// Desktop: all cards visible in one line.
// Mobile:  smooth horizontal-scroll carousel (snap).

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  MessageCirclePlus,
  RefreshCw,
  ScanFace,
  UserRoundPlus,
  WalletCards,
  FileWarning,
} from 'lucide-react';

/* ────────────────────────── types ────────────────────────── */

interface ActionConfig {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  /* Tailwind classes for the icon tile gradient + glow */
  iconGradient: string;
  iconShadow: string;
  /* Card-level hover glow colour (inline style, for dynamic oklch) */
  hoverGlow: string;
  hoverBorder: string;
  /* Radial tint bloom inside the card on hover */
  tintColor: string;
}

const ACTIONS: ActionConfig[] = [
  {
    href: '/sales/enquiry',
    label: 'Add enquiry',
    desc: 'Capture leads & start conversion.',
    icon: <MessageCirclePlus className="h-6 w-6" />,
    iconGradient: 'from-pink-400 via-fuchsia-400 to-rose-400',
    iconShadow: 'shadow-[0_8px_22px_rgba(236,72,153,0.35)]',
    hoverGlow: '0 22px 60px rgba(236,72,153,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(244,114,182,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(251,207,232,0.28),transparent 55%)',
  },
  {
    href: '/payments?new=1',
    label: 'Quick billing',
    desc: 'Raise & record payments fast.',
    icon: <WalletCards className="h-6 w-6" />,
    iconGradient: 'from-amber-400 via-orange-400 to-yellow-400',
    iconShadow: 'shadow-[0_8px_22px_rgba(245,158,11,0.35)]',
    hoverGlow: '0 22px 60px rgba(251,146,60,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(251,191,36,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(254,243,199,0.28),transparent 55%)',
  },
  {
    href: '/checkin',
    label: 'Face check-in',
    desc: 'Smart attendance via face scan.',
    icon: <ScanFace className="h-6 w-6" />,
    iconGradient: 'from-cyan-400 via-sky-400 to-blue-400',
    iconShadow: 'shadow-[0_8px_22px_rgba(6,182,212,0.35)]',
    hoverGlow: '0 22px 60px rgba(34,211,238,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(34,211,238,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(207,250,254,0.28),transparent 55%)',
  },
  {
    href: '/clients/new',
    label: 'New member',
    desc: 'Onboard a fresh member in one tap.',
    icon: <UserRoundPlus className="h-6 w-6" />,
    iconGradient: 'from-violet-500 via-purple-500 to-fuchsia-500',
    iconShadow: 'shadow-[0_8px_22px_rgba(139,92,246,0.35)]',
    hoverGlow: '0 22px 60px rgba(139,92,246,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(167,139,250,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(237,233,254,0.28),transparent 55%)',
  },
  {
    href: '/finance/dues',
    label: 'Dues report',
    desc: 'View overdue & recovery status.',
    icon: <FileWarning className="h-6 w-6" />,
    iconGradient: 'from-red-400 via-rose-400 to-orange-400',
    iconShadow: 'shadow-[0_8px_22px_rgba(239,68,68,0.35)]',
    hoverGlow: '0 22px 60px rgba(248,113,113,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(252,165,165,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(254,226,226,0.28),transparent 55%)',
  },
  {
    href: '/members/expiring',
    label: 'Renewals',
    desc: 'Manage upcoming membership renewals.',
    icon: <CalendarClock className="h-6 w-6" />,
    iconGradient: 'from-indigo-500 via-violet-500 to-purple-400',
    iconShadow: 'shadow-[0_8px_22px_rgba(99,102,241,0.35)]',
    hoverGlow: '0 22px 60px rgba(99,102,241,0.22),0 8px 20px rgba(15,23,42,0.06)',
    hoverBorder: 'rgba(129,140,248,0.40)',
    tintColor: 'radial-gradient(circle at top left,rgba(224,231,255,0.28),transparent 55%)',
  },
];

/* ────────────────────────── component ────────────────────── */

export default function QuickActionsRail() {
  return (
    <section
      aria-label="Quick actions"
      className="relative mt-6"
    >
      {/* ambient background orbs — decorative */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[32px] overflow-hidden"
        style={{
          background:
            'radial-gradient(circle at 12% 40%,rgba(236,72,153,0.10),transparent 26%),' +
            'radial-gradient(circle at 82% 20%,rgba(6,182,212,0.09),transparent 22%),' +
            'radial-gradient(circle at 55% 90%,rgba(139,92,246,0.09),transparent 24%)',
        }}
      />

      {/* glass shell */}
      <div
        className="rounded-[32px] border border-white/70 px-5 py-5"
        style={{
          background: 'rgba(255,255,255,0.58)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow:
            '0 20px 56px rgba(15,23,42,0.08),0 6px 16px rgba(15,23,42,0.04),' +
            'inset 0 1px 0 rgba(255,255,255,0.82)',
        }}
      >
        {/* header */}
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
              Fitness operating system
            </p>
            <h2 className="mt-0.5 text-lg font-extrabold tracking-[-0.035em] text-slate-900">
              Quick actions
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-bold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Studio live
            </span>
          </div>
        </div>

        {/* scrollable rail */}
        <div
          className="flex gap-3 overflow-x-auto pb-1"
          style={{
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {ACTIONS.map((a) => (
            <ActionCard key={a.href} {...a} />
          ))}
        </div>

        {/* footer */}
        <p className="mt-3 text-right text-[11px] font-semibold text-slate-400">
          Scroll → on mobile
        </p>
      </div>
    </section>
  );
}

/* ────────────────────────── card ────────────────────────── */

function ActionCard({
  href,
  label,
  desc,
  icon,
  iconGradient,
  iconShadow,
  hoverGlow,
  hoverBorder,
  tintColor,
}: ActionConfig) {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={label}
      className="group relative flex min-w-[200px] flex-1 flex-col overflow-hidden rounded-[22px] border p-4 text-left"
      style={{
        scrollSnapAlign: 'start',
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        border: `1px solid ${hovered ? hoverBorder : 'rgba(255,255,255,0.68)'}`,
        boxShadow: hovered
          ? hoverGlow
          : '0 10px 30px rgba(15,23,42,0.09),0 3px 8px rgba(15,23,42,0.04)',
        transform: hovered ? 'translateY(-7px) scale(1.018)' : 'translateY(0) scale(1)',
        transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1),box-shadow 0.28s cubic-bezier(0.16,1,0.3,1),border-color 0.28s ease',
      }}
    >
      {/* glass highlight shine */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(138deg,rgba(255,255,255,0.38) 0%,transparent 28%,transparent 72%,rgba(255,255,255,0.22) 100%)',
        }}
      />

      {/* coloured tint bloom on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-300"
        style={{
          background: tintColor,
          opacity: hovered ? 1 : 0,
        }}
      />

      {/* shimmer sweep */}
      {hovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 rounded-[inherit]"
          style={{
            background:
              'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)',
            animation: 'qa-shimmer 0.55s ease forwards',
          }}
        />
      )}

      {/* icon tile */}
      <span
        className={`relative z-10 mb-3 inline-flex h-[52px] w-[52px] items-center justify-center rounded-[16px] bg-gradient-to-br text-white ${iconGradient} ${iconShadow}`}
        style={{
          transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
          transform: hovered ? 'scale(1.10) rotate(-2deg)' : 'scale(1) rotate(0deg)',
        }}
      >
        {icon}
      </span>

      {/* label + arrow */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <span className="text-[15px] font-bold tracking-[-0.025em] text-slate-900">
          {label}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900/[0.06] text-slate-500"
          style={{
            transition: 'transform 0.28s cubic-bezier(0.16,1,0.3,1)',
            transform: hovered ? 'translate(3px,-3px)' : 'translate(0,0)',
            color: hovered ? '#0f172a' : undefined,
          }}
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>

      {/* description */}
      <p className="relative z-10 mt-1.5 text-[12.5px] font-medium leading-5 text-slate-500">
        {desc}
      </p>
    </Link>
  );
}

/* shimmer keyframe — injected once */
if (typeof document !== 'undefined') {
  if (!document.getElementById('qa-shimmer-style')) {
    const s = document.createElement('style');
    s.id = 'qa-shimmer-style';
    s.textContent =
      '@keyframes qa-shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(220%)}}';
    document.head.appendChild(s);
  }
}
