'use client';

// Command Center — the AI Guardian.
//
// Correlations across cards, with a confidence you can argue with.
//
// ── The design problem ──────────────────────────────────────────────────────
//
// A panel that says "worker starvation — 87% confident" and nothing else is
// asking the operator to trust a number they cannot check, at the worst moment
// to be asking for trust. Under pressure they will either believe it blindly or
// ignore it entirely, and both are bad outcomes.
//
// So the evidence is the panel, and the confidence bar is its caption. Every
// finding shows what fired, and — the part most versions leave out — what
// COULD NOT BE CHECKED. "Redis is healthy, so the queue backend is not the
// cause" is a load-bearing piece of the worker-starvation diagnosis; if Redis
// could not be probed, the operator needs to see that gap rather than just a
// slightly smaller number.
//
// ── The AI's place on this screen ───────────────────────────────────────────
//
// The diagnosis is deterministic and arrives with the page. Narration is a
// button, it costs a request, and what it produces is visibly labelled as
// machine-written and visually separated from the rule's own conclusion. It can
// never appear where the conclusion goes, because the moment those two look
// alike the operator can no longer tell which one to trust.

import { useCallback, useEffect, useState } from 'react';
import { m } from 'framer-motion';
import {
  AlertTriangle, Brain, Check, ChevronDown, ChevronUp, HelpCircle,
  Lightbulb, Minus, ShieldCheck, Sparkles, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { semantic, rgba } from '@/lib/palette';
import type { GuardianFinding, GuardianReport, GuardianNarration } from '@/lib/api';

const POLL_MS = 20_000;

const SEVERITY: Record<string, { color: string; label: string; Icon: typeof XCircle }> = {
  critical: { color: semantic.danger, label: 'Critical', Icon: XCircle },
  warning: { color: semantic.warning, label: 'Warning', Icon: AlertTriangle },
  info: { color: semantic.primary, label: 'Note', Icon: Lightbulb },
};

/** Confidence, in words. The number alone invites false precision. */
function confidenceLabel(c: number): string {
  if (c >= 0.85) return 'Strong evidence';
  if (c >= 0.65) return 'Good evidence';
  if (c >= 0.45) return 'Partial evidence';
  return 'Weak evidence';
}

function EvidenceLine({ kind, text }: { kind: 'fired' | 'absent' | 'unchecked'; text: string }) {
  const icon = kind === 'fired'
    ? <Check size={11} color={semantic.success} className="mt-[3px] flex-shrink-0" />
    : kind === 'absent'
      ? <Minus size={11} color={semantic.muted} className="mt-[3px] flex-shrink-0" />
      : <HelpCircle size={11} color={semantic.warning} className="mt-[3px] flex-shrink-0" />;

  return (
    <li className="flex gap-1.5 text-[11.5px] leading-snug"
      style={{ color: kind === 'fired' ? 'var(--text-secondary)' : 'var(--text-tertiary)' }}>
      {icon}
      <span>{text}</span>
    </li>
  );
}

function FindingCard({ finding }: { finding: GuardianFinding }) {
  const [open, setOpen] = useState(finding.severity === 'critical');
  const [narration, setNarration] = useState<GuardianNarration | null>(null);
  const [asking, setAsking] = useState(false);

  const tone = SEVERITY[finding.severity] ?? SEVERITY.warning;
  const { Icon } = tone;
  const pct = Math.round(finding.confidence * 100);
  const { evidence } = finding;

  const explain = useCallback(async () => {
    setAsking(true);
    try {
      const res = await api.superAdmin.explainGuardianFinding(finding.id);
      setNarration(res.data);
    } catch (e: unknown) {
      setNarration({
        finding_id: finding.id,
        narration: null,
        unavailable_reason: e instanceof Error ? e.message : 'Narration failed',
      });
    } finally {
      setAsking(false);
    }
  }, [finding.id]);

  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-[14px] p-3.5"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        boxShadow: `inset 3px 0 0 0 ${tone.color}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 flex-shrink-0 place-items-center rounded-[9px]"
            style={{ background: rgba(tone.color, 0.10) }}>
            <Icon size={14} color={tone.color} />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-[750]" style={{ color: 'var(--text-primary)' }}>
              {finding.title}
            </p>
            {/* The rule's own words. Never mixed with anything a model wrote. */}
            <p className="mt-1 text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {finding.conclusion}
            </p>
          </div>
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Hide evidence' : 'Show evidence'}
          className="flex-shrink-0 rounded-[8px] p-1.5"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-tertiary)' }}
        >
          {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {/* Confidence as a bar with a worded label. The bar is the caption to the
          evidence below it, not a claim standing on its own. */}
      <div className="mt-3 flex items-center gap-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--bg-subtle)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: tone.color }} />
        </div>
        <span className="flex-shrink-0 text-[10.5px] font-[700] tabular-nums" style={{ color: 'var(--text-tertiary)' }}>
          {confidenceLabel(finding.confidence)} · {pct}%
        </span>
      </div>

      {open && (
        <div className="mt-3 space-y-3 rounded-[10px] px-3 py-2.5" style={{ background: 'var(--bg-subtle)' }}>
          <div>
            <p className="mb-1 text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
              Why this fired
            </p>
            <ul className="space-y-1">
              {evidence.triggers.map((e) => <EvidenceLine key={e.key} kind="fired" text={e.detail} />)}
              {evidence.supporting.map((e) => <EvidenceLine key={e.key} kind="fired" text={e.detail} />)}
            </ul>
          </div>

          {evidence.absent.length > 0 && (
            <div>
              <p className="mb-1 text-[10px] font-[700] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>
                Checked, not present
              </p>
              <ul className="space-y-1">
                {evidence.absent.map((e) => <EvidenceLine key={e.key} kind="absent" text={e.detail} />)}
              </ul>
            </div>
          )}

          {evidence.unchecked.length > 0 && (
            <div>
              {/* The section most versions of this screen omit, and the reason
                  the confidence is lower than it looks like it should be. */}
              <p className="mb-1 text-[10px] font-[700] uppercase tracking-wide" style={{ color: semantic.warning }}>
                Could not be checked — confidence reduced
              </p>
              <ul className="space-y-1">
                {evidence.unchecked.map((e) => <EvidenceLine key={e.key} kind="unchecked" text={e.detail} />)}
              </ul>
            </div>
          )}

          {finding.advice && (
            <p className="flex gap-1.5 text-[11.5px] leading-snug" style={{ color: 'var(--text-secondary)' }}>
              <Lightbulb size={12} className="mt-[2px] flex-shrink-0" color={semantic.warning} />
              {finding.advice}
            </p>
          )}

          {finding.recommend.length > 0 && (
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {/* Advisory, and labelled as such. The Guardian never runs
                  anything — the commands are below, and a human presses them. */}
              Suggested next, in the Commands panel below:{' '}
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                {finding.recommend.join(' → ')}
              </span>
              {finding.recovery && ' (or One Click Recovery)'}
            </p>
          )}
        </div>
      )}

      {/* Narration lives here, at the bottom, behind a button, visibly labelled
          — never where the conclusion goes. */}
      <div className="mt-3">
        {!narration && (
          <button
            onClick={explain}
            disabled={asking}
            className="flex items-center gap-1.5 rounded-[9px] px-2.5 py-1.5 text-[11.5px] font-[650] disabled:opacity-50"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            <Sparkles size={11} />
            {asking ? 'Asking…' : 'Ask AI what to do first'}
          </button>
        )}

        {narration?.narration && (
          <div className="rounded-[10px] px-3 py-2.5"
            style={{ background: rgba(semantic.primary, 0.06), border: `1px dashed ${rgba(semantic.primary, 0.35)}` }}>
            <p className="mb-1 flex items-center gap-1 text-[10px] font-[700] uppercase tracking-wide"
              style={{ color: semantic.primary }}>
              <Sparkles size={10} />
              AI-written · advisory
            </p>
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              {narration.narration}
            </p>
          </div>
        )}

        {narration && !narration.narration && (
          <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
            {/* The finding is unaffected — the deterministic text above is what
                matters, and this was only ever a garnish. */}
            {narration.unavailable_reason ?? 'Narration unavailable.'} The diagnosis above stands on its own.
          </p>
        )}
      </div>
    </m.div>
  );
}

