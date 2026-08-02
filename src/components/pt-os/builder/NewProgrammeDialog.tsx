'use client';

// Create a programme, then open it in the builder.
//
// ── What this replaces, and why the flow changed ───────────────────────────
//
// The Programs screen used to carry a four-step wizard: pick a client, name
// the plan, add every exercise, save. That wizard was the ONLY way to create a
// plan with exercises in it, so it could not simply be deleted when the new
// builder landed — creating a programme would have stopped working.
//
// It is replaced rather than ported. The wizard existed because there was
// nowhere else to add exercises; now there is. So this captures only what a
// plan needs to EXIST — client, name, goal, length — and hands straight over
// to the builder, which is where exercises belong. Two short steps instead of
// one long form, and the second step is a screen you will return to anyway.
//
// The client is still chosen here because assignment happens on create: a
// programme nobody is on is a template, and the trainer who just typed a name
// almost always has a client in mind.

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';

export interface ClientOption { id: string; name: string; }

export const PROGRAMME_GOALS = [
  { value: 'muscle_gain', label: 'Muscle Gain' },
  { value: 'weight_loss', label: 'Weight Loss' },
  { value: 'endurance', label: 'Endurance' },
  { value: 'general_fitness', label: 'General Fitness' },
  { value: 'recovery', label: 'Recovery' },
] as const;

export const WEEKS_MIN = 1;
export const WEEKS_MAX = 52;
export const PER_WEEK_MIN = 1;
export const PER_WEEK_MAX = 14;

/**
 * Read a number out of what is currently typed, held to its bounds.
 *
 * Called on blur and again on submit — never on change, which is what was
 * broken. The fields used to be numeric state clamped on every keystroke:
 *
 *   onChange={(e) => setWeeks(Math.max(1, Number(e.target.value) || 1))}
 *
 * Numeric state cannot hold "", so clearing the box to type a new value was
 * impossible. Select-all and type 8: the browser fires change with "" first,
 * Number("") is 0, `|| 1` turns that into 1, the box snaps to "1" — and the 8
 * lands after it, giving 18. The only reachable values were the ones you could
 * build by appending to a 1.
 *
 * The upper bound was not enforced at all either: max={52} is a hint the
 * browser does not apply to typing, and Math.max only has a floor. 999 weeks
 * submitted happily.
 */
