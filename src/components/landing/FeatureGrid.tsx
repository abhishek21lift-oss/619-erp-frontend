'use client';

import {
  LayoutDashboard, Dumbbell, Sparkles, MessageSquareText, LineChart, ClipboardCheck,
  CalendarCheck2, Wallet, BookOpen, FileText, BarChart3, Building2,
} from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C } from './tokens';

const CATEGORIES = [
  {
    label: 'Operate',
    color: C.blueHi,
    wash: C.blueWash,
    features: [
      { icon: <LayoutDashboard size={15} />, t: 'Command dashboard', d: 'Revenue, sessions and client load at a glance.' },
      { icon: <CalendarCheck2 size={15} />, t: 'Attendance & check-in', d: 'Mobile-first check-in and session tracking.' },
      { icon: <Wallet size={15} />, t: 'Billing & collections', d: 'Packages, dues, invoices and MTD collection.' },
      { icon: <ClipboardCheck size={15} />, t: 'Client lifecycle', d: 'Onboarding to renewal — one profile, all history.' },
    ],
  },
  {
    label: 'Train',
    color: C.goldHi,
    wash: C.goldSoft,
    features: [
      { icon: <Dumbbell size={15} />, t: 'Programmes & templates', d: 'Design once, assign to one client or many.' },
      { icon: <BookOpen size={15} />, t: 'Exercise library', d: 'Cues, tempo and equipment for every movement.' },
      { icon: <LineChart size={15} />, t: 'Progress tracking', d: 'Strength, measurements and adherence trends.' },
    ],
  },
  {
    label: 'Intelligence',
    color: C.emerald,
    wash: C.emeraldSoft,
    features: [
      { icon: <Sparkles size={15} />, t: 'AI Coach', d: 'Workout and diet generation grounded in client data.' },
      { icon: <BarChart3 size={15} />, t: 'AI insights', d: 'Churn risk, renewals due and what to do next.' },
      { icon: <FileText size={15} />, t: 'Knowledge base', d: 'A searchable library every AI output is grounded in.' },
    ],
  },
  {
    label: 'Engage',
    color: C.blue,
    wash: 'rgba(0,103,224,0.14)',
    features: [
      { icon: <MessageSquareText size={15} />, t: 'WhatsApp outreach', d: 'Renewal nudges, birthdays and follow-ups where clients reply.' },
      { icon: <Sparkles size={15} />, t: 'Campaigns & offers', d: 'Run referral offers and measure what works.' },
    ],
  },
  {
    label: 'Grow',
    color: C.blueHi,
    wash: C.blueWash,
    features: [
      { icon: <LineChart size={15} />, t: 'Finance & forecast', d: 'Revenue trends, pending collections and forecasting.' },
      { icon: <Building2 size={15} />, t: 'Multi-branch', d: 'Roll up studios into one view of the business.' },
    ],
  },
];

/**
 * Feature catalogue — grouped under the five core areas the product
 * genuinely ships. Only live, real features; nothing fabricated.
 */
export default function FeatureGrid() {
  return (
    <Section id="features" aria-labelledby="features-title">
      <Container>
        <SectionHeader
          id="features-title"
          eyebrow="Everything included"
          title="Five core areas, one platform"
          sub="Every module below ships with MY PT STUDIO — no add-ons, no per-feature billing. What you see is what the platform does today."
        />

        <div className="mt-14 grid gap-4 lg:grid-cols-5">
          {CATEGORIES.map((cat, ci) => (
            <Reveal key={cat.label} delay={0.05 + ci * 0.05} className="h-full">
              <div
                className="flex h-full flex-col rounded-2xl border p-5"
                style={{ background: C.panel, borderColor: C.lineSoft }}
              >
                <span
                  className="inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.12em]"
                  style={{ background: cat.wash, color: cat.color }}
                >
                  {cat.label}
                </span>
                <ul className="mt-5 space-y-4">
                  {cat.features.map((f) => (
                    <li key={f.t} className="flex items-start gap-2.5">
                      <span className="mt-0.5 shrink-0" style={{ color: cat.color }} aria-hidden>
                        {f.icon}
                      </span>
                      <div>
                        <p className="text-[12.5px] font-bold leading-snug" style={{ color: C.ink }}>{f.t}</p>
                        <p className="mt-0.5 text-[11px] leading-[1.5]" style={{ color: C.faint }}>{f.d}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}