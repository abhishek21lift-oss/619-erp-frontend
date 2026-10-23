'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, ClipboardCheck } from 'lucide-react';
import { amber, blue, emerald, gray, tint } from '@/lib/palette';
import GoalStepCard from './GoalStepCard';

export interface BaselineSource {
  key: string;
  label: string;
  /** Short state line, e.g. "78.4 kg · 22.1% · 12 Aug 2026". */
  detail: string;
  state: 'complete' | 'pending' | 'missing';
  href: string;
}

/** One K11 baseline reading: BP, BMI, body fat, step test, strength, flexibility. */
export interface BaselineMetric {
  label: string;
  value: string;
}

const STATE = {
  complete: { label: 'On file', color: emerald[600], wash: tint(emerald[500], 0.12) },
  pending: { label: 'In progress', color: amber[700], wash: tint(amber[500], 0.16) },
  missing: { label: 'Not recorded', color: gray[600], wash: gray[100] },
} as const;

/**
 * What the plan is built on. Read-only by design: the goal wizard never
 * creates or edits an assessment, it points at the module that does. Each
 * row carries the same client_id the wizard was opened with, so opening one
 * cannot silently switch to another client.
 *
 * `step` and `children` let the Assessment & Review wizard step use this as
 * its own card, with the re-test date underneath the readings.
 */
export function BaselineScreeningCard({
  sources, metrics = [], step, children,
}: {
  sources: BaselineSource[];
  metrics?: BaselineMetric[];
  step?: number;
  children?: ReactNode;
}) {
  return (
    <GoalStepCard
      icon={ClipboardCheck} title="Assessment & Review" step={step}
      hint="baseline readings and screening already on file — nothing here is typed twice"
    >
      {metrics.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {metrics.map((m) => (
            <div key={m.label} className="rounded-[12px] px-3.5 py-2.5" style={{ background: gray[50] }}>
              <p className="text-[10.5px] font-[700] uppercase tracking-wider" style={{ color: gray[500] }}>{m.label}</p>
              <p className="mt-0.5 text-[13px] font-[760]" style={{ color: m.value === '—' ? gray[400] : gray[800] }}>{m.value}</p>
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-2.5">
        {sources.map((s) => {
          const chip = STATE[s.state];
          return (
            <li
              key={s.key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3"
              style={{ background: gray[50] }}
            >
              <div className="min-w-0">
                <p className="text-[12.5px] font-[760]" style={{ color: gray[800] }}>{s.label}</p>
                <p className="text-[12px]" style={{ color: gray[500] }}>{s.detail}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-2.5 py-1 text-[11px] font-[760]"
                  style={{ background: chip.wash, color: chip.color }}
                >
                  {chip.label}
                </span>
                <Link
                  href={s.href}
                  className="inline-flex items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[700]"
                  style={{ background: tint(blue[500], 0.1), color: blue[700] }}
                >
                  Open <ArrowUpRight size={12} />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      {children}
    </GoalStepCard>
  );
}

export default BaselineScreeningCard;
