// src/components/QuickActionsRail.tsx
//
// ██████████████████████████████████████████████████████
// 619 FITNESS — ULTRA PREMIUM QUICK COMMAND CENTER v4.0
// ██████████████████████████████████████████████████████
//
// Design: Apple VisionOS × Linear × Stripe AI × Framer
// Features:
//  — Animated mesh-gradient ambient background
//  — Glassmorphism floating cards with layered depth
//  — Magnetic hover + 3D tilt via pointer tracking
//  — Staggered entrance animation
//  — Live metric badges per card
//  — AI suggestion chips (Most used / High priority / Revenue opportunity)
//  — Compact / Expanded / AI Smart view modes
//  — Ripple click animation
//  — Shimmer sweep on hover
//  — Full keyboard navigation + ARIA
//  — Mobile snap carousel with touch support
//
// Tech: React + Next.js + TailwindCSS (inline styles for dynamic values)

'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  CalendarClock,
  MessageCirclePlus,
  ScanFace,
  UserRoundPlus,
  WalletCards,
  FileWarning,
  Zap,
  Brain,
  Wifi,
  LayoutGrid,
  Maximize2,
  Sparkles,
  ChevronRight,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════
   INJECT KEYFRAMES (once, client-side)
═══════════════════════════════════════════════════════ */
const CSS = `
@keyframes qa-float-a {
  0%,100% { transform: translate(0,0) scale(1); }
  33%      { transform: translate(18px,-14px) scale(1.06); }
  66%      { transform: translate(-12px,10px) scale(0.96); }
}
@keyframes qa-float-b {
  0%,100% { transform: translate(0,0) scale(1); }
  40%      { transform: translate(-20px,16px) scale(1.05); }
  75%      { transform: translate(14px,-10px) scale(0.97); }
}
@keyframes qa-float-c {
  0%,100% { transform: translate(0,0) scale(1); }
  50%      { transform: translate(10px,20px) scale(1.04); }
}
@keyframes qa-pulse-dot {
  0%,100% { opacity:1; transform: scale(1); }
  50%      { opacity:0.5; transform: scale(1.5); }
}
@keyframes qa-pulse-ring {
  0%   { transform: scale(1); opacity:0.6; }
  100% { transform: scale(2.4); opacity:0; }
}
@keyframes qa-shimmer {
  0%   { transform: translateX(-120%); }
  100% { transform: translateX(260%); }
}
@keyframes qa-ripple {
  0%   { transform: scale(0); opacity:0.6; }
  100% { transform: scale(4); opacity:0; }
}
@keyframes qa-stagger-in {
  0%   { opacity:0; transform: translateY(24px) scale(0.96); }
  100% { opacity:1; transform: translateY(0) scale(1); }
}
@keyframes qa-border-spin {
  0%   { background-position: 0% 50%; }
  100% { background-position: 300% 50%; }
}
@keyframes qa-stat-count {
  0%   { opacity:0; transform:translateY(6px); }
  100% { opacity:1; transform:translateY(0); }
}
@keyframes qa-ai-badge-in {
  0%   { opacity:0; transform:scale(0.8) translateY(4px); }
  100% { opacity:1; transform:scale(1) translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  [style*="qa-stagger-in"], [style*="qa-float"], [style*="qa-pulse"],
  [style*="qa-shimmer"], [style*="qa-ripple"], [style*="qa-border-spin"],
  [style*="qa-stat-count"], [style*="qa-ai-badge-in"] {
    animation: none !important;
    transition: none !important;
  }
}
`;

function injectCSS() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('qa-premium-css')) return;
  const s = document.createElement('style');
  s.id = 'qa-premium-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */

type ViewMode = 'compact' | 'expanded' | 'ai';

interface LiveMetric {
  value: string;
  label: string;
  trend?: 'up' | 'down' | 'neutral';
}

interface AiBadge {
  text: string;
  color: string;
}

interface ActionConfig {
  href: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
  shortcut: string;
  iconFrom: string;
  iconVia: string;
  iconTo: string;
  glowA: string;
  glowB: string;
  borderGlow: string;
  bloomColor: string;
  metric: LiveMetric;
  ai: AiBadge;
  activity: string;
}

