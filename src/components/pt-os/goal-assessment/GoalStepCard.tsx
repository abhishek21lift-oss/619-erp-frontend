'use client';

// The one card every screen in the Goal Setting module sits in.
//
// Before this, each of the nine steps carried its own copy of the same
// wrapper (card + accent bar + icon tile + "Step N of 8" heading) and the
// copies had drifted: the wizard has nine steps and said "of 8" in some
// headers and "of 9" in others. The heading is now derived from STEPS, so it
// cannot disagree with the wizard again, and a redesign of the step frame is
// one file rather than eleven.
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { indigo, gray, rgba } from '@/lib/palette';
import { LAST_STEP } from './types';

interface GoalStepCardProps {
  /** Omit for a plain summary card with no header. */
  icon?: LucideIcon;
  title?: string;
  /** One line under the title — what this step is for. */
  hint?: string;
  /** Current step id; renders "Step n of N" in the header. */
  step?: number;
  /** Right-hand slot in the header, e.g. a live score chip. */
  badge?: ReactNode;
  children: ReactNode;
}

export function GoalStepCard({ icon: Icon, title, hint, step, badge, children }: GoalStepCardProps) {
  return (
    <section
      className="relative overflow-hidden rounded-[26px] sm:rounded-[30px]"
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${gray[200]}`,
        boxShadow: `0 1px 2px ${rgba(gray[900], 0.04)}, 0 24px 60px -34px ${rgba(indigo[900], 0.34)}`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[150px]"
        style={{ background: 'radial-gradient(120% 140% at 12% 0%, rgba(255,187,148,0.22) 0%, transparent 62%)' }}
      />
      <div className="relative h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #A33757 0%, #FFBB94 42%, transparent 100%)' }} />

      <div className="relative p-5 sm:p-8">
        {title && (
          <header className="mb-6 flex items-start justify-between gap-3 sm:mb-7">
            <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
              {Icon && (
                <div
                  className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] sm:h-12 sm:w-12 sm:rounded-[16px]"
                  style={{ background: indigo[50], border: `1px solid ${indigo[100]}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.8)' }}
                >
                  <Icon size={19} strokeWidth={1.75} style={{ color: indigo[600] }} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {step && (
                  <p className="mb-1 text-[10px] font-[760] uppercase leading-none tracking-[0.14em]" style={{ color: indigo[600] }}>
                    Step {step} of {LAST_STEP}
                  </p>
                )}
                <h2 className="text-[21px] font-[820] leading-[1.15] tracking-[-0.03em] text-[color:var(--text-primary)] sm:text-[23px]">
                  {title}
                </h2>
                {hint && (
                  <p className="mt-1.5 max-w-[52ch] text-[12.5px] leading-relaxed text-[color:var(--text-muted)] sm:text-[13px]">
                    {hint}
                  </p>
                )}
              </div>
            </div>
            {badge && <div className="flex-shrink-0 pt-0.5">{badge}</div>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export default GoalStepCard;
