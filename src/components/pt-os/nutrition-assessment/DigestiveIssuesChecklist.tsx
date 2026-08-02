'use client';

import { Check } from 'lucide-react';
import { Slider } from '@/components/ui';
import SearchableSelect from '@/components/pt-os/SearchableSelect';
import type { DigestiveIssue, DigestiveFrequency } from '@/lib/nutrition-calculations';

const KNOWN_ISSUES = ['Bloating', 'Acidity', 'Constipation', 'Diarrhea', 'Gas', 'IBS', 'Nausea', 'Food Intolerance'];

const FREQUENCY_OPTIONS: { value: DigestiveFrequency; label: string }[] = [
  { value: 'rare', label: 'Rare' }, { value: 'weekly', label: 'Weekly' }, { value: 'daily', label: 'Daily' },
];

interface DigestiveIssuesChecklistProps {
  value: DigestiveIssue[];
  onChange: (v: DigestiveIssue[]) => void;
}

/** Same expand-on-select pattern as SupplementChecklist — checking an issue
 *  reveals a Frequency select + Severity slider beneath it. */
export function DigestiveIssuesChecklist({ value, onChange }: DigestiveIssuesChecklistProps) {
  const isChecked = (issue: string) => value.some((s) => s.issue === issue);
  const get = (issue: string) => value.find((s) => s.issue === issue);

  const toggle = (issue: string) => {
    if (isChecked(issue)) onChange(value.filter((s) => s.issue !== issue));
    else onChange([...value, { issue, frequency: 'weekly', severity: 5 }]);
  };

  const updateFrequency = (issue: string, frequency: DigestiveFrequency) => {
    onChange(value.map((s) => (s.issue === issue ? { ...s, frequency } : s)));
  };

  const updateSeverity = (issue: string, severity: number) => {
    onChange(value.map((s) => (s.issue === issue ? { ...s, severity } : s)));
  };

  return (
    <div className="space-y-2.5">
      {KNOWN_ISSUES.map((issue) => {
        const checked = isChecked(issue);
        const item = get(issue);
        return (
          <div key={issue} className="rounded-[16px] transition-all" style={{ border: checked ? '2px solid #0067E0' : '2px solid rgba(15,23,42,0.08)', background: checked ? 'rgba(0,103,224,0.04)' : 'var(--bg-subtle)' }}>
            <button
              type="button" onClick={() => toggle(issue)}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
            >
              <span
                className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] transition-all"
                style={{ background: checked ? '#0067E0' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}
              >
                {checked && <Check size={13} color="#fff" strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] font-[700]" style={{ color: checked ? '#0f172a' : '#475569' }}>{issue}</span>
            </button>
            {checked && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4 pb-4">
                <SearchableSelect
                  label="Frequency" allowCustom={false}
                  value={item?.frequency || 'weekly'}
                  onChange={(v) => updateFrequency(issue, v as DigestiveFrequency)}
                  options={FREQUENCY_OPTIONS}
                />
                <Slider
                  label="Severity" value={item?.severity ?? 5} min={1} max={10}
                  onChange={(v) => updateSeverity(issue, v)}
                  scaleLabels={['1 · Mild', '10 · Severe']}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default DigestiveIssuesChecklist;