/* ═══════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════ */

const ACTIONS: ActionConfig[] = [
  {
    href: '/sales/enquiry',
    label: 'Add Enquiry',
    desc: 'Capture leads & start conversion flow.',
    icon: <MessageCirclePlus className="h-6 w-6" />,
    shortcut: '⌘ E',
    iconFrom: '#f472b6',
    iconVia: '#c026d3',
    iconTo: '#f97316',
    glowA: 'rgba(244,114,182,0.35)',
    glowB: 'rgba(192,38,211,0.20)',
    borderGlow: 'rgba(244,114,182,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(244,114,182,0.22) 0%,transparent 60%)',
    metric: { value: '+12', label: 'leads today', trend: 'up' },
    ai: { text: 'Follow-up needed', color: 'bg-pink-500/15 text-pink-300 border-pink-500/25' },
    activity: 'Priya Kumar — 2 min ago',
  },
  {
    href: '/payments?new=1',
    label: 'Quick Billing',
    desc: 'Raise & record payments instantly.',
    icon: <WalletCards className="h-6 w-6" />,
    shortcut: '⌘ B',
    iconFrom: '#fbbf24',
    iconVia: '#f97316',
    iconTo: '#ca8a04',
    glowA: 'rgba(251,191,36,0.38)',
    glowB: 'rgba(249,115,22,0.22)',
    borderGlow: 'rgba(251,191,36,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(251,191,36,0.20) 0%,transparent 60%)',
    metric: { value: '₹48K', label: 'collected', trend: 'up' },
    ai: { text: 'Revenue opportunity', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25' },
    activity: 'Rahul Singh — 5 min ago',
  },
  {
    href: '/checkin',
    label: 'Face Check-In',
    desc: 'Smart attendance via face scan.',
    icon: <ScanFace className="h-6 w-6" />,
    shortcut: '⌘ F',
    iconFrom: '#22d3ee',
    iconVia: '#38bdf8',
    iconTo: '#6366f1',
    glowA: 'rgba(34,211,238,0.35)',
    glowB: 'rgba(99,102,241,0.22)',
    borderGlow: 'rgba(34,211,238,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(34,211,238,0.20) 0%,transparent 60%)',
    metric: { value: '128', label: 'check-ins today', trend: 'up' },
    ai: { text: 'Most used today', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25' },
    activity: 'Ankit Verma — just now',
  },
  {
    href: '/clients/new',
    label: 'New Member',
    desc: 'Onboard a fresh member instantly.',
    icon: <UserRoundPlus className="h-6 w-6" />,
    shortcut: '⌘ N',
    iconFrom: '#a855f7',
    iconVia: '#d946ef',
    iconTo: '#ec4899',
    glowA: 'rgba(168,85,247,0.35)',
    glowB: 'rgba(217,70,239,0.22)',
    borderGlow: 'rgba(168,85,247,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(168,85,247,0.22) 0%,transparent 60%)',
    metric: { value: '7', label: 'new joins', trend: 'up' },
    ai: { text: 'Recommended action', color: 'bg-violet-500/15 text-violet-300 border-violet-500/25' },
    activity: 'Neha Gupta — 12 min ago',
  },
  {
    href: '/finance/dues',
    label: 'Dues Report',
    desc: 'View overdue & recovery status.',
    icon: <FileWarning className="h-6 w-6" />,
    shortcut: '⌘ D',
    iconFrom: '#f87171',
    iconVia: '#fb923c',
    iconTo: '#fbbf24',
    glowA: 'rgba(248,113,113,0.35)',
    glowB: 'rgba(251,146,60,0.22)',
    borderGlow: 'rgba(248,113,113,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(248,113,113,0.22) 0%,transparent 60%)',
    metric: { value: '23', label: 'pending renewals', trend: 'down' },
    ai: { text: 'High priority', color: 'bg-red-500/15 text-red-300 border-red-500/25' },
    activity: 'Dues updated — 1 hr ago',
  },
  {
    href: '/members/expiring',
    label: 'Renewals',
    desc: 'Manage upcoming membership renewals.',
    icon: <CalendarClock className="h-6 w-6" />,
    shortcut: '⌘ R',
    iconFrom: '#818cf8',
    iconVia: '#a855f7',
    iconTo: '#6366f1',
    glowA: 'rgba(129,140,248,0.35)',
    glowB: 'rgba(99,102,241,0.22)',
    borderGlow: 'rgba(129,140,248,0.65)',
    bloomColor: 'radial-gradient(ellipse at 0% 0%,rgba(129,140,248,0.22) 0%,transparent 60%)',
    metric: { value: '18', label: 'expiring in 7d', trend: 'neutral' },
    ai: { text: 'Scheduled review', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' },
    activity: 'Batch renewed — 3 hr ago',
  },
];

/* ═══════════════════════════════════════════════════════
   AMBIENT BACKGROUND
═══════════════════════════════════════════════════════ */

function AmbientBg() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[32px]">
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(145deg,' +
            'rgba(15,23,42,0.97) 0%,' +
            'rgba(15,23,42,0.94) 30%,' +
            'rgba(20,14,40,0.96) 60%,' +
            'rgba(15,23,42,0.97) 100%)',
        }}
      />
      {/* floating orbs */}
      <div
        className="absolute -left-20 -top-20 h-64 w-64 rounded-full opacity-25"
        style={{
          background: 'radial-gradient(circle,rgba(244,114,182,1),transparent 70%)',
          filter: 'blur(48px)',
          animation: 'qa-float-a 14s ease-in-out infinite',
        }}
      />
      <div
        className="absolute -bottom-12 -right-12 h-72 w-72 rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle,rgba(34,211,238,1),transparent 70%)',
          filter: 'blur(52px)',
          animation: 'qa-float-b 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute bottom-10 left-1/3 h-48 w-48 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle,rgba(168,85,247,1),transparent 70%)',
          filter: 'blur(40px)',
          animation: 'qa-float-c 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute right-1/4 top-8 h-40 w-40 rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle,rgba(251,191,36,1),transparent 70%)',
          filter: 'blur(36px)',
          animation: 'qa-float-a 16s 4s ease-in-out infinite',
        }}
      />
      {/* top edge shine */}
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-[32px]"
        style={{
          background:
            'linear-gradient(90deg,transparent 5%,rgba(255,255,255,0.12) 40%,rgba(255,255,255,0.18) 50%,rgba(255,255,255,0.12) 60%,transparent 95%)',
        }}
      />
      {/* subtle grid overlay */}
      <div
        className="absolute inset-0 rounded-[inherit] opacity-[0.025]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),' +
            'linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   HEADER
