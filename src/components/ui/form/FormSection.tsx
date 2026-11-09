'use client';

import * as React from 'react';
import { cn } from '../cn';
import { FieldSurface } from './controls';

/**
 * One section of a data-entry form, as a card.
 *
 * The shape already existed in the fitness-testing steps — a titled card, a
 * tinted field panel, controls sitting on it — but it was rebuilt per screen
 * and half the forms never got it. This is the one definition.
 *
 * The tone tints depth only: the tile, the panel, the 3px top rule. Text stays
 * on the app's text tokens, so contrast never depends on which hue a section
 * happens to use.
 */
export type FormSectionTone = 'rose' | 'amber' | 'emerald' | 'sky';

const TONES: Record<FormSectionTone, { rgb: string; ink: string }> = {
  rose: { rgb: '163,55,87', ink: '163,55,87' },
  amber: { rgb: '245,158,11', ink: '180,83,9' },
  emerald: { rgb: '16,185,129', ink: '4,120,87' },
  sky: { rgb: '14,165,233', ink: '3,105,161' },
};

export function FormSection({
  icon, title, description, tone = 'rose', className, children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  tone?: FormSectionTone;
  className?: string;
  children: React.ReactNode;
}) {
  const t = TONES[tone];
  return (
    <section
      className={cn('rounded-[20px] p-1', className)}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderTop: `3px solid rgba(${t.rgb},0.55)`,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3">
        <span
          aria-hidden
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: `rgba(${t.rgb},0.16)`, color: `rgb(${t.ink})` }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-[14px] font-[750] leading-tight tracking-[-0.01em]"
            style={{ color: 'var(--text-primary)' }}>
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-muted)' }}>
              {description}
            </p>
          )}
        </div>
      </div>

      {/* `nested` puts every control inside on the white surface it was
          designed for; the tint behind them belongs to the panel, not the
          input. */}
      <FieldSurface surface="nested">
        <div
          className="rounded-[14px] p-3.5"
          style={{ background: `linear-gradient(180deg, rgba(${t.rgb},0.085), rgba(${t.rgb},0.028))` }}
        >
          {children}
        </div>
      </FieldSurface>
    </section>
  );
}
