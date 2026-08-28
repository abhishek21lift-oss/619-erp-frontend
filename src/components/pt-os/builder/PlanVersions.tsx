'use client';

// "What did this programme say in March?"
//
// ── What is actually at risk ──────────────────────────────────────────────
//
// Not the client's history: workout_sessions and workout_sets record what was
// performed, independently of the plan, and no edit touches them. What an edit
// destroys is the PRESCRIPTION — what the programme said before the numbers
// were typed over. A trainer reviewing a plateau wants both, and only one of
// them survives.
//
// ── Why it is a button and not automatic ──────────────────────────────────
//
// The builder autosaves on every field blur. Versioning on write would mint a
// version per keystroke-ish edit, so the history would be thousands of rows
// deep and worth nothing. A version is a decision — "this is the block I ran
// with them" — and decisions get a button.
//
// ── Why saving does not create a new plan ─────────────────────────────────
//
// The snapshot is archived and the LIVE plan keeps its id, so assignments and
// clients never move. Minting a new plan and repointing assignments would
// migrate every client on a shared template at once, which is not what "keep
// a copy of what I had" means.

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { History, Loader2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlanVersion } from '@/lib/api';
import { useToast } from '@/lib/toast';

export interface PlanVersionsProps {
  planId: string;
  /** The live plan's version number — what a snapshot taken now would be called. */
  version: number;
  /** Lets the builder adopt the incremented version without a full reload. */
  onSaved: (nextVersion: number) => void;
}

export default function PlanVersions({ planId, version, onSaved }: PlanVersionsProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkoutPlanVersion[] | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetched on expand, not on mount: most visits to the builder are to edit
  // the programme, and a request nobody reads is a request not worth making.
  const load = useCallback(async () => {
    try {
      setRows(await api.workouts.plans.versions.list(planId));
    } catch {
      setRows([]);
      toast.error('Could not load the version history');
    }
  }, [planId, toast]);

  useEffect(() => { if (open && rows === null) void load(); }, [open, rows, load]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.workouts.plans.versions.create(planId);
      onSaved(res.plan.version ?? version + 1);
      setRows(null);          // force a refetch; the list has a new entry
      setOpen(true);
      toast.success(res.message);
    } catch {
      toast.error('Could not save a version');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="mb-4 rounded-[20px] p-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-h-[44px] items-center gap-2 text-left"
        >
          <History size={15} style={{ color: 'var(--text-muted)' }} />
          <span>
            <span className="block text-[13px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              Version {version}
            </span>
            <span className="block text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
              {open ? 'Hide history' : 'View history'}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-[44px] items-center gap-1.5 rounded-[14px] px-3.5 text-[12.5px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{
            background: 'linear-gradient(135deg, #0067e0, #3B8DF5)',
            boxShadow: '0 4px 14px -4px rgba(0,103,224,0.5)',
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save this version
        </button>
      </div>

      {open && (
        <m.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-3"
        >
          {rows === null ? (
            <div className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : rows.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No saved versions yet. Save one before a big rewrite and you can always see what the
              programme used to say.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {rows.map((v) => (
                <li
                  key={v.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-[12px] px-3 py-2.5"
                  style={{ background: 'var(--bg-subtle)' }}
                >
                  <span className="text-[12.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                    Version {v.version}
                  </span>
                  <span className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    {v.exercise_count} exercise{v.exercise_count === 1 ? '' : 's'} · {formatDate(v.created_at)}
                    {v.created_by_name ? ` · ${v.created_by_name}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </m.div>
      )}
    </div>
  );
}

/** "12 Mar 2026" — a version is placed in time, not timed to the second. */
function formatDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
