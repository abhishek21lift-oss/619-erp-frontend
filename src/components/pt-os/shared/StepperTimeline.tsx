'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { semantic } from '@/lib/palette';

export interface StepperTimelineStep<Id extends number = number> {
  id: Id;
  label: string;
}

interface StepperTimelineProps<Id extends number> {
  steps: readonly StepperTimelineStep<Id>[];
  current: Id;
  onStep: (id: Id) => void;
  /** The surface the stepper sits on. The studio wizards are dark; the public
   *  signing page is the same light stage as the marketing site. */
  tone?: 'dark' | 'light';
  /**
   * `timeline` is the numbered-circle bar. `progress` is the compact light
   * treatment for long wizards: one labelled progress rail instead of eleven
   * circles that no longer fit a phone.
   */
  variant?: 'timeline' | 'progress';
}

/** Numbered circles with animated fill bars, click-to-jump when a step is
 *  reachable (`step.id <= current + 1`). Every assessment wizard passes its
 *  own `steps` list rather than keeping a near-identical wrapper. */
export function StepperTimeline<Id extends number>({ steps, current, onStep, tone = 'dark', variant = 'timeline' }: StepperTimelineProps<Id>) {
  const light = tone === 'light';
  // Reachability is computed by array *position*, not raw numeric id — a
  // caller (e.g. PAR-Q) may pass a `steps` list with gaps in `id` when a
  // step is conditionally hidden, so "id <= current + 1" would wrongly
  // block the next reachable step.
  const currentIndex = steps.findIndex((s) => s.id === current);

  // On a phone a 7- or 8-step bar is wider than the screen, and the steps
  // past the edge used to sit there cut off. The current step is scrolled
  // into view whenever it changes. Declared before the progress variant
  // returns, because a hook cannot sit behind a branch.
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [current]);

  if (variant === 'progress') {
    const currentStep = currentIndex > -1 ? steps[currentIndex] : null;
    return (
      <div className="w-full">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[10px] font-[760] uppercase tracking-[0.16em]" style={{ color: semantic.muted }}>
            Step {Math.max(currentIndex + 1, 1)} of {steps.length}
          </p>
          <p className="min-w-0 truncate text-[12.5px] font-[760]" style={{ color: semantic.ink }}>
            {currentStep?.label}
          </p>
        </div>
        <div className="mt-2.5 flex items-center gap-1" aria-label="Goal plan progress">
          {steps.map((s, i) => {
            const done = currentIndex > -1 && i < currentIndex;
            const active = current === s.id;
            const reachable = currentIndex === -1 || i <= currentIndex + 1;
            return (
              <button
                key={s.id}
                type="button"
                aria-label={`Step ${i + 1}: ${s.label}${done ? ' (complete)' : ''}`}
                aria-current={active ? 'step' : undefined}
                disabled={!reachable}
                onClick={() => { if (reachable) onStep(s.id); }}
                className="flex h-6 flex-1 items-center"
                style={{ cursor: reachable ? 'pointer' : 'default' }}
              >
                <span
                  className="h-2 w-full rounded-full transition-all duration-300"
                  style={{
                    minWidth: 3,
                    background: done
                      ? 'linear-gradient(90deg, #A33757, #852E4E)'
                      : active
                        ? '#FB9590'
                        : 'var(--bg-subtle)',
                    boxShadow: active ? '0 0 0 3px rgba(163,55,87,0.12)' : 'none',
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className={`flex items-center px-1 ${light ? 'w-full min-w-0 justify-center' : 'min-w-max'}`}>
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
                  className={`relative flex flex-shrink-0 items-center justify-center rounded-full text-[13px] font-[800] transition-all duration-300 ${light ? 'h-8 w-8 sm:h-10 sm:w-10' : 'h-10 w-10'}`}
                  style={{
                    background: done ? '#A33757' : active ? '#fff' : light ? semantic.surface : 'rgba(255,255,255,0.14)',
                    color: done ? '#fff' : active ? semantic.ink : light ? semantic.muted : 'rgba(255,255,255,0.7)',
                    boxShadow: active
                      ? light
                        ? '0 0 0 3px rgba(163,55,87,0.16), 0 2px 8px rgba(0,0,0,0.08)'
                        : '0 0 0 4px rgba(255,255,255,0.18), 0 2px 8px rgba(0,0,0,0.2)'
                      : 'none',
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
                  className={`min-h-[26px] max-w-[90px] text-center text-[10.5px] font-[680] leading-tight tracking-tight ${light ? 'hidden sm:block' : ''}`}
                  style={{
                    color: active
                      ? light ? semantic.ink : '#fff'
                      : done
                        ? light ? '#A33757' : '#FFBB94'
                        : light ? semantic.muted : 'rgba(255,255,255,0.55)',
                  }}
                >
                  {s.label}
                </span>
              </button>
              {i < steps.length - 1 && (
                <div
                  className={`relative h-[2px] rounded-full overflow-hidden ${light ? 'w-3 sm:w-12 mx-1 sm:mx-1.5 mb-0 sm:mb-5' : 'w-8 sm:w-12 mx-1.5 mb-5'}`}
                  style={{ background: light ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)' }}
                >
                  <m.div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: 'linear-gradient(90deg, #A33757, #852E4E)' }}
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