export default function Guardian() {
  const [report, setReport] = useState<GuardianReport | null>(null);
  const [error, setError] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.superAdmin.commandCenterGuardian();
      setReport(res.data);
      setError('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load the Guardian');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    const tick = () => { if (alive) load(); };
    tick();
    const id = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(id); };
  }, [load]);

  if (error) {
    return (
      <p className="rounded-[12px] px-3 py-2 text-[11.5px]"
        style={{ background: rgba(semantic.danger, 0.08), color: semantic.danger }}>
        {error}
      </p>
    );
  }

  if (!report) {
    return <div className="h-[52px] animate-pulse rounded-[14px]"
      style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }} />;
  }

  const { findings } = report;
  const clean = findings.length === 0;

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-3.5 py-2.5"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-[10px]"
            style={{ background: clean ? rgba(semantic.success, 0.10) : rgba(semantic.primary, 0.10) }}>
            {clean
              ? <ShieldCheck size={15} color={semantic.success} />
              : <Brain size={15} color={semantic.primary} />}
          </span>
          <div>
            <p className="text-[14px] font-[800]" style={{ color: 'var(--text-primary)' }}>
              AI Guardian
            </p>
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              {/* "Ran and matched nothing" is a different claim from "did not
                  run", and the operator is told which. */}
              {clean
                ? report.note ?? `${report.rules_evaluated} correlation rules ran; none matched`
                : `${findings.length} finding${findings.length === 1 ? '' : 's'} from ${report.rules_evaluated} correlation rules`}
            </p>
          </div>
        </div>

        {!clean && (
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[650]"
            style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {collapsed ? 'Show' : 'Hide'}
            {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
          </button>
        )}
      </div>

      {!collapsed && findings.map((f) => <FindingCard key={f.id} finding={f} />)}
    </div>
  );
}
