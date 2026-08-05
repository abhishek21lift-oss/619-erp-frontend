'use client';

// Command Center — the operational commands.
//
// The buttons that touch production. Everything shown here is described by the
// server: which commands exist, which are destructive, which queues are valid,
// and which cannot run on this deployment. This file keeps no list of its own,
// so what the client gates and what the server enforces cannot drift apart —
// and a client that got out of date can only ever be less permissive, never
// more, because the server re-checks all of it.
//
// ── What the UI is responsible for ──────────────────────────────────────────
//
// Making the consequence legible BEFORE the press. The confirmation is not a
// speed bump: it types back the command's own name, and the prompt leads with
// the blast radius the server wrote. An operator clearing failed jobs at 2am
// should have read "the failed jobs and their payloads are gone" before their
// fingers found the keyboard.
//
// The three refusal statuses each mean something different and are rendered
// differently: 428 opens the confirmation, 429 is a cooldown (not an error —
// the previous press worked), 503 means the capability is absent and no amount
// of retrying will help.

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  AlertTriangle, Ban, Check, ChevronRight, Loader2, Play, ShieldAlert, Terminal, X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ApiError } from '@/lib/http';
import { semantic, rgba } from '@/lib/palette';
import type { CommandCenterCommand } from '@/lib/api';
import { Center, ErrorState } from '@/app/platform/_shared/ui';

/** What came back from the last press, per command. */
type Outcome =
  | { kind: 'ok'; text: string }
  | { kind: 'error'; text: string }
  | { kind: 'cooldown'; text: string };

/** The command awaiting a typed confirmation, if any. */
type Pending = { cmd: CommandCenterCommand; queue?: string };

function outcomeTone(kind: Outcome['kind']): string {
  if (kind === 'ok') return semantic.success;
  // A cooldown is not a failure — the command ran, just now. Amber, not red,
  // so the operator does not go looking for a problem that does not exist.
  if (kind === 'cooldown') return semantic.warning;
  return semantic.danger;
}

