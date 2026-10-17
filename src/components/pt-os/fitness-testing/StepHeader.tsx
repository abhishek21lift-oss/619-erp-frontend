'use client';

import type { LucideIcon } from 'lucide-react';
import { gradient, type Tone } from './fitnessTheme';

/**
 * The header every wizard step opens with: a domain-hued gradient squircle,
 * the step's name, and its one-line context. Was seven near-identical copies
 * of a dark tile, one per step.
 */
export function StepHeader({ icon: Icon, tone, title, subtitle }: {
  icon: LucideIcon;
  tone: Tone;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-7 flex items-start gap-4">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-[16px] text-white"
        style={{ background: gradient(tone), boxShadow: `0 14px 30px -14px ${tone.glow}` }}
      >
        <Icon size={20} />
      </span>
      <div>
        <h2 className="text-[20px] font-[840] leading-none tracking-[-0.03em]" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="mt-1.5 text-[13px]" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
      </div>
    </div>
  );
}

export default StepHeader;
