'use client';

import { ArrowRight, FileClock, GitCompare } from 'lucide-react';
import AssessmentComparison, { comparisonNumber } from '@/components/pt-os/shared/AssessmentComparison';

interface PostureComparisonProps {
  initial: Record<string, unknown>;
  latest: Record<string, unknown>;
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function issues(row: Record<string, unknown>): string[] {
  return [...new Set([
    ...strings(row.front_issues), ...strings(row.side_issues), ...strings(row.back_issues),
  ])];
}

function muscleCount(row: Record<string, unknown>): number {
  const value = row.muscle_imbalances;
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'string') {
    try { const p = JSON.parse(value); return Array.isArray(p) ? p.length : 0; } catch { return 0; }
  }
  return 0;
}

/**
 * “No longer recorded” is deliberately not “resolved”. A finding the trainer
 * did not select later may simply not have been assessed, and the report must
 * not claim improvement from silence. Only `resolved_findings`, which the
 * trainer ticks explicitly, counts as resolved.
 */
export function PostureComparison({ initial, latest }: PostureComparisonProps) {
  const before = issues(initial);
  const after = issues(latest);
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  const added = after.filter((i) => !beforeSet.has(i));
  const unchanged = after.filter((i) => beforeSet.has(i));
  const missing = before.filter((i) => !afterSet.has(i));
  const resolved = strings(latest.resolved_findings);

  const groups = [
    { label: 'New findings', items: added, color: '#A33757', bg: 'rgba(163,55,87,0.10)' },
    { label: 'Unchanged', items: unchanged, color: '#475569', bg: 'rgba(148,163,184,0.14)' },
    { label: 'Not recorded in current', items: missing, color: '#b45309', bg: 'rgba(245,158,11,0.12)' },
    { label: 'Explicitly resolved', items: resolved, color: '#047857', bg: 'rgba(16,185,129,0.12)' },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-3">
      <AssessmentComparison
        title="Postural Improvement"
        initial={initial} latest={latest}
        rows={[
          {
            key: 'posture_risk_score',
            label: 'Posture Risk Score',
            a: comparisonNumber(initial.posture_risk_score),
            b: comparisonNumber(latest.posture_risk_score),
            higherIsBetter: true,
          },
          {
            key: 'distinct_issues',
            label: 'Distinct Findings',
            a: issues(initial).length,
            b: issues(latest).length,
            higherIsBetter: false,
          },
          {
            key: 'muscle_findings',
            label: 'Muscle Findings',
            a: muscleCount(initial),
            b: muscleCount(latest),
            higherIsBetter: false,
          },
        ]}
      />

      <div className="rounded-[20px] p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}>
        <div className="mb-2.5 flex items-center gap-2">
          <GitCompare size={14} style={{ color: '#A33757' }} />
          <p className="text-[12.5px] font-[800]" style={{ color: 'var(--text-primary)' }}>Finding Changes</p>
          <span className="ml-auto text-[10px] font-[650]" style={{ color: 'var(--text-muted)' }}>
            {String(initial.assessment_date ?? '—').slice(0, 10)} <ArrowRight size={9} className="inline" /> {String(latest.assessment_date ?? '—').slice(0, 10)}
          </span>
        </div>

        {groups.length === 0 ? (
          <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>No comparable findings recorded in both assessments.</p>
        ) : (
          <div className="space-y-2">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="mb-1 text-[9.5px] font-[780] uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted)' }}>
                  {group.label} · {group.items.length}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <span key={item} className="rounded-[8px] px-2 py-1 text-[10.5px] font-[650]" style={{ background: group.bg, color: group.color }}>
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {missing.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 text-[10.5px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            <FileClock size={12} style={{ flexShrink: 0, marginTop: 2 }} />
            “Not recorded in current” means the assessment did not capture it. It is not marked resolved unless the trainer resolved it explicitly.
          </p>
        )}
      </div>
    </div>
  );
}

export default PostureComparison;
