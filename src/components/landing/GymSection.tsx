'use client';

import { Building2, UserRoundCheck, CalendarCheck2, Wallet, Radar, BadgePercent, MessageSquareText, Users } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C } from './tokens';

const BENEFITS = [
  {
    icon: <Building2 size={17} />,
    title: 'Multi-branch, one view',
    body: 'Run one studio or many — occupancy, collections and attendance roll up into a single dashboard.',
  },
  {
    icon: <UserRoundCheck size={17} />,
    title: 'Front-desk check-in',
    body: 'Mobile-first check-in your staff can run on a phone at the desk — no desktop terminal required.',
  },
  {
    icon: <CalendarCheck2 size={17} />,
    title: 'Memberships & renewals',
    body: 'Plans, trials, renewals and lapses tracked automatically. See who is about to churn before they do.',
  },
  {
    icon: <Wallet size={17} />,
    title: 'Collections that reconcile',
    body: 'Payments, pending dues and invoices in one place — MTD collected vs. pending, always visible.',
  },
  {
    icon: <BadgePercent size={17} />,
    title: 'Offers & campaigns',
    body: 'Run referral offers and WhatsApp campaigns to your member base — engagement that can be measured.',
  },
  {
    icon: <MessageSquareText size={17} />,
    title: 'WhatsApp engagement',
    body: 'Birthdays, renewals and nudges reach members on WhatsApp — where Indian fitness clients actually reply.',
  },
  {
    icon: <Radar size={17} />,
    title: 'Early warning signals',
    body: 'Attendance drops and pending dues are flagged as risk signals — the AI tells you who needs a call.',
  },
  {
    icon: <Users size={17} />,
    title: 'Team roles & access',
    body: 'Owner, admin, manager, trainer — everyone sees exactly what their role needs, nothing more.',
  },
];

/**
 * For Gyms & Studios — the operator pitch. Bento grid, honest feature set
 * (no inventory module — deliberately excluded).
 */
export default function GymSection() {
  return (
    <Section id="for-gyms" alt aria-labelledby="for-gyms-title">
      <Container>
        <SectionHeader
          id="for-gyms-title"
          eyebrow="For gyms & studios"
          title="The back office your front desk deserves"
          sub="Memberships, check-ins, payments, renewals and engagement — the daily machinery of a gym, operated from one place that your whole team can actually use."
        />

        <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((b, i) => (
            <Reveal key={b.title} delay={0.03 + i * 0.035} className="h-full">
              <div
                className="flex h-full flex-col rounded-2xl border p-5"
                style={{ background: C.panel, borderColor: C.lineSoft }}
              >
                <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: C.goldSoft, color: C.goldHi }} aria-hidden>
                  {b.icon}
                </span>
                <h3 className="mt-3.5 text-[14px] font-bold tracking-[-0.01em]" style={{ color: C.ink }}>{b.title}</h3>
                <p className="mt-2 text-[12.5px] leading-[1.6]" style={{ color: C.muted }}>{b.body}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-col items-center justify-between gap-4 rounded-2xl border px-6 py-5 sm:flex-row" style={{ background: C.panelAlt, borderColor: C.lineSoft }}>
            <p className="text-center text-[13.5px] font-medium sm:text-left" style={{ color: C.body }}>
              Front desk staff, managers and owners — the whole team works from the same data. No training academy required.
            </p>
            <Link
              href="/start-free"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-[13.5px] font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${C.blue450} 0%, ${C.blueLo} 100%)`, boxShadow: '0 10px 26px -10px rgba(0,103,224,0.55)' }}
            >
              Start your free trial
            </Link>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}