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
      className="rounded-[24px] overflow-hidden"
      style={{ background: 'var(--bg-card)', border: `1px solid ${gray[200]}`, boxShadow: `0 4px 24px ${rgba(gray[900], 0.06)}` }}
    >
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${indigo[500]}, ${indigo[300]})` }} />
      <div className="p-7 sm:p-10">
        {title && (
          <header className="mb-7 flex items-start gap-4">
            {Icon && (
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]"
                style={{ background: indigo[50], border: `1px solid ${indigo[100]}` }}
              >
                <Icon size={20} strokeWidth={1.75} style={{ color: indigo[600] }} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">{title}</h2>
              <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">
                {step ? `Step ${step} of ${LAST_STEP}${hint ? ` — ${hint}` : ''}` : hint}
              </p>
            </div>
            {badge && <div className="flex-shrink-0">{badge}</div>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export default GoalStepCard;
