'use client';

import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import {
  LayoutDashboard, UserRound, Dumbbell, Sparkles, ChefHat, TrendingUp,
  Lightbulb, Building2, Check, Users, Wallet, CalendarCheck,
  Target, Flame, Droplets,
} from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, EASE, SHADOW, TABULAR } from './tokens';

// ── Atoms ──────────────────────────────────────────────────────────────────

function PanelCard({ title, sub, children }: { title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="h-full rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-[12px] font-bold tracking-[-0.01em]" style={{ color: C.ink }}>{title}</p>
        {sub && <p className="text-[10px] font-medium" style={{ color: C.faint }}>{sub}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Chip({ children, color = C.blueHi }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold"
      style={{ background: `${color}1c`, color }}
    >
      {children}
    </span>
  );
}

function BarRow({ name, pct, color, right }: { name: string; pct: number; color: string; right?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-12 shrink-0 text-[10.5px] font-semibold" style={{ color: C.body }}>{name}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
        <m.div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: color }}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </div>
      {right && <span className="w-10 shrink-0 text-right text-[10px] font-bold tabular-nums" style={{ color: C.muted }}>{right}</span>}
    </div>
  );
}

// ── Panels ─────────────────────────────────────────────────────────────────

function DashboardPanel() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <PanelCard title="Today's revenue" sub="Live from payments">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[22px] font-[850] tracking-[-0.02em]" style={{ ...TABULAR, color: C.ink }}>₹6,400</div>
            <p className="text-[10px] font-medium" style={{ color: C.faint }}>4 payments so far</p>
          </div>
          <Chip color={C.emerald}>+23% MTD</Chip>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
          <div className="h-full rounded-full" style={{ width: '72%', background: `linear-gradient(90deg, ${C.emerald}, ${C.emerald}88)` }} />
        </div>
      </PanelCard>
      <PanelCard title="Month target" sub="Owner-set">
        <div className="flex items-center justify-between">
          <span className="text-[22px] font-[850] tracking-[-0.02em]" style={{ ...TABULAR, color: C.ink }}>68%</span>
          <span className="text-[10px] font-medium" style={{ color: C.faint }}>₹4.3L of ₹6.3L</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
          <div className="h-full rounded-full" style={{ width: '68%', background: `linear-gradient(90deg, ${C.gold}, ${C.goldHi})` }} />
        </div>
      </PanelCard>
      <PanelCard title="Studio health" sub="Collection · retention">
        <div className="flex items-center justify-between">
          <span className="text-[22px] font-[850] tracking-[-0.02em]" style={{ ...TABULAR, color: C.emerald }}>84</span>
          <Chip color={C.emerald}>Excellent</Chip>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
          <div className="h-full rounded-full" style={{ width: '84%', background: C.emerald }} />
        </div>
      </PanelCard>
      <div className="sm:col-span-3">
        <PanelCard title="Today's sessions" sub="Who is training when">
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { t: '6:30 AM', c: 'Priya Sharma', w: 'Push A · AR', s: 'Done', sc: C.emerald },
              { t: '9:00 AM', c: 'Karan Patel', w: 'Pull B · KP', s: 'PT', sc: C.gold },
              { t: '5:30 PM', c: 'Simran Mehta', w: 'Legs C · SM', s: 'Scheduled', sc: C.blueHi },
            ].map((r) => (
              <div key={r.c} className="rounded-xl border p-3" style={{ background: C.panel, borderColor: C.lineSoft }}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold tabular-nums" style={{ color: C.blueHi }}>{r.t}</span>
                  <span className="rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${r.sc}1c`, color: r.sc }}>{r.s}</span>
                </div>
                <p className="mt-1.5 text-[11.5px] font-bold" style={{ color: C.ink }}>{r.c}</p>
                <p className="text-[10px] font-medium" style={{ color: C.faint }}>{r.w}</p>
              </div>
            ))}
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

function ClientsPanel() {
  const rows = [
    { n: 'Priya Sharma', tag: 'Active', tagC: C.emerald, pct: 92, rt: '92%' },
    { n: 'Karan Patel', tag: 'Balance due', tagC: C.gold, pct: 61, rt: '61%' },
    { n: 'Simran Mehta', tag: 'Renews in 6d', tagC: C.blueHi, pct: 78, rt: '78%' },
    { n: 'Dev Thakur', tag: 'New this week', tagC: C.emerald, pct: 40, rt: '40%' },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r, i) => (
        <div
          key={r.n}
          className="flex items-center gap-3 rounded-xl border px-4 py-3"
          style={{ background: C.panelAlt, borderColor: C.lineSoft }}
        >
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold"
            style={{ background: [C.blue, C.gold, C.blueHi, C.emerald][i], color: '#fff' }}
            aria-hidden
          >
            {r.n.split(' ').map((w) => w[0]).join('')}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-[12.5px] font-bold" style={{ color: C.ink }}>{r.n}</p>
              <span className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold" style={{ background: `${r.tagC}1c`, color: r.tagC }}>
                {r.tag}
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
                <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.tagC }} />
              </div>
              <span className="text-[9.5px] font-bold tabular-nums" style={{ color: C.muted }}>{r.rt}</span>
            </div>
          </div>
        </div>
      ))}
      <p className="pt-1 text-[10.5px] font-medium" style={{ color: C.faint }}>
        One profile per client — assessments, programmes, diet, payments, progress and history.
      </p>
    </div>
  );
}

