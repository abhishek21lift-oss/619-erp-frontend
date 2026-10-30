'use client';

import type { ReactNode } from 'react';
import { AlertCircle, History, Loader2, Plus } from 'lucide-react';
import { Button, PageHero } from '@/components/ui';

interface AssessmentHistoryHubProps {
  title: string;
  icon: ReactNode;
  emptyLabel: string;
  loading: boolean;
  loadError: string;
  onRetry: () => void;
  onNew: () => void;
  assessments: Record<string, unknown>[];
  renderCard: (assessment: Record<string, unknown>) => ReactNode;
  renderComparison?: (initial: Record<string, unknown>, latest: Record<string, unknown>) => ReactNode;
}

/** The list half of an assessment module: loading/error states, hero, the
 *  initial-vs-latest comparison and the client's assessment history. */
export function AssessmentHistoryHub({
  title, icon, emptyLabel, loading, loadError, onRetry, onNew,
  assessments, renderCard, renderComparison,
}: AssessmentHistoryHubProps) {
  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 size={28} className="animate-spin" style={{ color: '#3F46D6' }} /></div>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-md py-24 text-center">
        <AlertCircle size={32} style={{ color: '#ef4444', margin: '0 auto 12px' }} />
        <p className="text-[14px] font-[600] text-[color:var(--text-secondary)]">{loadError}</p>
        <Button variant="outline" className="mt-4" onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  const sorted = [...assessments].sort((a, b) => String(b.assessment_date ?? '').localeCompare(String(a.assessment_date ?? '')));
  const initial = sorted[sorted.length - 1];
  const latest = sorted[0];

  return (
    <div className="mx-auto w-full max-w-3xl py-6 space-y-5">
      <PageHero
        icon={icon}
        title={title}
        actions={
          <Button iconLeft={<Plus size={14} />} onClick={onNew} style={{ background: '#fff', color: '#0F172A' }}>
            New Assessment
          </Button>
        }
      />

      {sorted.length >= 2 && renderComparison?.(initial, latest)}

      <div className="space-y-3">
        {sorted.length === 0 && (
          <div className="rounded-[20px] p-10 text-center" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <p className="text-[14px] font-[600] text-[color:var(--text-muted)]">{emptyLabel}</p>
            <Button className="mt-4" iconLeft={<Plus size={14} />} onClick={onNew} style={{ background: 'linear-gradient(135deg, #5B63F6, #3F46D6)', color: '#fff' }}>
              Start First Assessment
            </Button>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12.5px] font-[700] text-[color:var(--text-muted)]">Assessment History</p>
          </div>
        )}
        {sorted.map(renderCard)}
      </div>
    </div>
  );
}

export default AssessmentHistoryHub;
