'use client';
/**
 * Alert silences, next to Re-probe because that is where an operator is when
 * they are about to do maintenance.
 *
 * A silence mutes NOTIFICATION, never detection: the alert still opens and
 * still appears in the Alert Center. That distinction is the whole feature —
 * a window that also stopped detection would hide the new failure it happened
 * to overlap.
 *
 * When there is no window this renders one quiet button. When there is one it
 * renders an amber chip carrying the reason, because "why is nobody paging us"
 * is a question that must be answerable from the screen itself.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { BellOff, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { AlertSilence } from '@/lib/api';
import { rgba, semantic } from '@/lib/palette';
import { errorMessage } from '@/lib/forms/errors';
import { FormField, SelectInput, TextInput } from '@/components/ui/form';
import { metaFor } from './tokens';

const POLL_MS = 60_000;
const DURATIONS = [
  { minutes: 15, label: '15 minutes' },
  { minutes: 60, label: '1 hour' },
  { minutes: 240, label: '4 hours' },
  { minutes: 1440, label: '24 hours' },
] as const;

const until = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const Silences: React.FC<{ cards: string[] }> = ({ cards }) => {
  const [silences, setSilences] = useState<AlertSilence[]>([]);
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [minutes, setMinutes] = useState(60);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterSilences();
      setSilences(res.data.silences);
    } catch (err) {
      setError(errorMessage(err, 'Could not load silences'));
    }
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.superAdmin.createAlertSilence({
        source: source || null,
        reason: reason.trim(),
        minutes,
      });
      setOpen(false);
      setReason('');
      setSource('');
      setMinutes(60);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the silence'));
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.superAdmin.cancelAlertSilence(id);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not cancel the silence'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {silences.map((s) => (
        <span
          key={s.id}
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-[700]"
          style={{ background: rgba(semantic.warning, 0.12), color: semantic.warningLo }}
          title={`${s.reason} — created by ${s.created_by ?? 'unknown'}`}
        >
          <BellOff size={11} />
          {s.source ? `${metaFor(s.source).title} muted` : 'All alerts muted'} until {until(s.ends_at)}
          <button
            type="button"
            onClick={() => cancel(s.id)}
            disabled={busy}
            aria-label={`Cancel silence for ${s.source ?? 'all alerts'}`}
            className="ml-0.5 rounded-full p-0.5 disabled:opacity-50"
          >
            <X size={11} />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[11.5px] font-[800]"
        style={{
          borderColor: silences.length ? rgba(semantic.warning, 0.35) : 'var(--border)',
          background: 'var(--surface)',
          color: silences.length ? semantic.warningLo : 'var(--text-primary)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <BellOff size={13} />
        {open ? 'Close' : silences.length ? 'Silenced' : 'Silence alerts'}
      </button>

      {open && (
        <form
          onSubmit={create}
          className="basis-full rounded-[12px] p-3"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <div className="flex flex-wrap items-end gap-2">
            <FormField label="Source" density="compact" className="w-auto">
              <SelectInput
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-10 rounded-[8px] px-2 pr-8 text-[11.5px] font-[600]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                <option value="">All alerts</option>
                {cards.map((c) => <option key={c} value={c}>{metaFor(c).title}</option>)}
              </SelectInput>
            </FormField>

            <FormField label="For" density="compact" className="w-auto">
              <SelectInput
                value={minutes}
                onChange={(e) => setMinutes(DURATIONS.find((d) => String(d.minutes) === e.target.value)?.minutes ?? 60)}
                className="h-10 rounded-[8px] px-2 pr-8 text-[11.5px] font-[600]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              >
                {DURATIONS.map((d) => <option key={d.minutes} value={d.minutes}>{d.label}</option>)}
              </SelectInput>
            </FormField>

            <FormField label="Reason" density="compact" className="min-w-[180px] flex-1">
              <TextInput
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={200}
                placeholder="Redis upgrade, expected restart"
                className="h-10 rounded-[8px] px-2 text-[11.5px]"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' }}
              />
            </FormField>

            <button
              type="submit"
              disabled={busy || reason.trim().length < 3}
              className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[11.5px] font-[800] disabled:opacity-50"
              style={{ background: semantic.warning, color: semantic.ink }}
            >
              {busy && <Loader2 size={12} className="animate-spin" />}
              Silence
            </button>
          </div>
          {error && <p className="mt-2 text-[11px]" style={{ color: semantic.dangerLo }}>{error}</p>}
        </form>
      )}
    </div>
  );
};

export default Silences;
