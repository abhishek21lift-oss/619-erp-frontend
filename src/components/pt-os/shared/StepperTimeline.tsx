'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';

export interface StepperTimelineStep {
  id: number;
  label: string;
}

interface StepperTimelineProps {
  steps: StepperTimelineStep[];
  current: number;
  onStep: (id: number) => void;
}

/** Generalized from LifestyleProgressTimeline — numbered circles with
 *  animated fill bars, click-to-jump when a step is reachable
 *  (`step.id <= current + 1`). Accepts an arbitrary `steps` list so every
 *  wizard module can share one stepper instead of reimplementing it. */
export function StepperTimeline({ steps, current, onStep }: StepperTimelineProps) {
  // Reachability is computed by array *position*, not raw numeric id — a
  // caller (e.g. PAR-Q) may pass a `steps` list with gaps in `id` when a
  // step is conditionally hidden, so "id <= current + 1" would wrongly
  // block the next reachable step.
  const currentIndex = steps.findIndex((s) => s.id === current);

  // On a phone a 7- or 8-step bar is wider than the screen, and the steps
  // past the edge used to sit there cut off. The current step is scrolled
  // into view whenever it changes.
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [current]);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex items-center min-w-max px-1">
        {steps.map((s, i) => {
          // By position, like reachability: ids may have gaps.
          const done = currentIndex > -1 && i < currentIndex;
          const active = current === s.id;
          const reachable = currentIndex === -1 || i <= currentIndex + 1;
          return (
            <div key={s.id} className="flex items-center">
              <button
                type="button"
                ref={active ? activeRef : undefined}
                aria-current={active ? 'step' : undefined}
                onClick={() => { if (reachable) onStep(s.id); }}
                className="flex flex-col items-center gap-2 min-w-0"
              >
                <div
                  className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-[13px] font-[800] transition-all duration-300"
                  style={{
                    background: done ? '#0067E0' : active ? '#fff' : 'rgba(255,255,255,0.14)',
                    color: done ? '#fff' : active ? '#0F172A' : 'rgba(255,255,255,0.7)',
                    boxShadow: active ? '0 0 0 4px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.2)' : 'none',
                    transform: active ? 'scale(1.08)' : 'scale(1)',
                  }}
                >
                  <AnimatePresence mode="wait">
                    {done ? (
                      <m.span key="ck" initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ duration: 0.2 }}>
                        <Check size={15} strokeWidth={3} />
                      </m.span>
                    ) : (
                      <m.span key="nm" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
                        {i + 1}
                      </m.span>
                    )}
                  </AnimatePresence>
                </div>
                {/* Wraps rather than nowrap: long names ("Cardiorespiratory
                    Endurance") overflowed a 90px column into the next label.
                    min-h keeps one- and two-line labels the same height so
                    the connector sits level with every circle. */}
                <span
                  className="min-h-[26px] max-w-[90px] text-center text-[10.5px] font-[680] leading-tight tracking-tight"
                  style={{ color: active ? '#fff' : done ? '#7FB4FF' : 'rgba(255,255,255,0.55)' }}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div className="relative h-[2px] w-8 sm:w-12 mx-1.5 mb-5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.18)' }}>
                  <m.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #0067E0, #0059CE)' }}
                    animate={{ width: done ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default StepperTimeline;
