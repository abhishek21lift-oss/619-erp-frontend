'use client';

/**
 * The assistant itself: a bottom sheet on a phone, a floating panel on a
 * desktop, the same component either way.
 *
 * It is one component and not two because the difference is entirely
 * positional — where it sits, which edge it animates from, how its corners are
 * rounded. Splitting it would duplicate the input, the action grid, the
 * streaming view and the history for the sake of four style values.
 *
 * Notes on things that are easy to get wrong here:
 *
 *   data-no-pull-refresh. This is a fixed overlay and the app's pull-to-refresh
 *   listens on window. Without the attribute, dragging down inside the sheet
 *   pulls the page behind it. There is a guard test that fails if a new overlay
 *   is added without it.
 *
 *   Body scroll lock. An open sheet over a scrollable page on iOS scrolls the
 *   page underneath, and the sheet appears to drift. Locking on open and
 *   restoring the exact previous value on close is the part people skip.
 *
 *   The answer view replaces the grid rather than pushing it down. A sheet that
 *   grows while text streams into it moves the thing you are reading.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  ArrowUp, ChevronLeft, Loader2, Mic, MicOff, Sparkles, Square, X,
} from 'lucide-react';
import { AI_INPUT_EXAMPLES, actionsForPath, resolveHref, type AiAction } from '@/lib/ai-actions';
import { AiStreamError, streamAiChat } from '@/lib/ai-stream';
import { useVoiceInput } from '@/lib/use-voice-input';
import { api } from '@/lib/api';
import type { AiActionPlan, AiActionResult, AiConversation } from '@/lib/api';
import { useDialogA11y } from '@/hooks/useDialogA11y';
import ActionConfirmView from './ActionConfirmView';

const EASE = [0.16, 1, 0.3, 1] as const;

/** Follow-ups offered under an answer. Deliberately generic: they are
 *  conversation moves that make sense after any answer, not fake knowledge
 *  about what the model just said. */
const FOLLOW_UPS = [
  'Who should I contact first?',
  'Draft a message for them.',
  'Show me the numbers behind this.',
];

