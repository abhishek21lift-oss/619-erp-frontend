'use client';

import { NotebookPen } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';

export interface CoachNotesField {
  key: string;
  label: string;
}

interface CoachNotesPanelProps {
  fields: CoachNotesField[];
  notes: Record<string, string>;
  onChange: (key: string, value: string) => void;
  title?: string;
  subtitle?: string;
}

/** Generalized from lifestyle-assessment's CoachNotesPanel — a grid of
 *  auto-grow textareas, but driven by a `fields` prop instead of a
 *  hardcoded key list so any module (PAR-Q's trainer-notes step included)
 *  can reuse it. */
export function CoachNotesPanel({ fields, notes, onChange, title = 'Coach Notes', subtitle = 'Optional — free-form notes per focus area.' }: CoachNotesPanelProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <NotebookPen size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">{title}</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">{subtitle}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <FloatInput
              key={f.key} label={f.label} multiline autoGrow
              value={notes[f.key] ?? ''}
              onChange={(v) => onChange(f.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoachNotesPanel;
