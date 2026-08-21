'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Search, Dumbbell, X, Clock, Star, Loader2, CornerDownLeft, Check, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSearchFieldFocus } from '@/lib/search-field-focus';
import { api } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { cn } from '@/components/ui/cn';
import type { ExerciseMeta, LibraryExercise } from '@/lib/api';
import { useVirtualList } from '@/components/pt-os/exercise-library/useExerciseLibrary';

export interface PickedExercise {
  id: string;
  name: string;
  prescription_mode_primary?: string | null;
  prescription_mode_allowed?: string[];
}


/**
 * The picker's contents, with no shell of its own.
 *
 * Split out because the same search, filters, virtualised library and batch
 * footer are needed in two places with completely different framing: the
 * dialog three callers still open, and the full page the programme builder
 * navigates to. Duplicating four hundred lines to change the frame around them
 * would guarantee the two drift.
 *
 * It renders a fragment on purpose — the caller owns the surface, the padding
 * and the heading, because those are exactly what differ between a modal and
 * a page.
 */
export interface ExercisePickerPanelProps {
  /**
   * Whether this panel is live: the dialog is open, or the page is mounted.
   *
   * Gates the fetch and the document-level key listener, and clears the batch
   * when it goes false — a closed dialog must not keep loading the library or
   * answering arrow keys behind whatever is now on top of it.
   */
  live: boolean;
  /** Dismiss. The dialog closes; the page goes back to the builder. */
  onClose: () => void;
  onSelect: (exercise: PickedExercise) => void;
  /** Exercise names this client has logged recently — quick-pick chips. */
  recentNames?: string[];
  /**
   * Exercise ids already in the programme for this day. They stay visible but
   * are marked and cannot be added twice — hiding them would make a trainer
   * wonder why a movement they know exists has vanished from search.
   */
  existingIds?: string[];
  /**
   * Offer "Custom" — log a movement by name that is not in the library.
   *
   * Opt-in rather than on by default, because whether it works depends
   * entirely on what the caller does with it. A logged session can hold one:
   * workout_session_exercises.exercise_id is nullable and exercise_name is
   * NOT NULL, so the row carries the name itself. A programme cannot:
   * workout_plan_exercises stores only a reference to the library and has no
   * name column to put it in, so a custom pick there would be accepted by the
   * dialog and then silently dropped. Offering it in a place that cannot keep
   * it is worse than not offering it.
   */
  allowCustom?: boolean;
  /**
   * Collect a batch instead of adding one and closing.
   *
   * Opt-in, because the three other callers genuinely want one-at-a-time:
   * a logged session, a template row and a plan detail row each add a single
   * movement and then need the caller's own follow-up UI. Only the programme
   * builder is a "sit down and lay out the day" screen, and there the
   * add-one-then-reopen loop meant opening this dialog once per exercise —
   * search state, filters and scroll position thrown away each time.
   *
   * `onSelectMany` is required when this is on; `onSelect` is then unused.
   */
  multiple?: boolean;
  /**
   * Receives the batch. In batch mode the panel does NOT dismiss itself after
   * calling this — the caller does.
   *
   * That is deliberate, and it is the difference between a dialog and a page.
   * Adding a batch is N sequential requests; if the panel closed itself the
   * moment the button was pressed, the caller's own failure handling would be
   * running against a screen the trainer had already left, and a batch that
   * failed entirely would vanish with nothing to retry. So the caller keeps
   * the surface until it knows the writes landed, and reports `busy` while
   * they are in flight.
   */
  onSelectMany?: (exercises: PickedExercise[]) => void;
  /**
   * The caller is writing the batch right now: disable the commit, say so.
   * Ignored outside batch mode.
   */
  busy?: boolean;
}


const PAGE_SIZE = 60;
const ROW_HEIGHT = 56;
// The scrolling list's height. Raised from 360 with batch mode: picking six
// movements through a six-row window means scrolling the library more than
// reading it, and the whole point of collecting a batch is seeing enough of
// the library at once to build a day from it.
const VIEWPORT = 440;

