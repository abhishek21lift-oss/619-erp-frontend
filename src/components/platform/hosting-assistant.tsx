'use client';

// The Hostinger operations assistant — a question box, not a control panel.
//
// ── The assistant is read-only by construction ──────────────────────────────
//
// It answers from the estate snapshot and the operation catalogue, and when the
// right answer is an action it returns a PROPOSAL: an operation id, validated
// parameters and a safety class. It has no execute path, no approval id and no
// way to widen a request — the server will not accept a write from this
// endpoint even if the model asks for one. Pressing "prepare approval" here
// goes through the same gate as every button on the machine screen.
//
// ── What the answer is standing on, said out loud ───────────────────────────
//
// `context_errors` counts the estate areas that could not be read when the
// answer was built. An answer given while the VPS list was unreachable is
// plausible and incomplete, and the difference matters — so it is stated
// beneath the answer rather than left in a log. The same for a fallback answer:
// when no model was reachable, the operator is told that this is the
// deterministic path, not the assistant's own words.

import { useCallback, useState } from 'react';
import { AlertTriangle, Loader2, Play, Send, Sparkles, X } from 'lucide-react';
import { api } from '@/lib/api';
import type { HostingerAssistantAnswer, HostingerSafety } from '@/lib/api';
import { Button, TextArea } from '@/components/ui';
import { Panel, SectionLabel } from './console';
import { ChatMarkdown } from '@/components/fitness/ChatMarkdown';
import { errorMessage } from '@/lib/forms/errors';
import { ApprovalGateCard, SafetyBadge, previewJson, useApprovalGate } from './hosting-shared';

/** Questions an operator actually types. Each one is answerable from the snapshot. */
const SUGGESTIONS = [
  'Is anything wrong with the estate right now?',
  'Which SSL certificates expire soonest?',
  'What is the loaded machine doing, and is it healthy?',
  'Which subscriptions renew in the next 30 days?',
  'Restart the Docker project on the busiest machine',
];

