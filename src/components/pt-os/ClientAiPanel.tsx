'use client';
//
// Ask AI — the conversational assistant for ONE client, opened from that
// client's profile.
//
// Distinct from AiCoachPanel, which generates artefacts (a workout, a diet) and
// picks its own client. This answers questions about the client already on
// screen, and cannot generate or change anything. Two different jobs; merging
// them would mean one component with two modes and two sets of failure states.
//
// The client is fixed by the page and is never selectable here. That is
// deliberate: a picker inside this panel would imply the panel decides what you
// may read, and it does not — the service re-authorises the id against the
// caller's own session on every single turn.

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { m } from 'framer-motion';
import {
  Sparkles, X, Send, Loader2, AlertTriangle, User, Database,
} from 'lucide-react';
import { Button } from '@/components/ui';
import {
  streamClientAi, ClientAiError, SUGGESTED_QUESTIONS,
  type ClientAiTurn, type ClientAiGrounding,
} from '@/lib/client-ai';
import { useDialogA11y } from '@/hooks/useDialogA11y';

interface Msg extends ClientAiTurn {
  id: string;
  /** Retrieval provenance, assistant turns only. */
  tools?: string[];
  unavailable?: { tool: string; reason: string }[];
  failed?: boolean;
  /** Still being written. Drives the caret, and suppresses the provenance
   *  chips until there is an answer for them to be provenance for. */
  streaming?: boolean;
  /** Written, but stopped short. The text is kept — it is real and the trainer
   *  is already reading it — with a line saying not to treat it as complete. */
  truncated?: boolean;
  /** The service's check of this answer's figures against the client's records. */
  grounding?: ClientAiGrounding;
}

