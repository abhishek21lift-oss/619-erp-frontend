'use client';

// The studio's weekly set range per muscle.
//
// ── Why this screen exists at all ─────────────────────────────────────────
//
// The set counts on the analytics page are measured. The range they are judged
// against is not — it is a coaching opinion. Shipping that opinion as a
// hard-coded constant would put a number the trainer never chose beside a
// number measured from their client, in the same typeface, with nothing to
// distinguish them. This screen is what makes the opinion theirs.
//
// ── What the defaults are, and are not ────────────────────────────────────
//
// The seeded values are commonly-cited starting ranges. They are deliberately
// not attributed to a specific study or author, because they circulate in
// roughly this form across several published training systems and a citation
// would lend them an authority they do not have. The copy on this screen says
// so plainly rather than implying a source.
//
// Some muscles ship with no range. That is not an omission: where no such
// range is conventional, a plausible-looking pair of numbers would be invented,
// and a blank at least says "you decide".
//
// Clearing both fields is allowed and means "no range" — after which that
// muscle gets no verdict on the analytics screen, which is the correct
// outcome and not a broken one.

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Loader2, RotateCcw, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { MuscleLandmark } from '@/lib/api';
import { useToast } from '@/lib/toast';

export interface LandmarkEditorProps {
  open: boolean;
  onClose: () => void;
  /** Lets the analytics page re-read its numbers against the new ranges. */
  onSaved: () => void;
}

export default function LandmarkEditor({ open, onClose, onSaved }: LandmarkEditorProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<MuscleLandmark[] | null>(null);
  const [savingMuscle, setSavingMuscle] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    api.progress.workoutLog.landmarks.list()
      .then((r) => { if (!cancelled) setRows(r.data ?? []); })
      .catch(() => { if (!cancelled) { setRows([]); toast.error('Could not load your ranges'); } });
    return () => { cancelled = true; };
  }, [open, toast]);

  // Tell the parent once, on close, rather than after every field — the
  // analytics page refetch is not cheap and nobody needs it mid-edit.
  const close = () => { if (dirty) onSaved(); onClose(); };

  if (!open) return null;

  const save = async (muscle: string, mev: number | null, mrv: number | null) => {
    setSavingMuscle(muscle);
    try {
      const { data } = await api.progress.workoutLog.landmarks.save(muscle, { mev_sets: mev, mrv_sets: mrv });
      setRows((prev) => (prev ?? []).map((r) => (
        r.target_muscle === muscle ? { ...r, ...data, is_custom: true } : r
      )));
      setDirty(true);
    } catch {
      // Re-read rather than leaving the field showing a value the server
      // rejected — a min above a max is refused, and the input must not keep
      // pretending it was stored.
      toast.error('Could not save that range');
      const fresh = await api.progress.workoutLog.landmarks.list().catch(() => null);
      if (fresh) setRows(fresh.data ?? []);
    } finally {
      setSavingMuscle(null);
    }
  };

  /** Drop the override so the shared starting range comes back. */
  const reset = async (muscle: string) => {
    setSavingMuscle(muscle);
    try {
      const { data } = await api.progress.workoutLog.landmarks.reset(muscle);
      setRows((prev) => (prev ?? []).map((r) => (r.target_muscle === muscle ? { ...data } : r)));
      setDirty(true);
    } catch {
      toast.error('Could not restore the default range');
    } finally {
      setSavingMuscle(null);
    }
  };

  return (
    <div
      data-no-pull-refresh className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={close}
      role="presentation"
    >
      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Weekly set ranges"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] p-5 sm:rounded-[24px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="text-[17px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            Weekly set ranges
          </h2>
          <button
            onClick={close}
            aria-label="Close"
            className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-[12px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* The disclaimer is the feature, not boilerplate. Without it the
            numbers below read as the system's prescription. */}
        <p className="mb-4 text-[12px] leading-[1.5]" style={{ color: 'var(--text-muted)' }}>
          These are <strong style={{ color: 'var(--text-primary)' }}>your studio&rsquo;s</strong> ranges,
          used only to flag a muscle as below or above on the analytics screen. The starting values are
          commonly-cited ranges rather than findings from a particular study — treat them as a
          conversation starter and change them to match how you coach. A muscle left blank simply gets
          no verdict.
        </p>

        {rows === null ? (
          <div className="flex justify-center py-10">
            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((r) => (
              <LandmarkRow
                key={r.target_muscle}
                row={r}
                saving={savingMuscle === r.target_muscle}
                onSave={(mev, mrv) => save(r.target_muscle, mev, mrv)}
                onReset={() => reset(r.target_muscle)}
              />
            ))}
          </ul>
        )}
      </m.div>
    </div>
  );
}