export function clamp(raw: string, min: number, max: number): number {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export interface NewProgrammeDialogProps {
  open: boolean;
  onClose: () => void;
  /** Preselects the client when opened from a client-scoped screen. */
  presetClientId?: string | null;
  /** Lets the Programs list refresh without this component knowing how. */
  onCreated?: (plan: WorkoutPlan) => void;
}

export default function NewProgrammeDialog({
  open, onClose, presetClientId, onCreated,
}: NewProgrammeDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<string | null>(presetClientId ?? null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>(PROGRAMME_GOALS[0].value);
  // Held as strings, not numbers, and clamped on blur rather than on every
  // keystroke. See clamp() below for what the numeric version did.
  const [weeks, setWeeks] = useState('4');
  const [perWeek, setPerWeek] = useState('3');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setClientId(presetClientId ?? null);
    api.pt.clients()
      .then((r: { data?: unknown[] }) => {
        setClients(((r?.data ?? []) as Array<{ id: string; name: string }>)
          .map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => setClients([]));
  }, [open, presetClientId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? clients.filter((c) => c.name.toLowerCase().includes(q)) : clients;
  }, [clients, search]);

  if (!open) return null;

  const submit = async () => {
    if (!clientId) { toast.error('Pick a client first'); return; }
    if (!name.trim()) { toast.error('Give the programme a name'); return; }

    setSaving(true);
    try {
      const { plan } = await api.workouts.plans.create({
        name: name.trim(),
        goal,
        difficulty: 'intermediate',
        duration_weeks: clamp(weeks, WEEKS_MIN, WEEKS_MAX),
        sessions_per_week: clamp(perWeek, PER_WEEK_MIN, PER_WEEK_MAX),
        // Deliberately no exercises: the builder adds them, one granular
        // request each, so they keep stable ids from the moment they exist.
      });

      // Assign before navigating. A failure here must not swallow the plan —
      // it exists either way, so report and continue rather than roll back.
      try {
        await api.workouts.assign({ workout_plan_id: plan.id, client_id: clientId });
      } catch {
        toast.error('Programme created, but could not assign it to the client');
      }

      onCreated?.(plan);
      router.push(`/pt-os/clients/${clientId}/training/builder?plan=${plan.id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not create the programme');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      // z-[120], not z-50. The AI assistant's floating button is z-100 and
      // fixed to the bottom-right, so at z-50 this sheet opened UNDERNEATH it
      // and the FAB sat on top of the "Create and add exercises" button —
      // covering the sheet's primary action on a 390px screen. Above the FAB
      // and the nav, below the toasts (z-9999) and the impersonation banner
      // (z-10000), both of which should outrank a dialog.
      className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="New programme"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[24px] p-5 sm:rounded-[24px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[17px] font-[800]" style={{ color: 'var(--text-primary)' }}>
            New programme
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-[44px] w-[44px] items-center justify-center rounded-[12px]"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        <Field label="Programme name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
            placeholder="e.g. Upper / Lower Split"
            className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
            style={inputStyle}
          />
        </Field>

        <Field label="Goal">
          <div className="flex flex-wrap gap-1.5">
            {PROGRAMME_GOALS.map((g) => {
              const active = g.value === goal;
              return (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className="h-[44px] rounded-[12px] px-3 text-[12.5px] font-[700]"
                  style={{
                    background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                    color: active ? '#fff' : 'var(--text-muted)',
                  }}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Weeks">
            <input
              type="number" min={WEEKS_MIN} max={WEEKS_MAX} value={weeks} inputMode="numeric"
              onChange={(e) => setWeeks(e.target.value)}
              onBlur={() => setWeeks(String(clamp(weeks, WEEKS_MIN, WEEKS_MAX)))}
              className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
              style={inputStyle}
            />
          </Field>
          <Field label="Sessions / week">
            <input
              type="number" min={PER_WEEK_MIN} max={PER_WEEK_MAX} value={perWeek} inputMode="numeric"
              onChange={(e) => setPerWeek(e.target.value)}
              onBlur={() => setPerWeek(String(clamp(perWeek, PER_WEEK_MIN, PER_WEEK_MAX)))}
              className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
              style={inputStyle}
            />
          </Field>
        </div>

        {!presetClientId && (
          <Field label="Client">
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients…"
                className="h-[44px] w-full rounded-[12px] pl-9 pr-3 text-[13.5px] outline-none"
                style={inputStyle}
              />
            </div>
            <div className="max-h-44 overflow-y-auto rounded-[12px]" style={{ border: '1px solid var(--border)' }}>
              {filtered.length === 0 ? (
                <p className="p-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No clients found.</p>
              ) : filtered.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setClientId(c.id)}
                  className="flex h-[44px] w-full items-center px-3 text-left text-[13.5px] font-[650]"
                  style={{
                    background: c.id === clientId ? 'var(--bg-subtle)' : 'transparent',
                    color: c.id === clientId ? 'var(--brand)' : 'var(--text-primary)',
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </Field>
        )}

        <button
          onClick={submit}
          disabled={saving}
          className="mt-2 flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white disabled:opacity-60"
          style={{ background: 'var(--brand)' }}
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {saving ? 'Creating…' : 'Create and add exercises'}
        </button>
        <p className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
          You will add exercises next, in the builder.
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-subtle)',
  border: '1px solid var(--border)',
  color: 'var(--text-primary)',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[11px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      {children}
    </label>
  );
}