/** Render a command's output without pretending to know its shape. */
function summarise(output: unknown): string {
  if (output === null || output === undefined) return 'done';
  if (typeof output !== 'object') return String(output);
  const entries = Object.entries(output as Record<string, unknown>)
    .filter(([, v]) => v !== null && typeof v !== 'object')
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${String(v)}`);
  return entries.length ? entries.join(' · ') : 'done';
}

// ── The confirmation ────────────────────────────────────────────────────────

function ConfirmDialog({
  pending, onCancel, onConfirm, running,
}: {
  pending: Pending;
  onCancel: () => void;
  onConfirm: () => void;
  running: boolean;
}) {
  const [typed, setTyped] = useState('');
  const { cmd } = pending;
  // The exact string the server will compare against. Requiring the command's
  // own name — rather than a generic "DELETE" or an OK button — is what stops a
  // click-through: you cannot produce it without having read which command you
  // are firing.
  const matches = typed === cmd.name;

  return (
    <div
      data-no-pull-refresh className="fixed inset-0 z-50 grid place-items-center p-4"
      style={{ background: rgba(semantic.ink, 0.55) }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cc-confirm-title"
    >
      <m.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.16 }}
        className="w-full max-w-[440px] rounded-[18px] p-5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-[11px]"
            style={{ background: rgba(semantic.danger, 0.10) }}>
            <ShieldAlert size={17} color={semantic.danger} />
          </span>
          <div className="min-w-0">
            <p id="cc-confirm-title" className="text-[15px] font-[800]" style={{ color: 'var(--text-primary)' }}>
              {cmd.label}
            </p>
            {pending.queue && (
              <p className="text-[11.5px]" style={{ color: 'var(--text-tertiary)' }}>
                on the <strong>{pending.queue}</strong> queue
              </p>
            )}
          </div>
        </div>

        {/* The blast radius leads, above the input. The operator reads the
            consequence before they reach the thing that lets them proceed. */}
        <p className="mb-4 rounded-[10px] px-3 py-2.5 text-[12.5px] leading-relaxed"
          style={{ background: rgba(semantic.danger, 0.08), color: 'var(--text-primary)' }}>
          {cmd.blast_radius}
        </p>

        <label className="mb-1.5 block text-[11px] font-[650] uppercase tracking-wide"
          style={{ color: 'var(--text-tertiary)' }}>
          Type <span style={{ color: 'var(--text-primary)' }}>{cmd.name}</span> to confirm
        </label>
        <input
          autoFocus
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && matches && !running) onConfirm(); }}
          spellCheck={false}
          autoComplete="off"
          className="mb-4 w-full rounded-[11px] px-3 py-2 text-[13px] font-mono outline-none"
          style={{
            background: 'var(--bg-subtle)',
            border: `1px solid ${matches ? semantic.success : 'var(--border)'}`,
            color: 'var(--text-primary)',
          }}
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={running}
            className="flex items-center gap-1.5 rounded-[11px] px-3 py-2 text-[12.5px] font-[650] disabled:opacity-50"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <X size={13} /> Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!matches || running}
            className="flex items-center gap-1.5 rounded-[11px] px-3 py-2 text-[12.5px] font-[750] disabled:opacity-40"
            style={{ background: semantic.danger, color: '#fff' }}
          >
            {running ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
            Run
          </button>
        </div>
      </m.div>
    </div>
  );
}

// ── One command row ─────────────────────────────────────────────────────────

function CommandRow({
  cmd, queue, onQueue, onRun, running, outcome,
}: {
  cmd: CommandCenterCommand;
  queue: string;
  onQueue: (q: string) => void;
  onRun: () => void;
  running: boolean;
  outcome: Outcome | undefined;
}) {
  const blocked = Boolean(cmd.unavailable_reason);

  return (
    <div
      className="rounded-[14px] p-3.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        // Destructive commands carry a red hairline even at rest, so the
        // grid reads as two classes of thing before anything is clicked.
        boxShadow: cmd.destructive && !blocked ? `inset 3px 0 0 0 ${semantic.danger}` : undefined,
        opacity: blocked ? 0.72 : 1,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              {cmd.label}
            </p>
            {cmd.destructive && !blocked && (
              <span className="flex-shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-[750] uppercase tracking-wide"
                style={{ background: rgba(semantic.danger, 0.10), color: semantic.danger }}>
                Destructive
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-tertiary)' }}>
            {cmd.description}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          {cmd.accepts_queue && !blocked && (
            <select
              value={queue}
              onChange={(e) => onQueue(e.target.value)}
              aria-label={`Queue for ${cmd.label}`}
              className="rounded-[9px] px-2 py-1.5 text-[11.5px] font-[600] outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {/* Straight from the server's QUEUE_NAMES — the client never
                  invents a queue name, and an unknown one is a 400 anyway. */}
              {(cmd.queues ?? []).map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          )}

          <button
            onClick={onRun}
            disabled={blocked || running}
            title={cmd.unavailable_reason ?? cmd.blast_radius}
            className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[12px] font-[700] disabled:cursor-not-allowed"
            style={
              blocked
                ? { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-tertiary)' }
                : cmd.destructive
                  ? { background: rgba(semantic.danger, 0.10), color: semantic.danger }
                  : { background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }
            }
          >
            {blocked
              ? <><Ban size={12} /> Unavailable</>
              : running
                ? <><Loader2 size={12} className="animate-spin" /> Running</>
                : <><ChevronRight size={12} /> Run</>}
          </button>
        </div>
      </div>

      {/* An absent capability explains itself in full. "Unavailable" with no
          reason is the version of this screen that gets a support ticket. */}
      {cmd.unavailable_reason && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-[9px] px-2.5 py-2 text-[11px] leading-snug"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}>
          <AlertTriangle size={12} className="mt-[1px] flex-shrink-0" />
          {cmd.unavailable_reason}
        </p>
      )}

      {outcome && (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-[9px] px-2.5 py-2 text-[11px] leading-snug font-mono"
          style={{ background: rgba(outcomeTone(outcome.kind), 0.08), color: 'var(--text-primary)' }}>
          {outcome.kind === 'ok'
            ? <Check size={12} className="mt-[1px] flex-shrink-0" color={semantic.success} />
            : <AlertTriangle size={12} className="mt-[1px] flex-shrink-0" color={outcomeTone(outcome.kind)} />}
          {outcome.text}
        </p>
      )}
    </div>
  );
}

// ── The panel ───────────────────────────────────────────────────────────────

export default function CommandPanel({ onRan }: { onRan?: () => void }) {
  const [commands, setCommands] = useState<CommandCenterCommand[] | null>(null);
  const [error, setError] = useState('');
  const [queues, setQueues] = useState<Record<string, string>>({});
  const [running, setRunning] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [pending, setPending] = useState<Pending | null>(null);

  useEffect(() => {
    let alive = true;
    api.superAdmin.commandCenterCommands()
      .then((res) => {
        if (!alive) return;
        setCommands(res.data.commands);
        // Default each queue selector to the first valid name, so a press can
        // never send an empty queue the server would have to reject.
        setQueues(Object.fromEntries(
          res.data.commands
            .filter((c) => c.accepts_queue && c.queues?.length)
            .map((c) => [c.name, c.queues![0]]),
        ));
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : 'Failed to load commands');
      });
    return () => { alive = false; };
  }, []);

  const execute = useCallback(async (cmd: CommandCenterCommand, confirm?: string) => {
    setRunning(cmd.name);
    const queue = cmd.accepts_queue ? queues[cmd.name] : undefined;
    try {
      const res = await api.superAdmin.runCommandCenterCommand(cmd.name, { queue, confirm });
      const data = res.data;
      setOutcomes((prev) => ({
        ...prev,
        [cmd.name]: {
          kind: 'ok',
          text: 'dry_run' in data ? `would run: ${data.would_run}` : `${data.duration_ms} ms · ${summarise(data.output)}`,
        },
      }));
      setPending(null);
      // Numbers on the status cards are stale the moment a command lands —
      // pausing a queue changes the queues card, and an operator who has to
      // wait out the poll interval will press the button again.
      onRan?.();
    } catch (e: unknown) {
      if (e instanceof ApiError && e.status === 428) {
        // The server asked for a typed confirmation. Open the dialog rather
        // than surfacing this as an error: nothing went wrong.
        setPending({ cmd, queue });
        setRunning(null);
        return;
      }
      const kind: Outcome['kind'] = e instanceof ApiError && e.status === 429 ? 'cooldown' : 'error';
      setOutcomes((prev) => ({
        ...prev,
        [cmd.name]: { kind, text: e instanceof Error ? e.message : 'Command failed' },
      }));
      setPending(null);
    } finally {
      setRunning(null);
    }
  }, [queues, onRan]);

  if (error) return <Center><ErrorState error={error} onRetry={() => window.location.reload()} /></Center>;

  if (!commands) {
    return (
      <div className="grid gap-2.5 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[76px] animate-pulse rounded-[14px]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />
        ))}
      </div>
    );
  }

  // Runnable first. The rungs that need a Docker socket are real and worth
  // showing, but they are not what someone opens this panel to press.
  const sorted = [...commands].sort((a, b) => {
    const ab = a.unavailable_reason ? 1 : 0;
    const bb = b.unavailable_reason ? 1 : 0;
    if (ab !== bb) return ab - bb;
    return Number(a.destructive) - Number(b.destructive);
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[10px]"
          style={{ background: rgba(semantic.primary, 0.10) }}>
          <Terminal size={15} color={semantic.primary} />
        </span>
        <div>
          <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>Commands</p>
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            Every run is recorded in the audit log with who ran it and what happened
          </p>
        </div>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        {sorted.map((c) => (
          <CommandRow
            key={c.name}
            cmd={c}
            queue={queues[c.name] ?? ''}
            onQueue={(q) => setQueues((prev) => ({ ...prev, [c.name]: q }))}
            onRun={() => execute(c)}
            running={running === c.name}
            outcome={outcomes[c.name]}
          />
        ))}
      </div>

      {pending && (
        <ConfirmDialog
          pending={pending}
          running={running === pending.cmd.name}
          onCancel={() => setPending(null)}
          onConfirm={() => execute(pending.cmd, pending.cmd.name)}
        />
      )}
    </div>
  );
}
