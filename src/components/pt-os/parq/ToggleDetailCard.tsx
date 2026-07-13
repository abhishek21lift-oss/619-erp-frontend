'use client';

import { Check } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';

interface ToggleDetailCardProps {
  label: string;
  checked: boolean;
  onToggle: (v: boolean) => void;
  details: string;
  onDetailsChange: (v: string) => void;
  detailsLabel?: string;
  helperText?: string;
}

/** The toggle-expand pattern used throughout PAR-Q's Current Health step —
 *  a YES/NO card that reveals a free-text detail field only when checked.
 *  Same visual language as DigestiveIssuesChecklist's expand-on-select
 *  pattern from nutrition-assessment. */
export function ToggleDetailCard({
  label, checked, onToggle, details, onDetailsChange, detailsLabel = 'Details', helperText,
}: ToggleDetailCardProps) {
  return (
    <div
      className="rounded-[16px] overflow-hidden transition-all"
      style={{
        border: checked ? '2px solid #F59E0B' : '2px solid rgba(15,23,42,0.08)',
        background: checked ? 'rgba(245,158,11,0.04)' : 'var(--bg-subtle)',
      }}
    >
      <button
        type="button"
        onClick={() => onToggle(!checked)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-3">
          <span
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] transition-all"
            style={{ background: checked ? '#F59E0B' : '#fff', border: checked ? 'none' : '1.5px solid #cbd5e1' }}
          >
            {checked && <Check size={13} color="#fff" strokeWidth={3} />}
          </span>
          <span className="text-[13.5px] font-[700]" style={{ color: checked ? '#0f172a' : '#475569' }}>{label}</span>
        </span>
        {helperText && <span className="text-[11px] font-[600]" style={{ color: '#94a3b8' }}>{helperText}</span>}
      </button>
      {checked && (
        <div className="px-4 pb-4">
          <FloatInput label={detailsLabel} multiline autoGrow value={details} onChange={onDetailsChange} />
        </div>
      )}
    </div>
  );
}

export default ToggleDetailCard;
