'use client';

// Creating a workout: name, and two optional labels.
//
// Deliberately three fields. Everything else a workout carries — sections,
// prescriptions, supersets — is decided against real exercises in the builder,
// and asking for it up front means answering questions before the thing they
// describe exists.

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button, FloatInput } from '@/components/ui';
import { useDialogA11y } from '@/hooks/useDialogA11y';

export default function NewWorkoutDialog({ onClose, onCreate, onError }: {
  onClose: () => void;
  onCreate: (fields: { name: string; goal: string; dayLabel: string }) => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [dayLabel, setDayLabel] = useState('');
  const [saving, setSaving] = useState(false);

  // No `open` prop of its own — the parent only renders this component while
  // it should be open, so the dialog is open for the whole of its mounted
  // lifetime. escapeCloses stays default: unlike a save-in-flight sheet,
  // losing typed fields here is a name and two optional labels, not money.
  const dialogRef = useDialogA11y({ open: true, onClose });

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    try {
      await onCreate({ name, goal, dayLabel });
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : 'Could not create that workout');
      // Stays open with the typed values intact: closing on failure loses the
      // name and tells the trainer nothing about why.
      setSaving(false);
    }
  };

  return (
    <div
      // usePullToRefresh listens on window, so without this a downward drag
      // inside the dialog pulls the page behind it.
      data-no-pull-refresh
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      style={{ background: 'rgba(15,23,42,0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-label="New workout"
    >
      <div
        className="w-full max-w-md rounded-[20px] border p-5"
        style={{ borderColor: 'var(--border-2)', background: 'var(--bg-card)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[16px] font-[780]" style={{ color: 'var(--text-primary)' }}>
            New workout
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" style={{ color: 'var(--text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        <div className="space-y-2.5">
          <FloatInput label="Name" value={name} onChange={setName} required />
          <FloatInput label="Goal" value={goal} onChange={setGoal} />
          <FloatInput label="Day label" value={dayLabel} onChange={setDayLabel} />
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!name.trim() || saving}>
            {saving ? 'Creating…' : 'Create and add exercises'}
          </Button>
        </div>
      </div>
    </div>
  );
}