/** `getClientTrainingBrief` → `training brief`. */
function toolLabel(name: string): string {
  return name
    .replace(/^getClient/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
}

export default function ClientAiPanel({
  clientId, clientName, onClose,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputId = useId();

  // Abort in flight work when the panel closes or the client changes, so a
  // slow answer about Rahul cannot land in a panel now showing Priya.
  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setDraft('');
    setBusy(false);
  }, [clientId]);

  useEffect(() => {
    // Instant while streaming: a smooth scroll re-triggered on every token
    // spends its whole life interrupting itself and never reaches the bottom.
    const streaming = messages.some((msg) => msg.streaming);
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: streaming ? 'auto' : 'smooth',
    });
  }, [messages, busy]);

  // Escape, focus trap and focus restore, replacing a bespoke Escape listener.
  // The panel declared aria-modal while Tab walked out of it into the page
  // behind, and closing dropped focus to the top of the document.
  const dialogRef = useDialogA11y({ open: true, onClose });

  const send = useCallback(async (text: string) => {
    const question = text.trim();
    if (!question || busy) return;

    const userMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: question };
    // Captured BEFORE the optimistic append: history is what preceded this
    // question, and including it would send the question twice.
    const priorHistory = messages.map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMsg]);
    setDraft('');
    setBusy(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // One id for the whole answer, minted before the first token: every update
    // below targets it, so a second question started while this one is still
    // writing cannot overwrite the wrong bubble.
    const answerId = `a-${Date.now()}`;
    const patch = (fields: Partial<Msg>) => setMessages(
      (prev) => prev.map((msg) => (msg.id === answerId ? { ...msg, ...fields } : msg)),
    );

    try {
      const res = await streamClientAi(
        { clientId, message: question, history: priorHistory },
        {
          // Retrieval is done and the model is writing. The bubble appears now,
          // empty, because an empty bubble that is about to fill reads as
          // progress where a spinner reads as a wait.
          onStart: (start) => setMessages((prev) => [...prev, {
            id: answerId,
            role: 'assistant',
            content: '',
            tools: start.toolsUsed,
            unavailable: start.toolsUnavailable,
            streaming: true,
          }]),
          onText: (text) => patch({ content: text }),
        },
        controller.signal,
      );
      patch({
        content: res.message,
        tools: res.toolsUsed,
        unavailable: res.toolsUnavailable,
        grounding: res.grounding,
        streaming: false,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const partial = err instanceof ClientAiError && err.partial;
      if (partial) {
        // Keep what arrived, flag it. Deleting text the trainer has already
        // read to replace it with "something went wrong" is the worse outcome.
        patch({ streaming: false, truncated: true });
      } else {
        setMessages((prev) => [...prev.filter((msg) => msg.id !== answerId), {
          id: `e-${Date.now()}`,
          role: 'assistant',
          failed: true,
          content: err instanceof ClientAiError ? err.message : 'Something went wrong.',
        }]);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }, [busy, clientId, messages]);

  // The spinner belongs to the retrieval phase only. Once text is arriving, the
  // text itself is the progress indicator and a second one is just noise.
  const waiting = busy && !messages.some((msg) => msg.streaming);

  return (
    <div
      // usePullToRefresh listens on window and claims any downward drag while
      // scrollY is 0. Without this, dragging the transcript at the top of its
      // own scroll pulls the whole page down BEHIND the open panel.
      ref={dialogRef}
      data-no-pull-refresh
      className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Ask AI about ${clientName}`}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 cursor-default"
        style={{ background: 'rgba(8,12,20,0.55)', backdropFilter: 'blur(2px)' }}
      />

      <m.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="relative flex h-[86vh] w-full max-w-[620px] flex-col overflow-hidden rounded-t-[22px] sm:h-[76vh] sm:rounded-[22px]"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg, 0 24px 64px rgba(0,0,0,0.28))' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: '1px solid var(--border)' }}>
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
            style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)' }}
          >
            <Sparkles size={16} className="text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-[780] leading-tight" style={{ color: 'var(--text-primary)' }}>
              Client AI
            </p>
            <p className="truncate text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
              {clientName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Client AI"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] transition-colors hover:bg-[var(--bg-hover)]"
            style={{ border: '1px solid var(--border)' }}
          >
            <X size={15} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        {/* Transcript */}
        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-6 text-center">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-full"
                style={{ background: 'rgba(0,103,224,0.12)' }}
              >
                <Sparkles size={20} style={{ color: '#0067e0' }} />
              </div>
              <div>
                <p className="text-[14px] font-[750]" style={{ color: 'var(--text-primary)' }}>
                  Ask about {clientName}
                </p>
                <p className="mx-auto mt-1 max-w-[42ch] text-[12px]" style={{ color: 'var(--text-muted)' }}>
                  Answers come from this client&rsquo;s records. The assistant reads only &mdash; it cannot change anything.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-[12px] px-3.5 py-2.5 text-left text-[12.5px] font-[620] transition-colors hover:bg-[var(--bg-hover)]"
                    style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={msg.role === 'user' ? 'flex justify-end' : ''}>
                {msg.role === 'user' ? (
                  <div
                    className="max-w-[85%] rounded-[14px] rounded-br-[4px] px-3.5 py-2.5 text-[12.5px] font-[560]"
                    style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff' }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div
                    className="rounded-[14px] rounded-bl-[4px] px-3.5 py-3"
                    style={{
                      background: msg.failed ? 'rgba(239,68,68,0.08)' : 'var(--bg-subtle)',
                      border: `1px solid ${msg.failed ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                    }}
                  >
                    {msg.failed && (
                      <div className="mb-1.5 flex items-center gap-1.5">
                        <AlertTriangle size={12} style={{ color: '#ef4444' }} />
                        <span className="text-[11px] font-[700]" style={{ color: '#ef4444' }}>
                          Couldn&rsquo;t answer
                        </span>
                      </div>
                    )}
                    <p
                      className="whitespace-pre-wrap text-[12.5px] leading-relaxed"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {msg.content}
                      {msg.streaming && (
                        <span
                          aria-hidden
                          className="ml-0.5 inline-block animate-pulse align-baseline"
                          style={{ width: 2, height: '0.95em', background: '#0067e0' }}
                        />
                      )}
                    </p>
                    {/* The bubble is empty for the first second or two. Say what
                        is happening rather than showing a blank box. */}
                    {msg.streaming && !msg.content && (
                      <span className="sr-only">Writing an answer</span>
                    )}

                    {msg.truncated && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[10.5px] font-[700]" style={{ color: '#f59e0b' }}>
                        <AlertTriangle size={11} />
                        Stopped before it finished — treat this as incomplete.
                      </p>
                    )}

                    {/* Figures the service could not find in this client's
                        records. Named individually rather than counted: a
                        trainer needs to know WHICH number to distrust, and a
                        bare "1 unverified figure" makes them re-read the whole
                        answer to guess at it. */}
                    {!!msg.grounding?.figures.length && (
                      <div
                        className="mt-2.5 rounded-[10px] px-2.5 py-2"
                        style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.30)' }}
                      >
                        <p className="flex items-center gap-1.5 text-[10.5px] font-[750]" style={{ color: '#b45309' }}>
                          <AlertTriangle size={11} />
                          Not found in {clientName}&rsquo;s records:{' '}
                          {msg.grounding.figures.map((f) => f.text).join(', ')}
                        </p>
                        <p className="mt-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Check {msg.grounding.figures.length === 1 ? 'this figure' : 'these figures'} against the record before acting on {msg.grounding.figures.length === 1 ? 'it' : 'them'}.
                        </p>
                      </div>
                    )}

                    {/* Provenance. A trainer acting on this deserves to know
                        which records it rests on — and which it could not read,
                        because a silent gap reads as "there is nothing there". */}
                    {!!msg.tools?.length && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                        <Database size={10} style={{ color: 'var(--text-muted)' }} />
                        {msg.tools.map((t) => (
                          <span
                            key={t}
                            className="rounded-full px-2 py-0.5 text-[9.5px] font-[700] uppercase tracking-wide"
                            style={{ background: 'rgba(0,103,224,0.10)', color: '#0067e0' }}
                          >
                            {toolLabel(t)}
                          </span>
                        ))}
                      </div>
                    )}
                    {!!msg.unavailable?.length && (
                      <p className="mt-1.5 text-[10.5px] font-[600]" style={{ color: '#f59e0b' }}>
                        Couldn&rsquo;t read: {msg.unavailable.map((u) => toolLabel(u.tool)).join(', ')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {waiting && (
              <div className="flex items-center gap-2 px-1 py-2">
                <Loader2 size={13} className="animate-spin" style={{ color: '#0067e0' }} />
                <span className="text-[11.5px] font-[600]" style={{ color: 'var(--text-muted)' }}>
                  Reading {clientName}&rsquo;s records&hellip;
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <form
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderTop: '1px solid var(--border)' }}
          onSubmit={(e) => { e.preventDefault(); send(draft); }}
        >
          <label htmlFor={inputId} className="sr-only">
            Ask a question about {clientName}
          </label>
          <input
            id={inputId}
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask anything…"
            disabled={busy}
            autoComplete="off"
            className="min-w-0 flex-1 rounded-[12px] px-3.5 text-[12.5px] outline-none"
            style={{
              minHeight: 44,
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          <Button
            type="submit"
            disabled={busy || !draft.trim()}
            aria-label="Send"
            iconLeft={busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            style={{ background: 'linear-gradient(135deg, #0067e0, #0059ce)', color: '#fff', minHeight: 44 }}
          >
            Send
          </Button>
        </form>

        <p
          className="flex items-center justify-center gap-1.5 px-4 pb-3 text-[10px]"
          style={{ color: 'var(--text-muted)' }}
        >
          <User size={9} />
          Read-only. Always check important details against the record.
        </p>
      </m.div>
    </div>
  );
}
