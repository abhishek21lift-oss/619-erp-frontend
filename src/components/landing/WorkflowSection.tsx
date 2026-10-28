'use client';

import { useRef } from 'react';
import { m, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  UserRoundPlus, Sparkles, PenLine, Dumbbell, LineChart, BrainCircuit,
  Wallet, MessageSquareText,
} from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';

const STEPS = [
  {
    icon: <UserRoundPlus size={17} />,
    title: 'Onboard a client',
    body: 'Profile, PAR-Q, goals, measurements and history — captured once at signup.',
    tag: 'Day 1',
  },
  {
    icon: <Sparkles size={17} />,
    title: 'AI drafts the programme',
    body: 'The workout generator reads the profile and proposes a complete periodised plan.',
    tag: 'Minutes',
  },
  {
    icon: <PenLine size={17} />,
    title: 'Trainer reviews & edits',
    body: 'Tweak sets, tempo or the whole split — the AI never bypasses your judgement.',
    tag: 'Your call',
  },
  {
    icon: <Dumbbell size={17} />,
    title: 'Client trains',
    body: 'Check-ins and attendance are recorded at the studio or by the trainer.',
    tag: 'Every session',
  },
  {
    icon: <LineChart size={17} />,
    title: 'Progress is tracked',
    body: 'Strength, adherence and measurements accumulate against the programme.',
    tag: 'Automatically',
  },
  {
    icon: <BrainCircuit size={17} />,
    title: 'AI analyses the data',
    body: 'Insights surface what is working and what needs attention — with the “why”.',
    tag: 'Weekly',
  },
  {
    icon: <Wallet size={17} />,
    title: 'Billing & renewals run themselves',
    body: 'Dues, invoices and renewal dates are flagged before they lapse.',
    tag: 'Always on',
  },
  {
    icon: <MessageSquareText size={17} />,
    title: 'Follow-ups on WhatsApp',
    body: 'Renewal nudges, birthday wishes and check-in reminders — sent from the profile.',
    tag: 'In seconds',
  },
];

/**
 * The 8-step client lifecycle — a scroll-drawn progress spine through the
 * product's actual workflow. The line animates once as it enters the viewport.
 */
export default function WorkflowSection() {
  const spineRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: spineRef,
    offset: ['start 0.75', 'end 0.55'],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.12], [0, 1]);

  return (
    <Section id="workflow" alt aria-labelledby="workflow-title">
      <Container>
        <SectionHeader
          id="workflow-title"
          eyebrow="The workflow"
          title="From first enquiry to loyal client — one loop"
          sub="Every step below is a real screen in the product. The AI removes the busywork at each stage; the trainer owns the outcome."
        />

        <div ref={spineRef} className="relative mx-auto mt-16 max-w-2xl">
          {/* Spine */}
          <div
            aria-hidden
            className="absolute bottom-6 left-[23px] top-6 w-px sm:left-[27px]"
            style={{ background: C.line }}
          />
          <m.div
            aria-hidden
            className="absolute bottom-6 left-[23px] top-6 w-px origin-top sm:left-[27px]"
            style={{
              scaleY: reduce ? 1 : scaleY,
              opacity: reduce ? 1 : opacity,
              background: `linear-gradient(180deg, ${C.blue}, ${C.violet})`,
            }}
          />

          <ol className="space-y-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.title} delay={0.03} y={20}>
                <li className="relative flex gap-4 sm:gap-6">
                  <span
                    className="relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-2xl border sm:h-14 sm:w-14"
                    style={{
                      background: C.panel,
                      borderColor: C.lineSoft,
                      color: i === 2 || i === 7 ? C.goldHi : C.blueHi,
                      boxShadow: SHADOW.card,
                    }}
                    aria-hidden
                  >
                    {s.icon}
                  </span>
                  <div
                    className="flex-1 rounded-[16px] p-4 sm:p-5"
                    style={{ background: C.panel, boxShadow: SHADOW.card }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1.5">
                      <h3 className="text-[15px] font-[600] tracking-[-0.01em]" style={{ color: C.ink }}>
                        <span className="mr-2 text-[11px] font-bold" style={{ color: C.faint }}>
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        {s.title}
                      </h3>
                      <span
                        className="rounded-full px-2.5 py-0.5 text-[11px]"
                        style={{ background: C.blueWash, color: C.blueHi }}
                      >
                        {s.tag}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[13px] leading-[1.5]" style={{ color: C.muted }}>{s.body}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </Section>
  );
}