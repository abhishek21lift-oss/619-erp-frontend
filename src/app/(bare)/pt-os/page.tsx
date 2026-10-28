import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Dumbbell } from 'lucide-react';
import {
  C,
  PRIMARY_BUTTON,
  SECONDARY_BUTTON,
  SHADOW,
  STAGE,
} from '@/components/landing/tokens';

export const metadata: Metadata = {
  title: 'PT OS: Personal Trainer Software for India',
  description:
    'PT OS helps Indian personal trainers run clients, programmes, sessions, payments and renewals in one workspace. Start free today.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/pt-os' },
  openGraph: {
    url: 'https://myptstudio.com/pt-os',
    title: 'PT OS: Personal Trainer Software for India',
    description:
      'Clients, programmes, sessions, payments and renewals for Indian personal trainers — in one professional workspace.',
    type: 'website',
  },
};

const features = [
  ['Client management', 'Profiles, assessments, goals, measurements, notes, attendance and history in one place.'],
  ['Programme building', 'Create structured training programmes, templates and exercise prescriptions for your clients.'],
  ['Nutrition planning', 'Keep nutrition planning and client preferences alongside the coaching relationship.'],
  ['Progress tracking', 'Track measurements, strength, adherence and progress over time so reviews are evidence-led.'],
  ['Payments & billing', 'Manage invoices, payments, dues and follow-ups without maintaining a separate ledger.'],
  ['Scheduling & attendance', 'See scheduled sessions, check-in status and who is due to train.'],
];

const faqs = [
  [
    'Who is PT OS for?',
    'Independent personal trainers, boutique PT studios, strength coaches and online coaches in India — anyone who trains clients and also runs the business.',
  ],
  [
    'How is this different from a diary or Excel sheet?',
    'A diary cannot remind a client to renew, reconcile a UPI payment, or show attendance trends. PT OS keeps clients, sessions, payments and renewals in one searchable record.',
  ],
  [
    'How is this different from generic gym management software?',
    'Gym software is built for front-desk operations across hundreds of members. PT OS is built around the trainer-client relationship: programmes, assessments, progress reviews and personal follow-ups.',
  ],
  [
    'Does it work for online coaching?',
    'Yes. Programmes, diet plans, progress tracking and payments work the same whether the client trains in person or online.',
  ],
  [
    'What does it cost to try?',
    'Every plan starts with a 7-day free trial. No card is required to start.',
  ],
];

export default function PtOsLandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section aria-labelledby="pt-os-hero-title" className="mx-auto max-w-6xl px-6 pt-10 sm:pt-16">
        <div
          className="relative overflow-hidden rounded-[28px] p-7 sm:rounded-[36px] sm:p-11"
          style={{ background: C.canvas, border: `1px solid ${C.lineSoft}`, boxShadow: SHADOW.panel }}
        >
          {/* The public surface's own light: a key light, a drafting grid, and the two brand accents. */}
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
            <div
              className="absolute -right-24 -top-28 h-[320px] w-[320px] rounded-full"
              style={{ background: C.goldSoft, filter: 'blur(60px)' }}
            />
            <div
              className="absolute -bottom-32 -left-20 h-[360px] w-[360px] rounded-full"
              style={{ background: C.blueWashStrong, filter: 'blur(70px)' }}
            />
          </div>

          <div className="relative max-w-[820px]">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-[18px] text-white"
              style={{ background: `linear-gradient(135deg, ${C.blue450}, ${C.blueLo})`, boxShadow: SHADOW.blueGlow }}
            >
              <Dumbbell size={26} strokeWidth={2.2} aria-hidden />
            </span>

            <p
              className="mt-7 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: C.goldHi, background: C.goldSoft, border: `1px solid ${C.goldGlow}` }}
            >
              <span className="h-[7px] w-[7px] rounded-[2px]" style={{ background: C.blue }} />
              MY PT STUDIO · PT OS
            </p>

            <h1
              id="pt-os-hero-title"
              className="mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)] font-[850] leading-[1.04] tracking-[-0.045em]"
              style={{ color: C.ink }}
            >
              Personal trainer software built for how India coaches.
            </h1>
            <p
              className="mt-6 max-w-[660px] text-[16px] leading-[1.7] sm:text-[18px]"
              style={{ color: C.muted }}
            >
              PT OS brings clients, programmes, assessments, nutrition, progress, payments, scheduling and engagement into one professional workspace for personal trainers.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/start-free" className={`${PRIMARY_BUTTON} group h-[52px] w-full px-7 text-[15px] sm:w-auto`}>
                Start free
                <ArrowRight size={17} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link href="/" className={`${SECONDARY_BUTTON} h-[52px] w-full px-7 text-[15px] sm:w-auto`}>
                Explore MY PT STUDIO
              </Link>
            </div>
            <p className="mt-4 text-[13px] font-[520]" style={{ color: C.faint }}>
              7-day free trial · No card required
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50" aria-labelledby="pt-os-features">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 id="pt-os-features" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a personal trainer needs to run the business.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20" aria-labelledby="pt-os-india">
        <h2 id="pt-os-india" className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
          Built for India, not adapted from a generic CRM.
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold">Payments trainers actually receive</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Record cash and UPI transfers, verify them before marking paid, and track dues, invoices and package balances in rupees — no side spreadsheet.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-6">
            <h3 className="text-lg font-semibold">Follow-ups where clients reply</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Renewal reminders, birthday wishes and check-in nudges go out on WhatsApp, and QR check-in runs on a phone at the studio door.
            </p>
          </article>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50" aria-labelledby="pt-os-switch">
        <div className="mx-auto max-w-4xl px-6 py-16 sm:py-20">
          <h2 id="pt-os-switch" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Replace scattered spreadsheets, notes and messaging.
          </h2>
          <p className="mt-4 leading-7 text-slate-600">
            Today a session lives in one chat, a payment in another, and a renewal date in nobody&apos;s memory. PT OS makes them one record: when a package runs out, the renewal is flagged before the client lapses, with the follow-up message ready to send.
          </p>
          <p className="mt-4 leading-7 text-slate-600">
            Generic gym software tracks front-desk operations for hundreds of members. PT OS tracks the coaching relationship — programmes, assessments, progress photos and personal follow-ups — which is what a personal training business actually sells.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 sm:py-20" aria-labelledby="pt-os-faq">
        <h2 id="pt-os-faq" className="text-3xl font-bold tracking-tight sm:text-4xl">
          Questions trainers ask before starting.
        </h2>
        <div className="mt-8 space-y-6">
          {faqs.map(([q, a]) => (
            <div key={q}>
              <h3 className="text-lg font-semibold">{q}</h3>
              <p className="mt-1 text-sm leading-6 text-slate-600">{a}</p>
            </div>
          ))}
        </div>
        <Link href="/start-free" className="mt-10 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
          Start your free trial
        </Link>
      </section>
    </main>
  );
}