function TrainingPanel() {
  const ex = [
    { n: 'Barbell Squat', d: '4 × 8–10', t: 'Tempo 2-0-2', r: 'Rest 120s' },
    { n: 'Flat Bench Press', d: '4 × 8–10', t: 'Tempo 2-0-2', r: 'Rest 120s' },
    { n: 'Bent-Over Row', d: '3 × 10–12', t: 'Tempo 2-1-2', r: 'Rest 90s' },
    { n: 'Overhead Press', d: '3 × 10', t: 'Tempo 2-1-2', r: 'Rest 90s' },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="space-y-2">
        {ex.map((e, i) => (
          <div key={e.n} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border px-4 py-3" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold" style={{ background: C.blueWash, color: C.blueHi }} aria-hidden>
              {i + 1}
            </span>
            <p className="min-w-[140px] text-[12.5px] font-bold" style={{ color: C.ink }}>{e.n}</p>
            <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: C.blueWash, color: C.blueHi }}>{e.d}</span>
            <span className="text-[10px] font-medium" style={{ color: C.faint }}>{e.t}</span>
            <span className="text-[10px] font-medium" style={{ color: C.faint }}>{e.r}</span>
          </div>
        ))}
        <p className="pt-1 text-[10.5px] font-medium" style={{ color: C.faint }}>
          Cues, tempo, rest and coaching notes travel with every exercise. Assign to one client or the whole roster.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <p className="text-[12px] font-bold" style={{ color: C.ink }}>Push A · Week 3</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>14 clients</Chip>
            <Chip color={C.emerald}>75% adherence</Chip>
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <p className="text-[12px] font-bold" style={{ color: C.ink }}>Muscle groups</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>Quads</Chip>
            <Chip>Pecs</Chip>
            <Chip>Back</Chip>
            <Chip>Shoulders</Chip>
          </div>
        </div>
      </div>
    </div>
  );
}

