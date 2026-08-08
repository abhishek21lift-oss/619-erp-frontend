'use client';

// Check-in Leaderboard — who is actually turning up.
//
// ── What this replaces ─────────────────────────────────────────────────────
//
// A four-column HTML <table> and two bare date inputs, with no page title at
// all. On a phone that produced the screen this rewrite exists because of:
// every member name broken across two lines, the "Check-ins" column heading
// hyphenated mid-word, the Activity bars running off the right edge of their
// own card, and nothing anywhere saying what the page was.
//
// A table is a desktop primitive. It gives every column the same weight and
// then asks a 390px screen to honour four of them. This is a list of cards —
// rank, face, name, count — which is what the data actually is.
//
// ── What the bar means ─────────────────────────────────────────────────────
//
// It was `checkins / top`, drawn in the danger red, unlabelled. Two problems.
// The first is that the leader is by definition 100%, so the bar adds nothing
// to the leader's row and everything below it is a ratio against a number the
// reader has to find themselves. The second is that red is the colour this app
// uses for overdue payments and expiring memberships, on a board where turning
// up is the good outcome.
//
// The bar is still relative to the leader — that is the honest reading of a
// leaderboard — but it is brand-coloured, it is captioned, and the raw count
// sits next to it so the row is readable without it.
//
// ── Dates ──────────────────────────────────────────────────────────────────
//
// The range defaulted through `toISOString().split('T')[0]`, which is UTC. In
// IST that is the previous day's date every night between midnight and 05:30
// — the same rollover bug we fixed in the roster, in a different file.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { AlertTriangle, CalendarRange, Crown, RotateCw, Trophy, UserCheck, Users } from 'lucide-react';
import Guard from '@/components/Guard';
import AppShell from '@/components/AppShell';
import ClientAvatar, { initialsOf } from '@/components/pt-os/ClientAvatar';
import { EmptyState, PageContainer, PageHero, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import type { Attendance, Client } from '@/lib/api';
import { fmtDate, toInputDate } from '@/lib/format';
import { buildBoard, type BoardRow } from '@/lib/leaderboard';

export default function LeaderboardPage() {
  return (
    <Guard roles={['admin', 'manager']}>
      <Inner />
    </Guard>
  );
}

/** A preset range, as an offset in days back from today. `month` starts on the 1st. */
const PRESETS = [
  { id: '7', label: '7 days' },
  { id: '30', label: '30 days' },
  { id: 'month', label: 'This month' },
  { id: 'custom', label: 'Custom' },
] as const;

type PresetId = (typeof PRESETS)[number]['id'];

/** Local calendar date, not UTC — see the note at the top of the file. */
function localToday() {
  return toInputDate(new Date());
}

function rangeFor(preset: PresetId): { from: string; to: string } | null {
  const to = localToday();
  if (preset === 'custom') return null;
  if (preset === 'month') {
    const d = new Date();
    return { from: toInputDate(new Date(d.getFullYear(), d.getMonth(), 1)), to };
  }
  const d = new Date();
  d.setDate(d.getDate() - (Number(preset) - 1));
  return { from: toInputDate(d), to };
}

// Gold for the leader, and nothing else.
//
// The obvious thing is gold/silver/bronze for the top three. It does not
// survive joint ranks: this studio's own board has two members level on one
// check-in, so "rank 3" is two rows, and a fifth member joining them makes it
// three. Tinting an unbounded number of rows bronze is not a podium, and at
// 10% alpha the three tints are barely distinguishable anyway. One winner,
// one treatment; everyone else reads their place off the number.
const LEADER_BADGE = { bg: 'var(--warning-bg)', fg: 'var(--amber-700)' };

function Inner() {
  const reduce = useReducedMotion();
  const [preset, setPreset] = useState<PresetId>('30');
  const initial = rangeFor('30')!;
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const [records, setRecords] = useState<Attendance[] | null>(null);
  const [photos, setPhotos] = useState<Map<string, string | null>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    let alive = true;
    setLoading(true);
    setError('');
    // Photos are a nicety and clients/ is a second request, so a failure there
    // must not cost the board. The names come off the attendance rows either
    // way; without photos the rows fall back to initials.
    Promise.all([
      api.attendance.list({ from, to, type: 'client' }),
      api.clients.list({ limit: 2000 }).catch(() => [] as Client[]),
    ])
      .then(([att, clients]) => {
        if (!alive) return;
        setRecords(Array.isArray(att) ? att : []);
        setPhotos(new Map((clients as Client[]).map((c) => [String(c.id), c.photo_url ?? null])));
      })
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : 'Failed to load attendance'))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [from, to]);

  useEffect(() => load(), [load]);

  const applyPreset = (id: PresetId) => {
    setPreset(id);
    const r = rangeFor(id);
    if (r) { setFrom(r.from); setTo(r.to); }
  };

  const board = useMemo(() => buildBoard(records ?? [], photos), [records, photos]);
  const top = board[0]?.checkins || 0;
  const totalCheckins = board.reduce((s, r) => s + r.checkins, 0);
  const avg = board.length ? totalCheckins / board.length : 0;

  return (
    <AppShell>
      <PageContainer>
        {/* `.page-main` used to wrap this and added its own 16px on top of the
            shell's, so the page sat at 32px from the edge while the dashboard
            sat at 16. PageContainer carries the dashboard's exact
            measurements. */}
        <PageHero
          icon={<Trophy size={20} />}
          title="Check-in Leaderboard"
          // The range is not repeated here. It is in the two date fields
          // immediately below, and a second copy in DD-MM-YYYY wrapped the
          // header onto three lines on a phone. Where the range genuinely
          // changes the meaning of what is on screen — an empty board — it
          // is spelled out there instead.
          subtitle="Who is actually turning up"
        />

          {/* ── Range ────────────────────────────────────────────────────
              Presets first, because "last 30 days" is the question almost
              everyone is asking and typing two dates to ask it is three taps
              and a calendar picker too many. The inputs stay for the case the
              presets do not cover, and are labelled — they used to sit in a
              flex-wrap row where the label and its field could land on
              different lines. */}
          <div
            className="rounded-[18px] p-3.5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {PRESETS.map((p) => {
                const active = preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPreset(p.id)}
                    aria-pressed={active}
                    className="h-[38px] shrink-0 cursor-pointer rounded-full px-3.5 text-[12.5px] font-[700] transition-transform active:scale-95"
                    style={{
                      background: active ? 'var(--brand)' : 'var(--bg-subtle)',
                      color: active ? '#fff' : 'var(--text-secondary)',
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-[800] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  From
                </span>
                <input
                  type="date" value={from} max={to}
                  onChange={(e) => { setFrom(e.target.value); setPreset('custom'); }}
                  className="h-[44px] w-full rounded-[12px] px-3 text-[13.5px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-[10.5px] font-[800] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  To
                </span>
                <input
                  type="date" value={to} min={from} max={localToday()}
                  onChange={(e) => { setTo(e.target.value); setPreset('custom'); }}
                  className="h-[44px] w-full rounded-[12px] px-3 text-[13.5px] outline-none"
                  style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
              </label>
            </div>
          </div>

          {/* Three numbers off the same request. The old page made the reader
              add the column up to learn how many check-ins there had been. */}
          <div className="grid grid-cols-3 gap-2.5">
            <Stat icon={<UserCheck size={14} />} label="Check-ins" value={loading ? null : totalCheckins} />
            <Stat icon={<Users size={14} />} label="Members" value={loading ? null : board.length} />
            <Stat
              icon={<CalendarRange size={14} />}
              label="Avg each"
              value={loading ? null : (Math.round(avg * 10) / 10).toString()}
            />
          </div>

          {error ? (
            <EmptyState
              icon={<AlertTriangle size={22} />}
              title="Could not load the leaderboard"
              description={error}
              action={(
                <button
                  type="button"
                  onClick={load}
                  className="inline-flex h-[44px] cursor-pointer items-center gap-2 rounded-[14px] px-4 text-[13.5px] font-[700] text-white transition-transform active:scale-95"
                  style={{ background: 'var(--brand)' }}
                >
                  <RotateCw size={16} /> Try again
                </button>
              )}
            />
          ) : loading ? (
            <BoardSkeleton />
          ) : board.length === 0 ? (
            <EmptyState
              icon={<Trophy size={22} />}
              title="No check-ins in this range"
              description={`Nobody was marked present or late between ${fmtDate(from)} and ${fmtDate(to)}. Try a wider range.`}
            />
          ) : (
            <>
              <ol className="flex list-none flex-col gap-2.5 p-0">
                {board.map((r, i) => (
                  <BoardRow key={r.id} row={r} top={top} i={i} reduce={!!reduce} />
                ))}
              </ol>
              <p className="mt-3 px-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Bars are relative to the leader&apos;s {top} check-in{top === 1 ? '' : 's'}.
              </p>
            </>
          )}
      </PageContainer>
    </AppShell>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string | null }) {
  return (
    <div
      className="rounded-[16px] p-3"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
    >
      <span className="flex items-center gap-1.5 text-[10px] font-[800] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
        {icon}
        <span className="truncate">{label}</span>
      </span>
      {value === null
        ? <Skeleton width="60%" height={22} className="mt-1.5" />
        : (
          <p className="mt-1 text-[22px] font-[800] tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>
            {value}
          </p>
        )}
    </div>
  );
}

