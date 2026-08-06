'use client';

/**
 * MY PT STUDIO — SaaS marketing landing page.
 *
 * Repositioned from a personal-trainer page into a premium software-company
 * site: the product is the hero, the founder is invisible. Self-contained
 * palette (deep maroon + luxury gold on white) so it doesn't inherit the app's
 * in-product blue brand tokens. Framer Motion for subtle scroll reveals
 * (disabled under prefers-reduced-motion).
 */

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import BrandLogoWide from '@/components/BrandLogoWide';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight, Check, Menu, X, Sparkles, Star, ChevronDown,
  Users, Dumbbell, Salad, CalendarCheck, LineChart, Ruler,
  Wallet, FileText, CreditCard, Inbox, Zap, BookOpen, ClipboardList,
  Smartphone, Cloud, Bell, BarChart3, UsersRound, ShieldCheck, Building2, Bot,
  Quote, PhoneCall,
} from 'lucide-react';

// ── Palette ─────────────────────────────────────────────────────────────────
// Blue + black, taken from the MY PT STUDIO cube mark. BLUE is sampled from the
// artwork itself (#0067E0) rather than picked by eye, so the page and the logo
// are the same blue.
//
// The names are kept as MAROON/GOLD so this stays a pure colour change: the
// file uses these constants in ~100 places and in fixed structural roles
// (MAROON = primary, MAROON_DEEP = darkest surface + text on accent,
// GOLD = the bright accent that has to pop against the dark panels). Renaming
// them as well would bury a simple recolour inside a 100-line rename diff and
// make it far harder to review or revert.
const MAROON = '#0067E0';       // primary — logo blue
const MAROON_DEEP = '#0F172A';  // near-black — the logo's cube
const MAROON_HI = '#0067E0';    // lifted primary
const GOLD = '#0067E0';         // bright accent; sits on the dark panels
const GOLD_HI = '#7FB4FF';      // lightest accent
const INK = '#0F172A';          // blue-black body text
const MUTE = '#64748B';         // neutral slate

const gradText: React.CSSProperties = {
  background: `linear-gradient(120deg, ${MAROON_DEEP} 0%, ${MAROON} 44%, ${GOLD} 118%)`,
  WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
};

// ── Scroll reveal ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0, y = 22, className = '' }: { children: ReactNode; delay?: number; y?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Wordmark ────────────────────────────────────────────────────────────────
function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/mypt-logo.png"
        alt="MY PT STUDIO"
        width={38}
        height={38}
        priority
        className="h-9 w-9 shrink-0 object-contain"
        style={light ? { filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.35))' } : undefined}
      />
      {/* Mirrors the artwork: "MY PT" blue, "STUDIO" black. On the dark footer
          that inverts — black on near-black is invisible — so STUDIO takes the
          light accent there instead. */}
      <span className="text-[15.5px] font-[750] tracking-[-0.01em]">
        <span style={{ color: light ? '#fff' : MAROON }}>MY&nbsp;PT&nbsp;</span>
        <span style={{ color: light ? GOLD : INK }}>STUDIO</span>
      </span>
    </span>
  );
}

const NAV = ['Solutions', 'Features', 'Pricing', 'Resources', 'About'];

