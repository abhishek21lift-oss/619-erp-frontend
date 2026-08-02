'use client';

/**
 * The global search box in the top navigation.
 *
 * It replaces a box that filtered a hardcoded array of page names in the
 * browser. This one searches the studio's actual records on the server, and the
 * page index survives as a secondary group — you can still type "reports" and
 * jump there, but the primary answer to "Rahul" is now Rahul.
 *
 * ── Three decisions worth knowing ────────────────────────────────────────────
 *
 * 1. The component renders GROUPS, not clients. Everything below the input is
 *    driven by the generic { title, subtitle, meta, badges, href } item the API
 *    returns. When the backend starts returning workouts or invoices they
 *    render here with no change to this file — which is the whole point of the
 *    envelope. The one type-specific touch is the avatar treatment for
 *    `type === 'client'`.
 *
 * 2. Below `sm` the input becomes a button that opens a full-screen sheet.
 *    Squeezed between a menu button and four icon buttons, an inline input on a
 *    390pt phone is ~140px wide — too narrow to read its own placeholder, let
 *    alone a result. A sheet is also what makes the on-screen keyboard usable.
 *
 * 3. Keyboard navigation walks ONE flat list. Rows are grouped for the eye but
 *    numbered end to end, so ↑/↓ crosses group boundaries the way a person
 *    expects rather than trapping the cursor inside a section.
 */

import * as React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Search, X, ArrowRight, UserPlus, CalendarPlus, IndianRupee,
  Clock, CornerDownLeft, Users, FileText, Loader2,
  Dumbbell, ClipboardList, Salad, Activity, MessageSquare, Sparkles,
} from 'lucide-react';
import { api, SearchItem, SearchResponse } from '@/lib/api';
import { cn } from '@/components/ui/cn';
import { avatarGradient, initialsAvatar } from '@/lib/avatar';
import {
  ViewedRecord, clearRecentQueries, clearRecentlyViewed, getRecentQueries,
  getRecentlyViewed, pushRecentQuery, pushRecentlyViewed, subscribeToHistory,
} from './recent';

// ── Tuning ───────────────────────────────────────────────────────────────────

/** Long enough that a fast typist produces one request per word rather than one
 *  per keystroke; short enough that results feel attached to the typing. */
const DEBOUNCE_MS = 300;

/** Matches the backend's floor. Below it the server returns nothing, so asking
 *  is a wasted round trip. */
const MIN_QUERY_LENGTH = 2;

const RESULT_LIMIT = 6;

/** Queries already answered this session. Backspacing through a word is the
 *  single most common interaction here and it should be instant, not a fresh
 *  request per character removed. Cleared on unmount with the component. */
const CACHE_MAX = 30;

// ── Quick actions ────────────────────────────────────────────────────────────

interface QuickAction {
  label: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  keywords: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'New client', hint: 'Enrol someone new', href: '/pt-os/new-client', icon: UserPlus, keywords: 'new create add client member enrol enroll signup join' },
  { label: 'Record payment', hint: 'Log money received', href: '/finance/record-payment', icon: IndianRupee, keywords: 'new create add payment collect money cash received invoice bill' },
  { label: 'Schedule session', hint: 'Book a PT session', href: '/pt-os/schedule-session', icon: CalendarPlus, keywords: 'new create add session booking schedule appointment slot' },
];

/**
 * Quick actions surface on an explicit intent, not on every query — otherwise
 * they sit above real results competing for the first row. "+" is the deliberate
 * shortcut; the create/new/add verbs catch the people who type what they mean.
 */
function matchQuickActions(query: string): QuickAction[] {
  const raw = query.trim().toLowerCase();
  if (!raw) return [];
  if (raw === '+') return QUICK_ACTIONS;
  const q = raw.startsWith('+') ? raw.slice(1).trim() : raw;
  if (!q) return QUICK_ACTIONS;
  const explicit = raw.startsWith('+') || /^(new|create|add)\b/.test(q);
  if (!explicit) return [];
  const terms = q.split(/\s+/).filter(Boolean);
  return QUICK_ACTIONS.filter((a) => {
    const haystack = `${a.label} ${a.keywords}`.toLowerCase();
    return terms.every((t) => haystack.includes(t));
  });
}

