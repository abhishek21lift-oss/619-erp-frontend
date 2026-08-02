'use client';

import { ArrowDown, ArrowUp, Minus, GitCompare } from 'lucide-react';

interface MobilityComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

function num(v: unknown): number | null {
  const f = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(f) ? f : null;
}

const METRICS: { key: string; label: string }[] = [
  { key: 'mobility_score', label: 'Mobility Score' },
  { key: 'grip_strength_kg', label: 'Grip Strength (kg)' },
  { key: 'vertical_jump_cm', label: 'Vertical Jump (cm)' },
  { key: 'balance_test_seconds', label: 'Balance Test (s)' },
];

export function MobilityComparison({ initial, latest }: MobilityComparisonProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-7">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <GitCompare size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Progress Comparison</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">
              Initial ({String(initial.assessment_date ?? '—')}) vs. Latest ({String(latest.assessment_date ?? '—')})
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {METRICS.map((m) => {
            const a = num(initial[m.key]);
            const b = num(latest[m.key]);
            if (a == null && b == null) return null;
            const delta = a != null && b != null ? Math.round((b - a) * 100) / 100 : null;
            const improved = delta != null && delta !== 0 ? delta > 0 : null;
            return (
              <div key={m.key} className="flex items-center justify-between gap-3 rounded-[14px] px-4 py-3" style={{ background: 'var(--bg-subtle)' }}>
                <span className="text-[13px] font-[640] text-slate-600">{m.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-[12.5px] font-[600] text-slate-400">
                    {a ?? '—'} <span className="mx-1">→</span> {b ?? '—'}
                  </span>
                  {delta != null && (
                    <span
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-[700]"
                      style={{
                        background: improved == null ? 'rgba(148,163,184,0.14)' : improved ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                        color: improved == null ? '#64748b' : improved ? '#059669' : '#dc2626',
                      }}
                    >
                      {delta === 0 ? <Minus size={11} /> : delta > 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {delta > 0 ? '+' : ''}{delta}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default MobilityComparison;