function LandmarkRow({
  row, saving, onSave, onReset,
}: {
  row: MuscleLandmark;
  saving: boolean;
  onSave: (mev: number | null, mrv: number | null) => void;
  onReset: () => void;
}) {
  const [mev, setMev] = useState(row.mev_sets == null ? '' : String(row.mev_sets));
  const [mrv, setMrv] = useState(row.mrv_sets == null ? '' : String(row.mrv_sets));

  // Adopt whatever the server actually stored, so a rejected edit does not
  // leave the field showing a value that was never saved.
  useEffect(() => { setMev(row.mev_sets == null ? '' : String(row.mev_sets)); }, [row.mev_sets]);
  useEffect(() => { setMrv(row.mrv_sets == null ? '' : String(row.mrv_sets)); }, [row.mrv_sets]);

  const parse = (v: string) => (v.trim() === '' ? null : Number(v));
  const commit = () => {
    const a = parse(mev);
    const b = parse(mrv);
    if ((a != null && !Number.isFinite(a)) || (b != null && !Number.isFinite(b))) return;
    if (a === row.mev_sets && b === row.mrv_sets) return;      // nothing changed
    onSave(a, b);
  };

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-[14px] px-3 py-2" style={{ background: 'var(--bg-subtle)' }}>
      <span className="min-w-[86px] flex-1 truncate text-[12.5px] font-[700] capitalize" style={{ color: 'var(--text-primary)' }}>
        {row.target_muscle}
        {row.is_custom && (
          <span className="ml-1.5 text-[9.5px] font-[650] uppercase tracking-wide" style={{ color: 'var(--brand)' }}>
            yours
          </span>
        )}
      </span>

      <Num value={mev} onChange={setMev} onBlur={commit} label={`Minimum sets for ${row.target_muscle}`} />
      <span className="text-[12px]" style={{ color: 'var(--text-muted)' }}>–</span>
      <Num value={mrv} onChange={setMrv} onBlur={commit} label={`Maximum sets for ${row.target_muscle}`} />

      <span className="w-[20px] shrink-0">
        {saving && <Loader2 size={13} className="animate-spin" style={{ color: 'var(--text-muted)' }} />}
      </span>

      {/* Back to the shared default — a DELETE of this studio's row, not two
          nulls. Blanking the fields stores "no range" and that muscle stops
          being judged; this restores the starting numbers. Two different
          intentions, and only one of them is undoable by hand. */}
      {row.is_custom && (
        <button
          type="button"
          aria-label={`Restore the default range for ${row.target_muscle}`}
          onClick={onReset}
          className="flex h-[44px] w-[44px] items-center justify-center rounded-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <RotateCcw size={13} />
        </button>
      )}
    </li>
  );
}

function Num({
  value, onChange, onBlur, label,
}: { value: string; onChange: (v: string) => void; onBlur: () => void; label: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      inputMode="numeric"
      aria-label={label}
      placeholder="—"
      className="h-[44px] w-[54px] rounded-[10px] px-1 text-center text-[13px] font-[700] outline-none"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    />
  );
}
