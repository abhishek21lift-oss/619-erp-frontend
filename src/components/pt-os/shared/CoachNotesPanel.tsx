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
    <div>
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
  );
}

export default CoachNotesPanel;
