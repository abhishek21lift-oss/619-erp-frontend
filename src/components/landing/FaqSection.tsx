'use client';

import { useState } from 'react';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, EASE } from './tokens';

const FAQ = [
  { q: 'What is MY PT STUDIO?', a: 'The business management platform for personal trainers — client management, workout and nutrition builders, progress tracking, payments and analytics in one platform, so you can run your entire training business from a single place.' },
  { q: 'Who is it for?', a: 'Independent personal trainers, online coaches, PT studios and fitness businesses of any size — from solo trainers to multi-location training businesses.' },
  { q: 'Do my clients need to install anything?', a: 'No. The platform is fully web-based and mobile-friendly. You manage everything from any device, and clients can be onboarded in minutes.' },
  { q: 'Can I run more than one studio or training location?', a: 'Yes. Our multi-tenant architecture lets you run multiple training locations from one account, each with fully isolated data, its own team, branding and permissions.' },
  { q: 'Is my data secure?', a: 'Every studio is isolated at the database level with row-level security, encrypted connections and role-based access control. Your data is yours, and it is never shared across studios.' },
  { q: 'How do I get started?', a: 'Start free — create your PT business in a couple of minutes. Our team reviews it, then helps you import your clients so you are live in a day, not a month.' },
];

/**
 * FAQ — dark accordion. Content is the product's real documentation answers,
 * lightly edited for tone; nothing invented.
 */
export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <Section id="resources" aria-labelledby="resources-title">
      <Container className="max-w-3xl">
        <SectionHeader
          id="resources-title"
          eyebrow="Resources & FAQ"
          title="Questions, answered"
          sub="The basics most studios ask us before starting. Deeper answers live in the help centre after you sign in."
        />

        <div className="mt-12 space-y-2.5">
          {FAQ.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={0.03 * i} y={16}>
                <div
                  className="overflow-hidden rounded-2xl border transition-colors duration-200"
                  style={{ background: C.panel, borderColor: isOpen ? C.lineBlue : C.lineSoft }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[14px] font-bold leading-snug" style={{ color: C.ink }}>{f.q}</span>
                    <m.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="shrink-0"
                      aria-hidden
                    >
                      <ChevronDown size={17} style={{ color: isOpen ? C.goldHi : C.faint }} />
                    </m.span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <m.div
                        id={`faq-panel-${i}`}
                        role="region"
                        aria-labelledby={`faq-button-${i}`}
                        initial={reduce ? false : { height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={reduce ? undefined : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="px-5 pb-5 text-[13.5px] leading-[1.7]" style={{ color: C.muted }}>{f.a}</p>
                      </m.div>
                    )}
                  </AnimatePresence>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}