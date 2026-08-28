'use client';

import { Link2, Users, Dumbbell, ChefHat, ClipboardList, TrendingUp, BadgeCheck, CalendarClock } from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C } from './tokens';

const CARDS = [
  {
    icon: <Dumbbell size={17} />,
    title: 'Programme builders',
    body: 'Design programmes once, assign to many. Templates, blocks and every exercise from the library, with cues and tempo.',
    link: { href: '/pt-os', label: 'PT OS' },
  },
  {
    icon: <ClipboardList size={17} />,
    title: 'Client assessments',
    body: 'Capture PAR-Q, goals, measurements and history at onboarding — the foundation every AI output is built on.',
  },
  {
    icon: <Users size={17} />,
    title: 'Client management',
    body: 'Full profiles with attendance, payments, progress photos, notes and history — searchable in seconds.',
  },
  {
    icon: <ChefHat size={17} />,
    title: 'Diet planning',
    body: 'Generated nutrition plans you can fine-tune, with macros and meal preferences tracked against client goals.',
  },
  {
    icon: <TrendingUp size={17} />,
    title: 'Progress tracking',
    body: 'Measurements, strength and adherence over time — clear trends you can show a client at review time.',
  },
  {
    icon: <BadgeCheck size={17} />,
    title: 'Professional billing',
    body: 'Invoices and payments in your name, not a ledger on your phone. Dues and follow-ups handled in the app.',
  },
  {
    icon: <CalendarClock size={17} />,
    title: 'Schedule & attendance',
    body: 'Session scheduling with check-in status — know exactly who trained, who skipped and who is due to train.',
  },
  {
    icon: <Link2 size={17} />,
    title: 'Client engagement',
    body: 'Birthday wishes, progress nudges and renewal reminders — sent from the same profile you manage daily.',
  },
];

/**
 * For Trainers — the independent-coach pitch. Honest: names the tools a
 * freelancer really runs their business with.
 */
export default function PtOsSection() {
  return (
    <Section id="for-trainers" aria-labelledby="for-trainers-title">
      <Container>
        <div className="grid items-start gap-12 lg:grid-cols-[400px_1fr]">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              id="for-trainers-title"
              eyebrow="For personal trainers"
              align="left"
              title="Run your coaching business like a professional operation"
              sub={
                <>
                  If you train clients independently — online or in a gym — your entire business is
                  currently a diary, a WhatsApp chat and an Excel sheet. PT OS turns those three
                  scraps into one professional workspace: your clients, your programmes, your
                  billing, in your name.
                </>
              }
            />
            <Reveal delay={0.15}>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/pt-os"
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13.5px] font-bold transition-colors duration-200"
                  style={{ background: C.blueWash, borderColor: C.lineBlue, color: C.ink }}
                >
                  Explore PT OS
                </Link>
                <Link
                  href="/ai-coach"
                  className="inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-[13.5px] font-bold transition-colors duration-200"
                  style={{ borderColor: C.line, color: C.body }}
                >
                  How the AI Coach works
                </Link>
              </div>
            </Reveal>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {CARDS.map((c, i) => (
              <Reveal key={c.title} delay={0.04 + i * 0.04} className="h-full">
                <div
                  className="group flex h-full flex-col rounded-2xl border p-5 transition-colors duration-200 hover:border-[rgba(0,103,224,0.5)]"
                  style={{ background: C.panel, borderColor: C.lineSoft }}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: C.blueWash, color: C.blueHi }} aria-hidden>
                      {c.icon}
                    </span>
                    <h3 className="text-[14px] font-bold tracking-[-0.01em]" style={{ color: C.ink }}>{c.title}</h3>
                  </div>
                  <p className="mt-3 flex-1 text-[12.5px] leading-[1.6]" style={{ color: C.muted }}>{c.body}</p>
                  {c.link && (
                    <a
                      href={c.link.href}
                      className="mt-3 text-[12px] font-bold transition-opacity hover:opacity-80"
                      style={{ color: C.blueHi }}
                    >
                      {c.link.label} →
                    </a>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}