function AiWorkoutPanel() {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div>
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip color={C.gold}>Muscle Gain</Chip>
            <Chip>Intermediate</Chip>
            <Chip>Full Equipment</Chip>
            <Chip color={C.emerald}>4 days / week</Chip>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[11.5px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})` }}>
              <Sparkles size={13} /> Generate programme
            </span>
            <span className="text-[10.5px] font-medium" style={{ color: C.faint }}>Grounded in assessments + PAR-Q</span>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {[
            { step: 'Analysing client profile, goals and training history', done: true },
            { step: 'Selecting movements for available equipment', done: true },
            { step: 'Applying progressive overload across the week', done: true },
          ].map((s) => (
            <div key={s.step} className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full" style={{ background: C.emeraldSoft, color: C.emerald }} aria-hidden>
                <Check size={11} />
              </span>
              <p className="text-[11.5px] font-medium" style={{ color: C.body }}>{s.step}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
        <p className="text-[12px] font-bold" style={{ color: C.ink }}>Day 1 · Upper Body</p>
        <div className="mt-2.5 space-y-2">
          {[
            { n: 'Incline DB Press', d: '3 × 8–10' },
            { n: 'Lat Pulldown', d: '3 × 10–12' },
            { n: 'Face Pull', d: '3 × 15' },
          ].map((e) => (
            <div key={e.n} className="flex items-center justify-between rounded-lg px-2.5 py-2" style={{ background: C.panel }}>
              <span className="text-[11px] font-semibold" style={{ color: C.body }}>{e.n}</span>
              <span className="text-[10px] font-bold tabular-nums" style={{ color: C.blueHi }}>{e.d}</span>
            </div>
          ))}
        </div>
        <p className="mt-2.5 text-[10px] font-medium" style={{ color: C.faint }}>Trainer reviews and edits before it reaches the client.</p>
      </div>
    </div>
  );
}

function AiDietPanel() {
  const meals = [
    { t: 'Breakfast', f: 'Oats, eggs, milk', m: 'P 32 · C 45 · F 12' },
    { t: 'Lunch', f: 'Rice, dal, curd, vegetables', m: 'P 28 · C 62 · F 10' },
    { t: 'Snack', f: 'Paneer & fruit', m: 'P 18 · C 26 · F 8' },
    { t: 'Dinner', f: 'Grilled chicken / paneer salad', m: 'P 42 · C 30 · F 14' },
  ];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_200px]">
      <div className="space-y-2">
        {meals.map((m) => (
          <div key={m.t} className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
            <div>
              <p className="text-[12px] font-bold" style={{ color: C.ink }}>{m.t}</p>
              <p className="text-[11px] font-medium" style={{ color: C.muted }}>{m.f}</p>
            </div>
            <span className="shrink-0 rounded-md px-2 py-1 text-[10px] font-bold tabular-nums" style={{ background: C.goldSoft, color: C.goldHi }}>{m.m}</span>
          </div>
        ))}
        <p className="pt-1 text-[10.5px] font-medium" style={{ color: C.faint }}>
          Budgets respect the client&apos;s goal, training load and dietary preferences — Indian meals included.
        </p>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <div className="flex items-center gap-2">
            <Flame size={14} style={{ color: C.goldHi }} />
            <span className="text-[16px] font-[850] tabular-nums" style={{ color: C.ink }}>2,150</span>
            <span className="text-[10px] font-medium" style={{ color: C.faint }}>kcal / day</span>
          </div>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Protein</p>
              <p className="text-[15px] font-[800] tabular-nums" style={{ color: C.ink }}>165 g</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Water</p>
              <p className="text-[15px] font-[800] tabular-nums" style={{ color: C.ink }}>3.5 L</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <Droplets size={12} style={{ color: C.blueHi }} />
            <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'rgba(148,163,184,0.14)' }}>
              <div className="h-full w-3/4 rounded-full" style={{ background: C.blueHi }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevenuePanel() {
  const bars = [46, 61, 55, 78, 70, 92, 84];
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <PanelCard title="Revenue trend" sub="Monthly · INR">
        <div className="mt-4 flex h-[120px] items-end gap-2">
          {bars.map((h, i) => (
            <m.div
              key={i}
              className="flex-1 origin-bottom rounded-t-md"
              style={{
                height: `${h}%`,
                background: i === bars.length - 1 ? `linear-gradient(180deg, ${C.goldHi}, ${C.gold})` : `linear-gradient(180deg, ${C.blueHi}, ${C.blue})`,
                opacity: i === bars.length - 1 ? 1 : 0.75,
              }}
              initial={{ scaleY: 0 }}
              whileInView={{ scaleY: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: EASE }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[9.5px] font-medium" style={{ color: C.faint }}>
          <span>Feb</span><span>Mar</span><span>Apr</span><span>May</span><span>Jun</span><span>Jul</span><span>Aug</span>
        </div>
      </PanelCard>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Collected · MTD</p>
          <p className="mt-1 text-[20px] font-[850] tabular-nums" style={{ color: C.emerald }}>₹4.3L</p>
          <p className="text-[10px] font-medium" style={{ color: C.faint }}>vs ₹1.8L pending</p>
        </div>
        <div className="rounded-2xl border p-4" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Renewals due</p>
          <p className="mt-1 text-[20px] font-[850] tabular-nums" style={{ color: C.goldHi }}>12</p>
          <p className="text-[10px] font-medium" style={{ color: C.faint }}>next 30 days</p>
        </div>
      </div>
    </div>
  );
}

function InsightsPanel() {
  const rows = [
    { icon: <Wallet size={14} />, c: C.gold, t: '₹1.2L collectable', d: 'renewals due in the next 7 days', a: 'WhatsApp', ac: C.emerald },
    { icon: <Users size={14} />, c: C.blueHi, t: '₹42K pending', d: 'across 12 clients — 3 overdue', a: 'View dues', ac: C.gold },
    { icon: <CalendarCheck size={14} />, c: C.blue, t: '3 birthdays today', d: 'wish them before today\'s sessions', a: 'Wish', ac: C.blueHi },
    { icon: <Target size={14} />, c: C.emerald, t: 'Month target on pace', d: '₹4.3L of ₹6.3L with 12 days left', a: 'Track', ac: C.emerald },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.t} className="flex items-center gap-3 rounded-xl border px-4 py-3" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${r.c}1c`, color: r.c }} aria-hidden>
            {r.icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold" style={{ color: C.ink }}>{r.t}</p>
            <p className="truncate text-[10.5px] font-medium" style={{ color: C.faint }}>{r.d}</p>
          </div>
          <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] font-bold" style={{ background: `${r.ac}1c`, color: r.ac }}>
            {r.a}
          </span>
        </div>
      ))}
      <p className="pt-1 text-[10.5px] font-medium" style={{ color: C.faint }}>
        The AI Coach turns raw records into a short list of who to call and what to say.
      </p>
    </div>
  );
}

