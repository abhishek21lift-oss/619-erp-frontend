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
import { m } from 'framer-motion';
import { Dumbbell, Loader2, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { WorkoutPlan } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { useDialogA11y } from '@/hooks/useDialogA11y';

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

/**
 * Match a client's stored goal to one of the five programme goals.
 *
 * `pt_clients.goal` is free TEXT (migration 050), filled by the onboarding
 * wizard, so it arrives as "muscle_gain", "Muscle Gain", "muscle gain" or
 * something nobody listed. Anything that does not map returns undefined and
 * the dialog leaves the current selection alone rather than guessing.
 */
export function goalFromClient(raw: unknown): string | undefined {
  const key = String(raw ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (!key) return undefined;
  return PROGRAMME_GOALS.find((g) => g.value === key)?.value;
}

/**
 * Sessions per week, out of the client's own `frequency`.
 *
 * Also free TEXT: "3", "3x/week", "4 days", "twice weekly". The first integer
 * is the only part that can be read reliably, and it is only used when it
 * lands inside the range the field accepts — "twice weekly" yields nothing,
 * so the default stands rather than a number being invented for it.
 */
export function perWeekFromClient(raw: unknown): number | undefined {
  const match = String(raw ?? '').match(/\d+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  if (!Number.isFinite(n) || n < PER_WEEK_MIN || n > PER_WEEK_MAX) return undefined;
  return n;
}

/** A name the trainer can accept or type over — never a name they cannot see. */
export function programmeNameFor(clientName: string, goalValue?: string): string {
  const label = PROGRAMME_GOALS.find((g) => g.value === goalValue)?.label;
  return label ? `${clientName} — ${label}` : `${clientName} — Training Plan`;
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
  // Escape, focus trap and focus restore. This dialog had none of the three:
  // it could only be dismissed with a mouse, and Tab left it immediately.
  const dialogRef = useDialogA11y({ open: true, onClose });
  const [search, setSearch] = useState('');
  const [clientId, setClientId] = useState<string | null>(presetClientId ?? null);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState<string>(PROGRAMME_GOALS[0].value);
  // Held as strings, not numbers, and clamped on blur rather than on every
  // keystroke. See clamp() below for what the numeric version did.
  const [weeks, setWeeks] = useState('4');
  const [perWeek, setPerWeek] = useState('3');
  const [saving, setSaving] = useState(false);
  /**
   * Which fields the trainer has typed in themselves.
   *
   * Picking a client fills the rest of the form from that client's record —
   * but a trainer who has already named the programme and then changes their
   * mind about the client must not watch their own typing disappear. Only
   * untouched fields are filled.
   */
  const [touched, setTouched] = useState<Record<'name' | 'goal' | 'weeks' | 'perWeek', boolean>>({
    name: false, goal: false, weeks: false, perWeek: false,
  });
  const touch = (k: 'name' | 'goal' | 'weeks' | 'perWeek') =>
    setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

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

  /**
   * Fill the form from the chosen client.
   *
   * The client list carries only id and name, so the record is read on
   * selection — /api/pt-os/clients/:id returns the whole row, including the
   * `goal` and `frequency` the onboarding wizard collects. Nothing here is
   * invented: a field is filled only when the client's record actually
   * answers it, and the weeks default of 4 is the same default the form
   * already opened with.
   */
  useEffect(() => {
    if (!open || !clientId) return;
    let cancelled = false;

    api.pt.client(clientId)
      .then((r: { data?: unknown }) => {
        if (cancelled) return;
        const row = (r?.data ?? {}) as Record<string, unknown>;
        const clientName = String(row.name ?? clients.find((c) => c.id === clientId)?.name ?? '').trim();
        const matchedGoal = goalFromClient(row.goal);
        const matchedPerWeek = perWeekFromClient(row.frequency);

        setTouched((t) => {
          if (!t.goal && matchedGoal) setGoal(matchedGoal);
          if (!t.perWeek && matchedPerWeek) setPerWeek(String(matchedPerWeek));
          if (!t.weeks) setWeeks('4');
          if (!t.name && clientName) {
            setName(programmeNameFor(clientName, matchedGoal ?? (t.goal ? goal : undefined)));
          }
          return t;
        });
      })
      .catch(() => { /* the form keeps its defaults; nothing is claimed */ });

    return () => { cancelled = true; };
    // `goal` is read inside the updater only as a fallback for the name, and
    // re-running on every goal keystroke would refetch the client.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId, clients]);

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
    <m.div
      // z-[120], not z-50. The AI assistant's floating button is z-100 and
      // fixed to the bottom-right, so at z-50 this sheet opened UNDERNEATH it
      // and the FAB sat on top of the "Create and add exercises" button —
      // covering the sheet's primary action on a 390px screen. Above the FAB
      // and the nav, below the toasts (z-9999) and the impersonation banner
      // (z-10000), both of which should outrank a dialog.
      data-no-pull-refresh
      className="fixed inset-0 z-[120] flex items-end justify-center p-0 sm:items-center sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.18 }}
    >
      {/* The backdrop is its own element, not the wrapper.
          `aria-hidden` because it is a mouse affordance only: click-outside to
          dismiss. Giving it a key handler would add a tab stop that announces
          nothing and does nothing — Escape is the keyboard equivalent, and
          useDialogA11y provides it. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: 'var(--bg-overlay)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={onClose}
      />

      <m.div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-programme-title"
        className="relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl sm:rounded-3xl"
        initial={{ y: 24, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        style={{
          // --bg-elevated, NOT --bg-card. This is the bug that made the sheet
          // look transparent: --bg-card is rgba(255,255,255,0.8) in light and
          // rgba(30,41,59,0.7) in dark — a frosted-glass CARD token, which only
          // reads as glass when something behind it is blurred. Used raw on a
          // floating panel with no backdrop-filter, the page simply showed
          // through it at 20-30%. --bg-elevated is the opaque surface token
          // (#FFFFFF / #1E293B) and is what every other dialog in the app uses.
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(15,23,42,0.28)',
        }}
      >
        {/* Grab handle, mobile only — the affordance that says this sheet can
            be dismissed downward, and the visual cue that it is a sheet rather
            than a page. */}
        <div className="flex justify-center pt-3 sm:hidden" aria-hidden="true">
          <div className="h-1 w-9 rounded-full" style={{ background: 'var(--border)' }} />
        </div>

        {/* Header — outside the scroll area, so the title stays put while a
            long client list moves underneath it. */}
        <div
          className="flex items-start justify-between gap-3 px-5 pb-4 pt-4 sm:pt-5"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <span
              className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[12px]"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              <Dumbbell size={18} />
            </span>
            <div className="min-w-0">
              <h2
                id="new-programme-title"
                className="truncate text-[17px] font-[800] tracking-[-0.01em]"
                style={{ color: 'var(--text-primary)' }}
              >
                New programme
              </h2>
              <p className="mt-0.5 text-[12px]" style={{ color: 'var(--text-muted)' }}>
                Name it and set its shape — exercises come next.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1.5 -mt-1 flex h-[44px] w-[44px] flex-shrink-0 items-center justify-center rounded-[12px] transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body — the only part that scrolls. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          {!presetClientId && (
            <Field label="Client">
              <div className="relative mb-2">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                  placeholder="Search clients…"
                  className="h-[44px] w-full rounded-[12px] pl-9 pr-3 text-[13.5px] outline-none"
                  style={inputStyle}
                />
              </div>
              <div
                className="max-h-44 overflow-y-auto overscroll-contain rounded-[12px]"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-subtle)' }}
              >
                {filtered.length === 0 ? (
                  <p className="p-3 text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No clients found.</p>
                ) : filtered.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setClientId(c.id)}
                    aria-pressed={c.id === clientId}
                    className="flex h-[44px] w-full items-center px-3 text-left text-[13.5px] font-[650]"
                    style={{
                      background: c.id === clientId ? 'var(--bg-elevated)' : 'transparent',
                      color: c.id === clientId ? 'var(--brand)' : 'var(--text-primary)',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </Field>
          )}
          <Field label="Programme name">
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); touch('name'); }}
              placeholder="e.g. Upper / Lower Split"
              className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none transition-shadow focus:ring-2"
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
                    onClick={() => { setGoal(g.value); touch('goal'); }}
                    aria-pressed={active}
                    className="h-[44px] rounded-[12px] px-3 text-[12.5px] font-[700] transition-transform active:scale-95"
                    style={{
                      background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                      color: active ? '#fff' : 'var(--text-muted)',
                      border: `1px solid ${active ? 'transparent' : 'var(--border)'}`,
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
                onChange={(e) => { setWeeks(e.target.value); touch('weeks'); }}
                onBlur={() => setWeeks(String(clamp(weeks, WEEKS_MIN, WEEKS_MAX)))}
                className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
                style={inputStyle}
              />
            </Field>
            <Field label="Sessions / week">
              <input
                type="number" min={PER_WEEK_MIN} max={PER_WEEK_MAX} value={perWeek} inputMode="numeric"
                onChange={(e) => { setPerWeek(e.target.value); touch('perWeek'); }}
                onBlur={() => setPerWeek(String(clamp(perWeek, PER_WEEK_MIN, PER_WEEK_MAX)))}
                className="h-[48px] w-full rounded-[12px] px-3 text-[14px] outline-none"
                style={inputStyle}
              />
            </Field>
          </div>

        </div>

        {/* Footer — pinned. The panel used to be one scrolling column, so on a
            short screen with the client list open the primary action scrolled
            out of view and the sheet looked like it had no way forward. */}
        <div
          className="px-5 pb-[max(20px,env(safe-area-inset-bottom))] pt-4"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}
        >
          <button
            onClick={submit}
            disabled={saving}
            className="flex h-[48px] w-full items-center justify-center gap-2 rounded-[14px] text-[14px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-60"
            style={{ background: 'var(--brand)', boxShadow: '0 8px 24px rgba(2,113,235,0.24)' }}
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            {saving ? 'Creating…' : 'Create and add exercises'}
          </button>
          <p className="mt-2 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            You will add exercises next, in the builder.
          </p>
        </div>
      </m.div>
    </m.div>
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
