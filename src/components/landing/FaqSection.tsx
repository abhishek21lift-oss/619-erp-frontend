'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, EASE, SHADOW } from './tokens';
import { HOME_FAQ, type FaqItem } from './faq-content';

/**
 * FAQ — accordion. Defaults are the homepage's answers; `/pt-os` passes its
 * own list and header.
 *
 * Every answer stays mounted in the HTML so a crawler that runs no JavaScript
 * still reads all of them. Closed panels are collapsed, transparent and
 * `aria-hidden`; opening one only animates height and opacity.
 */
export default function FaqSection({
  items = HOME_FAQ,
  id = 'resources',
  eyebrow = 'Resources & FAQ',
  title = 'Questions, answered',
  sub = 'The basics most studios ask us before starting. Deeper answers live in the help centre after you sign in.',
}: {
  items?: FaqItem[];
  id?: string;
  eyebrow?: ReactNode;
  title?: ReactNode;
  sub?: ReactNode;
} = {}) {
  const [open, setOpen] = useState<number | null>(0);
  const reduce = useReducedMotion();

  return (
    <Section id={id} aria-labelledby={`${id}-title`}>
      <Container className="max-w-3xl">
        <SectionHeader
          id={`${id}-title`}
          eyebrow={eyebrow}
          title={title}
          sub={sub}
        />

        <div className="mt-12 space-y-3">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={f.q} delay={0.03 * i} y={16}>
                <div
                  className="overflow-hidden rounded-[16px] transition-shadow duration-200"
                  style={{ background: C.panel, boxShadow: SHADOW.card, outline: isOpen ? `1px solid ${C.blue}` : 'none' }}
                >
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${i}`}
                    id={`faq-button-${i}`}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-[15px] font-[500] leading-snug" style={{ color: C.ink }}>{f.q}</span>
                    <m.span
                      animate={{ rotate: isOpen ? 180 : 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      className="shrink-0"
                      aria-hidden
                    >
                      <ChevronDown size={17} style={{ color: isOpen ? C.blueHi : C.faint }} />
                    </m.span>
                  </button>
                  <m.div
                    id={`faq-panel-${i}`}
                    role="region"
                    aria-labelledby={`faq-button-${i}`}
                    aria-hidden={!isOpen}
                    initial={false}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={reduce ? { duration: 0 } : { duration: 0.3, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <p className="px-5 pb-5 text-[14px] leading-[1.6]" style={{ color: C.muted }}>{f.a}</p>
                  </m.div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </Container>
    </Section>
  );
}