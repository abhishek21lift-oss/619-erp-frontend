'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  CalendarClock,
  Check,
  ClipboardList,
  Dumbbell,
  IndianRupee,
  MessageCircle,
  Repeat,
  TrendingUp,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, PRIMARY_BUTTON, SECONDARY_BUTTON, SHADOW, STAGE } from './tokens';
import LandingNav from './LandingNav';
import FaqSection from './FaqSection';
import FinalCta from './FinalCta';
import Footer from './Footer';

/**
 * The `/pt-os` marketing page.
 *
 * It used to be plain Tailwind on white — no nav, no footer, no product
 * surface — while every other public page ran on the soft-UI system. This
 * composes the same primitives as the homepage so the two pages read as one
 * product, and gives PT OS its own argument: the coaching loop, the three
 * things the workspace holds, and the India-specific pieces.
 *
 * No invented clients, rupee figures or screenshots: the hero visual is a
 * diagram of the product's real loop, drawn from the same tokens as the page.
 */

const NAV = [
  { label: 'Product', href: '#product' },
  { label: 'Built for India', href: '#india' },
  { label: 'Why switch', href: '#switch' },
  { label: 'Questions', href: '#questions' },
] as const;

const LOOP: { n: string; icon: ReactNode; title: string; body: string }[] = [
  {
    n: '01',
    icon: <ClipboardList size={16} aria-hidden />,
    title: 'Assess',
    body: 'PAR-Q, goals, measurements and history at onboarding.',
  },
  {
    n: '02',
    icon: <Dumbbell size={16} aria-hidden />,
    title: 'Programme',
    body: 'Blocks, templates and prescriptions from the exercise library.',
  },
  {
    n: '03',
    icon: <CalendarClock size={16} aria-hidden />,
    title: 'Train',
    body: 'Sessions, attendance and check-ins on the same client.',
  },
  {
    n: '04',
    icon: <TrendingUp size={16} aria-hidden />,
    title: 'Review',
    body: 'Measurements, strength and adherence over time.',
  },
  {
    n: '05',
    icon: <Repeat size={16} aria-hidden />,
    title: 'Renew',
    body: 'The package runs out — flagged before the client lapses.',
  },
];

const PANELS: { icon: ReactNode; title: string; body: string; chips: string[]; wide?: boolean }[] = [
  {
    icon: <Users size={19} aria-hidden />,
    title: 'The client record',
    body:
      'Every client is one live record: profiles, PAR-Q and assessments, goals, measurements, notes, attendance and payment history. Every screen in PT OS reads from it, so nothing is entered twice or remembered in a chat.',
    chips: ['Profiles', 'Assessments', 'Goals', 'Measurements', 'Notes', 'Attendance', 'Payment history'],
    wide: true,
  },
  {
    icon: <Dumbbell size={19} aria-hidden />,
    title: 'The work itself',
    body:
      'Build structured programmes from the exercise library, add nutrition plans, and track strength and adherence over time — so a progress review is evidence, not a feeling.',
    chips: ['Programme builder', 'Templates', 'Exercise library', 'Nutrition plans', 'Progress tracking'],
  },
  {
    icon: <Wallet size={19} aria-hidden />,
    title: 'The business around it',
    body:
      'Invoices, UPI and cash payments, dues and reminders, all reconciled against the same client in rupees — without a second ledger or a spreadsheet on your phone.',
    chips: ['Invoices', 'UPI & cash', 'Dues', 'Receipts', 'WhatsApp reminders', 'QR check-in'],
  },
];

const BEFORE = [
  'A session lives in one chat',
  'A payment lives in another',
  'A renewal date lives in nobody’s memory',
];

const AFTER = [
  'Sessions, attendance and history on one record',
  'Payments and dues reconciled in rupees',
  'Renewals flagged before the client lapses',
];

