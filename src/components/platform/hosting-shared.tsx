'use client';

// Shared pieces for the three Hostinger console screens.
//
// ── Upstream payloads are read defensively, and this is where that lives ────
//
// Everything under `/hostinger/*` is a projection of the Hostinger API, whose
// field names are not ours and do move between revisions. A console that
// destructures `data[0].domain` renders "undefined" the day that changes, and
// renders it confidently. So the panels never index a payload directly: they go
// through `prop` / `str` / `num` / `rows` below, which return null for anything
// unexpected and let the screen say "not reported" instead of inventing one.
//
// ── The approval gate is one implementation, used by three screens ─────────
//
// plan → (typed confirmation for destructive) → execute. The VPS quick actions,
// the Docker project actions and the assistant's proposal all route through
// `useApprovalGate`, so there is exactly one place where "what did the operator
// approve" is turned into a call, and exactly one wording for what a class
// means. The server enforces the gate; this hook only drives it.

import { useCallback, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import type {
  HostingerCatalogue, HostingerOperationParams, HostingerOperationResult,
  HostingerPlan, HostingerSafety, HostingerSlot,
} from '@/lib/api';
import { Button, TextInput } from '@/components/ui';
import { errorMessage } from '@/lib/forms/errors';
import { useToast } from '@/lib/toast';

/* ── Defensive readers ─────────────────────────────────────────────────────── */

/** A property of an object payload, or undefined for anything else. */
export function prop(value: unknown, key: string): unknown {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** A non-empty string, or null. */
export function str(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

/** A finite number, including the numeric strings upstream sometimes sends. */
export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function bool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

/**
 * The array inside a list payload.
 *
 * Hostinger wraps list responses as `{ data: [...], meta: {...} }` on some
 * endpoints and returns a bare array on others. Both spellings are the same
 * thing to a reader.
 */
export function rows(payload: unknown): Record<string, unknown>[] {
  const list = Array.isArray(payload) ? payload : prop(payload, 'data');
  return Array.isArray(list) ? (list.filter((r) => r && typeof r === 'object') as Record<string, unknown>[]) : [];
}

/** The data of a slot, or null. Slots fail independently; this is the `ok` half. */
export function slotData<T = unknown>(slot: HostingerSlot | null | undefined): T | null {
  return slot && slot.ok ? (slot.data as T) : null;
}

/** Why a slot has no data, or null. */
export function slotError(slot: HostingerSlot | null | undefined): { code: string; message: string } | null {
  return slot && !slot.ok ? slot.error : null;
}

/* ── Formatting ────────────────────────────────────────────────────────────── */

export const nf = (n: number) => Math.round(n).toLocaleString('en-IN');

export function fmtWhen(iso: unknown): string {
  const value = str(iso);
  if (!value) return 'unknown';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'unknown';
  const days = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (days < 0) return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 60) return `${days}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function fmtDate(iso: unknown): string {
  const value = str(iso);
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * A timestamp that may or may not be an ISO string.
 *
 * `restore_time` and friends are integers upstream with no unit documented;
 * rendering a raw epoch as "1 Jan 1970" is worse than saying "not reported", so
 * seconds and milliseconds are both recognised and anything else is refused.
 */
export function fmtMaybeEpoch(value: unknown): string {
  const n = num(value);
  if (n !== null) {
    const ms = n > 1e12 ? n : n > 1e9 ? n * 1000 : null;
    if (ms === null) return '—';
    return new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  return str(value) ? fmtDate(value) : '—';
}

/** Bytes, binary units — what a backup size is measured in upstream. */
export function fmtBytes(value: unknown): string {
  const n = num(value);
  if (n === null || n < 0) return '—';
  if (n === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/** Seconds as days/hours, for the uptime metric. */
export function fmtDuration(seconds: unknown): string {
  const s = num(seconds);
  if (s === null || s < 0) return '—';
  const days = Math.floor(s / 86400);
  if (days >= 1) return `${days}d ${Math.floor((s % 86400) / 3600)}h`;
  const hours = Math.floor(s / 3600);
  if (hours >= 1) return `${hours}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(s / 60)}m`;
}

/**
 * The latest reading of one metric.
 *
 * The documented shape is `{ cpu_usage: { unit: '%', usage: { '<epoch>': 1.45 },
 * ... } }` — one timestamp map per metric. "What is it doing now" is the entry
 * with the highest timestamp, and the whole series is not something this screen
 * has room to draw.
 */
export function metric(data: unknown, key: string): { value: number; unit: string | null; at: number | null } | null {
  const metricObj = prop(data, key);
  const usage = prop(metricObj, 'usage');
  if (!usage || typeof usage !== 'object') return null;
  const stamps = Object.keys(usage as Record<string, unknown>).map(Number).filter(Number.isFinite);
  if (!stamps.length) return null;
  const at = Math.max(...stamps);
  const value = num((usage as Record<string, unknown>)[String(at)]);
  if (value === null) return null;
  return { value, unit: str(prop(metricObj, 'unit')), at };
}

export function fmtMetric(m: { value: number; unit: string | null } | null): string {
  if (!m) return 'not reported';
  const unit = m.unit === '%' ? '%' : m.unit ? ` ${m.unit}` : '';
  return `${m.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}${unit}`;
}

/** JSON, bounded, for a response body shown on screen rather than read. */
export function previewJson(value: unknown, max = 4000): string {
  if (value === undefined || value === null) return '';
  let text: string;
  try {
    text = JSON.stringify(value, null, 2);
  } catch {
    return '';
  }
  return text.length > max ? `${text.slice(0, max)}\n… (${text.length - max} more characters)` : text;
}

/* ── Safety classes ─────────────────────────────────────────────────────────── */

/**
 * The three classes, worded as the SERVER words them.
 *
 * `catalog.SAFETY_LABELS` is the authority and the catalogue endpoint ships it;
 * these are the fallback for the first paint, before the catalogue has loaded.
 * The gate itself is enforced server-side — nothing here decides anything.
 */
export const SAFETY_FALLBACK: Record<HostingerSafety, string> = {
  read: 'Runs immediately',
  mutate: 'Requires approval',
  destructive: 'Requires approval and a typed confirmation',
};

const SAFETY_STYLE: Record<HostingerSafety, { fg: string; bg: string; border: string; icon: React.ReactNode }> = {
  read: { fg: '#6B2440', bg: 'rgba(107,36,64,0.10)', border: 'rgba(107,36,64,0.25)', icon: <ShieldCheck size={11} /> },
  mutate: { fg: '#b45309', bg: 'rgba(180,83,9,0.10)', border: 'rgba(180,83,9,0.25)', icon: <ShieldAlert size={11} /> },
  destructive: { fg: '#b91c1c', bg: 'rgba(185,28,28,0.10)', border: 'rgba(185,28,28,0.28)', icon: <AlertTriangle size={11} /> },
};

export function SafetyBadge({ safety, labels }: { safety: HostingerSafety; labels?: HostingerCatalogue['safetyLabels'] }) {
  const style = SAFETY_STYLE[safety] ?? SAFETY_STYLE.mutate;
  const words = labels?.[safety] ?? SAFETY_FALLBACK[safety] ?? safety;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-[3px] text-[10px] font-[750] uppercase"
      style={{ color: style.fg, background: style.bg, border: `1px solid ${style.border}`, letterSpacing: '0.06em' }}
      title={words}
    >
      {style.icon}{words}
    </span>
  );
}

/* ── The approval gate ──────────────────────────────────────────────────────── */

export type GatePhase =
  | { phase: 'idle' }
  | { phase: 'planning'; operation: string }
  | { phase: 'planned'; plan: HostingerPlan }
  | { phase: 'executing'; plan: HostingerPlan }
  | { phase: 'done'; operation: string; result: HostingerOperationResult }
  | { phase: 'failed'; operation: string; message: string };

export type ApprovalGate = {
  state: GatePhase;
  confirmation: string;
  setConfirmation: (v: string) => void;
  secrets: Record<string, string>;
  setSecret: (field: string, value: string) => void;
  /** Ask the server to store an approval for this operation. */
  request: (operation: string, params?: HostingerOperationParams) => Promise<void>;
  /** Execute the stored approval, with the secret values re-entered here. */
  approve: () => Promise<void>;
  reset: () => void;
  busy: boolean;
};

/**
 * plan → approve → execute, as one state machine.
 *
 * `onDone` runs after a successful execution so the calling screen can re-read
 * whatever the write changed. A failed execution does NOT reset the gate: the
 * operator needs the reason on screen, and the approval is already consumed
 * (or not) — either way, re-planning is a deliberate next step, not a silent
 * retry of a request that may have restarted a machine.
 */
export function useApprovalGate(onDone?: () => void): ApprovalGate {
  const { toast } = useToast();
  const [state, setState] = useState<GatePhase>({ phase: 'idle' });
  const [confirmation, setConfirmation] = useState('');
  const [secrets, setSecrets] = useState<Record<string, string>>({});

  const request = useCallback(async (operation: string, params: HostingerOperationParams = {}) => {
    setConfirmation('');
    setSecrets({});
    setState({ phase: 'planning', operation });
    try {
      const plan = await api.superAdmin.hostingerPlan(operation, params);
      setState({ phase: 'planned', plan });
    } catch (err) {
      setState({ phase: 'failed', operation, message: errorMessage(err, 'That operation could not be prepared.') });
    }
  }, []);

  const approve = useCallback(async () => {
    if (state.phase !== 'planned') return;
    const { plan } = state;
    setState({ phase: 'executing', plan });
    try {
      const result = await api.superAdmin.hostingerExecute({
        operation: plan.operation,
        approvalId: plan.approval_id,
        ...(plan.safety === 'destructive' ? { confirmation } : {}),
        ...(Object.keys(secrets).length ? { secrets } : {}),
      });
      setSecrets({});
      setState({ phase: 'done', operation: plan.operation, result });
      toast.success(`${plan.summary?.summary || plan.operation} — done.`);
      onDone?.();
    } catch (err) {
      // The error is shown in the gate AND toasts, because the gate may be
      // scrolled past on a phone.
      const message = errorMessage(err, 'That operation failed.');
      setState({ phase: 'failed', operation: plan.operation, message });
      toast.error(message);
    }
  }, [state, confirmation, secrets, onDone, toast]);

  const reset = useCallback(() => { setState({ phase: 'idle' }); setConfirmation(''); setSecrets({}); }, []);
  const setSecret = useCallback((field: string, value: string) => {
    setSecrets((prev) => ({ ...prev, [field]: value }));
  }, []);

  return {
    state, confirmation, setConfirmation, secrets, setSecret, request, approve, reset,
    busy: state.phase === 'planning' || state.phase === 'executing',
  };
}

/**
 * The approval card: what will run, what it will do, and the two things the
 * server will refuse without — a typed operation id for a destructive call,
 * and any write-only credential re-entered at the moment of execution.
 */
export function ApprovalGateCard({ gate, onDismiss }: { gate: ApprovalGate; onDismiss: () => void }) {
  const { state } = gate;

  if (state.phase === 'idle') return null;

  if (state.phase === 'planning' || state.phase === 'executing') {
    return (
      <Shell tone="pending">
        <p className="flex items-center gap-2 text-[12.5px] font-[650]" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 size={14} className="animate-spin" style={{ color: 'var(--brand)' }} />
          {state.phase === 'planning'
            ? `Storing an approval for ${state.operation}…`
            : `Running ${state.plan.operation}…`}
        </p>
      </Shell>
    );
  }

  if (state.phase === 'failed') {
    return (
      <Shell tone="danger">
        <p className="flex items-start gap-2 text-[12.5px]" style={{ color: '#b91c1c' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span><strong className="font-[750]">{state.operation}</strong> — {state.message}</span>
        </p>
        <div className="mt-3 flex gap-2">
          <Button variant="outline" onClick={onDismiss}>Dismiss</Button>
          <Button variant="outline" iconLeft={<RefreshCw size={13} />} onClick={() => { gate.reset(); void gate.request(state.operation); }}>
            Prepare again
          </Button>
        </div>
      </Shell>
    );
  }

  if (state.phase === 'done') {
    const body = previewJson(state.result?.data, 1200);
    return (
      <Shell tone="ok">
        <p className="flex items-center gap-2 text-[12.5px] font-[700]" style={{ color: '#047857' }}>
          <CheckCircle2 size={14} /> {state.operation} — done.
        </p>
        {body && (
          <pre className="mt-2 max-h-48 overflow-auto rounded-[10px] p-2.5 text-[10.5px] leading-relaxed"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {body}
          </pre>
        )}
        <div className="mt-3"><Button variant="outline" onClick={onDismiss}>Dismiss</Button></div>
      </Shell>
    );
  }

  // planned
  const { plan } = state;
  const s = plan.summary;
  const secretFields = Array.isArray(s?.secret_fields) ? s.secret_fields : [];
  const needsTyped = plan.safety === 'destructive';
  const typedOk = !needsTyped || gate.confirmation.trim() === plan.operation;
  const requestBody = previewJson(s?.request_body, 2000);

  return (
    <Shell tone={plan.safety === 'destructive' ? 'danger' : 'pending'}>
      <div className="flex flex-wrap items-center gap-2">
        <SafetyBadge safety={plan.safety} />
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>{str(s?.method) ?? ''} {str(s?.path) ?? plan.operation}</span>
      </div>
      <p className="mt-2 text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>{str(s?.summary) ?? plan.operation}</p>
      <p className="mt-0.5 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
        {str(s?.effect) ?? SAFETY_FALLBACK[plan.safety]} · approval {plan.approval_id.slice(0, 8)} expires {fmtWhen(plan.expires_at)}
      </p>

      {requestBody && (
        <>
          <p className="mt-3 mb-1 text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>What will be sent</p>
          <pre className="max-h-52 overflow-auto rounded-[10px] p-2.5 text-[10.5px] leading-relaxed"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            {requestBody}
          </pre>
        </>
      )}

      {secretFields.length > 0 && (
        <>
          <p className="mt-3 mb-1 text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>Re-enter now — never stored</p>
          <div className="flex flex-col gap-2">
            {secretFields.map((field) => (
              <TextInput
                key={field}
                type="password"
                autoComplete="new-password"
                value={gate.secrets[field] ?? ''}
                onChange={(e) => gate.setSecret(field, e.target.value)}
                placeholder={field}
                aria-label={field}
              />
            ))}
          </div>
        </>
      )}

      {needsTyped && (
        <>
          <p className="mt-3 mb-1 text-[10px] font-[750] uppercase" style={{ color: 'var(--text-muted)', letterSpacing: '0.12em' }}>
            Type {plan.operation} to confirm
          </p>
          <TextInput
            value={gate.confirmation}
            onChange={(e) => gate.setConfirmation(e.target.value)}
            placeholder={plan.operation}
            aria-label={`Type ${plan.operation} to confirm`}
            spellCheck={false}
            autoComplete="off"
            className="font-mono"
          />
        </>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          onClick={() => { void gate.approve(); }}
          disabled={!typedOk || (secretFields.length > 0 && secretFields.some((f) => !gate.secrets[f]))}
          className={plan.safety === 'destructive' ? '!bg-[#b91c1c] !text-white hover:!bg-[#991b1b]' : undefined}
        >
          {plan.safety === 'destructive' ? 'Run it' : 'Approve and run'}
        </Button>
        <Button variant="outline" onClick={onDismiss}>Cancel</Button>
      </div>
    </Shell>
  );
}

function Shell({ tone, children }: { tone: 'pending' | 'danger' | 'ok'; children: React.ReactNode }) {
  const border = tone === 'danger' ? 'rgba(185,28,28,0.32)' : tone === 'ok' ? 'rgba(4,120,87,0.30)' : 'var(--border)';
  const bg = tone === 'danger' ? 'rgba(185,28,28,0.05)' : tone === 'ok' ? 'rgba(4,120,87,0.06)' : 'var(--bg-subtle)';
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: bg, border: `1px solid ${border}` }}>
      {children}
    </div>
  );
}

/* ── Honest about what the API cannot do ───────────────────────────────────── */

/**
 * The capability gaps, stated where an operator would otherwise hunt for them.
 *
 * Both of these were checked against the official OpenAPI document rather than
 * assumed: there is no VPS terminal or exec endpoint, and the file endpoints
 * are shared-hosting only. `spec.version` is the revision that claim is about,
 * so the sentence ages into "check revision 2.1.0" rather than into a wrong
 * claim about today.
 */
export function CapabilityGaps({ spec, scope }: { spec?: HostingerCatalogue['spec']; scope: 'estate' | 'vps' }) {
  const revision = spec?.version ? `API v${spec.version}` : 'the API revision this console was built against';
  const lines = scope === 'estate'
    ? [
        'SSH and a shell on a VPS are not part of the Hostinger API, so there is no terminal in this console.',
        'Docker projects, their containers and their logs ARE supported and live on the machine screen.',
        'Website files are reachable for shared hosting only — a VPS filesystem has no API endpoint.',
      ]
    : [
        'There is no terminal or file manager for a VPS in the Hostinger API — no endpoint exists to build one on.',
        'Docker is the supported way in: projects, containers and logs are read here, and running them goes through the approval gate.',
        'VPS metrics need an explicit date window upstream; this screen asks for the last 24 hours.',
      ];
  return (
    <div className="rounded-[14px] p-3.5" style={{ background: 'color-mix(in srgb, var(--brand) 8%, transparent)', border: '1px solid color-mix(in srgb, var(--brand) 24%, transparent)' }}>
      <p className="flex items-start gap-2 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <Info size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} />
        <span>
          <strong style={{ color: 'var(--text-primary)' }}>What this console cannot do</strong>, checked against the official
          Hostinger OpenAPI document ({revision}) rather than inferred:
          <span className="mt-1 block">
            {lines.map((l) => <span key={l} className="mt-1 block">· {l}</span>)}
          </span>
        </span>
      </p>
    </div>
  );
}

/** One line stating where a figure came from, when it is a sample rather than a total. */
export function SampleNote({ text }: { text: string }) {
  return <p className="mt-1 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>{text}</p>;
}