// ── Nav ─────────────────────────────────────────────────────────────────────
function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        // Solid, full-bleed bar that fills the notch / notification area so
        // page content scrolling underneath can never bleed into the status
        // bar. Floor the notch reserve at 2.75rem so the nav still clears the
        // status bar even when env(safe-area-inset-top) resolves to 0.
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0,103,224,0.07)',
      }}
    >
      <div className="mx-auto max-w-6xl px-4">
        <nav className="flex items-center justify-between py-3">
          <Link href="/"><Wordmark /></Link>
          <div className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} className="text-[13.5px] font-[560] transition-colors hover:opacity-70" style={{ color: MUTE }}>{n}</a>
            ))}
          </div>
          <div className="hidden items-center gap-2.5 md:flex">
            {/* Two doors, not one. Both used to point at /login and both said
                something vague; now each names who it is for. The split is
                enforced on the server — a member is refused at Admin Login
                and a studio account at Member Login — so these labels are a
                description of the rule, not a substitute for it. */}
            <Link href="/login" className="rounded-xl px-3.5 py-2 text-[13.5px] font-[650] transition-colors hover:bg-black/[0.04]" style={{ color: INK }}>Admin Login</Link>
            <Link href="/member-login" className="group inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13.5px] font-[680] text-white transition-transform hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%)`, boxShadow: `0 8px 20px ${MAROON}40` }}>
              Member Login <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setOpen((s) => !s)} aria-label="Menu" style={{ color: INK }}>
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
        {open && (
          <div className="mt-2 rounded-2xl p-3 md:hidden" style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(18px)', border: '1px solid rgba(0,103,224,0.08)' }}>
            {NAV.map((n) => (
              <a key={n} href={`#${n.toLowerCase()}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-[14px] font-[560]" style={{ color: INK }}>{n}</a>
            ))}
            <div className="mt-2 flex gap-2 border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
              <Link href="/login" onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 text-center text-[14px] font-[650]" style={{ color: INK, border: '1px solid rgba(0,0,0,0.1)' }}>Admin Login</Link>
              <Link href="/member-login" onClick={() => setOpen(false)} className="flex-1 rounded-xl py-2.5 text-center text-[14px] font-[680] text-white" style={{ background: MAROON }}>Member Login</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

// ── Product mockup (the hero dashboard) ─────────────────────────────────────
function DashboardMock() {
  const bars = [42, 58, 51, 73, 66, 88, 79];
  return (
    <div
      className="relative overflow-hidden rounded-[22px] p-3 sm:p-4"
      style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(10px)', border: '1px solid rgba(0,103,224,0.10)', boxShadow: '0 40px 90px -30px rgba(15,23,42,0.35), 0 12px 30px -12px rgba(15,23,42,0.18)' }}
    >
      {/* window chrome */}
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FECACA' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FEF3C7' }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#CBD5E1' }} />
        <span className="ml-2 rounded-md px-2 py-0.5 text-[9px] font-[600]" style={{ background: 'rgba(0,103,224,0.06)', color: MAROON }}>app.myptstudio.com</span>
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-3 gap-2.5">
        {[
          { l: 'Active Clients', v: '248', d: '+12%', i: <Users size={13} /> },
          { l: 'Revenue (MTD)', v: '₹6.4L', d: '+23%', i: <Wallet size={13} /> },
          { l: 'Sessions', v: '1,092', d: '+8%', i: <CalendarCheck size={13} /> },
        ].map((k) => (
          <div key={k.l} className="rounded-xl p-2.5" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
            <div className="mb-1 flex items-center gap-1" style={{ color: MAROON }}>
              <span className="grid h-5 w-5 place-items-center rounded-md" style={{ background: 'rgba(0,103,224,0.08)' }}>{k.i}</span>
            </div>
            <div className="text-[15px] font-[800]" style={{ color: INK }}>{k.v}</div>
            <div className="flex items-center justify-between">
              <span className="text-[8.5px] font-[600] uppercase tracking-wide" style={{ color: MUTE }}>{k.l}</span>
              <span className="text-[9px] font-[700]" style={{ color: '#059669' }}>{k.d}</span>
            </div>
          </div>
        ))}
      </div>
      {/* chart + list */}
      <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-5">
        <div className="rounded-xl p-3 sm:col-span-3" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10.5px] font-[750]" style={{ color: INK }}>Revenue trend</span>
            <span className="text-[9px] font-[600]" style={{ color: MUTE }}>Last 7 months</span>
          </div>
          <div className="flex h-24 items-end gap-1.5">
            {bars.map((h, i) => (
              <div key={i} className="flex-1 rounded-t-md" style={{ height: `${h}%`, background: i === bars.length - 1 ? `linear-gradient(180deg, ${GOLD_HI}, ${GOLD})` : `linear-gradient(180deg, ${MAROON_HI}, ${MAROON})`, opacity: i === bars.length - 1 ? 1 : 0.85 }} />
            ))}
          </div>
        </div>
        <div className="rounded-xl p-3 sm:col-span-2" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)' }}>
          <span className="text-[10.5px] font-[750]" style={{ color: INK }}>Today's clients</span>
          <div className="mt-2 space-y-2">
            {['AR', 'KP', 'SM', 'DT'].map((n, i) => (
              <div key={n} className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full text-[9px] font-[800] text-white" style={{ background: [MAROON, GOLD, MAROON_HI, '#059669'][i] }}>{n}</span>
                <div className="h-1.5 flex-1 rounded-full" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full" style={{ width: `${[80, 55, 92, 40][i]}%`, background: GOLD }} />
                </div>
                <span className="text-[9px] font-[700]" style={{ color: MUTE }}>{['Done', 'PT', 'Done', 'New'][i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Section shell ───────────────────────────────────────────────────────────
function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return <section id={id} className={`mx-auto max-w-6xl px-5 ${className}`}>{children}</section>;
}
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-[720] uppercase tracking-[0.14em]"
      style={{ background: 'rgba(0,103,224,0.06)', color: MAROON, border: '1px solid rgba(0,103,224,0.10)' }}>
      {children}
    </span>
  );
}

// ── Data ────────────────────────────────────────────────────────────────────
const FEATURES = [
  { i: Users, t: 'Client CRM', d: 'Every client, plan and payment in one profile — no more scattered sheets.' },
  { i: Dumbbell, t: 'Workout Builder', d: 'Drag-and-drop programmes from a rich exercise library, assigned in seconds.' },
  { i: Salad, t: 'Nutrition Planner', d: 'Macro-aware meal plans and daily tracking your clients actually follow.' },
  { i: CalendarCheck, t: 'Attendance', d: 'QR, face and biometric check-in with live occupancy and peak-hour insight.' },
  { i: LineChart, t: 'Progress Tracking', d: 'Strength PRs, volume trends and photos that prove the results you deliver.' },
  { i: Ruler, t: 'Body Composition', d: 'Measurements, body-fat and assessments scored automatically over time.' },
  { i: Wallet, t: 'Revenue Dashboard', d: 'Live revenue, dues and renewals — know exactly where the money is.' },
  { i: FileText, t: 'Invoices', d: 'Branded invoices and receipts generated the moment a payment lands.' },
  { i: CreditCard, t: 'Payments', d: 'Record, reconcile and chase dues without a single spreadsheet.' },
  { i: Inbox, t: 'Lead Management', d: 'Capture enquiries, follow up on time and convert more trials.' },
  { i: Zap, t: 'Automation', d: 'Renewal nudges, check-in reminders and follow-ups that run themselves.' },
  { i: BookOpen, t: 'Exercise Library', d: 'Hundreds of exercises with cues, media and muscle mapping built in.' },
  { i: ClipboardList, t: 'Assessment Forms', d: 'Digital PAR-Q, consent and screening with server-side risk scoring.' },
  { i: Bot, t: 'AI Assistant', d: 'Draft plans, summarise progress and answer client questions in a click.' },
  { i: UsersRound, t: 'Multi-Trainer', d: 'Add your team with per-role permissions and commission tracking.' },
  { i: Building2, t: 'Multi-Tenant', d: 'Run multiple studios from one platform, each fully isolated and secure.' },
];

const SECONDARY = [
  { i: Smartphone, t: 'Mobile friendly' }, { i: Cloud, t: 'Cloud storage' }, { i: Bell, t: 'Notifications' },
  { i: BarChart3, t: 'Reports & analytics' }, { i: ShieldCheck, t: 'Role permissions' }, { i: FileText, t: 'Data export' },
];

const COMPARE = [
  { f: 'One source of truth', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Automated billing & dues', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Workout & nutrition builder', me: true as const, wa: false as const, gs: false as const },
  { f: 'Progress & body composition', me: true as const, wa: false as const, gs: false as const },
  { f: 'Attendance & check-in', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Multi-trainer & permissions', me: true as const, wa: false as const, gs: 'partial' as const },
  { f: 'Built for fitness businesses', me: true as const, wa: false as const, gs: false as const },
];

const TESTIMONIALS = [
  { q: 'We replaced four tools and a pile of spreadsheets with one platform. Our renewals are up 30% because nothing slips through the cracks.', n: 'Studio Owner', r: 'Boutique Fitness Studio' },
  { q: 'Onboarding a client used to take an hour. Now it takes five minutes — plan, nutrition, consent, payment, done.', n: 'Head Coach', r: 'Online Coaching Business' },
  { q: 'For the first time I can see my whole business at a glance. Revenue, attendance, dues — it is all just there.', n: 'Founder', r: 'Strength & Conditioning Gym' },
];

/**
 * Feature bullets per plan. These are marketing copy and stay hardcoded, but
 * the NAME, PRICE, TERM and CLIENT LIMIT all come from the live plan catalogue —
 * they are commercial promises and must match what checkout actually charges.
 *
 * This page previously hardcoded its own price list, which had drifted badly:
 * it advertised ₹999/mo for 30 clients while the system charges ₹1,499/mo with
 * a 5-client cap, and listed two plans ("Studio", "Enterprise") that do not
 * exist. Anyone signing up was being quoted a price the product could not
 * honour, so pricing is now read from the same source of truth as billing.
 */
const PLAN_FEATURES: Record<string, string[]> = {
  starter: ['Client CRM & profiles', 'Workout & nutrition builder', 'Payments & invoices', 'Mobile app access'],
  growth: ['Everything in Starter', 'Progress & body composition', 'Automation & reminders', 'Reports & analytics'],
  professional: ['Everything in Growth', 'Attendance & check-in', 'Commission tracking', 'Priority support'],
  elite: ['Everything in Professional', 'Multi-trainer & permissions', 'AI assistant', 'Dedicated onboarding'],
};

const HIGHLIGHT_PLAN = 'professional';

function planTerm(months: number): string {
  if (months === 1) return '/mo';
  if (months === 12) return '/yr';
  return `/${months} mo`;
}

const FAQ = [
  { q: 'What is MY PT STUDIO?', a: 'A complete operating system for fitness professionals — CRM, workout and nutrition builders, attendance, progress tracking, payments and analytics in one platform, so you can run your entire business from a single place.' },
  { q: 'Who is it for?', a: 'Personal trainers, online coaches, gym owners, fitness studios, strength coaches, sports academies and wellness businesses of any size — from solo coaches to multi-studio chains.' },
  { q: 'Do my clients need to install anything?', a: 'No. The platform is fully web-based and mobile-friendly. You manage everything from any device, and clients can be onboarded in minutes.' },
  { q: 'Can I run more than one studio?', a: 'Yes. Our multi-tenant architecture lets you run multiple studios from one account, each with fully isolated data, its own team, branding and permissions.' },
  { q: 'Is my data secure?', a: 'Every studio is isolated at the database level with row-level security, encrypted connections and role-based access control. Your data is yours, and it is never shared across studios.' },
  { q: 'How do I get started?', a: 'Start free — create your studio in a couple of minutes. Our team reviews it, then helps you import your clients so you are live in a day, not a month.' },
];

// ── Page ────────────────────────────────────────────────────────────────────
type PublicPlan = {
  code: string; name: string; price_inr: number; effective_price_inr: number;
  is_launch: boolean; duration_months: number; client_limit: number | null; best_for: string | null;
};
type PublicStats = { studios: number; trainers: number; active_clients: number; sessions_completed: number };

export default function LandingPage() {
  const [faqOpen, setFaqOpen] = useState<number | null>(0);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [founderSlots, setFounderSlots] = useState<number | null>(null);
  const [trialDays, setTrialDays] = useState(7);
  const [stats, setStats] = useState<PublicStats | null>(null);

  // Public, unauthenticated endpoints. Failures are swallowed on purpose: the
  // marketing page must still render if the API is cold or unreachable, it just
  // renders without live figures rather than with invented ones.
  useEffect(() => {
    const base = (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/+$/, '');
    const url = (p: string) =>
      (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1')
        ? p : `${base}${p}`;

    fetch(url('/api/public/plans'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.data) return;
        setPlans(j.data.plans ?? []);
        setFounderSlots(j.data.founder_slots_remaining ?? null);
        if (j.data.trial_days) setTrialDays(j.data.trial_days);
      })
      .catch(() => {});

    fetch(url('/api/public/stats'))
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.data) setStats(j.data); })
      .catch(() => {});
  }, []);

  // Only state a number once it actually says something. The previous band
  // claimed 12k+ coaches / 1.4M clients / 9M sessions / 40+ countries against a
  // real platform of 3 studios — publishing "0 sessions tracked" instead would
  // be honest but no better, so the band simply hides until the figures earn
  // their place.
  const statBand = stats
    ? ([
      ['Studios', stats.studios],
      ['Coaches', stats.trainers],
      ['Clients managed', stats.active_clients],
      ['Sessions delivered', stats.sessions_completed],
    ] as const).filter(([, v]) => v > 0)
    : [];
  const showStats = stats != null && stats.studios >= 25;

  return (
    <div className="relative min-h-screen" style={{ background: '#fff', color: INK }}>
      {/* ambient background — clipped so the decorative orbs never create
          horizontal document overflow. (We deliberately avoid overflow-x on the
          page wrapper itself: it forces overflow-y to `auto`, turning the
          wrapper into a nested scroll container that breaks document scrolling
          on Android/desktop while iOS's momentum layer papers over it.) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full" style={{ background: `radial-gradient(circle, ${MAROON}18, transparent 68%)` }} />
        <div className="absolute -right-40 top-24 h-[560px] w-[560px] rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}22, transparent 68%)` }} />
        <div className="absolute inset-0" style={{ background: 'radial-gradient(120% 90% at 50% -8%, rgba(0,103,224,0.06), transparent 60%)' }} />
      </div>

      <Nav />

      {/* ── HERO (Apple-style: centered logo, big type, pill CTAs) ──
          Top padding adds exactly the notch height on top of the base
          clearance so the logo always sits below the fixed topbar +
          notification area, never cramped under it on notched phones. */}
      <Section id="solutions" className="pb-16 text-center pt-[calc(max(env(safe-area-inset-top),2.75rem)+6.5rem)] sm:pt-[calc(max(env(safe-area-inset-top),2.75rem)+7.5rem)]">
        <Reveal>
          {/* Wide lockup, sized responsively. The neon is dialled back slightly
              here because the eyebrow pill sits immediately beneath it and a
              full-strength halo bleeds into that text. */}
          <div className="mb-7 flex justify-center">
            <span className="sm:hidden"><BrandLogoWide width={252} priority intensity={0.85} /></span>
            <span className="hidden sm:inline"><BrandLogoWide width={340} priority intensity={0.85} /></span>
          </div>
        </Reveal>
        <Reveal delay={0.04}>
          <Eyebrow><Sparkles size={13} /> The operating system for fitness professionals</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mx-auto mt-6 max-w-4xl text-[40px] font-[860] leading-[1.03] tracking-[-0.035em] sm:text-[68px]">
            Run your entire<br className="hidden sm:block" /> fitness business
            <br className="hidden sm:block" /> <span style={gradText}>from one platform.</span>
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-relaxed sm:text-[19px]" style={{ color: MUTE }}>
            MY PT STUDIO is the software that runs modern personal trainers, coaches and studios —
            clients, workouts, nutrition, attendance, payments and analytics, beautifully unified.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/start-free" className="group inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 text-[15px] font-[720] text-white transition-transform hover:-translate-y-0.5 sm:w-auto"
              style={{ background: `linear-gradient(135deg, ${MAROON} 0%, ${MAROON_DEEP} 100%)`, boxShadow: `0 14px 34px ${MAROON}44` }}>
              Start free <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mt-3.5 text-[12.5px]" style={{ color: MUTE }}>No credit card required · Set up in a day · Cancel anytime</p>
        </Reveal>

        <Reveal delay={0.2} y={34}>
          <div className="relative mx-auto mt-14 max-w-4xl">
            {/* floating accent cards */}
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.5, duration: 0.6 }}
              className="absolute -left-4 top-10 z-10 hidden rounded-2xl p-3 sm:-left-10 sm:block"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -18px rgba(15,23,42,0.3)' }}>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: '#059669' }}><Check size={16} /></span>
                <div className="text-left">
                  <div className="text-[12px] font-[800]" style={{ color: INK }}>Payment received</div>
                  <div className="text-[10px]" style={{ color: MUTE }}>₹8,000 · Renewal</div>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.65, duration: 0.6 }}
              className="absolute -right-4 bottom-8 z-10 hidden rounded-2xl p-3 sm:-right-10 sm:block"
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 20px 40px -18px rgba(15,23,42,0.3)' }}>
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-lg text-white" style={{ background: GOLD }}><LineChart size={16} /></span>
                <div className="text-left">
                  <div className="text-[12px] font-[800]" style={{ color: INK }}>+18% this month</div>
                  <div className="text-[10px]" style={{ color: MUTE }}>Active clients</div>
                </div>
              </div>
            </motion.div>
            <DashboardMock />
          </div>
        </Reveal>
      </Section>

      {/* ── TRUSTED BY ── */}
      <Section className="py-14">
        <Reveal>
          <p className="text-center text-[12px] font-[700] uppercase tracking-[0.18em]" style={{ color: MUTE }}>
            Trusted by fitness businesses worldwide
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['IRONWORKS', 'PULSE STUDIO', 'APEX COACHING', 'CORE ACADEMY', 'VITAL GYM', 'FORGE PT'].map((b) => (
              <span key={b} className="text-[15px] font-[820] tracking-tight" style={{ color: INK, opacity: 0.42 }}>{b}</span>
            ))}
          </div>
          {/* Live platform figures, shown only once they are worth stating.
              This band previously read "12k+ active coaches · 1.4M+ clients
              managed · 9M+ sessions tracked · 40+ countries" against a platform
              of three studios — none of it measured, and "countries" is not
              even a field the schema records. */}
          {showStats && statBand.length > 0 && (
            <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {statBand.map(([l, v]) => (
                <div key={l} className="text-center">
                  <div className="text-[28px] font-[850] tracking-tight tabular-nums" style={gradText}>
                    {v.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[12px] font-[600]" style={{ color: MUTE }}>{l}</div>
                </div>
              ))}
            </div>
          )}
        </Reveal>
      </Section>

      {/* ── PROBLEM → SOLUTION ── */}
      <Section className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>The old way is broken</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">
            Your business shouldn't live in <span style={{ color: MAROON }}>ten browser tabs.</span>
          </h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>
            Spreadsheets, chat threads and paper forms don't scale. MY PT STUDIO replaces the chaos with one calm, connected system.
          </p>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl p-7" style={{ background: 'rgba(15,23,42,0.03)', border: '1px solid rgba(15,23,42,0.10)' }}>
              <span className="text-[12px] font-[720] uppercase tracking-[0.14em]" style={{ color: MAROON }}>Before</span>
              <ul className="mt-5 space-y-3.5">
                {['Client data scattered across Excel & Sheets', 'Plans and updates lost in WhatsApp', 'Manual billing, missed renewals & dues', 'Attendance on paper, no real insight', 'No single view of the business'].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14.5px]" style={{ color: INK }}>
                    <X size={18} className="mt-0.5 shrink-0" style={{ color: '#DC2626' }} /> <span style={{ opacity: 0.82 }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="relative h-full overflow-hidden rounded-3xl p-7 text-white" style={{ background: `linear-gradient(150deg, ${MAROON} 0%, ${MAROON_DEEP} 88%)`, boxShadow: `0 30px 60px -24px ${MAROON}88` }}>
              <div aria-hidden className="absolute -right-16 -top-16 h-52 w-52 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}55, transparent 70%)` }} />
              <span className="relative text-[12px] font-[720] uppercase tracking-[0.14em]" style={{ color: GOLD_HI }}>With MY PT STUDIO</span>
              <ul className="relative mt-5 space-y-3.5">
                {['One profile per client — plans, payments, progress', 'Everything in sync, on every device', 'Automated invoices, dues & renewal nudges', 'QR / face check-in with live analytics', 'Your whole business at a glance'].map((p) => (
                  <li key={p} className="flex items-start gap-3 text-[14.5px]">
                    <span className="mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full" style={{ background: GOLD }}><Check size={12} style={{ color: MAROON_DEEP }} /></span>
                    <span style={{ opacity: 0.94 }}>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* ── FEATURES ── */}
      <Section id="features" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Everything in one platform</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">One platform. <span style={gradText}>Every tool you need.</span></h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>From the first enquiry to the tenth renewal — every part of your business, thoughtfully connected.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, idx) => (
            <Reveal key={f.t} delay={(idx % 4) * 0.05}>
              <div className="group h-full rounded-2xl p-5 transition-all hover:-translate-y-1"
                style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                <span className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-105"
                  style={{ background: `linear-gradient(135deg, ${MAROON}14, ${GOLD}18)`, color: MAROON }}>
                  <f.i size={19} />
                </span>
                <h3 className="mt-4 text-[15px] font-[750]" style={{ color: INK }}>{f.t}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed" style={{ color: MUTE }}>{f.d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            {SECONDARY.map((s) => (
              <span key={s.t} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-[600]"
                style={{ background: 'rgba(0,103,224,0.05)', color: INK, border: '1px solid rgba(0,103,224,0.08)' }}>
                <s.i size={14} style={{ color: MAROON }} /> {s.t}
              </span>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── PLATFORM SHOWCASE ── */}
      <Section className="py-20">
        <Reveal>
          <div className="overflow-hidden rounded-[32px] p-8 sm:p-12" style={{ background: 'linear-gradient(160deg, #F8FAFC 0%, #F1F5F9 100%)', border: '1px solid rgba(0,103,224,0.08)' }}>
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div>
                <Eyebrow>Beautiful on every screen</Eyebrow>
                <h2 className="mt-5 text-[28px] font-[820] leading-tight tracking-[-0.02em] sm:text-[38px]">Desktop, tablet, phone — <span style={{ color: MAROON }}>your studio travels with you.</span></h2>
                <p className="mt-4 text-[15.5px]" style={{ color: MUTE }}>Coach from the gym floor, review revenue from the sofa, onboard a client from your phone. Same data, everywhere, instantly.</p>
                <ul className="mt-6 space-y-3">
                  {['Native-feeling web app — nothing to install', 'Real-time sync across your whole team', 'Works beautifully on any device'].map((p) => (
                    <li key={p} className="flex items-center gap-2.5 text-[14.5px] font-[560]" style={{ color: INK }}>
                      <span className="grid h-5 w-5 place-items-center rounded-full text-white" style={{ background: MAROON }}><Check size={12} /></span> {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="rounded-2xl p-2" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 30px 60px -30px rgba(15,23,42,0.35)' }}>
                  <DashboardMock />
                </div>
                {/* phone frame */}
                <div className="absolute -bottom-6 -right-2 w-28 rounded-[20px] p-1.5 sm:w-32" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 24px 44px -18px rgba(15,23,42,0.4)' }}>
                  <div className="rounded-[15px] p-2" style={{ background: `linear-gradient(160deg, ${MAROON}, ${MAROON_DEEP})` }}>
                    <div className="text-[8px] font-[700] text-white opacity-80">Today</div>
                    <div className="mt-0.5 text-[15px] font-[850] text-white">₹6.4L</div>
                    <div className="mt-2 space-y-1.5">
                      {[70, 45, 88].map((w, i) => (
                        <div key={i} className="h-1.5 rounded-full bg-white/25"><div className="h-full rounded-full" style={{ width: `${w}%`, background: GOLD_HI }} /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── WHY / COMPARE ── */}
      <Section className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Why MY PT STUDIO</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Built for fitness businesses — <span style={gradText}>not adapted for them.</span></h2>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="mt-12 overflow-hidden rounded-3xl" style={{ border: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="grid grid-cols-5 items-center px-5 py-4 text-[12px] font-[700]" style={{ background: '#F8FAFC', color: MUTE }}>
              <div className="col-span-2 text-left" style={{ color: INK }}>Capability</div>
              <div className="text-center" style={{ color: MAROON }}>MY PT STUDIO</div>
              <div className="text-center">Excel / Sheets</div>
              <div className="text-center">WhatsApp</div>
            </div>
            {COMPARE.map((row, i) => (
              <div key={row.f} className="grid grid-cols-5 items-center px-5 py-3.5 text-[13.5px]" style={{ background: i % 2 ? 'rgba(0,0,0,0.015)' : '#fff', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                <div className="col-span-2 font-[600]" style={{ color: INK }}>{row.f}</div>
                <div className="flex justify-center"><Cell v={row.me} strong /></div>
                <div className="flex justify-center"><Cell v={row.gs} /></div>
                <div className="flex justify-center"><Cell v={row.wa} /></div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px]" style={{ color: MUTE }}>Generic gym software gets you part of the way. MY PT STUDIO is the whole journey.</p>
        </Reveal>
      </Section>

      {/* ── TESTIMONIALS ── */}
      <Section id="resources" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Loved by fitness businesses</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">The platform coaches switch to and <span style={{ color: MAROON }}>never leave.</span></h2>
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <Reveal key={t.n} delay={i * 0.07}>
              <div className="flex h-full flex-col rounded-3xl p-6" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                <Quote size={26} style={{ color: GOLD }} />
                <div className="mt-2 flex gap-0.5">{Array.from({ length: 5 }).map((_, s) => <Star key={s} size={14} style={{ color: GOLD, fill: GOLD }} />)}</div>
                <p className="mt-3 flex-1 text-[14.5px] leading-relaxed" style={{ color: INK, opacity: 0.86 }}>“{t.q}”</p>
                <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <div className="text-[13.5px] font-[750]" style={{ color: INK }}>{t.n}</div>
                  <div className="text-[12px]" style={{ color: MUTE }}>{t.r}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── PRICING ── */}
      <Section id="pricing" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Simple, scalable pricing</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Pricing that grows <span style={gradText}>with your studio.</span></h2>
          <p className="mt-4 text-[16px]" style={{ color: MUTE }}>
            Every plan starts with a {trialDays}-day free trial. No card required, no lock-in.
          </p>
          {founderSlots != null && founderSlots > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12.5px] font-[700]"
              style={{ background: `${GOLD}22`, color: MAROON_DEEP }}>
              <Star size={13} /> Founder&apos;s Club — {founderSlots} lifetime-locked {founderSlots === 1 ? 'place' : 'places'} left
            </p>
          )}
        </Reveal>

        {/* Rendered from the live catalogue. If it cannot be reached the section
            shows nothing rather than falling back to stale hardcoded prices. */}
        {plans.length === 0 ? (
          <p className="mt-12 text-center text-[14px]" style={{ color: MUTE }}>
            Plan pricing is loading — or <Link href="/login" className="underline" style={{ color: MAROON }}>sign in</Link> to see your options.
          </p>
        ) : (
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map((p, i) => {
              const highlight = p.code === HIGHLIGHT_PLAN;
              const limit = p.client_limit == null ? 'Unlimited active clients' : `Up to ${p.client_limit} active clients`;
              const feats = [limit, ...(PLAN_FEATURES[p.code] ?? [])];
              return (
                <Reveal key={p.code} delay={i * 0.05}>
                  <div className="relative flex h-full flex-col rounded-3xl p-6"
                    style={highlight
                      ? { background: `linear-gradient(160deg, ${MAROON} 0%, ${MAROON_DEEP} 92%)`, color: '#fff', boxShadow: `0 30px 60px -26px ${MAROON}99`, border: '1px solid transparent' }
                      : { background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
                    {highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10.5px] font-[800] uppercase tracking-wide" style={{ background: GOLD, color: MAROON_DEEP }}>Most popular</span>
                    )}
                    {p.is_launch && !highlight && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[10.5px] font-[800] uppercase tracking-wide" style={{ background: GOLD, color: MAROON_DEEP }}>Launch offer</span>
                    )}
                    <div className="text-[15px] font-[780]" style={{ color: highlight ? '#fff' : INK }}>{p.name}</div>
                    <div className="mt-1 text-[12px]" style={{ color: highlight ? 'rgba(255,255,255,0.7)' : MUTE }}>{p.best_for}</div>
                    <div className="mt-4 flex items-end gap-1.5">
                      <span className="text-[32px] font-[860] tracking-tight" style={{ color: highlight ? '#fff' : INK }}>
                        ₹{p.effective_price_inr.toLocaleString('en-IN')}
                      </span>
                      <span className="pb-1.5 text-[13px]" style={{ color: highlight ? 'rgba(255,255,255,0.7)' : MUTE }}>
                        {planTerm(p.duration_months)}
                      </span>
                    </div>
                    {/* Struck-through list price only when a launch discount is
                        genuinely active — never as a permanent fake anchor. */}
                    {p.is_launch && p.effective_price_inr < p.price_inr && (
                      <div className="mt-0.5 text-[12.5px]">
                        <span className="line-through" style={{ color: highlight ? 'rgba(255,255,255,0.6)' : MUTE }}>
                          ₹{p.price_inr.toLocaleString('en-IN')}
                        </span>
                        <span className="ml-1.5 font-[700]" style={{ color: highlight ? GOLD_HI : '#059669' }}>
                          save ₹{(p.price_inr - p.effective_price_inr).toLocaleString('en-IN')}
                        </span>
                      </div>
                    )}
                    <Link href="/login" className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13.5px] font-[720] transition-transform hover:-translate-y-0.5"
                      style={highlight ? { background: GOLD, color: MAROON_DEEP } : { background: MAROON, color: '#fff' }}>
                      Start {trialDays}-day trial <ArrowRight size={15} />
                    </Link>
                    <ul className="mt-6 space-y-2.5">
                      {feats.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-[13px]" style={{ color: highlight ? 'rgba(255,255,255,0.92)' : INK }}>
                          <Check size={15} className="mt-0.5 shrink-0" style={{ color: highlight ? GOLD_HI : '#059669' }} />
                          <span style={{ opacity: highlight ? 1 : 0.82 }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              );
            })}
          </div>
        )}
      </Section>

      {/* ── FAQ ── */}
      <Section id="about" className="py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Questions, answered</Eyebrow>
          <h2 className="mt-5 text-[30px] font-[820] leading-tight tracking-[-0.02em] sm:text-[42px]">Everything you need to know.</h2>
        </Reveal>
        <div className="mx-auto mt-10 max-w-3xl space-y-3">
          {FAQ.map((item, i) => {
            const open = faqOpen === i;
            return (
              <Reveal key={item.q} delay={i * 0.03}>
                <div className="overflow-hidden rounded-2xl" style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)' }}>
                  <button onClick={() => setFaqOpen(open ? null : i)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left">
                    <span className="text-[15px] font-[680]" style={{ color: INK }}>{item.q}</span>
                    <ChevronDown size={18} className="shrink-0 transition-transform" style={{ color: MAROON, transform: open ? 'rotate(180deg)' : 'none' }} />
                  </button>
                  {open && <div className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: MUTE }}>{item.a}</div>}
                </div>
              </Reveal>
            );
          })}
        </div>
      </Section>

      {/* ── FINAL CTA ── */}
      <Section className="pb-24 pt-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-[36px] px-8 py-16 text-center text-white sm:px-16" style={{ background: `linear-gradient(150deg, ${MAROON} 0%, ${MAROON_DEEP} 90%)` }}>
            <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}44, transparent 70%)` }} />
            <div aria-hidden className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full" style={{ background: `radial-gradient(circle, ${GOLD}33, transparent 70%)` }} />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-[30px] font-[850] leading-tight tracking-[-0.02em] sm:text-[46px]">Ready to build your fitness business?</h2>
              <p className="mx-auto mt-4 max-w-xl text-[16px]" style={{ color: 'rgba(255,255,255,0.82)' }}>Join the coaches and studios running everything on one platform. Start free today.</p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/start-free" className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-7 py-3.5 text-[15px] font-[760] transition-transform hover:-translate-y-0.5 sm:w-auto" style={{ background: GOLD, color: MAROON_DEEP }}>
                  Start free <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* ── FOOTER ── */}
      <footer className="border-t" style={{ borderColor: 'rgba(0,0,0,0.07)' }}>
        <Section className="py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Wordmark />
              <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed" style={{ color: MUTE }}>
                The operating system for modern personal trainers, coaches and studios. Grow faster, coach better, scale smarter.
              </p>
            </div>
            {[
              ['Product', ['Features', 'Pricing', 'Platform', 'Mobile']],
              ['Company', ['About', 'Resources', 'Careers', 'Contact']],
              ['Legal', ['Privacy', 'Terms', 'Security', 'DPA']],
            ].map(([h, items]) => (
              <div key={h as string}>
                <div className="text-[12px] font-[750] uppercase tracking-[0.12em]" style={{ color: INK }}>{h as string}</div>
                <ul className="mt-4 space-y-2.5">
                  {(items as string[]).map((it) => (
                    <li key={it}><a href="#features" className="text-[13.5px] transition-colors hover:opacity-60" style={{ color: MUTE }}>{it}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-6 sm:flex-row" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
            <p className="text-[12.5px]" style={{ color: MUTE }}>© {new Date().getFullYear()} MY PT STUDIO. All rights reserved.</p>
            <div className="flex items-center gap-1.5 text-[12px] font-[600]" style={{ color: MUTE }}>
              <ShieldCheck size={14} style={{ color: MAROON }} /> Enterprise-grade security · Multi-tenant isolation
            </div>
          </div>
        </Section>
      </footer>
    </div>
  );
}

// comparison cell
function Cell({ v, strong = false }: { v: boolean | 'partial'; strong?: boolean }) {
  if (v === true) return <span className="grid h-6 w-6 place-items-center rounded-full text-white" style={{ background: strong ? MAROON : '#059669' }}><Check size={13} /></span>;
  if (v === 'partial') return <span className="h-1 w-4 rounded-full" style={{ background: '#FBBF24' }} />;
  return <X size={16} style={{ color: '#CBD5E1' }} />;
}
