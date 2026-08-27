'use client';

import { NotebookPen } from 'lucide-react';
import FloatInput from '@/components/ui/FloatInput';

export interface CoachNotesField<T> {
  key: Extract<keyof T, string>;
  label: string;
}

/** Generic over the notes shape rather than taking Record<string, string>.
 *
 *  Each assessment declares its notes as an `interface`, and TypeScript does
 *  not give an interface an implicit index signature — so `CoachNotes` is not
 *  assignable to Record<string, string> and all three call sites failed to
 *  compile. The alternatives were to rewrite three type declarations as
 *  aliases, or to cast at every call site. A generic needs neither, and it
 *  buys something: `fields` keys are now checked against the notes type, so a
 *  typo in a field key is a compile error instead of a permanently blank
 *  textarea. */
interface CoachNotesPanelProps<T> {
  fields: CoachNotesField<T>[];
  notes: T;
  onChange: (key: Extract<keyof T, string>, value: string) => void;
  title?: string;
  subtitle?: string;
}

/** A grid of auto-grow textareas, driven by a `fields` prop rather than a
 *  hardcoded key list, so every assessment module can share one panel.
 *
 *  It was generalized out of lifestyle-assessment for exactly that reason and
 *  then nobody moved to it: lifestyle, posture and nutrition each kept their
 *  own copy, identical but for the field list and one line of subtitle. Four
 *  files, one component. They are gone now and all three import this.
 *
 *  The card chrome — rounded surface, gradient rule, padding — moved in here
 *  as part of that. The generalized version rendered a bare <div>, so the
 *  three copies each wrapped it themselves; leaving it that way would have
 *  meant migrating them and losing the card. */
export function CoachNotesPanel<T>({ fields, notes, onChange, title = 'Coach Notes', subtitle = 'Optional — free-form notes per focus area.' }: CoachNotesPanelProps<T>) {
  return (
    <div className="rounded-[24px] overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(15,23,42,0.06)' }}>
      <div className="h-1 w-full" style={{ background: 'linear-gradient(90deg,#0f172a,#334155)' }} />
      <div className="p-7 sm:p-10">
        <div className="flex items-start gap-4 mb-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[16px]" style={{ background: '#0f172a' }}>
            <NotebookPen size={20} color="#1CA3F9" />
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
              value={String(notes[f.key] ?? '')}
              onChange={(v) => onChange(f.key, v)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CoachNotesPanel;
