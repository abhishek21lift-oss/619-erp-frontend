'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight, Sparkles, Users, Wallet, CalendarCheck, LineChart,
  LayoutDashboard, Dumbbell, UserRound, ChefHat, TrendingUp, Building2,
  Bell, Check, CirclePlay,
} from 'lucide-react';
import { Container, Eyebrow } from './primitives';
import { C, EASE, SHADOW, TABULAR } from './tokens';

const GRAD_AI: React.CSSProperties = {
  background: `linear-gradient(94deg, ${C.blueHi} 0%, ${C.blue} 52%, ${C.gold} 118%)`,
  WebkitBackgroundClip: 'text',
  backgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
};

const BARS = [42, 58, 51, 73, 66, 88, 79];

/** Small atoms shared by the hero mock ─────────────────────────────────── */

function Delta({ v }: { v: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums"
      style={{ background: C.emeraldSoft, color: C.emerald }}
    >
      {v}
    </span>
  );
}

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9.5px] font-bold text-white"
      style={{ background: color }}
      aria-hidden
    >
      {initials}
    </span>
  );
}

/**
 * The Studio Command Center — a faithful miniature of the actual product
 * (PtOsDashboard): greeting banner, KPI row, revenue trend, today's roster and
 * an AI Coach insight. Sample data, clearly an illustration.
 */