function StudioPanel() {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="rounded-2xl border p-5" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Studio</p>
        <p className="mt-1.5 text-[16px] font-[800] tracking-[-0.01em]" style={{ color: C.ink }}>YOUR STUDIO</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>Main branch</Chip>
          <Chip color={C.gold}>Branch 02</Chip>
        </div>
        <div className="mt-4 space-y-2">
          <BarRow name="Client retention" pct={72} color={C.blueHi} right="72%" />
          <BarRow name="Renewals on track" pct={58} color={C.gold} right="58%" />
        </div>
      </div>
      <div className="rounded-2xl border p-5" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Roles &amp; access</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip>Owner</Chip>
          <Chip>Admin</Chip>
          <Chip>Manager</Chip>
          <Chip color={C.gold}>Trainer</Chip>
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.faint }}>Security</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Chip color={C.emerald}>Tenant isolation</Chip>
          <Chip color={C.emerald}>Row-level security</Chip>
          <Chip color={C.blueHi}>Passkeys</Chip>
        </div>
      </div>
    </div>
  );
}

// ── Section ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, panel: <DashboardPanel /> },
  { id: 'clients', label: 'Clients', icon: UserRound, panel: <ClientsPanel /> },
  { id: 'training', label: 'Training', icon: Dumbbell, panel: <TrainingPanel /> },
  { id: 'ai-workout', label: 'AI Workout', icon: Sparkles, panel: <AiWorkoutPanel /> },
  { id: 'ai-diet', label: 'AI Diet', icon: ChefHat, panel: <AiDietPanel /> },
  { id: 'revenue', label: 'Revenue', icon: TrendingUp, panel: <RevenuePanel /> },
  { id: 'insights', label: 'Insights', icon: Lightbulb, panel: <InsightsPanel /> },
  { id: 'studio', label: 'Studio', icon: Building2, panel: <StudioPanel /> },
] as const;

export default function ProductShowcase() {
  const [active, setActive] = useState<(typeof TABS)[number]['id']>('dashboard');
  const reduce = useReducedMotion();
  const current = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <Section id="product" alt aria-labelledby="product-title">
      <Container>
        <SectionHeader
          id="product-title"
          eyebrow="The platform"
          title="One platform. Every surface your PT business runs on."
          sub="Dashboard, clients, training, AI generation, revenue, insights and studio — all connected to the same data. Pick a module."
        />

        <Reveal delay={0.1} y={30}>
          <div className="mt-14">
            {/* Tab rail — vertical list on desktop, scrollable chips on mobile */}
            <div className="grid gap-6 lg:grid-cols-[228px_1fr]">
              <div
                role="tablist"
                aria-label="Platform modules"
                aria-orientation="vertical"
                className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:flex-col lg:overflow-visible lg:pb-0"
              >
                {TABS.map((t) => {
                  const isActive = t.id === active;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      id={`tab-${t.id}`}
                      aria-selected={isActive}
                      aria-controls={`panel-${t.id}`}
                      onClick={() => setActive(t.id)}
                      className="flex shrink-0 items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] font-[650] transition-all duration-200 lg:w-full lg:px-4"
                      style={
                        isActive
                          ? { background: C.blueWash, borderColor: C.lineBlue, color: C.ink, boxShadow: `inset 0 0 0 1px ${C.lineBlue}` }
                          : { background: 'transparent', borderColor: 'transparent', color: C.muted }
                      }
                    >
                      <t.icon size={16} style={{ color: isActive ? C.blueHi : C.faint }} aria-hidden />
                      {t.label}
                      {isActive && <span className="ml-auto hidden h-1.5 w-1.5 rounded-full lg:block" style={{ background: C.gold }} aria-hidden />}
                    </button>
                  );
                })}
              </div>

              {/* Stage */}
              <div
                className="relative overflow-hidden rounded-[24px] border p-4 sm:p-6"
                style={{ background: 'rgba(22,35,61,0.66)', borderColor: C.line, boxShadow: SHADOW.panel, backdropFilter: 'blur(14px)' }}
              >
                {/* stage glow */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute -top-24 right-0 h-64 w-64 rounded-full"
                  style={{ background: 'radial-gradient(closest-side, rgba(0,103,224,0.16), transparent 72%)' }}
                />
                <AnimatePresence mode="wait" initial={false}>
                  <m.div
                    key={current.id}
                    role="tabpanel"
                    id={`panel-${current.id}`}
                    aria-labelledby={`tab-${current.id}`}
                    initial={reduce ? false : { opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="relative min-h-[320px]"
                  >
                    {current.panel}
                  </m.div>
                </AnimatePresence>
              </div>
            </div>

            <p className="mt-6 text-center text-[12.5px] font-medium" style={{ color: C.faint }}>
              Sample data shown for illustration — the live platform uses your studio&apos;s real records.
              <Link href="/login" className="ml-1.5 font-bold underline-offset-4 hover:underline" style={{ color: C.blueHi }}>
                Log in to explore →
              </Link>
            </p>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}