═══════════════════════════════════════════════════════ */

function CommandHeader({
  mode,
  setMode,
}: {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}) {
  return (
    <div className="relative z-10 mb-5 flex flex-wrap items-start justify-between gap-3">
      {/* Left */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{
              background: 'rgba(251,191,36,0.12)',
              border: '1px solid rgba(251,191,36,0.25)',
              color: '#fbbf24',
            }}
          >
            <Zap className="h-2.5 w-2.5" />
            619 Fitness OS
          </span>
        </div>
        <h2
          className="text-xl font-extrabold tracking-[-0.04em] sm:text-2xl"
          style={{ color: '#f8fafc' }}
        >
          Quick Command Center
        </h2>
        <p
          className="mt-0.5 text-[12.5px] font-medium"
          style={{ color: 'rgba(148,163,184,0.85)' }}
        >
          Launch your most-used gym operations instantly.
        </p>
      </div>

      {/* Right */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Studio live */}
        <div
          className="relative inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{
            background: 'rgba(16,185,129,0.12)',
            border: '1px solid rgba(16,185,129,0.28)',
            color: '#34d399',
          }}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span
              className="absolute inline-flex h-full w-full rounded-full"
              style={{ background: '#10b981', animation: 'qa-pulse-ring 1.4s ease-out infinite' }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: '#10b981', animation: 'qa-pulse-dot 1.4s ease-in-out infinite' }}
            />
          </span>
          Studio Live
        </div>

        {/* Real-time sync */}
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold"
          style={{
            background: 'rgba(99,102,241,0.12)',
            border: '1px solid rgba(99,102,241,0.25)',
            color: 'rgba(165,180,252,0.9)',
          }}
        >
          <Wifi className="h-3 w-3" />
          Real-time sync
        </div>

        {/* AI suggestions */}
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
          style={{
            background: 'linear-gradient(135deg,rgba(168,85,247,0.20),rgba(217,70,239,0.15))',
            border: '1px solid rgba(168,85,247,0.35)',
            color: '#c084fc',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg,rgba(168,85,247,0.35),rgba(217,70,239,0.25))';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              'linear-gradient(135deg,rgba(168,85,247,0.20),rgba(217,70,239,0.15))';
          }}
        >
          <Brain className="h-3 w-3" />
          AI Suggestions
          <Sparkles className="h-3 w-3" />
        </button>

        {/* View mode switcher */}
        <div
          className="hidden sm:flex items-center gap-0.5 rounded-full p-1"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.09)',
          }}
        >
          {(
            [
              { id: 'compact' as ViewMode, icon: <LayoutGrid className="h-3 w-3" />, label: 'Compact' },
              { id: 'expanded' as ViewMode, icon: <Maximize2 className="h-3 w-3" />, label: 'Expanded' },
              { id: 'ai' as ViewMode, icon: <Sparkles className="h-3 w-3" />, label: 'AI Smart Mode' },
            ] as { id: ViewMode; icon: React.ReactNode; label: string }[]
          ).map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              title={m.label}
              aria-label={`Switch to ${m.label} view`}
              aria-pressed={mode === m.id}
              className="rounded-full p-1.5"
              style={{
                background: mode === m.id ? 'rgba(255,255,255,0.14)' : 'transparent',
                color: mode === m.id ? '#f8fafc' : 'rgba(148,163,184,0.7)',
                transition: 'all 0.18s ease',
              }}
            >
              {m.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   CARD
═══════════════════════════════════════════════════════ */

function ActionCard({
  href,
  label,
  desc,
  icon,
  shortcut,
  iconFrom,
  iconTo,
  glowA,
  glowB,
  borderGlow,
  bloomColor,
  metric,
  ai,
  activity,
  index,
  mode,
}: ActionConfig & { index: number; mode: ViewMode }) {
  const [hovered, setHovered] = React.useState(false);
  const [pressed, setPressed] = React.useState(false);
  const [ripples, setRipples] = React.useState<{ id: number; x: number; y: number }[]>([]);
  const cardRef = React.useRef<HTMLAnchorElement>(null);
  const rippleId = React.useRef(0);
  const [tilt, setTilt] = React.useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setTilt({
      x: ((e.clientY - cy) / (rect.height / 2)) * -8,
      y: ((e.clientX - cx) / (rect.width / 2)) * 8,
    });
  };

  const handleMouseLeave = () => {
    setHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const id = ++rippleId.current;
    setRipples((r) => [...r, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rr) => rr.id !== id)), 700);
  };

  const isCompact = mode === 'compact';
  const isExpanded = mode === 'expanded' || mode === 'ai';

  return (
    <Link
      ref={cardRef}
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onClick={handleClick}
      aria-label={`${label} — ${desc}`}
      className="group relative flex flex-col overflow-hidden rounded-[20px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      style={{
        scrollSnapAlign: 'start',
        minWidth: isCompact ? '180px' : isExpanded ? '240px' : '210px',
        flex: '1 0 0',
        padding: isCompact ? '14px 16px' : '18px 20px',
        background:
          'linear-gradient(145deg,rgba(255,255,255,0.07) 0%,rgba(255,255,255,0.035) 50%,rgba(255,255,255,0.055) 100%)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: `1px solid ${hovered ? borderGlow : 'rgba(255,255,255,0.10)'}`,
        boxShadow: hovered
          ? `0 0 0 1px ${borderGlow},0 28px 64px ${glowA},0 12px 28px ${glowB},inset 0 1px 0 rgba(255,255,255,0.12)`
          : 'inset 0 1px 0 rgba(255,255,255,0.08),0 8px 24px rgba(0,0,0,0.28)',
        transform: hovered
          ? `translateY(-10px) scale(${pressed ? '0.99' : '1.022'}) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`
          : 'translateY(0) scale(1) rotateX(0) rotateY(0)',
        transformStyle: 'preserve-3d',
        transition: pressed
          ? 'transform 0.12s ease'
          : 'transform 0.36s cubic-bezier(0.16,1,0.3,1),box-shadow 0.36s cubic-bezier(0.16,1,0.3,1),border-color 0.36s ease',
        animation: `qa-stagger-in 0.55s ${index * 0.07}s cubic-bezier(0.16,1,0.3,1) both`,
        cursor: 'pointer',
        // @ts-expect-error custom ring color
        '--tw-ring-color': borderGlow,
      }}
    >
      {/* Bloom tint */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500"
        style={{ background: bloomColor, opacity: hovered ? 1 : 0 }}
      />

      {/* Glass edge highlight */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{
          background:
            'linear-gradient(145deg,rgba(255,255,255,0.11) 0%,transparent 25%,transparent 75%,rgba(255,255,255,0.06) 100%)',
        }}
      />

      {/* Animated border spin on hover */}
      {hovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-[1px] rounded-[inherit]"
          style={{
            background: `linear-gradient(90deg,transparent,${borderGlow},transparent,${glowA},transparent)`,
            backgroundSize: '300% 100%',
            animation: 'qa-border-spin 2s linear infinite',
            opacity: 0.4,
          }}
        />
      )}

      {/* Shimmer sweep */}
      {hovered && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 rounded-[inherit]"
          style={{
            background: 'linear-gradient(90deg,transparent,rgba(255,255,255,0.09),transparent)',
            animation: 'qa-shimmer 0.65s ease forwards',
          }}
        />
      )}

      {/* Ripples */}
      {ripples.map((r) => (
        <span
          key={r.id}
          aria-hidden="true"
          className="pointer-events-none absolute rounded-full"
          style={{
            left: r.x,
            top: r.y,
            width: 8,
            height: 8,
            marginLeft: -4,
            marginTop: -4,
            background: borderGlow,
            animation: 'qa-ripple 0.65s ease-out forwards',
          }}
        />
      ))}

      {/* ── CONTENT ── */}
      <div className="relative z-10 flex flex-col" style={{ flex: 1 }}>

        {/* Icon + AI badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span
            className="inline-flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-[14px] text-white"
            style={{
              background: `linear-gradient(135deg,${iconFrom},${iconTo})`,
              boxShadow: hovered
                ? `0 0 0 1px rgba(255,255,255,0.12),0 12px 30px ${glowA},0 4px 12px ${glowB}`
                : `0 6px 18px ${glowA}`,
              transform: hovered ? 'scale(1.12) rotate(-4deg)' : 'scale(1) rotate(0deg)',
              transition: 'transform 0.36s cubic-bezier(0.16,1,0.3,1),box-shadow 0.36s ease',
            }}
          >
            {icon}
          </span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-bold border ${ai.color}`}
            style={{ animation: `qa-ai-badge-in 0.4s ${index * 0.07 + 0.3}s both` }}
          >
            <Sparkles className="h-2.5 w-2.5" />
            {ai.text}
          </span>
        </div>

        {/* Title + arrow */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[15px] font-extrabold tracking-[-0.03em]" style={{ color: '#f8fafc' }}>
            {label}
          </span>
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
            style={{
              background: hovered ? `linear-gradient(135deg,${iconFrom},${iconTo})` : 'rgba(255,255,255,0.08)',
              transform: hovered ? 'translate(2px,-2px) scale(1.1)' : 'translate(0,0) scale(1)',
              transition: 'all 0.28s cubic-bezier(0.16,1,0.3,1)',
              boxShadow: hovered ? `0 4px 12px ${glowA}` : 'none',
              color: hovered ? '#fff' : 'rgba(148,163,184,0.8)',
            }}
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>

        {/* Description */}
        {!isCompact && (
          <p className="mt-1 text-[12px] font-medium leading-[1.55]" style={{ color: 'rgba(148,163,184,0.75)' }}>
            {desc}
          </p>
        )}

        {/* Live metric */}
        <div
          className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.07)',
            animation: `qa-stat-count 0.4s ${index * 0.07 + 0.45}s both`,
          }}
        >
          <span
            className="text-[17px] font-extrabold tabular-nums tracking-[-0.03em]"
            style={{
              background: `linear-gradient(135deg,${iconFrom},${iconTo})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {metric.value}
          </span>
          <span className="text-[11px] font-semibold" style={{ color: 'rgba(148,163,184,0.75)' }}>
            {metric.label}
          </span>
          {metric.trend === 'up' && <span className="ml-auto text-[10px] font-bold text-emerald-400">↑</span>}
          {metric.trend === 'down' && <span className="ml-auto text-[10px] font-bold text-red-400">↓</span>}
        </div>

        {/* Expanded: recent activity */}
        {isExpanded && (
          <div
            className="mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: iconFrom }} />
            <span className="text-[11px] font-medium" style={{ color: 'rgba(148,163,184,0.65)' }}>
              {activity}
            </span>
          </div>
        )}

        {/* Footer: shortcut + launch */}
        <div className="mt-3 flex items-center justify-between">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold font-mono"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: 'rgba(148,163,184,0.70)',
            }}
          >
            {shortcut}
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10.5px] font-bold"
            style={{
              background: hovered ? `linear-gradient(135deg,${iconFrom},${iconTo})` : 'rgba(255,255,255,0.07)',
              border: `1px solid ${hovered ? 'transparent' : 'rgba(255,255,255,0.10)'}`,
              color: hovered ? '#fff' : 'rgba(148,163,184,0.75)',
              boxShadow: hovered ? `0 4px 14px ${glowA}` : 'none',
              transition: 'all 0.28s cubic-bezier(0.16,1,0.3,1)',
            }}
          >
            Launch
            <ChevronRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */

export default function QuickActionsRail() {
  React.useEffect(() => {
    injectCSS();
  }, []);

  const [mode, setMode] = React.useState<ViewMode>('expanded');

  return (
    <section aria-label="Quick Command Center" className="relative mt-6">
      {/* Outer ambient halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-8 -z-10 rounded-[48px] opacity-30"
        style={{
          background:
            'radial-gradient(ellipse at 20% 50%,rgba(244,114,182,0.25),transparent 50%),' +
            'radial-gradient(ellipse at 80% 30%,rgba(34,211,238,0.20),transparent 50%),' +
            'radial-gradient(ellipse at 50% 100%,rgba(168,85,247,0.20),transparent 50%)',
          filter: 'blur(24px)',
        }}
      />

      {/* Main glass panel */}
      <div
        className="relative overflow-hidden rounded-[32px] px-5 py-5 sm:px-7 sm:py-6"
        style={{
          boxShadow:
            '0 0 0 1px rgba(255,255,255,0.07),' +
            '0 32px 80px rgba(0,0,0,0.55),' +
            '0 12px 28px rgba(0,0,0,0.35),' +
            'inset 0 1px 0 rgba(255,255,255,0.09)',
        }}
      >
        <AmbientBg />
        <CommandHeader mode={mode} setMode={setMode} />

        {/* Scrollable rail */}
        <div
          role="list"
          className="relative z-10 flex gap-3 overflow-x-auto pb-1"
          style={{
            scrollSnapType: 'x mandatory',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            perspective: '1000px',
          }}
        >
          {ACTIONS.map((a, i) => (
            <div key={a.href} role="listitem" style={{ display: 'contents' }}>
              <ActionCard {...a} index={i} mode={mode} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] font-semibold" style={{ color: 'rgba(100,116,139,0.7)' }}>
            {mode === 'ai'
              ? '✦ AI Smart Mode — personalised suggestions active'
              : 'Swipe → on mobile · Click to launch'}
          </p>
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full bg-emerald-400"
              style={{ animation: 'qa-pulse-dot 2s ease-in-out infinite' }}
            />
            <span className="text-[11px] font-semibold text-emerald-400/70">
              6 actions ready
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
