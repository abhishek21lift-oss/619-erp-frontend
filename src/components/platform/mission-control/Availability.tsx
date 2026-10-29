'use client';
/**
 * Persisted availability — the console's memory.
 *
 * The live cards say what is true now; this rail says whether it has been true
 * for the last day or week. It exists because the in-browser history resets on
 * reload and a resolved alert leaves no trace of having flapped.
 *
 * Colour is the third channel here, not the first: the rail's shape (a gap vs
 * a filled bucket), the percentage and the worst-first order all carry the
 * same information. A bucket at the worst status inside it, so an incident
 * cannot hide between two green samples.
 */

import React, { useEffect, useState } from 'react';
import { Activity, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommandCenterAvailability, CommandCenterAvailabilityCard } from '@/lib/api';
import { errorMessage } from '@/lib/forms/errors';
import { metaFor, toneFor } from './tokens';

const POLL_MS = 120_000;
const WINDOWS = [{ hours: 24, label: '24h' }, { hours: 168, label: '7d' }] as const;

const sortWorstFirst = (a: CommandCenterAvailabilityCard, b: CommandCenterAvailabilityCard) =>
  (a.healthy_pct ?? 101) - (b.healthy_pct ?? 101) || a.card.localeCompare(b.card);

export const Availability: React.FC = () => {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<CommandCenterAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    const load = async () => {
      try {
        const res = await api.superAdmin.commandCenterAvailability({ hours });
        if (!live) return;
        setData(res.data);
        setError(null);
      } catch (err) {
        if (live) setError(errorMessage(err, 'Could not load availability'));
      } finally {
        if (live) setLoading(false);
      }
    };
    setLoading(true);
    load();
    const timer = setInterval(load, POLL_MS);
    return () => { live = false; clearInterval(timer); };
  }, [hours, attempt]);

  const cards = data ? [...data.cards].sort(sortWorstFirst) : [];
  const windowLabel = WINDOWS.find((w) => w.hours === hours)?.label ?? `${hours}h`;

  return (
    <section
      className="overflow-hidden rounded-[16px]"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}
      aria-labelledby="command-center-availability-title"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]" style={{ background: 'var(--bg-subtle)' }}>
            <Activity size={15} style={{ color: 'var(--text-tertiary)' }} />
          </span>
          <div>
            <h3 id="command-center-availability-title" className="text-[13.5px] font-[800]"
              style={{ color: 'var(--text-primary)' }}>
              Availability
            </h3>
            <p className="text-[10.5px]" style={{ color: 'var(--text-tertiary)' }}>
              Persisted status, survives restarts
            </p>
          </div>
        </div>

        <div className="flex gap-1 rounded-[10px] p-0.5" style={{ background: 'var(--bg-subtle)' }}
          role="group" aria-label="Availability window">
          {WINDOWS.map((w) => (
            <button
              key={w.hours}
              type="button"
              onClick={() => setHours(w.hours)}
              aria-pressed={hours === w.hours}
              className="rounded-[8px] px-2.5 py-1 text-[10.5px] font-[800]"
              style={{
                background: hours === w.hours ? 'var(--surface)' : 'transparent',
                color: hours === w.hours ? 'var(--text-primary)' : 'var(--text-tertiary)',
              }}
            >
              {w.label}
            </button>
          ))}
        </div>
      </header>

      {loading && !data ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : error ? (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11.5px]">
          <span style={{ color: 'var(--text-tertiary)' }}>{error}</span>
          <button type="button" onClick={() => setAttempt((n) => n + 1)}
            className="rounded-[8px] px-2.5 py-1 text-[11px] font-[700]"
            style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            Retry
          </button>
        </div>
      ) : cards.length === 0 ? (
        <p className="px-4 py-4 text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
          No samples yet — the first one lands within five minutes of boot.
        </p>
      ) : (
        <ul className="space-y-2 px-4 py-3">
          {cards.map((card) => {
            const meta = metaFor(card.card);
            return (
              <li key={card.card}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-[700]" style={{ color: 'var(--text-primary)' }}>
                    {meta.title}
                  </span>
                  <span className="whitespace-nowrap text-[10px] tabular-nums"
                    style={{ color: card.healthy_pct === null ? 'var(--text-disabled)' : 'var(--text-tertiary)' }}>
                    {card.healthy_pct === null ? 'no data' : `${card.healthy_pct}% healthy`}
                  </span>
                </div>
                <div
                  className="flex h-[14px] gap-px overflow-hidden rounded-[4px]"
                  role="img"
                  aria-label={`${meta.title}: ${card.healthy_pct === null ? 'no data' : `${card.healthy_pct}% healthy`} over the last ${windowLabel}`}
                >
                  {card.buckets.map((bucket) => {
                    const tone = bucket.status ? toneFor(bucket.status) : null;
                    return (
                      <span
                        key={bucket.at}
                        className="min-w-0 flex-1"
                        style={{ background: tone ? tone.color : 'var(--bg-subtle)' }}
                        title={`${new Date(bucket.at).toLocaleString()} · ${bucket.status ?? 'no sample'}`}
                      />
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

export default Availability;