function BoardRow({ row, top, i, reduce }: { row: BoardRow; top: number; i: number; reduce: boolean }) {
  const leader = row.rank === 1;
  const pct = top > 0 ? Math.max(4, (row.checkins / top) * 100) : 0;

  return (
    <m.li
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.24), duration: reduce ? 0 : 0.18 }}
      className="flex items-center gap-3 rounded-[18px] p-3.5"
      style={{
        background: 'var(--bg-card)',
        // The leader gets a ring rather than a different fill, so the row stays
        // on the same surface as the rest and the list still reads as one list.
        border: leader ? '1.5px solid var(--warning-border)' : '1px solid var(--border)',
      }}
    >
      {/* Rank. The number is the fact; the medal tint and the crown are the
          decoration on top of it — never the only carrier, because three tints
          of amber-ish is not something you want a reader to have to
          distinguish to know who won. */}
      <span
        className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-[12px] text-[13px] font-[800] tabular-nums"
        style={{
          background: leader ? LEADER_BADGE.bg : 'var(--bg-subtle)',
          color: leader ? LEADER_BADGE.fg : 'var(--text-secondary)',
        }}
      >
        {leader ? <Crown size={15} aria-hidden /> : row.rank}
        <span className="sr-only">{leader ? 'First place' : `Rank ${row.rank}`}</span>
      </span>

      <ClientAvatar
        name={row.name}
        photoUrl={row.photo}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[12px] font-[800] text-white"
        style={{ background: 'linear-gradient(135deg,#0067e0,#0059ce)' }}
      >
        {initialsOf(row.name)}
      </ClientAvatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          {/* Wraps rather than truncates. Two-word Indian names at this width
              are exactly the case the old table ellipsed. */}
          <p className="line-clamp-2 text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
            {row.name}
          </p>
          <span className="shrink-0 text-[15px] font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            {row.checkins}
            <span className="ml-1 text-[10.5px] font-[700]" style={{ color: 'var(--text-muted)' }}>
              {row.checkins === 1 ? 'visit' : 'visits'}
            </span>
          </span>
        </div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full"
          style={{ background: 'var(--bg-subtle)' }}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={top}
          aria-valuenow={row.checkins}
          aria-label={`${row.name}: ${row.checkins} of the leader's ${top}`}
        >
          <span
            className="block h-full rounded-full"
            style={{ width: `${pct}%`, background: leader ? 'var(--amber-700)' : 'var(--brand)' }}
          />
        </div>
      </div>
    </m.li>
  );
}

function BoardSkeleton() {
  return (
    <div className="flex flex-col gap-2.5" aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-[18px] p-3.5"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          <Skeleton width={36} height={36} className="shrink-0 rounded-[12px]" />
          <Skeleton width={40} height={40} className="shrink-0 rounded-[13px]" />
          <div className="min-w-0 flex-1">
            <Skeleton width="55%" height={13} />
            <Skeleton height={6} variant="pill" className="mt-2.5" />
          </div>
        </div>
      ))}
    </div>
  );
}
