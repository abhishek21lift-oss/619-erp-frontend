'use client';

import Link from 'next/link';
import { m, type Variants } from 'framer-motion';
import {
  Dumbbell, Apple, TrendingUp, BarChart3, Sparkles, ArrowRight,
  Zap, Brain, Shield, CheckCircle2, ChevronRight, Users, Target,
  Clock, LayoutGrid, Star, Cpu,
} from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';

/* ─────────────────────────────────────────────────────────────── */
/*  Data                                                           */
/* ─────────────────────────────────────────────────────────────── */

const TOOLS = [
  {
    href: '/ai/workout-generator',
    icon: Dumbbell,
    label: 'Workout Generator',
    eyebrow: 'Training Plans',
    description:
      'Create fully personalised, periodised training programmes in seconds. Every variable — volume, intensity, rest, tempo, progression — optimised for the individual.',
    capabilities: [
      'Goals: fat loss, muscle gain, strength, endurance',
      'Equipment-aware: gym, home, minimal, bodyweight',
      'Adjusts for injuries, experience, and schedule',
    ],
    color: '#60A5FA',
    glow: 'rgba(96,165,250,0.22)',
    gradientFrom: 'rgba(37,99,235,0.18)',
    gradientTo: 'rgba(37,99,235,0.04)',
    border: 'rgba(96,165,250,0.20)',
    badge: null,
  },
  {
    href: '/ai/diet-generator',
    icon: Apple,
    label: 'Diet Generator',
    eyebrow: 'Nutrition Plans',
    description:
      'Generate science-backed meal plans matched to each client\'s caloric targets, macro ratios, food preferences, allergies, and budget — with a full grocery list.',
    capabilities: [
      'Vegetarian, vegan, keto, paleo, and more',
      'Adjusts calories for cutting, bulking, or maintenance',
      'Grocery list included for effortless meal prep',
    ],
    color: '#4ADE80',
    glow: 'rgba(74,222,128,0.22)',
    gradientFrom: 'rgba(22,163,74,0.18)',
    gradientTo: 'rgba(22,163,74,0.04)',
    border: 'rgba(74,222,128,0.20)',
    badge: null,
  },
  {
    href: '/ai/progress-analysis',
    icon: TrendingUp,
    label: 'Progress Analyzer',
    eyebrow: 'Client Insights',
    description:
      'Deep AI analysis of any client\'s entire fitness journey. Surfaces trends, flags plateaus, highlights wins, and generates targeted coaching recommendations.',
    capabilities: [
      'Timeline analysis of measurements and sessions',
      'Detects stagnation before clients do',
      'Personalised next-step action plan',
    ],
    color: '#FBBF24',
    glow: 'rgba(251,191,36,0.22)',
    gradientFrom: 'rgba(217,119,6,0.18)',
    gradientTo: 'rgba(217,119,6,0.04)',
    border: 'rgba(251,191,36,0.20)',
    badge: null,
  },
  {
    href: '/ai/business-insights',
    icon: BarChart3,
    label: 'Business Insights',
    eyebrow: 'Studio Intelligence',
    description:
      'Studio-level AI analysis: revenue trends, at-risk clients, peak hours, trainer performance, and actionable growth strategies — all from your own data.',
    capabilities: [
      'Revenue forecast and trend detection',
      'Churn risk scoring for every active client',
      'Prioritised action plan with ROI rationale',
    ],
    color: '#C084FC',
    glow: 'rgba(192,132,252,0.22)',
    gradientFrom: 'rgba(124,58,237,0.18)',
    gradientTo: 'rgba(124,58,237,0.04)',
    border: 'rgba(192,132,252,0.20)',
    badge: 'Admin',
  },
];

const STEPS = [
  {
    n: '01',
    icon: Target,
    title: 'Pick your tool',
    body: 'Choose the AI module that fits the job — training plan, nutrition, client progress, or studio analytics.',
  },
  {
    n: '02',
    icon: Cpu,
    title: 'Enter context',
    body: 'Fill in a short form — goals, metrics, timeframe. The AI reads your gym\'s data automatically where available.',
  },
  {
    n: '03',
    icon: Zap,
    title: 'Get results instantly',
    body: 'A complete, professional-grade output — ready to share with the client or act on immediately. Usually under 10 seconds.',
  },
];