export function HostingAssistant() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<HostingerAssistantAnswer | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const gate = useApprovalGate();

  const ask = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    setError(null);
    setAsked(value);
    gate.reset();
    try {
      setAnswer(await api.superAdmin.hostingerAsk(value));
    } catch (err) {
      setAnswer(null);
      setError(errorMessage(err, 'The assistant could not answer that.'));
    } finally {
      setBusy(false);
    }
  };

  const proposal = answer?.proposal ?? null;
  const rejected = proposal && proposal.rejected === true ? proposal : null;
  const actionable = proposal && !proposal.rejected ? proposal : null;
  const contextErrors = answer?.context_errors ?? 0;

  return (
    <div className="flex flex-col gap-4">
      <Panel>
        <SectionLabel hint="Reads the estate, proposes actions, runs nothing">Ask about the estate</SectionLabel>
        <div className="flex flex-col gap-2">
          <TextArea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter is a newline — the convention every
              // chat box uses, and the reason this is a textarea at all.
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void ask(question); }
            }}
            rows={3}
            placeholder="Is the staging site's SSL about to expire?"
            aria-label="Ask the operations assistant"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} disabled={busy || !question.trim()} onClick={() => { void ask(question); }}>
              Ask
            </Button>
            <p className="text-[11px]" style={{ color: 'var(--text-disabled)' }}>
              Enter sends · Shift+Enter for a new line. Questions are recorded, scrubbed of anything that looks like a token.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => { setQuestion(s); void ask(s); }}
                className="min-h-[32px] rounded-full px-2.5 text-[11px] font-[650] transition hover:opacity-80"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      {error && (
        <p className="flex items-start gap-2 text-[12.5px]" style={{ color: '#b91c1c' }}>
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />{error}
        </p>
      )}

      {answer && (
        <>
          <Panel>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <SectionLabel hint={answer.model ? `model: ${answer.model}` : undefined}>Answer</SectionLabel>
              <div className="flex items-center gap-2 text-[10.5px]" style={{ color: 'var(--text-disabled)' }}>
                {answer.used_fallback && (
                  <span className="rounded-full px-2 py-[3px] font-[750] uppercase" style={{ background: 'rgba(180,83,9,0.10)', color: '#b45309', letterSpacing: '0.06em' }}>
                    deterministic answer — no model was reachable
                  </span>
                )}
                {answer.rate && <span>{answer.rate.used}/{answer.rate.limit} questions this window</span>}
              </div>
            </div>
            {asked && (
              <p className="mb-2 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                You asked: <span style={{ color: 'var(--text-secondary)' }}>{asked}</span>
              </p>
            )}
            <ChatMarkdown content={answer.answer} tone="themed" size={13} />
            <p className="mt-2 text-[11px]" style={{ color: contextErrors ? '#b45309' : 'var(--text-disabled)' }}>
              {contextErrors
                ? `${contextErrors} area${contextErrors === 1 ? '' : 's'} of the estate could not be read while this answer was built — treat it as incomplete.`
                : 'Built from a full read of the estate: websites, domains, machines, billing and firewalls.'}
            </p>
          </Panel>

          {rejected && (
            <Panel>
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]" style={{ background: 'rgba(180,83,9,0.10)', color: '#b45309' }}>
                  <X size={15} />
                </span>
                <div className="min-w-0">
                  <p className="text-[13px] font-[800]" style={{ color: 'var(--text-primary)' }}>The assistant would not turn that into an operation</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{rejected.reason}</p>
                  {rejected.fields && Object.keys(rejected.fields).length > 0 && (
                    <div className="mt-2">
                      {Object.entries(rejected.fields).map(([field, message]) => (
                        <p key={field} className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                          <span className="font-mono">{field}</span> — {message}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Panel>
          )}

          {actionable && (
            <Panel>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <SectionLabel hint={`${actionable.operation} · API ${actionable.safety === 'read' ? 'READ' : 'WRITE'}`}>Proposed operation</SectionLabel>
                <SafetyBadge safety={actionable.safety as HostingerSafety} />
              </div>
              <p className="text-[13px] font-[700]" style={{ color: 'var(--text-primary)' }}>{actionable.summary}</p>
              {actionable.note && <p className="mt-1 text-[12px]" style={{ color: 'var(--text-muted)' }}>{actionable.note}</p>}

              <pre className="mt-2 max-h-40 overflow-auto rounded-[10px] p-2.5 text-[10.5px] leading-relaxed"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                {previewJson(actionable.params, 1500) || '{}'}
              </pre>

              {actionable.secret_fields.length > 0 && (
                <p className="mt-2 text-[11.5px]" style={{ color: '#b45309' }}>
                  Needs {actionable.secret_fields.join(', ')} — you enter {actionable.secret_fields.length === 1 ? 'it' : 'them'} on the approval card. The assistant never handles credentials.
                </p>
              )}

              {actionable.safety === 'read' ? (
                <p className="mt-3 text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                  This one is a read — run it from the estate screen&rsquo;s catalogue, where the answer is shown next to its subject.
                </p>
              ) : gate.state.phase === 'idle' ? (
                <Button className="mt-3" iconLeft={<Play size={14} />}
                  onClick={() => { void gate.request(actionable.operation, actionable.params); }}>
                  Prepare the approval
                </Button>
              ) : null}
            </Panel>
          )}

          {gate.state.phase !== 'idle' && (
            <ApprovalGateCard gate={gate} onDismiss={gate.reset} />
          )}
        </>
      )}

      {!answer && !error && !busy && (
        <Panel>
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            <Sparkles size={15} className="mt-0.5 shrink-0" style={{ color: 'var(--brand)' }} />
            <span>
              The assistant reads the same snapshot the estate screen shows and knows every operation this console may call.
              It answers questions about the estate, and for anything that changes it, it hands you an operation to review —
              the approval gate still stands between the suggestion and the API.
            </span>
          </p>
        </Panel>
      )}
    </div>
  );
}

export default HostingAssistant;