// ── Page index (the old search, demoted to a secondary group) ────────────────

export interface PageEntry {
  label: string;
  href: string;
  keywords: string;
}

function matchPages(pages: PageEntry[], query: string): PageEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_QUERY_LENGTH) return [];
  return pages
    .filter((p) =>
      p.label.toLowerCase().includes(q)
      || p.keywords.toLowerCase().includes(q)
      || p.href.toLowerCase().includes(q))
    // Pages are a fallback, not the answer. Capping them stops "s" from burying
    // three clients under twenty navigation links.
    .slice(0, 4);
}

// ── Row model ────────────────────────────────────────────────────────────────
//
// Sections group visually; rows are numbered end to end for the keyboard.

type Row =
  | { kind: 'result'; key: string; item: SearchItem }
  | { kind: 'page'; key: string; page: PageEntry }
  | { kind: 'action'; key: string; action: QuickAction }
  | { kind: 'recentQuery'; key: string; query: string }
  | { kind: 'viewed'; key: string; record: ViewedRecord }
  | { kind: 'seeAll'; key: string };

interface Section {
  key: string;
  label: string;
  /** Renders on the right of the section heading — the "Clear" affordance. */
  action?: { label: string; onClick: () => void };
  rows: Row[];
}

// ── Matched-text highlighting ────────────────────────────────────────────────

/**
 * Emphasises the part of the text the query actually matched. Only literal
 * substrings are marked: a fuzzy hit ("Rhul" → "Rahul") has no substring to
 * highlight, and inventing one would point at the wrong letters.
 */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const at = text.toLowerCase().indexOf(q.toLowerCase());
  if (at === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <mark
        className="bg-transparent"
        style={{ color: 'var(--brand)', fontWeight: 700 }}
      >
        {text.slice(at, at + q.length)}
      </mark>
      {text.slice(at + q.length)}
    </>
  );
}

// ── Result avatar ────────────────────────────────────────────────────────────

/**
 * What a result looks like at a glance.
 *
 * People get a face: a photo, or initials on a colour derived from the name, so
 * the same person is the same colour every time. Everything else gets an icon
 * tile, because initials for "Squat Jerk" or "Invoice INV-0042" are noise —
 * two letters that mean nothing and read as a person who is not there.
 *
 * A type with no entry here falls back to the icon tile with a neutral glyph,
 * so a new backend provider renders sensibly before anyone touches this file.
 */
const TYPE_ICON: Record<string, { icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; colour: string }> = {
  exercise: { icon: Dumbbell, colour: '#0067E0' },
  workout_plan: { icon: ClipboardList, colour: '#0067E0' },
  diet_plan: { icon: Salad, colour: '#10B981' },
  assessment: { icon: Activity, colour: '#0067E0' },
  invoice: { icon: FileText, colour: '#F59E0B' },
  payment: { icon: IndianRupee, colour: '#10B981' },
  message: { icon: MessageSquare, colour: '#0067E0' },
  ai_conversation: { icon: Sparkles, colour: '#0067E0' },
};

