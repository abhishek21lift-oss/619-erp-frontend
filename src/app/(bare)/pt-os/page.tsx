import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'PT OS — Personal Training Business Management Software',
  description:
    'PT OS by MY PT STUDIO helps personal trainers manage clients, programmes, assessments, nutrition, progress, payments, scheduling and client engagement in one professional workspace.',
  robots: { index: true, follow: true },
  alternates: { canonical: '/pt-os' },
  openGraph: {
    url: 'https://myptstudio.com/pt-os',
    title: 'PT OS — Personal Training Business Management Software',
    description:
      'Run your personal training business like a professional operation with client management, programmes, nutrition, progress, payments and scheduling in one workspace.',
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

export default function PtOsLandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-blue-700">MY PT STUDIO · PT OS</p>
        <h1 className="mt-5 max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
          Personal training business management software built for coaches.
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

      <section className="mx-auto max-w-4xl px-6 py-16 text-center sm:py-20">
        <h2 className="text-3xl font-bold tracking-tight">Turn coaching into a professional operation.</h2>
        <p className="mx-auto mt-4 max-w-2xl text-slate-600">
          Replace scattered spreadsheets, notes and messaging with one system designed around the day-to-day work of a personal trainer.
        </p>
        <Link href="/start-free" className="mt-7 inline-flex rounded-xl bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800">
          Start your free trial
        </Link>
      </section>
    </main>
  );
}
