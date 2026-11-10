'use client';

import { useEffect, useRef } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { gray, semantic } from '@/lib/palette';

/** White on dark accents, near-black on light ones: at 11px the active number
 *  has to clear AA, and amber/green cannot carry white. */
function activeInk(hex: string): string {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.179 ? gray[900] : '#FFFFFF';
}

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
  /** `path` is the fitness wizard's numbered light rail: labels under the
   *  nodes, chapter-accent active step. `classic` is unchanged. */
  variant?: 'classic' | 'path';
  /** Path only, indexed by step array position. */
  accents?: readonly string[];
}

/** Numbered circles with animated fill bars, click-to-jump when a step is
 *  reachable (`step.id <= current + 1`). Every assessment wizard passes its
 *  own `steps` list rather than keeping a near-identical wrapper. */
export function StepperTimeline<Id extends number>({
  steps, current, onStep, tone = 'dark', variant = 'classic', accents,
}: StepperTimelineProps<Id>) {
  const light = tone === 'light';
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

  const activeLabel = steps.find((s) => s.id === current)?.label ?? '';

  if (variant === 'path') {
    return (
      <div className="mt-1">
        <div className="mb-2.5 flex items-baseline justify-between gap-3 sm:hidden">
          <span className="text-[10.5px] font-[700] uppercase tracking-[0.13em]" style={{ color: 'var(--text-muted)' }}>
            Step {currentIndex + 1} of {steps.length}
          </span>
          <strong className="truncate text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>{activeLabel}</strong>
        </div>
        <div className="flex items-start">
          {steps.map((s, i) => {
            const done = currentIndex > -1 && i < currentIndex;
            const active = current === s.id;
            const reachable = currentIndex === -1 || i <= currentIndex + 1;
            const accent = accents?.[i] ?? '#A33757';
            return (
              <div key={s.id} className="flex min-w-0 flex-1 items-start last:flex-none">
                <button
                  type="button"
                  ref={active ? activeRef : undefined}
                  aria-label={s.label}
                  aria-current={active ? 'step' : undefined}
                  aria-disabled={!reachable}
                  onClick={() => { if (reachable) onStep(s.id); }}
                  className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:w-[84px] sm:flex-none"
                >
                  <span
                    className={`relative grid shrink-0 place-items-center rounded-full text-[11px] font-[750] transition-all duration-200 ${
                      active
                        ? '-mt-0.5 h-[30px] w-[30px] sm:h-[34px] sm:w-[34px]'
                        : 'h-[26px] w-[26px] sm:h-[30px] sm:w-[30px]'
                    }`}
                    style={{
                      background: done
                        ? 'color-mix(in srgb, #A33757 9%, var(--bg-card))'
                        : active ? accent : 'var(--bg-card)',
                      border: `1.5px solid ${done
                        ? 'color-mix(in srgb, #A33757 28%, transparent)'
                        : active ? accent : 'var(--border)'}`,
                      color: done ? 'color-mix(in srgb, #A33757 65%, var(--text-primary))' : active ? activeInk(accent) : 'var(--text-muted)',
                      boxShadow: active ? `0 0 0 5px ${accent}24` : 'none',
                    }}
                  >
                    {done ? <Check size={14} strokeWidth={3} /> : i + 1}
                  </span>
                  <span
                    className="hidden max-w-[84px] text-center text-[10.5px] font-[680] leading-tight tracking-tight sm:block"
                    style={{
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {s.label}
                  </span>
                </button>
                {i < steps.length - 1 && (
                  <div
                    className="mt-[13px] h-[2px] min-w-1 flex-1 rounded-full sm:mt-[15px]"
                    style={{
                      background: done
                        ? 'color-mix(in srgb, #A33757 30%, var(--bg-card))'
                        : 'var(--bg-subtle)',
                    }}
                  />
                )}
              </div>
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
