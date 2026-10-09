import type { Metadata } from 'next';
import Link from 'next/link';

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
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">MY PT STUDIO · PT OS</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Personal trainer software built for how India coaches.
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
          PT OS brings clients, programmes, assessments, nutrition, progress, payments, scheduling and engagement into one professional workspace for personal trainers.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/start-free" className="rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
            Start free
          </Link>
          <Link href="/" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50">
            Explore MY PT STUDIO
          </Link>
        </div>
      </section>

      <section className="border-y border-slate-100 bg-slate-50" aria-labelledby="pt-os-features">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <h2 id="pt-os-features" className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a personal trainer needs to run the business.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(([title, body]) => (
              <article key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