function ResultAvatar({ item }: { item: { title: string; avatar_url?: string | null; type: string } }) {
  const [failed, setFailed] = React.useState(false);

  if (item.avatar_url && !failed) {
    return (
      // Plain <img>: these are user-uploaded photos on a storage host that is
      // not in the next/image allowlist, and an optimiser round trip buys
      // nothing at 36px. onError falls back rather than showing a broken image.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.avatar_url}
        alt=""
        onError={() => setFailed(true)}
        className="h-9 w-9 shrink-0 rounded-full object-cover"
        style={{ border: '1px solid var(--border)' }}
      />
    );
  }

  if (item.type === 'client') {
    return (
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
        style={{ background: avatarGradient(item.title || '?') }}
      >
        {initialsAvatar(item.title)}
      </span>
    );
  }

  const spec = TYPE_ICON[item.type];
  const Icon = spec?.icon ?? FileText;
  const colour = spec?.colour ?? 'var(--text-muted)';
  return (
    <span
      aria-hidden
      // Rounded square, not a circle: the shape itself says "not a person"
      // before the icon inside it is even read.
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
      style={{ background: `color-mix(in srgb, ${colour} 15%, transparent)`, color: colour }}
    >
      <Icon size={16} strokeWidth={1.8} />
    </span>
  );
}

const BADGE_TONE: Record<string, { bg: string; fg: string }> = {
  positive: { bg: 'rgba(16,185,129,0.14)', fg: '#059669' },
  warning: { bg: 'rgba(245,158,11,0.16)', fg: '#B45309' },
  neutral: { bg: 'var(--bg-subtle)', fg: 'var(--text-secondary)' },
  muted: { bg: 'var(--bg-subtle)', fg: 'var(--text-muted)' },
};

function Badge({ label, tone }: { label: string; tone: string }) {
  const c = BADGE_TONE[tone] ?? BADGE_TONE.neutral;
  return (
    <span
      className="shrink-0 rounded-full px-1.5 py-[1px] text-[9.5px] font-[700] uppercase tracking-[0.04em]"
      style={{ background: c.bg, color: c.fg }}
    >
      {label}
    </span>
  );
}

// ── Loading skeleton ─────────────────────────────────────────────────────────