function CommandCenter() {
  const reduce = useReducedMotion();
  return (
    <div
      className="relative overflow-hidden rounded-[22px] border"
      style={{ background: C.panel, borderColor: C.line, boxShadow: SHADOW.panel }}
    >
      {/* chrome bar */}
      <div
        className="flex items-center gap-2 border-b px-4 py-2.5"
        style={{ borderColor: C.lineSoft, background: C.panelAlt }}
      >
        <span className="flex gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.trackDot }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.trackDot }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: C.trackDot }} />
        </span>
        <span
          className="mx-auto hidden items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[9.5px] font-semibold tracking-wide sm:flex"
          style={{ color: C.muted, borderColor: C.lineSoft, background: 'rgba(148,163,184,0.06)' }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.emerald }} />
          Studio Command Center · YOUR STUDIO
        </span>
        <span className="ml-auto flex items-center gap-2 sm:ml-0">
          <Bell size={13} style={{ color: C.faint }} aria-hidden />
          <span
            className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-bold"
            style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, color: '#fff' }}
            aria-hidden
          >
            SK
          </span>
        </span>
      </div>

      <div className="flex">
        {/* rail — desktop only */}
        <div className="hidden shrink-0 flex-col items-center gap-1 border-r py-4 lg:flex" style={{ borderColor: C.lineSoft, width: 52 }}>
          {[
            { icon: <LayoutDashboard size={15} />, active: true, label: 'Dashboard' },
            { icon: <UserRound size={15} />, active: false, label: 'Clients' },
            { icon: <Dumbbell size={15} />, active: false, label: 'Training' },
            { icon: <Sparkles size={15} />, active: false, label: 'AI Coach' },
            { icon: <TrendingUp size={15} />, active: false, label: 'Revenue' },
            { icon: <LineChart size={15} />, active: false, label: 'Insights' },
            { icon: <Building2 size={15} />, active: false, label: 'Studio' },
          ].map((i) => (
            <span
              key={i.label}
              title={i.label}
              className="grid h-8 w-8 place-items-center rounded-lg"
              style={
                i.active
                  ? { background: C.blueWash, color: C.blueHi, boxShadow: `inset 0 0 0 1px ${C.lineBlue}` }
                  : { color: C.faint }
              }
            >
              {i.icon}
            </span>
          ))}
        </div>

        {/* main */}
        <div className="min-w-0 flex-1 p-4 sm:p-5">
          {/* greeting */}
          <div className="flex flex-wrap items-baseline justify-between gap-1">
            <p className="text-[13px] font-[750] tracking-[-0.01em]" style={{ color: C.ink }}>
              Good morning · <span style={{ color: C.goldHi }}>YOUR STUDIO</span>
            </p>
            <p className="hidden text-[10.5px] font-medium sm:block" style={{ color: C.faint }}>
              Monday, 17 August 2026
            </p>
          </div>

          {/* KPI row */}
          <div className="mt-3 grid grid-cols-3 gap-2.5">
            {[
              { icon: <Users size={14} />, v: '248', l: 'Active clients', d: '+12%', c: C.blue },
              { icon: <Wallet size={14} />, v: '₹6.4L', l: 'Revenue · MTD', d: '+23%', c: C.blueHi },
              { icon: <CalendarCheck size={14} />, v: '1,092', l: 'Sessions', d: '+8%', c: C.gold },
            ].map((k) => (
              <div
                key={k.l}
                className="rounded-xl border p-2.5 sm:p-3"
                style={{ background: C.panelAlt, borderColor: C.lineSoft }}
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-lg"
                  style={{ background: `${k.c}1f`, color: k.c }}
                  aria-hidden
                >
                  {k.icon}
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="text-[15px] font-[800] tracking-[-0.02em] sm:text-[17px]" style={{ ...TABULAR, color: C.ink }}>
                    {k.v}
                  </span>
                  <Delta v={k.d} />
                </div>
                <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color: C.faint }}>
                  {k.l}
                </p>
              </div>
            ))}
          </div>

          {/* trend + roster */}
          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-5">
            <div className="rounded-xl border p-3 sm:col-span-3" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold" style={{ color: C.ink }}>Revenue trend</span>
                <span className="text-[9px] font-medium" style={{ color: C.faint }}>Last 7 months</span>
              </div>
              <div className="mt-2.5 flex h-[74px] items-end gap-1.5">
                {BARS.map((h, i) => (
                  <m.div
                    key={i}
                    className="flex-1 origin-bottom rounded-t-[4px]"
                    style={{
                      height: `${h}%`,
                      background:
                        i === BARS.length - 1
                          ? `linear-gradient(180deg, ${C.goldHi}, ${C.gold})`
                          : `linear-gradient(180deg, ${C.blueHi}, ${C.blue})`,
                      opacity: i === BARS.length - 1 ? 1 : 0.7,
                    }}
                    initial={reduce ? false : { scaleY: 0 }}
                    whileInView={reduce ? undefined : { scaleY: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.35 + i * 0.06, ease: EASE }}
                  />
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-3 sm:col-span-2" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
              <span className="text-[10.5px] font-bold" style={{ color: C.ink }}>Today&apos;s clients</span>
              <div className="mt-2.5 space-y-2">
                {[
                  { n: 'AR', w: 80, s: 'Done', c: C.blue },
                  { n: 'KP', w: 55, s: 'PT', c: C.gold },
                  { n: 'SM', w: 92, s: 'Done', c: C.blueHi },
                  { n: 'DT', w: 40, s: 'New', c: C.emerald },
                ].map((r) => (
                  <div key={r.n} className="flex items-center gap-2">
                    <Avatar initials={r.n} color={r.c} />
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
                      <div className="h-full rounded-full" style={{ width: `${r.w}%`, background: r.c }} />
                    </div>
                    <span className="w-9 text-right text-[9px] font-bold" style={{ color: C.muted }}>{r.s}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI insight */}
          <div
            className="mt-2.5 flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
            style={{ background: C.blueWash, borderColor: C.lineBlue }}
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: C.blue, color: '#fff' }} aria-hidden>
              <Sparkles size={13} />
            </span>
            <p className="min-w-0 flex-1 text-[11px] leading-[1.45] font-medium" style={{ color: C.body }}>
              <span style={{ color: C.ink, fontWeight: 700 }}>5 renewals due this week</span> · ₹42K pending — the AI
              Coach has your follow-up list ready.
            </p>
            <span
              className="hidden shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold sm:block"
              style={{ background: C.ink, color: C.canvas }}
            >
              Open AI Coach
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Floating accent cards around the mock — desktop only. */
function FloatingCard({
  className,
  delay,
  floatDelay = 0,
  children,
}: {
  className: string;
  delay: number;
  floatDelay?: number;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <m.div
      className={`pointer-events-none absolute z-10 hidden md:block ${className}`}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
    >
      <div
        className="hero-float rounded-2xl border p-3.5"
        style={{
          background: 'rgba(16,27,48,0.92)',
          borderColor: C.line,
          boxShadow: SHADOW.float,
          backdropFilter: 'blur(14px)',
          animationDelay: `${floatDelay}s`,
        }}
      >
        {children}
      </div>
    </m.div>
  );
}

export default function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const mockY = useTransform(scrollYProgress, [0, 1], [0, -18]);

  return (
    <section id="top" aria-labelledby="hero-title" className="relative overflow-hidden">
      {/* ambient glows — clipped, never interactive */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-48 left-1/2 h-[560px] w-[900px] -translate-x-1/2 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(0,103,224,0.20), transparent 72%)' }}
        />
        <div
          className="absolute -right-40 top-40 h-[480px] w-[480px] rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(245,158,11,0.09), transparent 72%)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.05) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(80% 60% at 50% 0%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(80% 60% at 50% 0%, black 30%, transparent 100%)',
          }}
        />
      </div>

      <Container className="relative pt-[calc(max(env(safe-area-inset-top),1.5rem)+7.5rem)] pb-16 sm:pt-[calc(max(env(safe-area-inset-top),1.5rem)+8.5rem)] sm:pb-24">
        <div className="mx-auto max-w-[820px] text-center">
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}>
            <Eyebrow>
              <Sparkles size={12} />
              AI-Powered Gym &amp; Personal Training Platform
            </Eyebrow>
          </m.div>

          <m.h1
            id="hero-title"
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08, ease: EASE }}
            className="mt-7 text-[clamp(2.35rem,5.8vw,4.4rem)] font-[850] leading-[1.04] tracking-[-0.04em]"
            style={{ color: C.ink }}
          >
            Run your gym.
            <br />
            Train your clients.
            <br />
            Let <span style={GRAD_AI}>AI</span> handle the rest.
          </m.h1>

          <m.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16, ease: EASE }}
            className="mx-auto mt-7 max-w-[640px] text-[16px] leading-[1.75] sm:text-[18px]"
            style={{ color: C.muted }}
          >
            MY PT STUDIO is the operating system for modern fitness businesses — gym
            management, personal training and AI workout &amp; diet intelligence,
            working as one.
          </m.p>

          <m.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24, ease: EASE }}
            className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link
              href="/start-free"
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl px-8 py-3.5 text-[15px] font-bold text-white transition-all duration-200 hover:-translate-y-0.5 sm:w-auto"
              style={{
                background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`,
                boxShadow: '0 14px 36px -10px rgba(0,103,224,0.6), inset 0 1px 0 rgba(255,255,255,0.18)',
              }}
            >
              Start Free
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#product"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border px-8 py-3.5 text-[15px] font-bold transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/[0.05] sm:w-auto"
              style={{ color: C.body, borderColor: C.line }}
            >
              <CirclePlay size={17} style={{ color: C.blueHi }} />
              Explore the platform
            </a>
          </m.div>

          <m.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.34 }}
            className="mt-4 text-[12.5px] font-medium"
            style={{ color: C.faint }}
          >
            Free trial · No credit card required · Set up in a day
          </m.p>
        </div>

        {/* Product visual */}
        <m.div
          ref={ref}
          initial={{ opacity: 0, y: 36 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32, ease: EASE }}
          className="relative mx-auto mt-16 max-w-[960px] sm:mt-20"
        >
          <m.div style={{ y: mockY }}>
            <FloatingCard className="-left-8 top-16" delay={0.55} floatDelay={0}>
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ background: C.blue, color: '#fff', boxShadow: '0 8px 20px -6px rgba(0,103,224,0.6)' }}
                >
                  <Dumbbell size={16} />
                </span>
                <div className="text-left">
                  <div className="text-[12px] font-bold" style={{ color: C.ink }}>AI Workout Generated</div>
                  <div className="text-[10px] font-medium" style={{ color: C.faint }}>Strength · Push A — 45 min</div>
                </div>
              </div>
            </FloatingCard>

            <FloatingCard className="-right-8 bottom-12" delay={0.68} floatDelay={-3.5}>
              <div className="flex items-center gap-2.5">
                <span
                  className="grid h-9 w-9 place-items-center rounded-xl"
                  style={{ background: C.emerald, color: C.onEmerald, boxShadow: '0 8px 20px -6px rgba(52,211,153,0.5)' }}
                >
                  <Check size={16} />
                </span>
                <div className="text-left">
                  <div className="text-[12px] font-bold" style={{ color: C.ink }}>Payment received</div>
                  <div className="text-[10px] font-medium" style={{ color: C.faint }}>₹8,000 · Renewal</div>
                </div>
              </div>
            </FloatingCard>

            <CommandCenter />
          </m.div>

          {/* frame glow */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[40px]"
            style={{ background: 'radial-gradient(60% 60% at 50% 45%, rgba(0,103,224,0.16), transparent 75%)', filter: 'blur(30px)' }}
          />
        </m.div>

        <style>{`
          @keyframes hero-float-a {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-7px); }
          }
          .hero-float { animation: hero-float-a 7s ease-in-out infinite; }
        `}</style>
      </Container>
    </section>
  );
}