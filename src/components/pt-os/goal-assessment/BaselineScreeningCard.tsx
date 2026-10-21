'use client';

import Link from 'next/link';
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
 */
export function BaselineScreeningCard({ sources }: { sources: BaselineSource[] }) {
  return (
    <GoalStepCard
      icon={ClipboardCheck} title="Baseline & Screening"
      hint="pulled from the modules that own this data — nothing here is typed twice"
    >
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
    </GoalStepCard>
  );
}

export default BaselineScreeningCard;
