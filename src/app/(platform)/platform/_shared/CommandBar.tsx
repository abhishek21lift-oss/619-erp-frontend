'use client';

// Command palette (Cmd-K) for the platform console.
//
// Extracted verbatim from the 3,197-line platform/page.tsx (audit H-03).
// Component bodies, props and rendered markup are unchanged.
//
// Phase 6 — global search backend.
//
// The original CommandBar searched only the studio list and the coupon list
// in memory. That covered the two entity types whose data was already on
// hand when the palette opened. For the rest (trainers, clients,
// subscriptions, invoices, audit log), the home had no answer.
//
// The new /api/platform/search endpoint does. We hit it on a 250ms debounce
// after the user types at least 2 characters, and we group results by
// `kind`. Every result carries an `org_id`; the brief's rule is "never
// return ambiguous records without showing their org", and the type system
// enforces that. We render the org name as the subtitle, falling back to
// "—" when the backend could not resolve one (e.g. an orphan audit row).
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, LayoutDashboard, Activity, CreditCard, Receipt, Ticket, Search, ScrollText,
  HeartPulse, HardDrive, User, UserCog,
} from 'lucide-react';
import StudioMark from '@/components/StudioMark';
import { useSearchFieldFocus } from '@/lib/search-field-focus';
import { Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { StudioOverview, Coupon, PlatformSearchResult, PlatformSearchKind } from '@/lib/api';
import type { NavOpts, Tab } from './types';

const SERVER_ICON: Record<PlatformSearchKind, React.ReactNode> = {
  studio:       <Building2 size={14} />,
  owner:        <UserCog size={14} />,
  trainer:      <User size={14} />,
  client:       <Users size={14} />,
  subscription: <CreditCard size={14} />,
  invoice:      <Receipt size={14} />,
  audit:        <ScrollText size={14} />,
};

const SERVER_LABEL: Record<PlatformSearchKind, string> = {
  studio: 'Studios',
  owner: 'Owners',
  trainer: 'Trainers',
  client: 'Clients',
  subscription: 'Subscriptions',
  invoice: 'Invoices',
  audit: 'Audit',
};

export const NAV_TARGETS: { tab: Tab; label: string; icon: React.ReactNode; opts?: NavOpts }[] = [
  { tab: 'overview', label: 'Go to Overview', icon: <LayoutDashboard size={14} /> },
  { tab: 'studios', label: 'Go to Studios', icon: <Building2 size={14} /> },
  { tab: 'finance', label: 'Go to Finance · Billing', icon: <CreditCard size={14} />, opts: { financeSubTab: 'billing' } },
  { tab: 'finance', label: 'Go to Finance · Invoices', icon: <Receipt size={14} />, opts: { financeSubTab: 'invoices' } },
  { tab: 'finance', label: 'Go to Finance · Coupons', icon: <Ticket size={14} />, opts: { financeSubTab: 'coupons' } },
  { tab: 'activity', label: 'Go to Activity', icon: <Activity size={14} /> },
  { tab: 'audit', label: 'Go to Audit Centre', icon: <ScrollText size={14} /> },
  { tab: 'storage', label: 'Go to Storage', icon: <HardDrive size={14} /> },
  { tab: 'health', label: 'Go to System Health', icon: <HeartPulse size={14} /> },
];

export function CommandBar({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (tab: Tab, opts?: NavOpts) => void }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [studios, setStudios] = useState<StudioOverview[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [searchResults, setSearchResults] = useState<PlatformSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const loadedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    // Loaded once per page visit, not on every open — these lists change
    // slowly and re-fetching on every ⌘K press would make the palette feel
    // laggy for no benefit.
    if (!loadedRef.current) {
      loadedRef.current = true;
      api.superAdmin.overview().then((r) => setStudios(r.data.studios ?? [])).catch(() => {});
      api.superAdmin.listCoupons().then((r) => setCoupons(r.data ?? [])).catch(() => {});
    }
  }, [open]);

  // Was `setTimeout(() => inputRef.current?.focus(), 30)` inside the effect
  // above. A timeout is a new task, and WebKit only raises the on-screen
  // keyboard for a focus made while it is still processing the gesture — so
  // on a phone the palette opened with the caret placed and no keyboard.
  // See lib/search-field-focus.ts.
  useSearchFieldFocus(open, inputRef);

  // Global search — debounced 250ms. The backend already enforces a 2-char
  // minimum; we add the local guard too so we don't burn a round trip on
  // the first keystroke. The search endpoint accepts a `kinds` list; the
  // default covers studio/owner/trainer/client which are the cases the
  // local cache could never have answered.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.superAdmin.search(q)
        .then((r) => setSearchResults(r.data ?? []))
        .catch(() => setSearchResults([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const q = query.trim().toLowerCase();
  const navResults = q ? NAV_TARGETS.filter((n) => n.label.toLowerCase().includes(q)) : NAV_TARGETS;
  const studioResults = q ? studios.filter((s) => s.name.toLowerCase().includes(q)).slice(0, 6) : [];
  const couponResults = q ? coupons.filter((c) => c.code.toLowerCase().includes(q)).slice(0, 6) : [];
  // Group server results by kind for the section headers. The backend
  // already caps each kind at 10 and the total at 50, so we trust its
  // ordering and just bucket the array.
  const serverByKind = (kind: PlatformSearchKind) => searchResults.filter((r) => r.kind === kind);

  // One flat, ordered list so Up/Down/Enter can move through every visible
  // row regardless of which section it's in.
  type Row =
    | { kind: 'nav'; item: typeof NAV_TARGETS[number] }
    | { kind: 'studio'; item: StudioOverview }
    | { kind: 'coupon'; item: Coupon }
    | { kind: 'server'; item: PlatformSearchResult };
  const serverRows: Row[] = searchResults.map((item): Row => ({ kind: 'server', item }));
  const rows: Row[] = [
    ...navResults.map((item): Row => ({ kind: 'nav', item })),
    ...studioResults.map((item): Row => ({ kind: 'studio', item })),
    ...couponResults.map((item): Row => ({ kind: 'coupon', item })),
    ...serverRows,
  ];
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [query]);

  const activate = (row: Row) => {
    if (row.kind === 'nav') onNavigate(row.item.tab, row.item.opts);
    else if (row.kind === 'studio') onNavigate('studios');
    else if (row.kind === 'coupon') onNavigate('finance', { financeSubTab: 'coupons' });
    else if (row.kind === 'server') {
      // Server results carry their own URL (the backend builds it). We close
      // the palette and route via Next's router so the SPA tree stays
      // intact. /platform/studios/[id] is a real route segment we added
      // for Studio 360; the in-page tabs use ?tab= to preserve the
      // existing deep-link behaviour.
      onClose();
      router.push(row.item.url);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, rows.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); return; }
    if (e.key === 'Enter') { e.preventDefault(); const row = rows[active]; if (row) activate(row); }
  };

  if (!open) return null;

  const rowCls = 'flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors';
  const rowStyle = (i: number): React.CSSProperties =>
    i === active ? { background: 'var(--bg-hover)' } : {};

  let rowIndex = -1;

  return (
    <div
      // Covers the backdrop as well as the panel: a drag anywhere over an open
      // command bar belongs to it, never to the page behind it.
      data-no-pull-refresh
      className="fixed inset-0 z-[9500] flex items-start justify-center px-4 pt-[12vh]"
      style={{ background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-[18px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: '0 24px 60px rgba(15,23,42,0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input aria-label="Search studios, coupons, or jump to a section"
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search studios, coupons, or jump to a section…"
            className="flex-1 bg-transparent text-[14px] outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <kbd className="rounded-[5px] px-1.5 py-0.5 text-[10px] font-[700]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>Esc</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto overscroll-contain p-2">
          {navResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Jump to</p>
              {navResults.map((n) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={n.label} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'nav', item: n })}>
                    <span style={{ color: 'var(--text-muted)' }}>{n.icon}</span>
                    <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{n.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {studioResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Studios</p>
              {studioResults.map((s) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={s.id} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'studio', item: s })}>
                    <StudioMark name={s.name} logoUrl={s.logo_url} size={22} />
                    <span className="text-[13px] font-[600]" style={{ color: 'var(--text-primary)' }}>{s.name}</span>
                    <Badge tone={s.status === 'suspended' ? 'danger' : 'success'}>{s.status}</Badge>
                  </button>
                );
              })}
            </div>
          )}

          {couponResults.length > 0 && (
            <div className="mb-1">
              <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>Coupons</p>
              {couponResults.map((c) => {
                rowIndex++;
                const i = rowIndex;
                return (
                  <button key={c.id} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'coupon', item: c })}>
                    <Ticket size={14} style={{ color: 'var(--text-muted)' }} />
                    <span className="text-[13px] font-[700] tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.code}</span>
                    <span className="truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{c.description || (c.discount_type === 'percent' ? `${c.discount_value}% off` : `₹${c.discount_value} off`)}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Server results, grouped by kind. Rendered only when the
              debounced call has returned at least once (q.length >= 2).
              Each row carries the org in its subtitle so two studios with
              the same trainer name never collide visually. */}
          {searchResults.length > 0 && (() => {
            const kinds: PlatformSearchKind[] = ['studio', 'owner', 'trainer', 'client', 'subscription', 'invoice', 'audit'];
            return kinds.map((k) => {
              const items = serverByKind(k);
              if (items.length === 0) return null;
              return (
                <div key={k} className="mb-1">
                  <p className="px-3 py-1.5 text-[10px] font-[750] uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>{SERVER_LABEL[k]}</p>
                  {items.map((r) => {
                    rowIndex++;
                    const i = rowIndex;
                    return (
                      <button key={`${k}-${r.id}`} className={rowCls} style={rowStyle(i)} onMouseEnter={() => setActive(i)} onClick={() => activate({ kind: 'server', item: r })}>
                        <span style={{ color: 'var(--text-muted)' }}>{SERVER_ICON[k]}</span>
                        <span className="text-[13px] font-[600] truncate" style={{ color: 'var(--text-primary)' }}>{r.title}</span>
                        <span className="ml-1 truncate text-[11.5px]" style={{ color: 'var(--text-muted)' }}>{r.subtitle}</span>
                        {r.status && <Badge tone={r.status === 'suspended' ? 'danger' : r.status === 'failed' ? 'danger' : r.status === 'active' ? 'success' : 'neutral'}>{r.status}</Badge>}
                      </button>
                    );
                  })}
                </div>
              );
            });
          })()}

          {q && !searching && searchResults.length === 0 && studioResults.length === 0 && couponResults.length === 0 && navResults.length === 0 && (
            <p className="py-8 text-center text-[12.5px]" style={{ color: 'var(--text-muted)' }}>No matches for &quot;{query}&quot;.</p>
          )}
          {q.length >= 2 && searching && searchResults.length === 0 && (
            <p className="py-6 text-center text-[11.5px]" style={{ color: 'var(--text-muted)' }}>Searching…</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── FINANCE */
// Billing (per-studio subscriptions/payments) and Coupons used to be separate
// top-level tabs; Dashboard is new. None of Billing's or Coupons' internals
// changed here — this nests all three under one Finance section with an
// in-page sub-switch, with the aggregate KPIs that used to live at the top
// of Billing moved into Dashboard (Billing is now purely the per-studio
// action list, which is what an operator actually works from day to day).