const STATS = [
  { value: 'GPT-4o', label: 'Model', icon: Brain },
  { value: '< 10s', label: 'Avg. response', icon: Clock },
  { value: '4 tools', label: 'AI modules', icon: LayoutGrid },
  { value: '619', label: 'Studio-tuned', icon: Star },
];

const USE_CASES = [
  'New-client onboarding in minutes',
  'Re-engage a plateau client',
  'Build a 12-week programme overnight',
  "Spot churn risk before it's too late",
  'Justify a plan change with data',
  'Dietary advice for complex preferences',
  'Weekly progress report for any client',
  'Studio revenue deep-dive',
];

/* ─────────────────────────────────────────────────────────────── */
/*  Animations                                                     */
/* ─────────────────────────────────────────────────────────────── */

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};

/* ─────────────────────────────────────────────────────────────── */
/*  Page                                                           */
/* ─────────────────────────────────────────────────────────────── */

export default function AiCoachPage() {
  return (
    <Guard>
      <AppShell title="AI Coach">
        <div
          className="min-h-screen"
          style={{
            background: 'radial-gradient(ellipse 80% 40% at 50% -10%, rgba(212,175,55,0.10) 0%, transparent 70%), #050816',
          }}
        >

          {/* ── Hero ─────────────────────────────────────────── */}
          <section className="relative px-4 pt-12 pb-16 text-center overflow-hidden">
            {/* background orbs */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background: 'radial-gradient(circle 600px at 50% 0%, rgba(212,175,55,0.06), transparent)',
              }}
            />

            <m.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Pill badge */}
              <div className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full"
                style={{
                  background: 'rgba(212,175,55,0.10)',
                  border: '1px solid rgba(212,175,55,0.25)',
                }}>
                <Sparkles size={12} style={{ color: '#D4AF37' }} />
                <span className="text-[11px] font-semibold tracking-[0.08em] uppercase" style={{ color: '#D4AF37' }}>
                  619 AI Suite · Powered by GPT‑4o
                </span>
              </div>

              {/* Headline */}
              <h1
                className="text-[42px] sm:text-[56px] font-black leading-[1.05] tracking-[-0.03em] mb-4"
                style={{ color: '#fff' }}
              >
                Train smarter.{' '}
                <span
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F7E7A1 45%, #D4AF37 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  Coach better.
                </span>
              </h1>

              <p className="mx-auto max-w-xl text-[16px] leading-relaxed mb-8" style={{ color: 'rgba(255,255,255,0.52)' }}>
                Four AI tools built for serious fitness studios. Generate elite training plans,
                personalised nutrition, client progress analysis, and business intelligence —
                all from inside 619.
              </p>

              {/* CTAs */}
              <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
                <Link
                  href="/ai/workout-generator"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                  style={{
                    background: 'linear-gradient(135deg, #D4AF37 0%, #F7E7A1 100%)',
                    color: '#050816',
                    boxShadow: '0 0 32px rgba(212,175,55,0.35)',
                  }}
                >
                  <Zap size={15} />
                  Start generating
                </Link>
                <Link
                  href="/ai/progress-analysis"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[14px] font-semibold transition-all duration-200 hover:bg-white/10"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.80)',
                  }}
                >
                  Analyse a client
                  <ChevronRight size={15} />
                </Link>
              </div>

              {/* Use-case pill scroller */}
              <div className="relative overflow-hidden">
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl mx-auto">
                  {USE_CASES.map((uc) => (
                    <span
                      key={uc}
                      className="text-[11px] px-3 py-1 rounded-full font-medium"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        color: 'rgba(255,255,255,0.45)',
                      }}
                    >
                      {uc}
                    </span>
                  ))}
                </div>
              </div>
            </m.div>
          </section>

          {/* ── Stats bar ────────────────────────────────────── */}
          <section className="px-4 pb-12">
            <div
              className="mx-auto max-w-3xl grid grid-cols-2 sm:grid-cols-4 gap-px rounded-2xl overflow-hidden"
              style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.14)' }}
            >
              {STATS.map(({ value, label, icon: Icon }, i) => (
                <m.div
                  key={label}
                  custom={i}
                  initial="hidden"
                  animate="show"
                  variants={fadeUp}
                  className="flex flex-col items-center gap-1.5 py-5 px-4"
                  style={{ background: 'rgba(5,8,22,0.90)' }}
                >
                  <Icon size={15} style={{ color: 'rgba(212,175,55,0.60)' }} />
                  <span className="text-[20px] font-black tracking-tight" style={{ color: '#fff' }}>{value}</span>
                  <span className="text-[10px] font-semibold tracking-[0.07em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
                </m.div>
              ))}
            </div>
          </section>

          {/* ── Tool Cards ───────────────────────────────────── */}
          <section className="px-4 pb-20">
            <div className="mx-auto max-w-5xl">

              <m.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="text-center mb-10"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(212,175,55,0.70)' }}>
                  Four modules
                </p>
                <h2 className="text-[28px] sm:text-[34px] font-black tracking-[-0.025em]" style={{ color: '#fff' }}>
                  Everything your studio needs
                </h2>
                <p className="mt-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  Pick any tool below. Results in seconds.
                </p>
              </m.div>

              <div className="grid gap-5 sm:grid-cols-2">
                {TOOLS.map(({ href, icon: Icon, label, eyebrow, description, capabilities, color, glow, gradientFrom, gradientTo, border, badge }, i) => (
                  <m.div
                    key={href}
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                  >
                    <Link
                      href={href}
                      className="group relative flex flex-col rounded-3xl overflow-hidden transition-transform duration-300 hover:scale-[1.015] hover:-translate-y-0.5"
                      style={{
                        background: 'rgba(10,14,30,0.85)',
                        border: `1px solid ${border}`,
                        boxShadow: `0 8px 40px rgba(0,0,0,0.40), 0 0 0 0 ${glow}`,
                      }}
                    >
                      {/* Card header gradient */}
                      <div
                        className="relative px-6 pt-7 pb-6"
                        style={{
                          background: `linear-gradient(160deg, ${gradientFrom} 0%, ${gradientTo} 100%)`,
                          borderBottom: `1px solid ${border}`,
                        }}
                      >
                        {/* Glow orb behind icon */}
                        <div
                          className="absolute top-4 left-6 w-16 h-16 rounded-full blur-2xl pointer-events-none"
                          style={{ background: glow }}
                        />

                        <div className="relative flex items-start justify-between">
                          <div
                            className="flex items-center justify-center w-11 h-11 rounded-2xl"
                            style={{
                              background: 'rgba(0,0,0,0.35)',
                              border: `1px solid ${border}`,
                              backdropFilter: 'blur(12px)',
                            }}
                          >
                            <Icon size={20} style={{ color }} />
                          </div>
                          {badge && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-[0.08em]"
                              style={{
                                background: 'rgba(0,0,0,0.40)',
                                border: `1px solid ${border}`,
                                color,
                              }}
                            >
                              {badge}
                            </span>
                          )}
                        </div>

                        <div className="mt-4">
                          <p className="text-[10px] font-bold uppercase tracking-[0.10em] mb-1" style={{ color: `${color}cc` }}>
                            {eyebrow}
                          </p>
                          <h3 className="text-[20px] font-black tracking-[-0.02em]" style={{ color: '#fff' }}>
                            {label}
                          </h3>
                        </div>
                      </div>

                      {/* Card body */}
                      <div className="flex flex-col flex-1 px-6 py-5 gap-4">
                        <p className="text-[13px] leading-[1.65]" style={{ color: 'rgba(255,255,255,0.52)' }}>
                          {description}
                        </p>

                        <ul className="space-y-2">
                          {capabilities.map((cap) => (
                            <li key={cap} className="flex items-start gap-2.5">
                              <CheckCircle2 size={13} className="flex-shrink-0 mt-0.5" style={{ color }} />
                              <span className="text-[12px] leading-snug" style={{ color: 'rgba(255,255,255,0.55)' }}>
                                {cap}
                              </span>
                            </li>
                          ))}
                        </ul>

                        <div
                          className="mt-auto flex items-center gap-1.5 text-[12px] font-bold tracking-[0.02em] transition-all duration-200 group-hover:gap-3"
                          style={{ color }}
                        >
                          Open tool <ArrowRight size={13} />
                        </div>
                      </div>

                      {/* Hover glow overlay */}
                      <div
                        className="absolute inset-0 rounded-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-400"
                        style={{ boxShadow: `inset 0 0 60px ${glow}` }}
                      />
                    </Link>
                  </m.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ─────────────────────────────────── */}
          <section className="px-4 pb-20">
            <div className="mx-auto max-w-4xl">

              <div className="text-center mb-12">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: 'rgba(212,175,55,0.70)' }}>
                  Process
                </p>
                <h2 className="text-[28px] sm:text-[34px] font-black tracking-[-0.025em]" style={{ color: '#fff' }}>
                  From idea to output in seconds
                </h2>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                {STEPS.map(({ n, icon: Icon, title, body }, i) => (
                  <m.div
                    key={n}
                    custom={i}
                    initial="hidden"
                    animate="show"
                    variants={fadeUp}
                    className="relative flex flex-col gap-4 rounded-2xl p-6"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    {/* Step number */}
                    <div className="flex items-center justify-between">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl"
                        style={{
                          background: 'rgba(212,175,55,0.10)',
                          border: '1px solid rgba(212,175,55,0.20)',
                        }}
                      >
                        <Icon size={16} style={{ color: '#D4AF37' }} />
                      </div>
                      <span
                        className="text-[44px] font-black tabular-nums leading-none"
                        style={{ color: 'rgba(212,175,55,0.12)' }}
                      >
                        {n}
                      </span>
                    </div>

                    <h3 className="text-[16px] font-bold" style={{ color: '#fff' }}>{title}</h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{body}</p>

                    {/* Connector line (not on last) */}
                    {i < 2 && (
                      <div
                        className="hidden sm:block absolute top-10 -right-3 w-6 h-px"
                        style={{ background: 'rgba(212,175,55,0.20)' }}
                      />
                    )}
                  </m.div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Feature callout strip ────────────────────────── */}
          <section className="px-4 pb-20">
            <div className="mx-auto max-w-4xl">
              <div
                className="rounded-3xl overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 50%, rgba(96,165,250,0.06) 100%)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  boxShadow: '0 0 80px rgba(212,175,55,0.06)',
                }}
              >
                <div className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x" style={{ borderColor: 'rgba(212,175,55,0.12)' }}>
                  {[
                    { icon: Brain, title: 'Context-aware', body: 'The AI reads each client\'s actual history — not just generic templates.' },
                    { icon: Shield, title: 'Data stays yours', body: 'All processing uses your studio\'s own data. Nothing is shared externally.' },
                    { icon: Users, title: 'Client-ready output', body: 'Responses are formatted to hand directly to clients or import into plans.' },
                  ].map(({ icon: Icon, title, body }) => (
                    <div key={title} className="flex flex-col gap-3 p-6">
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                        style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.18)' }}
                      >
                        <Icon size={16} style={{ color: '#D4AF37' }} />
                      </div>
                      <h4 className="text-[15px] font-bold" style={{ color: '#fff' }}>{title}</h4>
                      <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Quick launch strip ───────────────────────────── */}
          <section className="px-4 pb-20">
            <div className="mx-auto max-w-4xl">
              <div className="text-center mb-8">
                <h2 className="text-[22px] font-black tracking-[-0.02em]" style={{ color: '#fff' }}>
                  Jump straight in
                </h2>
                <p className="mt-1 text-[13px]" style={{ color: 'rgba(255,255,255,0.40)' }}>
                  Each tool is a one-screen flow. No setup required.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {TOOLS.map(({ href, icon: Icon, label, color, border, eyebrow }) => (
                  <Link
                    key={href}
                    href={href}
                    className="group flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-200 hover:scale-[1.012]"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: `1px solid ${border}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
                      style={{ background: `${color}18`, border: `1px solid ${color}30` }}
                    >
                      <Icon size={16} style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: `${color}99` }}>{eyebrow}</p>
                      <p className="text-[14px] font-semibold truncate" style={{ color: '#fff' }}>{label}</p>
                    </div>
                    <ArrowRight
                      size={15}
                      className="flex-shrink-0 transition-transform duration-200 group-hover:translate-x-1"
                      style={{ color: 'rgba(255,255,255,0.25)' }}
                    />
                  </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Footer disclaimer ────────────────────────────── */}
          <div className="px-4 pb-12 text-center">
            <p className="text-[11px] leading-relaxed mx-auto max-w-md" style={{ color: 'rgba(255,255,255,0.20)' }}>
              AI-generated plans are a professional starting point. Always apply your
              expertise and judgement before sharing any recommendation with a client.
              619 AI Suite is powered by OpenAI GPT-4o.
            </p>
          </div>

        </div>
      </AppShell>
    </Guard>
  );
}