const FAQ = [
  {
    q: 'Who is PT OS for?',
    a: 'Independent personal trainers, boutique PT studios, strength coaches and online coaches in India — anyone who trains clients and also runs the business.',
  },
  {
    q: 'How is this different from a diary or Excel sheet?',
    a: 'A diary cannot remind a client to renew, reconcile a UPI payment, or show attendance trends. PT OS keeps clients, sessions, payments and renewals in one searchable record.',
  },
  {
    q: 'How is this different from generic gym management software?',
    a: 'Gym software is built for front-desk operations across hundreds of members. PT OS is built around the trainer-client relationship: programmes, assessments, progress reviews and personal follow-ups.',
  },
  {
    q: 'Does it work for online coaching?',
    a: 'Yes. Programmes, diet plans, progress tracking and payments work the same whether the client trains in person or online.',
  },
  {
    q: 'What does it cost to try?',
    a: 'Every plan starts with a 7-day free trial. No card is required to start.',
  },
];

export default function PtOsLanding() {
  return (
    <div className="relative min-h-screen" style={{ background: C.canvas, color: C.body }}>
      <LandingNav items={NAV} />

      <main id="main-content">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section aria-labelledby="pt-os-title" className="relative overflow-hidden">
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0" style={{ background: STAGE.light }} />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: STAGE.grid,
                backgroundSize: STAGE.gridSize,
                maskImage: STAGE.gridMask,
                WebkitMaskImage: STAGE.gridMask,
              }}
            />
            <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: STAGE.horizon }} />
          </div>

          <Container className="relative pb-14 pt-[calc(max(env(safe-area-inset-top),0px)+7rem)] sm:pb-20 sm:pt-[calc(max(env(safe-area-inset-top),0px)+8.5rem)]">
            <div className="mx-auto max-w-[860px] text-center">
              <Reveal>
                <p className="text-[17px] font-[600] tracking-[-0.01em]" style={{ color: C.blueHi }}>
                  PT OS · Personal trainer software
                </p>
              </Reveal>

              <Reveal delay={0.06}>
                <h1
                  id="pt-os-title"
                  className="mt-3 text-[clamp(2.6rem,6.2vw,4.6rem)] font-[600] leading-[1.03] tracking-[-0.035em]"
                  style={{ color: C.ink }}
                >
                  Personal trainer software
                  <br className="hidden sm:block" /> built for how India coaches.
                </h1>
              </Reveal>

              <Reveal delay={0.14}>
                <p
                  className="mx-auto mt-6 max-w-[620px] text-[17px] leading-[1.5] sm:text-[20px]"
                  style={{ color: C.muted }}
                >
                  Clients, programmes, assessments, nutrition, progress, payments and
                  renewals in one professional workspace — built for the way personal
                  trainers in India actually work.
                </p>
              </Reveal>

              <Reveal delay={0.22}>
                <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                  <Link
                    href="/start-free"
                    className={`${PRIMARY_BUTTON} h-12 w-auto max-sm:w-full px-7 text-[17px]`}
                  >
                    Start free
                  </Link>
                  <a
                    href="#product"
                    className={`${SECONDARY_BUTTON} h-12 w-auto max-sm:w-full px-7 text-[17px]`}
                  >
                    See what’s inside
                  </a>
                </div>
              </Reveal>

              <Reveal delay={0.3} y={0}>
                <p className="mt-4 text-[13px]" style={{ color: C.faint }}>
                  Free trial · No card required · Built for Indian trainers
                </p>
              </Reveal>
            </div>

            {/* The coaching loop — a diagram of the product, not invented data. */}
            <Reveal delay={0.3}>
              <div
                className="mx-auto mt-14 max-w-[600px] rounded-[20px] p-5 sm:p-6"
                style={{ background: C.panel, boxShadow: SHADOW.panel }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] font-[600]" style={{ color: C.ink }}>
                    The coaching loop
                  </p>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-[500]"
                      style={{ background: C.blueWash, color: C.blueHi }}
                    >
                      PT OS
                    </span>
                  </div>

                  <ol className="mt-4 space-y-1">
                    {LOOP.map((step) => (
                      <li key={step.title} className="flex items-center gap-3 rounded-[12px] px-2 py-2.5">
                        <span
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px]"
                          style={{ background: C.canvasAlt, color: C.blueHi }}
                          aria-hidden
                        >
                          {step.icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className="text-[13.5px] font-[600]" style={{ color: C.ink }}>
                              {step.title}
                            </span>
                            <span className="text-[11px] tabular-nums" style={{ color: C.faint }}>
                              {step.n}
                            </span>
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-[1.45]" style={{ color: C.muted }}>
                            {step.body}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ol>

                  <p className="mt-4 border-t pt-3 text-[12px]" style={{ borderColor: C.lineSoft, color: C.faint }}>
                    Every step writes to the same client record.
                  </p>
                </div>
              </Reveal>
          </Container>
        </section>

        {/* ── What PT OS holds ─────────────────────────────────────────── */}
        <Section id="product" aria-labelledby="product-title">
          <Container>
            <SectionHeader
              id="product-title"
              eyebrow="What PT OS is"
              title="One workspace for the whole coaching relationship"
              sub="Six disconnected tools is how most trainers run a business today. PT OS puts the client, the work and the money on one record — so nothing has to be remembered twice."
            />

            <div className="mt-14 grid gap-4 lg:grid-cols-2">
              {PANELS.map((panel, i) => (
                <Reveal
                  key={panel.title}
                  delay={0.05 + i * 0.05}
                  className={panel.wide ? 'lg:col-span-2' : 'h-full'}
                >
                  <article
                    className="flex h-full flex-col rounded-[20px] p-6 sm:p-7"
                    style={{ background: C.panel, boxShadow: SHADOW.card }}
                  >
                    <div
                      className={
                        panel.wide
                          ? 'grid h-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center'
                          : ''
                      }
                    >
                      <div>
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl"
                            style={{ background: C.blueWash, color: C.blueHi }}
                            aria-hidden
                          >
                            {panel.icon}
                          </span>
                          <h3
                            className="text-[19px] font-[600] tracking-[-0.02em]"
                            style={{ color: C.ink }}
                          >
                            {panel.title}
                          </h3>
                        </div>

                        <p
                          className="mt-4 max-w-[74ch] text-[13.5px] leading-[1.7]"
                          style={{ color: C.muted }}
                        >
                          {panel.body}
                        </p>
                      </div>

                      {panel.wide ? (
                        <ul
                          className="mt-5 grid gap-1 rounded-[16px] p-3 sm:grid-cols-2 lg:mt-0"
                          style={{ background: C.canvasAlt }}
                        >
                          {panel.chips.map((chip) => (
                            <li
                              key={chip}
                              className="flex items-center gap-2 px-2 py-1.5 text-[12px]"
                              style={{ color: C.body }}
                            >
                              <Check size={12} strokeWidth={3} style={{ color: C.blueHi }} aria-hidden />
                              {chip}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <ul className="mt-5 flex flex-wrap gap-2">
                          {panel.chips.map((chip) => (
                            <li
                              key={chip}
                              className="rounded-full px-3 py-1.5 text-[12px]"
                              style={{ background: C.canvasAlt, color: C.body }}
                            >
                              {chip}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </article>
                </Reveal>
              ))}
            </div>
          </Container>
        </Section>

        {/* ── Built for India ──────────────────────────────────────────── */}
        <Section id="india" alt aria-labelledby="india-title">
          <Container>
            <SectionHeader
              id="india-title"
              eyebrow="Built for India"
              title="Built for India, not adapted from a generic CRM"
              sub="The two things that decide whether a trainer keeps using a system: getting paid the way clients actually pay, and following up where clients actually reply."
            />

            <div className="mt-14 grid gap-4 sm:grid-cols-2">
              <Reveal delay={0.05} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[20px] p-6 sm:p-7"
                  style={{ background: C.panel, boxShadow: SHADOW.card }}
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-[12px]"
                    style={{ background: C.goldSoft, color: C.goldHi }}
                    aria-hidden
                  >
                    <IndianRupee size={19} />
                  </span>
                  <h3 className="mt-4 text-[18px] font-[600] tracking-[-0.015em]" style={{ color: C.ink }}>
                    Payments trainers actually receive
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.55]" style={{ color: C.muted }}>
                    Record cash and UPI transfers, verify them before marking paid, and track dues,
                    invoices and package balances in rupees — no side spreadsheet.
                  </p>
                </article>
              </Reveal>

              <Reveal delay={0.1} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[20px] p-6 sm:p-7"
                  style={{ background: C.panel, boxShadow: SHADOW.card }}
                >
                  <span
                    className="grid h-11 w-11 place-items-center rounded-[12px]"
                    style={{ background: C.blueWash, color: C.blueHi }}
                    aria-hidden
                  >
                    <MessageCircle size={19} />
                  </span>
                  <h3 className="mt-4 text-[18px] font-[600] tracking-[-0.015em]" style={{ color: C.ink }}>
                    Follow-ups where clients reply
                  </h3>
                  <p className="mt-2.5 text-[14px] leading-[1.55]" style={{ color: C.muted }}>
                    Renewal reminders, birthday wishes and check-in nudges go out on WhatsApp, and
                    QR check-in runs on a phone at the studio door.
                  </p>
                </article>
              </Reveal>
            </div>
          </Container>
        </Section>

        {/* ── Why switch ───────────────────────────────────────────────── */}
        <Section id="switch" aria-labelledby="switch-title">
          <Container>
            <SectionHeader
              id="switch-title"
              eyebrow="Why switch"
              title="Replace scattered spreadsheets, notes and messaging"
              sub="Today a session lives in one chat, a payment in another, and a renewal date in nobody’s memory. PT OS makes them one record: when a package runs out, the renewal is flagged before the client lapses, with the follow-up message ready to send."
            />

            <div className="mt-12 grid gap-4 lg:grid-cols-2">
              <Reveal className="h-full">
                <div
                  className="h-full rounded-[20px] p-6 sm:p-7"
                  style={{ background: C.canvasAlt }}
                >
                  <p className="text-[14px] font-[600]" style={{ color: C.muted }}>
                    Today
                  </p>
                  <ul className="mt-5 space-y-3.5">
                    {BEFORE.map((line) => (
                      <li key={line} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                          style={{ background: C.redSoft, color: C.red }}
                          aria-hidden
                        >
                          <X size={13} strokeWidth={3} />
                        </span>
                        <span className="text-[14px] leading-[1.5]" style={{ color: C.muted }}>
                          {line}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={0.08} className="h-full">
                <div
                  className="h-full rounded-[20px] p-6 sm:p-7"
                  style={{ background: C.panel, border: `1px solid ${C.blue}`, boxShadow: SHADOW.card }}
                >
                  <p className="text-[14px] font-[600]" style={{ color: C.blueHi }}>
                    With PT OS
                  </p>
                  <ul className="mt-5 space-y-3.5">
                    {AFTER.map((line) => (
                      <li key={line} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full"
                          style={{ background: C.blueWashStrong, color: C.blueHi }}
                          aria-hidden
                        >
                          <Check size={13} strokeWidth={3} />
                        </span>
                        <span
                          className="text-[14px] leading-[1.5]"
                          style={{ color: C.ink }}
                        >
                          {line}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            </div>

            <Reveal delay={0.12}>
              <p
                className="mx-auto mt-8 max-w-2xl text-center text-[13px] leading-[1.7]"
                style={{ color: C.faint }}
              >
                Generic gym software tracks front-desk operations for hundreds of members. PT OS
                tracks the coaching relationship — programmes, assessments, progress photos and
                personal follow-ups — which is what a personal training business actually sells.
              </p>
            </Reveal>
          </Container>
        </Section>

        <FaqSection
          id="questions"
          eyebrow="Questions"
          title="Questions trainers ask before starting"
          sub="The things trainers want to know before they move their business into one place."
          items={FAQ}
        />

        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}