/**
 * The Workout Builder's exercise picker, over the same library the Exercise
 * Library page serves — one API, one ranking, one set of filters.
 *
 * Opens on the trainer's own recently-programmed exercises, because the
 * overwhelmingly common action is reaching for something you already use.
 * Arrow keys and Enter work throughout, so a whole day can be programmed
 * without the mouse.
 *
 * Sizing note (unchanged from the original): globals.css sets
 * `html { font-size: 14px }`, so padding-derived heights land short of a thumb
 * target. The chips and Cancel button keep explicit 44px heights — this sheet
 * opens on a phone, mid-session, where a 24px chip is unhittable.
 */
export function ExercisePickerPanel({
  live, onClose, onSelect, recentNames = [], existingIds = [], allowCustom = false,
  multiple = false, onSelectMany, busy = false,
}: ExercisePickerPanelProps) {
  const { toast } = useToast();
  const searchRef = useRef<HTMLInputElement>(null);
  // `autoFocus` put the caret here and left the phone keyboard down —
  // WebKit wants the focus call inside the tap that opened the dialog, and
  // a layout effect is the closest a child of a parent-owned `live` can get.
  useSearchFieldFocus(live, searchRef);

  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('');
  const [equipment, setEquipment] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [meta, setMeta] = useState<ExerciseMeta | null>(null);
  const [exercises, setExercises] = useState<LibraryExercise[]>([]);
  const [recent, setRecent] = useState<LibraryExercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);

  const reqId = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);

  const existing = useMemo(() => new Set(existingIds), [existingIds]);

  useEffect(() => {
    if (!live) return;
    api.exercises.meta().then(setMeta).catch(() => { /* filters degrade, list still works */ });
    api.exercises.recent(10).then((r) => setRecent(r.exercises)).catch(() => setRecent([]));
  }, [live]);

  useEffect(() => {
    if (!live) {
      setSearch(''); setRegion(''); setEquipment('');
      setFavoritesOnly(false); setActive(0);
    }
  }, [live]);

  const load = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    try {
      const res = await api.exercises.list({
        limit: PAGE_SIZE,
        ...(search.trim() ? { q: search.trim() } : {}),
        ...(region ? { body_region: region } : {}),
        ...(equipment ? { equipment } : {}),
        ...(favoritesOnly ? { favorites_only: 'true' } : {}),
      });
      if (id === reqId.current) { setExercises(res.exercises); setActive(0); }
    } catch {
      if (id === reqId.current) {
        setExercises([]);
        toast.error('Failed to load exercises');
      }
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, [search, region, equipment, favoritesOnly, toast]);

  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => { void load(); }, 220);
    return () => clearTimeout(t);
  }, [live, load]);

  /**
   * The batch, in the order it was built.
   *
   * An array rather than a Set: the order exercises are added in IS the order
   * of the day, and a trainer picking Squat then Bench then Row means that
   * sequence. A Set would preserve insertion order in practice but says
   * nothing about intending to.
   */
  const [selected, setSelected] = useState<PickedExercise[]>([]);
  const selectedIds = useMemo(() => new Set(selected.map((e) => e.id)), [selected]);

  // Dropped whenever the dialog closes, so reopening never resurrects a batch
  // the trainer walked away from — that would silently add exercises they
  // chose in a different context, possibly for a different day.
  useEffect(() => { if (!live) setSelected([]); }, [live]);

  const toPicked = (ex: LibraryExercise): PickedExercise => ({
    id: ex.id,
    name: ex.name,
    prescription_mode_primary: ex.prescription_mode_primary,
    prescription_mode_allowed: ex.prescription_mode_allowed,
  });

  const pick = useCallback((ex: LibraryExercise) => {
    if (existing.has(ex.id)) return;

    if (multiple) {
      // Toggle and stay open. markUsed is deliberately NOT fired here — it is
      // a usage statistic, and a movement that was selected and then
      // deselected was never used.
      setSelected((prev) => prev.some((e) => e.id === ex.id)
        ? prev.filter((e) => e.id !== ex.id)
        : [...prev, toPicked(ex)]);
      return;
    }

    onSelect(toPicked(ex));
    // Feeds "recently used" for this trainer. Fire-and-forget: failing to
    // record a usage stat must never block adding the exercise.
    void api.exercises.markUsed(ex.id).catch(() => {});
    onClose();
  }, [existing, multiple, onSelect, onClose]);

  /**
   * Commit the batch.
   *
   * Hands the selection to the caller and stops there — see `onSelectMany`
   * for why dismissal is the caller's, not ours.
   */
  const addSelected = useCallback(() => {
    if (selected.length === 0 || busy) return;
    onSelectMany?.(selected);
    for (const e of selected) {
      if (e.id) void api.exercises.markUsed(e.id).catch(() => {});
    }
  }, [selected, busy, onSelectMany]);

  /**
   * The typed name, as it would be stored.
   *
   * Trimmed and capped at the 255 the column and the request schema both
   * enforce — better to clip here than to have the save rejected after the
   * trainer has already moved on.
   */
  const customName = search.trim().replace(/\s+/g, ' ').slice(0, 255);

  const addCustom = useCallback(() => {
    if (!customName) { searchRef.current?.focus(); return; }
    // Empty id is the signal for "not from the library" — the same shape the
    // recent-name chips already emit, and what the caller turns into a null
    // exercise_id.
    onSelect({ id: '', name: customName });
    onClose();
  }, [customName, onSelect, onClose]);

  const showRecentChips = !search && !region && !equipment && !favoritesOnly && recentNames.length > 0;
  const showRecentList  = !search && !region && !equipment && !favoritesOnly && recent.length > 0;
  const rows = showRecentList ? recent : exercises;

  const virtual = useVirtualList(rows, ROW_HEIGHT, VIEWPORT);

  // The keydown handler must always read the CURRENT rows/active/customName,
  // but re-attaching the document listener on every one of those changes
  // leaves a window (between the render committing and the effect flushing)
  // where the still-attached listener holds stale state. A real user pressing
  // Enter in that window — or a test firing Enter the moment the rows render —
  // lands on the old handler and the pick silently never happens. The ref
  // pattern attaches the listener once per open and delegates to the latest
  // handler, which the render phase updates synchronously, so the listener
  // can never outlive the state it reads.
  const onKeyRef = useRef<(e: KeyboardEvent) => void>(() => {});
  onKeyRef.current = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, rows.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      // Cmd/Ctrl+Enter commits the batch. Without it, batch mode is the one
      // path with no keyboard way to finish: plain Enter toggles a row, and
      // reaching the Add button means tabbing past every visible result.
      if (multiple && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        addSelected();
        return;
      }
      const target = rows[active];
      if (target) { e.preventDefault(); pick(target); }
      // Nothing in the library matched what was typed, so Enter means "use
      // it anyway" rather than doing nothing at the end of a search.
      else if (allowCustom && customName) { e.preventDefault(); addCustom(); }
    }
  };

  useEffect(() => {
    if (!live) return;
    const onKey = (e: KeyboardEvent) => onKeyRef.current(e);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [live]);

  // Keep the highlighted row in view when arrowing beyond the visible window.
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const top = active * ROW_HEIGHT;
    if (top < el.scrollTop) el.scrollTop = top;
    else if (top + ROW_HEIGHT > el.scrollTop + VIEWPORT) el.scrollTop = top + ROW_HEIGHT - VIEWPORT;
  }, [active]);

  const regions = useMemo(
    () => Object.keys(meta?.muscles_by_region || {}),
    [meta]
  );

  return (
    <>

        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-disabled)' }} />
          <input
            ref={searchRef}
            type="text" value={search}
            placeholder={allowCustom ? 'Search, or type a custom name…' : 'Search exercises…'}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search exercises"
            className="w-full pl-9 pr-9 py-2.5 rounded-[10px] text-[13px] outline-none"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          {loading && (
            <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-disabled)' }} />
          )}
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <Chip active={!region && !equipment && !favoritesOnly} onClick={() => { setRegion(''); setEquipment(''); setFavoritesOnly(false); }}>
            All
          </Chip>
          <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((v) => !v)}>
            <Star size={11} className="mr-1 inline" fill={favoritesOnly ? 'currentColor' : 'none'} />
            Favorites
          </Chip>
          {regions.map((r) => (
            <Chip key={r} active={region === r} onClick={() => setRegion(r === region ? '' : r)}>
              {r}
            </Chip>
          ))}
        </div>

        {meta && meta.equipment.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {meta.equipment.slice(0, 7).map((q) => (
              <Chip key={q.slug} small active={equipment === q.slug} onClick={() => setEquipment(q.slug === equipment ? '' : q.slug)}>
                {q.name}
              </Chip>
            ))}
          </div>
        )}

        {showRecentChips && (
          <div className="mb-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-[650] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
              <Clock size={11} /> This client&apos;s recent
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recentNames.slice(0, 6).map((name) => (
                <button
                  key={name}
                  onClick={() => { onSelect({ id: '', name }); onClose(); }}
                  className="flex h-[44px] items-center rounded-full px-3.5 text-[12px] font-[650] transition hover:opacity-80"
                  style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.25)' }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {showRecentList && (
          <p className="mb-1.5 flex items-center gap-1.5 text-[10.5px] font-[650] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
            <Clock size={11} /> You programme often
          </p>
        )}

        {/* Custom — pinned above the list rather than at the end of it, so it
            does not require scrolling past sixty near-misses to reach. */}
        {allowCustom && (
          <button
            type="button"
            onClick={addCustom}
            data-testid="custom-exercise"
            className="mb-2 flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition hover:opacity-90"
            style={{
              background: customName ? 'rgba(0,103,224,0.07)' : 'var(--bg-subtle)',
              border: `1px dashed ${customName ? 'rgba(0,103,224,0.38)' : 'var(--border)'}`,
              minHeight: 48,
            }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]"
              style={{ background: customName ? '#0067e0' : 'var(--bg-card)', color: customName ? '#fff' : '#94a3b8' }}>
              <PlusCircle size={15} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {customName ? `Use “${customName}”` : 'Custom exercise'}
                </span>
                <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide"
                  style={{ background: 'rgba(0,103,224,0.12)', color: '#0059ce' }}>
                  Custom
                </span>
              </span>
              <span className="block truncate text-[11px]" style={{ color: 'var(--text-disabled)' }}>
                {customName
                  ? 'Not in the library — logged against this session by name.'
                  : 'Type a name above to log something not in the library.'}
              </span>
            </span>
          </button>
        )}

        <div
          ref={listRef}
          onScroll={virtual.onScroll}
          className="overflow-y-auto"
          style={{ maxHeight: VIEWPORT }}
        >
          {loading && rows.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>Loading…</p>
          )}
          {!loading && rows.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-disabled)' }}>
              {search
                ? <>Nothing matches “{search}”.{allowCustom && <><br />Use the Custom option above to log it anyway.</>}</>
                : 'No exercises found.'}
            </p>
          )}

          {rows.length > 0 && (
            <div style={{ height: virtual.totalHeight }}>
              <div style={{ paddingTop: virtual.padTop, paddingBottom: virtual.padBottom }}>
                {virtual.slice.map((ex, i) => {
                  const index = rows.indexOf(ex);
                  const already = existing.has(ex.id);
                  const chosen = selectedIds.has(ex.id);
                  return (
                    <button
                      key={ex.id}
                      onClick={() => pick(ex)}
                      onMouseEnter={() => setActive(index)}
                      disabled={already}
                      // In batch mode the row is a toggle, so it reports its
                      // state rather than behaving like a menu item that fires
                      // once. Screen readers otherwise announce nothing at all
                      // when a selection changes, because the dialog does not
                      // move focus or close.
                      aria-pressed={multiple ? chosen : undefined}
                      style={{ height: ROW_HEIGHT }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-[10px] px-3 text-left transition',
                        index === active && !already && !chosen && 'bg-slate-100 dark:bg-white/[0.06]',
                        already ? 'cursor-not-allowed opacity-45' : 'hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                      )}
                    >
                      <span
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[8px] transition"
                        style={{
                          background: chosen ? 'var(--brand)' : 'var(--bg-subtle)',
                          color: chosen ? '#fff' : undefined,
                        }}
                      >
                        {already
                          ? <Check size={14} style={{ color: '#10b981' }} />
                          : chosen
                            ? <Check size={14} />
                            : <Dumbbell size={14} style={{ color: '#94a3b8' }} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-[650] text-[var(--text-primary)]">{ex.name}</span>
                          {ex.is_favorite && <Star size={9} className="shrink-0 text-amber-500" fill="currentColor" />}
                          {ex.is_custom && (
                            <span className="shrink-0 rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide text-[var(--brand)]" style={{ background: 'var(--brand-glow, rgba(239,68,68,0.1))' }}>
                              Custom
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[11px] capitalize text-slate-400">
                          {already
                            ? 'Already in this day'
                            : <>
                                {ex.primary_muscle || ex.target_muscle || ex.muscle_group}
                                {ex.equipment_name || ex.equipment ? ` · ${ex.equipment_name || ex.equipment}` : ''}
                                {ex.mechanic ? ` · ${ex.mechanic}` : ''}
                              </>}
                        </span>
                      </span>
                      {index === active && !already && (
                        <CornerDownLeft size={12} className="shrink-0 text-slate-300" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {multiple ? (
          <div
            className="mt-3 flex items-center gap-3 pt-3"
            style={{ borderTop: '1px solid var(--border)' }}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                {selected.length === 0
                  ? 'Nothing selected yet'
                  : `${selected.length} selected`}
              </p>
              <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {selected.length === 0
                  ? 'Tap exercises to build the day — they are added in the order you pick them.'
                  : selected.map((e) => e.name).join(' · ')}
              </p>
              <p className="hidden text-[10.5px] sm:block" style={{ color: 'var(--text-disabled)' }}>
                ↑↓ navigate · ↵ toggle · ⌘↵ add
              </p>
            </div>
            {selected.length > 0 && (
              <button
                onClick={() => setSelected([])}
                className="h-[44px] shrink-0 rounded-[10px] px-3 text-[12px] font-[650]"
                style={{ color: 'var(--text-muted)' }}
              >
                Clear
              </button>
            )}
            <button
              onClick={addSelected}
              disabled={selected.length === 0 || busy}
              className="flex h-[44px] shrink-0 items-center gap-1.5 rounded-[12px] px-4 text-[13px] font-[700] text-white transition-transform active:scale-[0.98] disabled:opacity-40"
              style={{ background: 'var(--brand)' }}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              {busy
                ? 'Adding…'
                : selected.length === 0
                  ? 'Add'
                  : `Add ${selected.length}`}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center justify-between">
            <span className="hidden text-[10.5px] text-slate-400 sm:block">↑↓ navigate · ↵ add</span>
            <button
              onClick={onClose}
              className="flex h-[44px] items-center gap-1.5 rounded-[10px] px-3.5 text-[12px] font-[650]"
              style={{ color: '#64748b' }}
            >
              <X size={13} /> Cancel
            </button>
          </div>
        )}
    </>
  );
}

interface ExercisePickerProps extends Omit<ExercisePickerPanelProps, 'live'> {
  open: boolean;
}

/**
 * The dialog form, unchanged for every caller that adds one exercise and moves
 * on: a logged session row, a template row, a plan-detail row.
 */
export function ExercisePicker({ open, ...rest }: ExercisePickerProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) rest.onClose(); }}>
      {/* Wider than the other dialogs in the app on purpose. This one is a
          workspace — search, filters and a long scrolling library — not a
          question with two answers. */}
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{rest.multiple ? 'Add exercises' : 'Add Exercise'}</DialogTitle>
          <DialogDescription>
            {rest.multiple
              ? 'Pick as many as you like, then add them all at once.'
              : rest.allowCustom
                ? 'Search the library, pick a recent one, or add a custom exercise by name.'
                : 'Search the exercise library or pick a recent one.'}
          </DialogDescription>
        </DialogHeader>
        <ExercisePickerPanel {...rest} live={open} />
      </DialogContent>
    </Dialog>
  );
}


function Chip({
  active, onClick, children, small,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  small?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'flex items-center justify-center rounded-full font-[650] transition',
        small ? 'h-[36px] px-3 text-[10.5px]' : 'h-[44px] min-w-[44px] px-3.5 text-[11px]',
      )}
      style={{
        background: active ? '#0f172a' : 'var(--bg-subtle)',
        color: active ? '#fff' : '#64748b',
      }}
    >
      {children}
    </button>
  );
}

export default ExercisePicker;
