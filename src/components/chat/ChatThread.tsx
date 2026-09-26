'use client';

/**
 * A member ↔ studio conversation, used by both sides: the member's
 * /member/messages and the trainer's /pt-os/messages.
 *
 * ── What it owns ───────────────────────────────────────────────────────────
 *
 *   • The message list: own messages on the right, the other side's on the
 *     left, grouped by day, with "Sent"/"Read" under the last one you sent.
 *   • Sending, optimistically: a message appears at once as "Sending…", is
 *     replaced by the server's copy when it lands, and on failure stays in
 *     place marked "Not sent — tap to retry" rather than vanishing with
 *     whatever was typed.
 *   • Keeping up to date: the thread is re-read every 15 seconds while the
 *     tab is visible, and immediately when it becomes visible again. Polling
 *     rather than a socket on purpose — a PT conversation is a handful of
 *     messages a day, and reading the thread is also what marks it read.
 *
 * The page supplies the header and how to load and send; this knows nothing
 * about which side of the API it is talking to.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { AlertCircle, Check, CheckCheck } from 'lucide-react';
import type { ChatMessage } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';
import ChatComposer from './ChatComposer';

type Side = ChatMessage['sender'];
type Local = ChatMessage & { pending?: 'sending' | 'failed' };

const POLL_MS = 15_000;
const INK = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const ACCENT = palette.blue[500];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const y = new Date(); y.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  });
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export type ChatThreadProps = {
  /** Which side the viewer is on: their messages sit on the right. */
  me: Side;
  /** First page of messages, already loaded by the page. */
  initial: ChatMessage[];
  /** Re-read the thread (also marks the other side's messages read). */
  reload: () => Promise<ChatMessage[]>;
  send: (body: string) => Promise<ChatMessage>;
  /** Shown when the thread is empty. */
  empty: React.ReactNode;
  placeholder?: string;
  /** A note above the composer, e.g. "Ravi has no app login yet". */
  notice?: React.ReactNode;
  /** Height of whatever sits under the thread (a bottom tab bar). */
  bottomOffset?: string;
};

export default function ChatThread({
  me, initial, reload, send, empty, placeholder, notice, bottomOffset = '0px',
}: ChatThreadProps) {
  const [messages, setMessages] = useState<Local[]>(initial);
  const listRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true); // follow new messages only if already at the bottom

  // Merge a fresh server read with any local messages still sending/failed.
  const refresh = useCallback(async () => {
    try {
      const fresh = await reload();
      setMessages((prev) => [...fresh, ...prev.filter((x) => x.pending)]);
    } catch {
      // Keep what is on screen; the next tick tries again. A transient read
      // failure is not worth interrupting a conversation for.
    }
  }, [reload]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => void refresh(), POLL_MS); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVis = () => {
      if (document.visibilityState === 'visible') { void refresh(); start(); } else stop();
    };
    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVis);
    return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
  }, [refresh]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const deliver = useCallback(async (tempId: string, body: string) => {
    try {
      const saved = await send(body);
      setMessages((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
    } catch {
      setMessages((prev) => prev.map((x) => (x.id === tempId ? { ...x, pending: 'failed' } : x)));
    }
  }, [send]);

  const submit = useCallback((body: string) => {
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    stick.current = true;
    setMessages((prev) => [...prev, {
      id: tempId, sender: me, body, read_at: null, created_at: new Date().toISOString(), pending: 'sending',
    }]);
    void deliver(tempId, body);
  }, [me, deliver]);

  const retry = (x: Local) => {
    setMessages((prev) => prev.map((y) => (y.id === x.id ? { ...y, pending: 'sending' } : y)));
    void deliver(x.id, x.body);
  };

  const lastMineId = [...messages].reverse().find((x) => x.sender === me && !x.pending)?.id;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} role="log" aria-live="polite" aria-label="Messages"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-3">
        {messages.length === 0 ? empty : messages.map((x, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(x.created_at).toDateString();
          const mine = x.sender === me;
          const grouped = prev && !newDay && prev.sender === x.sender
            && new Date(x.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
          return (
            <div key={x.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-[700]"
                    style={{ background: 'var(--bg-subtle)', color: MUTED }}>
                    {dayLabel(x.created_at)}
                  </span>
                </div>
              )}
              <m.div
                initial={x.pending === 'sending' ? { opacity: 0, y: 6, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-2.5'}`}>
                <div className={`flex max-w-[82%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <button type="button" disabled={x.pending !== 'failed'} onClick={() => retry(x)}
                    className="whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-left text-[14px] leading-[1.45] disabled:cursor-default"
                    style={mine
                      ? {
                          background: x.pending === 'failed' ? rgba(palette.red[500], 0.12) : ACCENT,
                          color: x.pending === 'failed' ? INK : '#fff',
                          borderBottomRightRadius: 6,
                          opacity: x.pending === 'sending' ? 0.75 : 1,
                        }
                      : { background: 'var(--bg-subtle)', color: INK, borderBottomLeftRadius: 6 }}
                    aria-label={x.pending === 'failed' ? `Not sent: ${x.body}. Tap to retry.` : undefined}>
                    {x.body}
                  </button>
                  {(x.pending || x.id === lastMineId || !grouped) && (
                    <span className="mt-0.5 flex items-center gap-1 px-1 text-[10.5px] font-[600]"
                      style={{ color: x.pending === 'failed' ? palette.red[600] : MUTED }}>
                      {x.pending === 'sending' ? 'Sending…'
                        : x.pending === 'failed' ? <><AlertCircle size={11} aria-hidden /> Not sent — tap to retry</>
                          : <>
                              {time(x.created_at)}
                              {x.id === lastMineId && (x.read_at
                                ? <><CheckCheck size={12} aria-hidden style={{ color: ACCENT }} /> Read</>
                                : <><Check size={12} aria-hidden /> Sent</>)}
                            </>}
                    </span>
                  )}
                </div>
              </m.div>
            </div>
          );
        })}
      </div>

      <AnimatePresence>{notice && <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{notice}</m.div>}</AnimatePresence>
      <div style={{ paddingBottom: bottomOffset }}>
        <ChatComposer onSend={submit} placeholder={placeholder} />
      </div>
    </div>
  );
}
