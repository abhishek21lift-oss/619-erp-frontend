'use client';

import type { ReactNode } from 'react';
import { CalendarCheck2, Dumbbell, MessageCircle, Smartphone, UsersRound, Wallet } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, CARD } from './tokens';

/**
 * What is inside the product, one part per side of the studio cube.
 *
 * Replaces the product tour and analytics sections, which were drawn as
 * dashboards populated with invented clients, revenue and growth figures.
 * Each part here names what the product actually has — the screens exist —
 * and nothing is illustrated with numbers the visitor could mistake for real.
 */
const PARTS: Array<{ icon: ReactNode; title: string; body: string; detail: string[] }> = [
  {
    icon: <UsersRound size={19} />,
    title: 'Clients',
    body: 'One profile per client, from the first enquiry onwards — screening, assessments, goals and the full history of their training with you.',
    detail: ['Leads', 'PAR-Q & consent', 'Assessments', 'Measurements', 'Progress photos'],
  },
  {
    icon: <Dumbbell size={19} />,
    title: 'Programmes',
    body: 'Workout and diet plans built on an exercise library. Write them yourself, or let AI draft one from the client’s profile and edit it before it goes out.',
    detail: ['Workout plans', 'Diet plans', 'Exercise library', 'Workout log'],
  },
  {
    icon: <CalendarCheck2 size={19} />,
    title: 'Sessions',
    body: 'Schedule sessions, keep every client’s session balance straight, and check people in with a QR code at the door.',
    detail: ['Schedule', 'Session balance', 'QR check-in', 'Attendance'],
  },
  {
    icon: <Wallet size={19} />,
    title: 'Payments',
    body: 'Record what was paid, check UPI transfers before you mark them paid, and see what is still due — without a spreadsheet on the side.',
    detail: ['Record payment', 'UPI verification', 'Dues', 'Invoices'],
  },
  {
    icon: <MessageCircle size={19} />,
    title: 'Renewals & reminders',
    body: 'Packages running out are flagged before they lapse, and reminders, offers and campaigns reach clients on WhatsApp.',
    detail: ['Renewals', 'WhatsApp', 'Offers', 'Campaigns'],
  },
  {
    icon: <Smartphone size={19} />,
    title: 'Member app',
    body: 'Your clients sign in to their own portal to see their membership, payments, attendance and progress — theirs, and nobody else’s.',
    detail: ['Membership', 'Payments', 'Attendance', 'Progress'],
  },
];

/** A plain tinted tile for the icon. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]"
      style={{ color: C.blueHi, background: C.blueWash }}
    >
      {children}
    </span>
  );
}

export default function StudioAnatomy() {
  return (
    <Section id="product" aria-labelledby="product-title">
      <Container>
        <SectionHeader
          id="product-title"
          eyebrow="Inside the studio"
          title="Six sides of one business."
          sub="Personal training runs on a handful of things that all depend on each other. MY PT STUDIO keeps them in one system, so a session, a payment and a renewal are never three separate records."
        />

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PARTS.map((p, i) => (
            <Reveal key={p.title} delay={0.04 * i} className="h-full">
              <article
                className="flex h-full flex-col rounded-[20px] p-6"
                style={{ background: CARD.background, border: CARD.border, boxShadow: CARD.boxShadow }}
              >
                <div className="flex items-start justify-between gap-4">
                  <Key>{p.icon}</Key>
                  <span className="text-[12px] tabular-nums" style={{ color: C.faint }}>
                    {String(i + 1).padStart(2, '0')} / 06
                  </span>
                </div>
                <h3 className="mt-5 text-[19px] font-[600] tracking-[-0.02em]" style={{ color: C.ink }}>{p.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-[1.6]" style={{ color: C.muted }}>{p.body}</p>
                <ul className="mt-5 flex flex-wrap gap-1.5 border-t pt-4" style={{ borderColor: C.lineSoft }}>
                  {p.detail.map((d) => (
                    <li
                      key={d}
                      className="rounded-full px-2.5 py-1 text-[11px]"
                      style={{ color: C.muted, background: C.canvasAlt }}
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}
