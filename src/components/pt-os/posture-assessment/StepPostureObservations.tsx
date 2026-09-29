'use client';

import { useState } from 'react';
import { PersonStanding } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import MultiSelectChips from '@/components/pt-os/MultiSelectChips';
import { POSTURE_ISSUES_BY_VIEW } from './types';
import type { PostureFormData } from './types';

const VIEWS: { key: 'frontIssues' | 'sideIssues' | 'backIssues'; label: string }[] = [
  { key: 'frontIssues', label: 'Front' },
  { key: 'sideIssues', label: 'Side' },
  { key: 'backIssues', label: 'Back' },
];

interface StepPostureObservationsProps {
  form: PostureFormData;
  set: <K extends keyof PostureFormData>(key: K, val: PostureFormData[K]) => void;
}

export function StepPostureObservations({ form, set }: StepPostureObservationsProps) {
  const [activeView, setActiveView] = useState<'frontIssues' | 'sideIssues' | 'backIssues'>('frontIssues');

  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <PersonStanding size={20} color="#1CA3F9" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-[color:var(--text-primary)] leading-none">Posture Observations</h2>
            <p className="text-[13px] text-[color:var(--text-muted)] mt-1.5">Step 1 of 2 — select any deviations noted from each view.</p>
          </div>
        </div>

        <div className="flex gap-2">
          {VIEWS.map((v) => {
            const selected = activeView === v.key;
            const count = form[v.key].length;
            return (
              <button
                key={v.key} type="button" onClick={() => setActiveView(v.key)}
                className="flex items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-[13px] font-[700] transition-all"
                style={{
                  background: selected ? 'var(--text-primary)' : 'var(--bg-subtle)',
                  color: selected ? 'var(--bg-card)' : 'var(--text-muted)',
                  border: selected ? '1.5px solid var(--text-primary)' : '1.5px solid var(--border)',
                }}
              >
                {v.label}
                {count > 0 && (
                  <span
                    className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-[800]"
                    style={{ background: selected ? '#0067E0' : 'var(--border)', color: selected ? '#fff' : 'var(--text-muted)' }}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* An issue saved on an older record from a view that no longer lists
            it still shows, so it can be seen and removed. */}
        <MultiSelectChips value={form[activeView]} onChange={(v) => set(activeView, v)}
          options={[...POSTURE_ISSUES_BY_VIEW[activeView], ...form[activeView].filter((i) => !POSTURE_ISSUES_BY_VIEW[activeView].includes(i))]} />

        <FloatInput label="Other Notes" multiline autoGrow maxLength={1000} value={form.otherIssueNotes} onChange={(v) => set('otherIssueNotes', v)} />
      </div>
    </div>
  );
}

export default StepPostureObservations;
