'use client';

import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StepCardProps {
  icon: LucideIcon;
  /** Chapter accent: icon tile and focus rings only, never a status. */
  accent: string;
  title: string;
  description?: string;
  badge?: string;
  children: ReactNode;
}

/** The fitness wizard's section shell. Local on purpose: FormSection's 3px
 *  top rule and tinted panel are a different anatomy, used by every other
 *  form screen. */
export function StepCard({ icon: Icon, accent, title, description, badge, children }: StepCardProps) {
  return (
    <section
      className="rounded-[24px] border bg-[var(--bg-card)] p-5 sm:p-7"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex flex-wrap items-start gap-x-3.5 gap-y-2">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]"
          style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}
        >
          <Icon size={18} />
        </span>
        <div className="flex-1">
          <h2 className="text-[18px] font-[780] leading-tight tracking-[-0.02em]" style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {description && <p className="mt-0.5 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>{description}</p>}
        </div>
        {badge && (
          <span
            className="ml-auto shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-[700]"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

export default StepCard;
