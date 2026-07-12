'use client';

import { NotebookPen } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';
import type { CoachNotes } from './types';

const SECTIONS: { key: keyof CoachNotes; label: string }[] = [
  { key: 'dietary_advice', label: 'Dietary Advice' },
  { key: 'meal_planning', label: 'Meal Planning' },
  { key: 'supplement_advice', label: 'Supplement Advice' },
  { key: 'medical_notes', label: 'Medical Notes' },
  { key: 'special_instructions', label: 'Special Instructions' },
];

interface CoachNotesPanelProps {
  notes: CoachNotes;
  set: (notes: CoachNotes) => void;
}

export function CoachNotesPanel({ notes, set }: CoachNotesPanelProps) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <NotebookPen size={20} color="#F59E0B" />
          </div>
          <div>
            <h2 className="text-[20px] font-[840] tracking-[-0.03em] text-slate-900 leading-none">Coach Notes</h2>
            <p className="text-[13px] text-slate-400 mt-1.5">Optional — free-form notes per focus area.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SECTIONS.map((s) => (
            <FloatInput
              key={s.key} label={s.label} multiline autoGrow
              value={notes[s.key]}
              onChange={(v) => set({ ...notes, [s.key]: v })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoachNotesPanel;
