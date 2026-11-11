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
import { m, useReducedMotion } from 'framer-motion';
import { ChevronDown, History, Loader2, Save } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlanVersion } from '@/lib/api';
import { useToast } from '@/lib/toast';

export interface PlanVersionsProps {
  planId: string;
  /** The live plan's version number — what a snapshot taken now would be called. */
  version: number;
  /** Lets the builder adopt the incremented version without a full reload. */
  onSaved: (nextVersion: number) => void;
  /**
   * Flushes pending autosaves before the snapshot is taken.
   *
   * A snapshot that races a save freezes the numbers from BEFORE the last
   * thing the trainer typed — the one thing a version is supposed to preserve.
   * Resolves false when something is still unsaved, in which case no snapshot
   * is taken.
   */
  beforeSave?: () => Promise<boolean>;
}

export default function PlanVersions({ planId, version, onSaved, beforeSave }: PlanVersionsProps) {
  const { toast } = useToast();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<WorkoutPlanVersion[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetched on expand, not on mount: most visits to the builder are to edit
  // the programme, and a request nobody reads is a request not worth making.
  const load = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(false);
    try {
      setRows(await api.workouts.plans.versions.list(planId));
    } catch {
      setHistoryError(true);
      setRows([]);
      toast.error('Could not load the history');
    } finally {
      setLoadingHistory(false);
    }
  }, [planId, toast]);

  useEffect(() => {
    if (open && rows === null && !loadingHistory) void load();
  }, [open, rows, loadingHistory, load]);

  const save = async () => {
    setSaving(true);
    try {
      if (beforeSave && !(await beforeSave())) {
        toast.error('Some changes could not be saved. Retry the save first.');
        return;
      }
      const res = await api.workouts.plans.versions.create(planId);
      onSaved(res.plan.version ?? version + 1);
      setRows(null);          // force a refetch; the list has a new entry
      setOpen(true);
      toast.success('Saved to history');
    } catch {
      toast.error('Could not save to history');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-[20px]"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      {/* A reference tool, not the work. It says what it is in one quiet row;
          the filled button belongs to "Add exercise", not here. */}
      <div className="flex min-h-[56px] items-center gap-2 py-2.5 pl-4 pr-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="plan-version-history"
          className="flex min-h-[56px] min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <History size={15} style={{ color: 'var(--brand)' }} aria-hidden />
          <span className="min-w-0 flex-1">
            <span
              className="block text-[10px] font-[700] uppercase tracking-wide"
              style={{ color: 'var(--text-muted)' }}
            >
              History
            </span>
            <span
              className="block truncate text-[13px] font-[750]"
              style={{ color: 'var(--text-primary)' }}
            >
              Older copies
            </span>
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            style={{
              color: 'var(--text-muted)',
              transform: open ? 'rotate(180deg)' : 'none',
              transition: 'transform .18s',
            }}
          />
        </button>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[12px] px-2.5 text-[12.5px] font-[700] transition-transform active:scale-[0.98] disabled:opacity-60"
          style={{ color: 'var(--brand)' }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save to history
        </button>
      </div>

      {open && (
        <m.div
          id="plan-version-history"
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduce ? 0 : 0.16 }}
          className="border-t px-4 pb-4 pt-3"
          style={{ borderColor: 'var(--border)' }}
        >
          {historyError ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px]" style={{ color: 'var(--danger-text)' }}>
                Could not load the history.
              </p>
              <button
                type="button"
                onClick={() => void load()}
                className="flex h-[44px] items-center text-[12.5px] font-[700]"
                style={{ color: 'var(--brand)' }}
              >
                Try again
              </button>
            </div>
          ) : loadingHistory || rows === null ? (
            <div role="status" aria-live="polite" className="flex justify-center py-4">
              <Loader2 size={16} className="animate-spin" aria-hidden style={{ color: 'var(--text-muted)' }} />
              <span className="sr-only">Loading history</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              Nothing saved yet. Save before a big rewrite and you can always look back at what the
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
                    {formatDate(v.created_at)}
                  </span>
                  <span className="text-[11px] font-[650]" style={{ color: 'var(--text-muted)' }}>
                    {v.exercise_count} exercise{v.exercise_count === 1 ? '' : 's'}
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
