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

/** A physical key for the icon: lit top edge, darker lip, same light as the cube. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px] border"
      style={{
        color: C.blueHi,
        background: 'linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 100%)',
        borderColor: 'rgba(31,42,61,0.10)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,1), 0 1px 0 rgba(31,42,61,0.12), 0 6px 14px -8px rgba(15,23,42,0.35)',
      }}
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
                className="flex h-full flex-col rounded-[24px] p-6"
                style={{ background: CARD.background, border: CARD.border, boxShadow: CARD.boxShadow }}
              >
                <div className="flex items-start justify-between gap-4">
                  <Key>{p.icon}</Key>
                  <span className="font-mono text-[11px] font-[600] tracking-[0.16em]" style={{ color: C.faint }}>
                    {String(i + 1).padStart(2, '0')} / 06
                  </span>
                </div>
                <h3 className="mt-5 text-[18px] font-[780] tracking-[-0.02em]" style={{ color: C.ink }}>{p.title}</h3>
                <p className="mt-2 flex-1 text-[14px] leading-[1.6]" style={{ color: C.muted }}>{p.body}</p>
                <ul className="mt-5 flex flex-wrap gap-1.5 border-t pt-4" style={{ borderColor: 'rgba(31,42,61,0.08)' }}>
                  {p.detail.map((d) => (
                    <li
                      key={d}
                      className="rounded-full px-2.5 py-1 font-mono text-[10.5px] font-[600] uppercase tracking-[0.08em]"
                      style={{ color: C.body, background: 'rgba(31,42,61,0.05)' }}
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