function ResultSkeleton() {
  return (
    <div className="px-3 py-2.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="mb-2 flex items-center gap-3 last:mb-0">
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full" style={{ background: 'var(--bg-subtle)' }} />
          <div className="min-w-0 flex-1">
            <div
              className="mb-1.5 h-[9px] animate-pulse rounded-full"
              style={{ background: 'var(--bg-subtle)', width: `${62 - i * 12}%` }}
            />
            <div
              className="h-[7px] animate-pulse rounded-full"
              style={{ background: 'var(--bg-subtle)', width: `${40 - i * 8}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Responsive placeholder ───────────────────────────────────────────────────

/**
 * The field is not one width. Sharing the header with a menu button and four
 * icon buttons leaves it ~277px at 640, 360px at 768 and 420px from 1024 up, so
 * a single placeholder either clips at the bottom of that range or wastes the
 * top of it. Each tier gets the longest wording that actually fits — measured,
 * not guessed. The "(Ctrl + K)" hint only appears where the shortcut is useful
 * AND there is room to say so.
 */
const PLACEHOLDERS = [
  { min: 1024, text: 'Search clients by name or mobile… (Ctrl + K)' },
  // 700, not 768: measured, the field is 337px here with 278px of text room for
  // a 215px string. At 640 the room drops to 218px — a 3px margin, which is not
  // a margin at all once a font or a locale shifts.
  { min: 700, text: 'Search clients by name or mobile…' },
  { min: 0, text: 'Search clients…' },
];

function usePlaceholder(): string {
  // Starts at the widest and corrects on mount. The alternative — reading
  // window during render — differs between server and client and breaks
  // hydration.
  const [width, setWidth] = React.useState(1280);
  React.useEffect(() => {
    const measure = () => setWidth(window.innerWidth);
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);
  return (PLACEHOLDERS.find((p) => width >= p.min) ?? PLACEHOLDERS[PLACEHOLDERS.length - 1]).text;
}

// ── Component ────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  /** The navigation index, kept searchable as a secondary group. */
  pages: PageEntry[];
  /** Matches the header's own light/dark chrome, which is class-driven rather
   *  than token-driven. The dropdown itself uses semantic tokens. */
  darkMode: boolean;
}

export default function GlobalSearch({ pages, darkMode }: GlobalSearchProps) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const placeholder = usePlaceholder();

  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [data, setData] = React.useState<SearchResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [focusIdx, setFocusIdx] = React.useState(-1);

  const [recentQueries, setRecentQueries] = React.useState<string[]>([]);
  const [viewed, setViewed] = React.useState<ViewedRecord[]>([]);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const sheetInputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const cacheRef = React.useRef<Map<string, SearchResponse>>(new Map());
  /** Guards against a slow response for an old query overwriting a newer one. */
  const seqRef = React.useRef(0);

  // History is read on the client only — localStorage does not exist during the
  // server render, and reading it in useState would desynchronise hydration.
  React.useEffect(() => {
    const sync = () => {
      setRecentQueries(getRecentQueries());
      setViewed(getRecentlyViewed());
    };
    sync();
    return subscribeToHistory(sync);
  }, []);

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  // ── Fetching ───────────────────────────────────────────────────────────────

  const trimmed = query.trim();
  const active = open || sheetOpen;

  React.useEffect(() => {
    if (!active) return;
    if (trimmed.length < MIN_QUERY_LENGTH) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const cached = cacheRef.current.get(trimmed.toLowerCase());
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    const seq = ++seqRef.current;

    const timer = setTimeout(() => {
      // Cancel the request still in flight for the previous keystroke: its
      // answer is already stale and it is competing for the same connection.
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      api.search
        .global(trimmed, { limit: RESULT_LIMIT, signal: controller.signal })
        .then((res) => {
          if (seq !== seqRef.current) return;
          const payload = res.data;
          const cache = cacheRef.current;
          if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
          cache.set(trimmed.toLowerCase(), payload);
          setData(payload);
          setLoading(false);
        })
        .catch((err: unknown) => {
          // An abort is this component cancelling itself, not a failure.
          if (controller.signal.aborted || (err as Error)?.name === 'AbortError') return;
          if (seq !== seqRef.current) return;
          setData(null);
          setLoading(false);
          const status = (err as { status?: number })?.status;
          setError(
            status === 429
              ? 'Searching too fast — try again in a moment.'
              : 'Search is unavailable right now.',
          );
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmed, active]);

  // Abort anything in flight when the box goes away.
  React.useEffect(() => () => abortRef.current?.abort(), []);

  // ── Sections ───────────────────────────────────────────────────────────────

  const quickActions = React.useMemo(() => matchQuickActions(query), [query]);
  const pageMatches = React.useMemo(() => matchPages(pages, trimmed), [pages, trimmed]);

  const sections = React.useMemo<Section[]>(() => {
    const out: Section[] = [];

    // Quick actions are resolved BEFORE the short-query guard, because "+" —
    // the documented shortcut for them — is one character and would otherwise
    // be treated as an empty box and answered with history.
    if (quickActions.length) {
      out.push({
        key: 'actions',
        label: 'Quick actions',
        rows: quickActions.map((a) => ({ kind: 'action' as const, key: `a-${a.href}`, action: a })),
      });
    }

    // Too short to search. Offer history rather than a blank panel — unless
    // quick actions already answered it, in which case history is just noise
    // under a deliberate command.
    if (trimmed.length < MIN_QUERY_LENGTH) {
      if (out.length) return out;
      if (viewed.length) {
        out.push({
          key: 'viewed',
          label: 'Recently viewed',
          action: { label: 'Clear', onClick: clearRecentlyViewed },
          rows: viewed.slice(0, 5).map((r) => ({ kind: 'viewed' as const, key: `v-${r.id}`, record: r })),
        });
      }
      if (recentQueries.length) {
        out.push({
          key: 'recent',
          label: 'Recent searches',
          action: { label: 'Clear', onClick: clearRecentQueries },
          rows: recentQueries.slice(0, 5).map((q) => ({ kind: 'recentQuery' as const, key: `q-${q}`, query: q })),
        });
      }
      return out;
    }

    // Server-ordered: clients, then archived clients, then whatever providers
    // the backend grows later.
    for (const group of data?.groups ?? []) {
      out.push({
        key: group.type,
        label: group.label,
        rows: group.items.map((item) => ({ kind: 'result' as const, key: `${group.type}-${item.id}`, item })),
      });
    }

    if (pageMatches.length) {
      out.push({
        key: 'pages',
        label: 'Pages',
        rows: pageMatches.map((p) => ({ kind: 'page' as const, key: `p-${p.href}`, page: p })),
      });
    }

    // Results are capped per group, so there is always more behind them.
    if ((data?.groups.length ?? 0) > 0) {
      out.push({ key: 'all', label: '', rows: [{ kind: 'seeAll' as const, key: 'see-all' }] });
    }

    return out;
  }, [trimmed, data, quickActions, pageMatches, viewed, recentQueries]);

  const flatRows = React.useMemo(() => sections.flatMap((s) => s.rows), [sections]);

  // A shrinking result list must never leave the cursor pointing past the end.
  React.useEffect(() => {
    setFocusIdx((i) => (i >= flatRows.length ? flatRows.length - 1 : i));
  }, [flatRows.length]);

  const hasResults = (data?.groups.length ?? 0) > 0;
  const searching = trimmed.length >= MIN_QUERY_LENGTH;
  const showEmptyState = searching && !loading && !error && !hasResults && !quickActions.length && !pageMatches.length;

  // ── Selection ──────────────────────────────────────────────────────────────

  const close = React.useCallback(() => {
    setOpen(false);
    setSheetOpen(false);
    setFocusIdx(-1);
  }, []);

  const go = React.useCallback((href: string) => {
    close();
    setQuery('');
    setData(null);
    router.push(href);
  }, [close, router]);

  const openItem = React.useCallback((item: SearchItem) => {
    pushRecentlyViewed(item);
    pushRecentQuery(trimmed);
    go(item.href);
  }, [go, trimmed]);

  const seeAllHref = `/pt-os/clients?q=${encodeURIComponent(trimmed)}`;

  const select = React.useCallback((row: Row) => {
    switch (row.kind) {
      case 'result':
        openItem(row.item);
        break;
      case 'viewed':
        go(row.record.href);
        break;
      case 'page':
        go(row.page.href);
        break;
      case 'action':
        go(row.action.href);
        break;
      case 'seeAll':
        pushRecentQuery(trimmed);
        go(seeAllHref);
        break;
      case 'recentQuery':
        // Re-runs the search rather than navigating — the point of a recent
        // search is to get back to its results.
        setQuery(row.query);
        setFocusIdx(-1);
        (sheetOpen ? sheetInputRef : inputRef).current?.focus();
        break;
    }
  }, [openItem, go, trimmed, seeAllHref, sheetOpen]);

  // ── Keyboard ───────────────────────────────────────────────────────────────

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!active) setOpen(true);
      setFocusIdx((i) => (flatRows.length ? (i + 1) % flatRows.length : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((i) => (flatRows.length ? (i <= 0 ? flatRows.length - 1 : i - 1) : -1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const row = focusIdx >= 0 ? flatRows[focusIdx] : flatRows[0];
      if (row) select(row);
      // Enter on a query with no rows still means "show me everything".
      else if (searching) { pushRecentQuery(trimmed); go(seeAllHref); }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (query) setQuery('');
      else { close(); inputRef.current?.blur(); }
    }
  };

  // Ctrl/Cmd+K from anywhere. On a phone the inline input does not exist, so the
  // same shortcut opens the sheet.
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (window.matchMedia('(max-width: 639px)').matches) {
          setSheetOpen(true);
        } else {
          inputRef.current?.focus();
          setOpen(true);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  // Escape closes the sheet even when focus has left the input.
  React.useEffect(() => {
    if (!sheetOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sheetOpen, close]);

  React.useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, []);

  // The sheet takes over the viewport; letting the page scroll behind it is the
  // classic iOS scroll-chaining bug.
  React.useEffect(() => {
    if (!sheetOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheetInputRef.current?.focus();
    return () => { document.body.style.overflow = prev; };
  }, [sheetOpen]);

  // Keep the highlighted row in view during keyboard navigation.
  React.useEffect(() => {
    if (focusIdx < 0 || !listRef.current) return;
    listRef.current
      .querySelector(`[data-row-idx="${focusIdx}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [focusIdx]);

  // ── Row rendering ──────────────────────────────────────────────────────────

  const renderRow = (row: Row, idx: number) => {
    const isFocused = idx === focusIdx;
    const common = cn(
      'flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition-colors duration-100',
    );
    const focusStyle: React.CSSProperties = isFocused
      ? { background: 'color-mix(in srgb, var(--brand) 10%, transparent)' }
      : {};

    const body = (() => {
      switch (row.kind) {
        case 'result': {
          const { item } = row;
          return (
            <>
              <ResultAvatar item={item} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span
                    className="truncate text-[13px] font-[650]"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    <Highlight text={item.title} query={trimmed} />
                  </span>
                  {item.badges?.slice(0, 1).map((b) => (
                    <Badge key={b.label} label={b.label} tone={b.tone} />
                  ))}
                </span>
                <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  {item.subtitle && (
                    <span className="truncate tabular-nums">
                      <Highlight text={item.subtitle} query={trimmed} />
                    </span>
                  )}
                  {item.subtitle && item.meta && <span aria-hidden>·</span>}
                  {item.meta && <span className="truncate">{item.meta}</span>}
                </span>
              </span>
              <ArrowRight size={13} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
        }
        case 'viewed':
          return (
            <>
              <ResultAvatar item={{ title: row.record.title, avatar_url: row.record.avatar_url, type: row.record.type }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-[650]" style={{ color: 'var(--text-primary)' }}>
                  {row.record.title}
                </span>
                {row.record.subtitle && (
                  <span className="block truncate text-[11.5px] tabular-nums" style={{ color: 'var(--text-muted)' }}>
                    {row.record.subtitle}
                  </span>
                )}
              </span>
              <Clock size={12} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
        case 'recentQuery':
          return (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                <Clock size={13} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px]" style={{ color: 'var(--text-primary)' }}>
                {row.query}
              </span>
              <Search size={12} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
        case 'page':
          return (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                <FileText size={13} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[13px] font-[550]" style={{ color: 'var(--text-primary)' }}>
                <Highlight text={row.page.label} query={trimmed} />
              </span>
              <ArrowRight size={13} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
        case 'action': {
          const Icon = row.action.icon;
          return (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white"
                style={{ background: 'var(--brand)' }}
              >
                <Icon size={13} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>
                  {row.action.label}
                </span>
                <span className="block truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  {row.action.hint}
                </span>
              </span>
              <CornerDownLeft size={12} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
        }
        case 'seeAll':
          return (
            <>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px]"
                style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
              >
                <Users size={13} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1 truncate text-[12.5px] font-[550]" style={{ color: 'var(--text-secondary)' }}>
                Search all records for “{trimmed}”
              </span>
              <ArrowRight size={13} className="shrink-0" style={{ color: 'var(--text-disabled)' }} />
            </>
          );
      }
    })();

    return (
      <button
        key={row.key}
        id={`gs-row-${idx}`}
        type="button"
        role="option"
        aria-selected={isFocused}
        data-row-idx={idx}
        // Pointer-down would fire before the click and blur the input first.
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setFocusIdx(idx)}
        onClick={() => select(row)}
        className={common}
        style={focusStyle}
      >
        {body}
      </button>
    );
  };

  // ── Panel ──────────────────────────────────────────────────────────────────

  // `heightClass` differs by surface: the dropdown is capped, the sheet fills
  // whatever the on-screen keyboard leaves. The scroll container must be the
  // element that carries the constraint, or the list clips instead of scrolling.
  const renderPanel = (heightClass: string) => (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Search results"
      className={cn('overflow-y-auto overscroll-contain', heightClass)}
    >
      {loading && !data && <ResultSkeleton />}

      {error && (
        <p className="px-4 py-6 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>
          {error}
        </p>
      )}

      {!error && showEmptyState && (
        <div className="px-4 py-7 text-center">
          <div
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text-disabled)' }}
          >
            <Search size={18} strokeWidth={1.6} />
          </div>
          <p className="text-[13.5px] font-[650]" style={{ color: 'var(--text-primary)' }}>
            No clients found
          </p>
          <p className="mt-1 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
            Nothing matches “{trimmed}”.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go('/pt-os/new-client')}
              className="rounded-[11px] px-3.5 py-2 text-[12.5px] font-[650] text-white"
              style={{ background: 'var(--brand)', minHeight: 38 }}
            >
              Create new client
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { pushRecentQuery(trimmed); go(seeAllHref); }}
              className="rounded-[11px] px-3.5 py-2 text-[12.5px] font-[650]"
              style={{
                background: 'var(--bg-subtle)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                minHeight: 38,
              }}
            >
              Search all records
            </button>
          </div>
        </div>
      )}

      {!error && sections.map((section) => {
        // Offset of this section's first row within the flat list.
        const offset = flatRows.indexOf(section.rows[0]);
        return (
          <div key={section.key} role="group" aria-label={section.label || 'More'} className="px-1.5 pb-1">
            {section.label && (
              <div className="flex items-center justify-between gap-2 px-2.5 pb-1 pt-2">
                <span
                  className="text-[9.5px] font-[750] uppercase"
                  style={{ color: 'var(--text-disabled)', letterSpacing: '0.12em' }}
                >
                  {section.label}
                </span>
                {section.action && (
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={section.action.onClick}
                    className="text-[10.5px] font-[600] underline-offset-2 hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {section.action.label}
                  </button>
                )}
              </div>
            )}
            {section.rows.map((row, i) => renderRow(row, offset + i))}
          </div>
        );
      })}

      {/* Footer: hints on a pointer device, timing when we have it. Hidden on
          touch, where there is no ↑↓ and the row would only steal height. */}
      {(hasResults || flatRows.length > 0) && (
        <div
          className="hidden items-center gap-2 border-t px-3.5 py-2 sm:flex"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
            ↑↓ navigate · ↵ open · esc close
          </span>
          {data && (
            <span className="ml-auto text-[10px] tabular-nums" style={{ color: 'var(--text-disabled)' }}>
              {data.took_ms} ms
            </span>
          )}
        </div>
      )}
    </div>
  );

  /** Announced to screen readers as the active option of the combobox. */
  const activeDescendant = focusIdx >= 0 && flatRows[focusIdx]
    ? `gs-row-${focusIdx}`
    : undefined;

  const inputChrome = cn(
    'relative w-full rounded-2xl py-[7px] pl-9 pr-8 text-[13px] outline-none transition-all duration-300',
    darkMode
      ? 'border border-white/10 bg-white/8 text-slate-100 placeholder:text-slate-500 focus:border-white/25 focus:bg-white/12'
      : 'border border-slate-200 bg-slate-50 text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:bg-white',
  );

  return (
    <>
      {/* ── Phone: a button, because an inline input here is ~140px wide ── */}
      <button
        type="button"
        aria-label="Search clients"
        onClick={() => setSheetOpen(true)}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors duration-200 sm:hidden',
          darkMode ? 'text-slate-300 hover:bg-white/10 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
        )}
      >
        <Search size={17} strokeWidth={1.6} />
      </button>

      {/* ── Tablet and up: inline combobox ── */}
      {/* flex-grow 999 rather than 1: the header also contains a spacer that
          pushes the icon cluster right, and with equal grow the two split the
          free space evenly — which squeezed this field to 139px at 640 and
          203px at 768, clipping its own placeholder. A lopsided grow lets the
          field take everything up to its max-width first, and the spacer take
          only what is left over. */}
      <div ref={containerRef} className="relative hidden sm:block sm:flex-[999_1_0%] sm:max-w-[360px] lg:max-w-[420px]">
        <div className="group relative flex items-center">
          <Search
            size={14}
            strokeWidth={2}
            className={cn(
              'absolute left-3 z-10 transition-colors duration-200',
              darkMode ? 'text-slate-500 group-focus-within:text-slate-300' : 'text-slate-400 group-focus-within:text-slate-600',
            )}
          />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={open}
            aria-controls="global-search-panel"
            aria-autocomplete="list"
            aria-activedescendant={activeDescendant}
            autoComplete="off"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocusIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className={inputChrome}
          />
          {loading && (
            <Loader2
              size={12}
              className="absolute right-8 z-10 animate-spin"
              style={{ color: 'var(--text-disabled)' }}
              aria-hidden
            />
          )}
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setQuery(''); setData(null); setFocusIdx(-1); inputRef.current?.focus(); }}
              className="absolute right-2.5 z-10 flex h-4 w-4 items-center justify-center rounded-full transition-colors duration-200"
              style={{ background: 'var(--bg-subtle)', color: 'var(--text-muted)' }}
            >
              <X size={9} />
            </button>
          )}
        </div>

        <AnimatePresence>
          {open && (sections.length > 0 || loading || error || showEmptyState) && (
            <m.div
              id="global-search-panel"
              initial={reduce ? false : { opacity: 0, y: -6, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.985 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[18px]"
              style={{
                transformOrigin: 'top center',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                boxShadow: '0 24px 60px rgba(15,23,42,0.22), 0 2px 8px rgba(15,23,42,0.06)',
              }}
            >
              {renderPanel('max-h-[min(70vh,460px)]')}
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Phone sheet ── */}
      {mounted && createPortal(
        <AnimatePresence>
          {sheetOpen && (
            <m.div
              className="fixed inset-0 z-[120] sm:hidden"
              initial={reduce ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
            >
              <div
                className="absolute inset-0"
                style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(6px)' }}
                onClick={close}
              />
              <m.div
                className="absolute inset-x-0 top-0 flex max-h-dvh flex-col rounded-b-[22px]"
                initial={reduce ? false : { y: -16 }}
                animate={{ y: 0 }}
                exit={reduce ? { opacity: 0 } : { y: -16 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: 'var(--bg-elevated)',
                  borderBottom: '1px solid var(--border)',
                  paddingTop: 'env(safe-area-inset-top, 0px)',
                  boxShadow: '0 20px 50px rgba(15,23,42,0.28)',
                }}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <div className="relative flex flex-1 items-center">
                    <Search size={15} strokeWidth={2} className="absolute left-3 z-10" style={{ color: 'var(--text-disabled)' }} />
                    <input
                      ref={sheetInputRef}
                      type="text"
                      role="combobox"
                      aria-expanded
                      aria-autocomplete="list"
                      aria-activedescendant={activeDescendant}
                      autoComplete="off"
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setFocusIdx(-1); }}
                      onKeyDown={onKeyDown}
                      // Shorter than the desktop placeholder on purpose: there
                      // is no Ctrl key on a phone, and the full wording clips
                      // at 390pt once the field is sized to stop iOS zooming.
                      placeholder="Search by name or mobile…"
                      className="w-full rounded-[14px] py-2.5 pl-9 pr-3 text-[15px] outline-none"
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-primary)',
                        // 16px+ stops iOS Safari zooming the viewport on focus.
                        fontSize: 16,
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="shrink-0 rounded-xl px-2.5 text-[13px] font-[600]"
                    style={{ color: 'var(--text-secondary)', minHeight: 44 }}
                  >
                    Cancel
                  </button>
                </div>
                <div className="min-h-0 flex-1 pb-2">{renderPanel('max-h-full')}</div>
              </m.div>
            </m.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