export default function AiCommandCenter({
  open, onClose, pathname, clientId, reducedMotion,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string | null;
  clientId: string | null;
  reducedMotion: boolean;
}) {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [asked, setAsked] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [recent, setRecent] = useState<AiConversation[]>([]);
  const [exampleIdx, setExampleIdx] = useState(0);
  // The confirm flow. `plan` is what the operator is being asked to approve;
  // `result` is what actually happened. Both null = the normal grid.
  const [plan, setPlan] = useState<AiActionPlan | null>(null);
  const [planning, setPlanning] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AiActionResult | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);

  const voice = useVoiceInput((text) => setInput(text));
  const actions = useMemo(() => actionsForPath(pathname), [pathname]);

  /* ── Body scroll lock ─────────────────────────────────────────────── */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  /* ── Escape closes ────────────────────────────────────────────────── */
  // Escape, focus trap and focus restore, replacing a bespoke Escape listener.
  // The panel declared aria-modal while Tab walked out of it into the page
  // behind, and closing dropped focus to the top of the document.
  const dialogRef = useDialogA11y({ open, onClose });

  /* ── Recent conversations, refreshed each time it opens ───────────── */
  useEffect(() => {
    if (!open) return;
    let alive = true;
    api.ai.conversations({ limit: 4 })
      .then((r) => { if (alive) setRecent(r?.data ?? []); })
      .catch(() => { /* history is a nicety; its absence is not an error */ });
    return () => { alive = false; };
  }, [open]);

  /* ── Rotating placeholder ─────────────────────────────────────────── */
  useEffect(() => {
    if (!open || reducedMotion || answer !== null) return;
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % AI_INPUT_EXAMPLES.length), 3600);
    return () => clearInterval(t);
  }, [open, reducedMotion, answer]);

  /* ── Abandon an in-flight stream when the panel closes ────────────── */
  useEffect(() => {
    if (!open) abortRef.current?.abort();
  }, [open]);

  const ask = useCallback(async (question: string) => {
    const q = question.trim();
    if (!q || streaming) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAsked(q);
    setAnswer('');
    setErrorMsg(null);
    setStreaming(true);
    setInput('');
    if (voice.listening) voice.stop();

    try {
      await streamAiChat(
        { message: q, conversationId, clientId, signal: controller.signal },
        {
          onText: setAnswer,
          onConversationId: setConversationId,
        },
      );
    } catch (err) {
      setErrorMsg(err instanceof AiStreamError ? err.message : 'Something went wrong.');
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [streaming, conversationId, clientId, voice]);

  /** Ask the server what this action WOULD do. Read-only; nothing is sent. */
  const proposeAction = useCallback(async (action: AiAction) => {
    if (!action.actionId) return;
    setPlanning(action.id);
    setActionError(null);
    setResult(null);
    try {
      const r = await api.ai.actionPlan(action.actionId);
      setPlan(r.data);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not prepare that action.');
    } finally {
      setPlanning(null);
    }
  }, []);

  /** The only path that sends anything, and it needs a plan the operator has
   *  just been shown. A stale plan comes back 409 and re-proposes rather than
   *  sending to a list nobody approved. */
  const confirmAction = useCallback(async () => {
    if (!plan || running) return;
    setRunning(true);
    setActionError(null);
    try {
      const r = await api.ai.actionExecute(plan.action_id, plan.plan_id);
      setResult(r.data);
      setPlan(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'That action could not be run.';
      setActionError(msg);
      // The list moved underneath them. Re-propose so they approve what is
      // true now rather than retrying against what was true a minute ago.
      if (/changed since/i.test(msg)) {
        try {
          const fresh = await api.ai.actionPlan(plan.action_id);
          setPlan(fresh.data);
        } catch { setPlan(null); }
      }
    } finally {
      setRunning(false);
    }
  }, [plan, running]);

  const runAction = useCallback((action: AiAction) => {
    if (action.kind === 'execute') { proposeAction(action); return; }
    if (action.kind === 'route') {
      const href = resolveHref(action, clientId);
      if (href) { onClose(); router.push(href); return; }
    }
    if (action.prompt) ask(action.prompt);
  }, [clientId, onClose, router, ask, proposeAction]);

  const openConversation = useCallback(async (id: string) => {
    try {
      const r = await api.ai.conversation(id);
      const msgs = r?.data?.messages ?? [];
      const lastUser = [...msgs].reverse().find((m2) => m2.role === 'user');
      const lastReply = [...msgs].reverse().find((m2) => m2.role === 'assistant');
      setConversationId(id);
      setAsked(lastUser?.content ?? r?.data?.title ?? 'Earlier conversation');
      setAnswer(lastReply?.content ?? '');
      setErrorMsg(null);
    } catch {
      setErrorMsg('That conversation could not be opened.');
    }
  }, []);

  const back = () => {
    abortRef.current?.abort();
    setAnswer(null);
    setAsked(null);
    setErrorMsg(null);
    setStreaming(false);
    setPlan(null);
    setResult(null);
    setActionError(null);
  };

  // Keep the newest text in view while it streams.
  useEffect(() => {
    if (streaming && answerRef.current) {
      answerRef.current.scrollTop = answerRef.current.scrollHeight;
    }
  }, [answer, streaming]);

  const showAnswer = answer !== null;
  const showAction = plan !== null || result !== null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Scrim */}
          <m.div
            key="ai-scrim"
            data-no-pull-refresh
            className="fixed inset-0 z-[130]"
            style={{ background: 'rgba(2,6,23,0.44)', backdropFilter: 'blur(3px)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.2 }}
            onClick={onClose}
          />

          <m.div
            key="ai-panel"
            ref={dialogRef}
            data-no-pull-refresh
            role="dialog"
            aria-modal="true"
            aria-label="AI assistant"
            className="fixed inset-x-0 bottom-0 z-[140] flex max-h-[86dvh] flex-col overflow-hidden rounded-t-[26px] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:max-h-[min(640px,80dvh)] sm:w-[420px] sm:rounded-[24px]"
            initial={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0.6 }}
            animate={reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reducedMotion ? { opacity: 0 } : { y: '100%', opacity: 0.4 }}
            transition={{ duration: reducedMotion ? 0 : 0.34, ease: EASE }}
            style={{
              background: 'rgba(255,255,255,0.86)',
              backdropFilter: 'blur(30px) saturate(180%)',
              WebkitBackdropFilter: 'blur(30px) saturate(180%)',
              border: '1px solid rgba(255,255,255,0.55)',
              boxShadow: '0 -24px 60px rgba(2,6,23,0.24), 0 20px 60px rgba(2,6,23,0.24)',
              paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            }}
          >
            {/* The processing glow. Only while streaming, and only a moving
                gradient line — a whole panel that pulses is a distraction to
                read against. */}
            {streaming && !reducedMotion && (
              <m.span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                style={{
                  background: 'linear-gradient(90deg, transparent, #0067e0, #7fb4ff, transparent)',
                  backgroundSize: '50% 100%',
                }}
                animate={{ backgroundPosition: ['-50% 0%', '150% 0%'] }}
                transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
              />
            )}

            {/* ── Header ── */}
            <div className="flex shrink-0 items-center gap-2.5 px-4 pb-2 pt-3.5">
              <span className="sm:hidden absolute left-1/2 top-1.5 h-1 w-9 -translate-x-1/2 rounded-full"
                style={{ background: 'rgba(15,23,42,0.18)' }} aria-hidden />
              {(showAnswer || showAction) ? (
                <button type="button" onClick={back} aria-label="Back to actions"
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ background: 'rgba(15,23,42,0.06)' }}>
                  <ChevronLeft size={16} style={{ color: '#0f172a' }} />
                </button>
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-[11px]"
                  style={{ background: 'linear-gradient(135deg,#0067e0,#003f87)' }}>
                  <Sparkles size={15} className="text-white" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13.5px] font-[800] tracking-[-0.01em]" style={{ color: '#0f172a' }}>
                  {plan ? plan.title : result ? 'Done' : showAnswer ? asked : 'AI Assistant'}
                </p>
                {!showAnswer && !showAction && (
                  <p className="text-[10.5px] font-[600]" style={{ color: '#64748b' }}>
                    Ask anything, or pick a shortcut
                  </p>
                )}
              </div>
              <button type="button" onClick={onClose} aria-label="Close AI assistant"
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ background: 'rgba(15,23,42,0.06)' }}>
                <X size={15} style={{ color: '#0f172a' }} />
              </button>
            </div>

            {/* ── Smart input ── */}
            <div className="shrink-0 px-4 pb-2.5">
              <div className="flex items-end gap-2 rounded-[16px] px-3 py-2"
                style={{ background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(15,23,42,0.10)' }}>
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); ask(input); }
                  }}
                  placeholder={voice.listening ? 'Listening…' : `Ask AI anything… ${AI_INPUT_EXAMPLES[exampleIdx]}`}
                  aria-label="Ask AI anything"
                  className="max-h-24 flex-1 resize-none bg-transparent py-1 text-[13px] font-[560] outline-none placeholder:text-[#94a3b8]"
                  style={{ color: '#0f172a' }}
                />
                {voice.supported && (
                  <button type="button" onClick={voice.toggle}
                    aria-label={voice.listening ? 'Stop dictation' : 'Dictate a question'}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors"
                    style={{
                      background: voice.listening ? 'rgba(239,68,68,0.14)' : 'rgba(15,23,42,0.06)',
                      color: voice.listening ? '#dc2626' : '#475569',
                    }}>
                    {voice.listening ? <MicOff size={14} /> : <Mic size={14} />}
                  </button>
                )}
                <button type="button"
                  onClick={() => (streaming ? abortRef.current?.abort() : ask(input))}
                  disabled={!streaming && !input.trim()}
                  aria-label={streaming ? 'Stop' : 'Send'}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-35"
                  style={{ background: 'linear-gradient(135deg,#0067e0,#003f87)' }}>
                  {streaming ? <Square size={12} fill="currentColor" /> : <ArrowUp size={15} />}
                </button>
              </div>
              {voice.error && (
                <p className="mt-1 px-1 text-[10.5px] font-[600]" style={{ color: '#dc2626' }}>{voice.error}</p>
              )}
            </div>

            {/* ── Body ── */}
            <div ref={answerRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
              {showAction ? (
                <ActionConfirmView
                  plan={plan}
                  result={result}
                  running={running}
                  error={actionError}
                  onConfirm={confirmAction}
                  onCancel={back}
                />
              ) : showAnswer ? (
                <>
                  {answer === '' && streaming && (
                    <div className="flex items-center gap-2 py-6" style={{ color: '#64748b' }}>
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-[12px] font-[620]">Thinking…</span>
                    </div>
                  )}
                  {answer !== '' && (
                    <p className="whitespace-pre-wrap text-[13px] font-[520] leading-[1.62]" style={{ color: '#1e293b' }}>
                      {answer}
                    </p>
                  )}
                  {errorMsg && (
                    <p className="mt-3 rounded-[12px] px-3 py-2 text-[12px] font-[620]"
                      style={{ background: 'rgba(239,68,68,0.10)', color: '#b91c1c' }}>
                      {errorMsg}
                    </p>
                  )}
                  {!streaming && answer && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[9.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
                        Next
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {FOLLOW_UPS.map((f) => (
                          <button key={f} type="button" onClick={() => ask(f)}
                            className="rounded-full px-2.5 py-1.5 text-[11.5px] font-[650] transition-colors"
                            style={{ background: 'rgba(0,103,224,0.09)', color: '#0067e0' }}>
                            {f}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    {actions.map((a) => (
                      <button key={a.id} type="button" onClick={() => runAction(a)}
                        disabled={planning !== null}
                        className="flex items-center gap-2 rounded-[13px] px-2.5 py-2.5 text-left transition-transform active:scale-[0.98] disabled:opacity-60"
                        style={{ background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(15,23,42,0.07)' }}>
                        {planning === a.id
                          ? <Loader2 size={14} className="animate-spin" style={{ color: '#0067e0' }} />
                          : <span className="text-[15px] leading-none" aria-hidden>{a.emoji}</span>}
                        <span className="min-w-0 flex-1 text-[11.5px] font-[680] leading-[1.25]" style={{ color: '#0f172a' }}>
                          {a.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {actionError && !showAction && (
                    <p className="mt-3 rounded-[12px] px-3 py-2 text-[12px] font-[620]"
                      style={{ background: 'rgba(239,68,68,0.10)', color: '#b91c1c' }}>
                      {actionError}
                    </p>
                  )}

                  {recent.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[9.5px] font-[800] uppercase tracking-[0.12em]" style={{ color: '#94a3b8' }}>
                        Recent
                      </p>
                      <div className="flex flex-col gap-1">
                        {recent.map((c) => (
                          <button key={c.id} type="button" onClick={() => openConversation(c.id)}
                            className="truncate rounded-[11px] px-2.5 py-2 text-left text-[11.5px] font-[620] transition-colors"
                            style={{ background: 'rgba(15,23,42,0.035)', color: '#475569' }}>
                            {c.title || 'Untitled conversation'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </m.div>
        </>
      )}
    </AnimatePresence>
  );
}
