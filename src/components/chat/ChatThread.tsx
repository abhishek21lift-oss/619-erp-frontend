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
import type { ChatChannel, ChatMessage } from '@/lib/api';
import { identity, palette, rgba, tint } from '@/lib/palette';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import ChatComposer from './ChatComposer';
import ChannelPicker from './ChannelPicker';

type Side = ChatMessage['sender'];
type Local = ChatMessage & { pending?: 'sending' | 'failed' };

const POLL_MS = 15_000;
const INK = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';

/**
 * The gateway's reason codes in words a trainer can act on. Anything unknown
 * says what is true without guessing a cause.
 */
function failureText(reason: string | null): string {
  const code = reason ?? '';
  if (code === 'recipient_not_on_whatsapp') return 'this number is not on WhatsApp';
  if (code.startsWith('invalid_recipient')) return "the phone number in this client's profile cannot be used";
  if (code === 'not_connected' || code.startsWith('whatsapp_')) return 'WhatsApp is not connected';
  if (code === 'duplicate_in_flight') return 'an earlier attempt is still sending';
  return 'WhatsApp could not deliver it';
}

/** The same non-semantic tint the roster uses, so a face reads the same way
 *  in the inbox and in the thread. */
function peerTone(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return identity[h % identity.length];
}

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
  /** Send a message. `channel` is supplied only when the page knows the studio's channels. */
  send: (body: string, channel?: ChatChannel) => Promise<ChatMessage>;
  /** Shown when the thread is empty. */
  empty: React.ReactNode;
  /** A note above the composer, e.g. "Ravi has no app login yet". */
  notice?: React.ReactNode;
  /** Height of whatever sits under the thread (a bottom tab bar). */
  bottomOffset?: string;
  /** Colour of the viewer's own bubbles. Defaults to the brand. */
  accent?: string;
  /** Who the viewer is talking to — draws their face beside incoming messages. */
  peer?: { name: string; photoUrl?: string | null };
  /** Present only on the trainer side: which channel the reply should use, and whether WhatsApp can send. */
  channels?: { default: ChatChannel; whatsapp_available: boolean };
  /** Retry a server-side failed WhatsApp row. Absent means no Retry control. */
  retryMessage?: (m: ChatMessage) => Promise<ChatMessage>;
  /** Rendered above the picker, inside the composer's padding wrapper. */
  composerExtra?: React.ReactNode;
  /** A draft to put in the composer, applied when `draftKey` changes. */
  draftText?: string;
  draftKey?: number;
  draftNote?: string;
};

export default function ChatThread({
  me, initial, reload, send, empty, notice, bottomOffset = '0px',
  accent = palette.blue[500], peer, channels, retryMessage, composerExtra,
  draftText, draftKey, draftNote,
}: ChatThreadProps) {
  const [messages, setMessages] = useState<Local[]>(initial);
  const [channel, setChannel] = useState<ChatChannel>(channels?.default ?? 'in_app');
  const [refusal, setRefusal] = useState<string | null>(null);
  // A 409 is a refusal, not a lost message: the text goes back into the field
  // and the optimistic bubble is removed. The key makes it win over an older
  // AI draft, which may be the text the trainer was editing when they sent.
  const [restored, setRestored] = useState<{ text: string; key: number; note?: string } | null>(null);
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

  const deliver = useCallback(async (tempId: string, body: string, rowChannel?: ChatChannel) => {
    try {
      const saved = await send(body, rowChannel);
      setMessages((prev) => prev.map((x) => (x.id === tempId ? saved : x)));
    } catch (err) {
      // A refusal (no phone, channel disconnected) cannot succeed on a retry,
      // so a tap-to-retry bubble would teach the trainer the wrong lesson.
      // Put the text back where they can fix it and say why.
      if ((err as { status?: number } | null)?.status === 409) {
        setMessages((prev) => prev.filter((x) => x.id !== tempId));
        setRestored({ text: body, key: Date.now() });
        setRefusal(err instanceof Error ? err.message : 'This message could not be sent.');
        return;
      }
      setMessages((prev) => prev.map((x) => (x.id === tempId ? { ...x, pending: 'failed' } : x)));
    }
  }, [send]);

  const submit = useCallback((body: string) => {
    const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    // The channel is fixed at submit time and carried on the row, so a later
    // change to the picker cannot move a retry onto another channel.
    const rowChannel = channels ? channel : undefined;
    setRefusal(null);
    stick.current = true;
    setMessages((prev) => [...prev, {
      id: tempId, sender: me, body, read_at: null, created_at: new Date().toISOString(),
      channel: rowChannel ?? 'in_app', message_type: 'text', delivery_status: null, failure_reason: null,
      pending: 'sending',
    }]);
    void deliver(tempId, body, rowChannel);
  }, [me, deliver, channels, channel]);

  const retry = (x: Local) => {
    setRefusal(null);
    setMessages((prev) => prev.map((y) => (y.id === x.id ? { ...y, pending: 'sending' } : y)));
    void deliver(x.id, x.body, channels ? x.channel : undefined);
  };

  const retryServer = async (x: ChatMessage) => {
    if (!retryMessage) return;
    try {
      const saved = await retryMessage(x);
      setMessages((prev) => prev.map((y) => (y.id === x.id ? saved : y)));
    } catch {
      // Stay failed. The server may have recorded a new reason; the next poll
      // brings it rather than this guessing one.
    }
  };

  const lastMineId = [...messages].reverse()
    .find((x) => x.sender === me && !x.pending && x.delivery_status !== 'failed')?.id;

  // Both keys are Date.now() values, so the larger one is newer. Exactly one
  // draft reaches the composer: a 409 restore beats the stale AI draft it came
  // from, and a newly clicked Draft reply beats an older restore.
  const pageDraft = draftKey === undefined
    ? null
    : { text: draftText ?? '', key: draftKey, note: draftNote };
  const activeDraft = !pageDraft ? restored
    : !restored ? pageDraft
      : (pageDraft.key >= restored.key ? pageDraft : restored);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={listRef} role="log" aria-live="polite" aria-label="Messages"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3"
        style={{ background: 'var(--bg-subtle)' }}>
        {messages.length === 0 ? empty : messages.map((x, i) => {
          const prev = messages[i - 1];
          const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(x.created_at).toDateString();
          const mine = x.sender === me;
          const grouped = prev && !newDay && prev.sender === x.sender
            && new Date(x.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60_000;
          const tone = peer ? peerTone(peer.name) : identity[0];
          // A server row can be failed without a local `pending` flag. Both
          // kinds get the same tint, reason and Retry; only the local kind may
          // use the bubble's tap-to-retry, because the normal send path must
          // never be asked to re-send a row the server already owns.
          const failed = x.pending === 'failed' || x.delivery_status === 'failed';
          const showChannel = !grouped || failed;
          // The trainer sees both channels. The member only needs a mark on
          // WhatsApp arrivals: "In app" on every ordinary message is noise.
          const channelLabel = x.channel === 'whatsapp'
            ? 'WhatsApp'
            : (me === 'studio' ? 'In app' : null);
          const whatsappStatus = mine && !failed && x.channel === 'whatsapp'
            ? x.delivery_status
            : null;
          return (
            <div key={x.id}>
              {newDay && (
                <div className="my-3 flex justify-center">
                  <span className="rounded-full px-2.5 py-0.5 text-[10.5px] font-[700]"
                    style={{ background: 'var(--bg-card)', color: MUTED, border: '1px solid var(--border)' }}>
                    {dayLabel(x.created_at)}
                  </span>
                </div>
              )}
              <m.div
                initial={x.pending === 'sending' ? { opacity: 0, y: 6, scale: 0.98 } : false}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex items-end ${mine ? 'justify-end' : 'justify-start'} ${grouped ? 'mt-0.5' : 'mt-2.5'}`}>
                {!mine && peer && (
                  <span className="mr-1.5 w-7 shrink-0">
                    {!grouped && (
                      <ClientAvatar
                        name={peer.name}
                        photoUrl={peer.photoUrl}
                        alt=""
                        className="flex h-7 w-7 items-center justify-center rounded-full text-[10.5px] font-[800]"
                        style={{ background: tint(tone, 0.2), color: INK }}
                      />
                    )}
                  </span>
                )}
                <div className={`flex max-w-[82%] flex-col ${mine ? 'items-end' : 'items-start'}`}>
                  <button type="button" disabled={x.pending !== 'failed'} onClick={() => retry(x)}
                    className="whitespace-pre-wrap break-words rounded-[18px] px-3.5 py-2 text-left text-[14px] leading-[1.45] disabled:cursor-default"
                    style={mine
                      ? {
                          background: failed ? rgba(palette.red[500], 0.12) : accent,
                          color: failed ? INK : '#fff',
                          borderBottomRightRadius: 6,
                          opacity: x.pending === 'sending' ? 0.75 : 1,
                        }
                      : { background: 'var(--bg-card)', color: INK, border: '1px solid var(--border)', borderBottomLeftRadius: 6 }}
                    aria-label={x.pending === 'failed' ? `Not sent: ${x.body}. Tap to retry.` : undefined}>
                    {x.body}
                  </button>
                  {(x.pending || failed || x.id === lastMineId || !grouped) && (
                    <span className="mt-0.5 flex items-center gap-1 px-1 text-[10.5px] font-[600]"
                      style={{ color: failed ? palette.red[600] : MUTED }}>
                      {x.pending === 'sending' ? 'Sending…'
                        : x.pending === 'failed' ? <><AlertCircle size={11} aria-hidden /> Not sent — tap to retry</>
                          : failed ? (
                            <>
                              <AlertCircle size={11} aria-hidden />
                              <span>Not sent — {failureText(x.failure_reason)}</span>
                              {retryMessage && (
                                <button type="button" onClick={() => void retryServer(x)}
                                  className="ml-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-[750]"
                                  style={{ color: palette.red[600], border: `1px solid ${rgba(palette.red[500], 0.35)}` }}>
                                  Retry
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              {time(x.created_at)}
                              {showChannel && channelLabel && (
                                <><span aria-hidden>·</span><span>{channelLabel}</span></>
                              )}
                              {whatsappStatus === 'queued' && <span>Sending…</span>}
                              {whatsappStatus === 'sent' && <><Check size={12} aria-hidden /><span>Sent</span></>}
                              {whatsappStatus === 'delivered' && <><CheckCheck size={12} aria-hidden /><span>Delivered</span></>}
                              {whatsappStatus === 'read' && (
                                <><CheckCheck size={12} aria-hidden style={{ color: accent }} /><span>Read</span></>
                              )}
                              {mine && x.channel === 'in_app' && x.id === lastMineId && (
                                x.read_at
                                  ? <><CheckCheck size={12} aria-hidden style={{ color: accent }} /><span>Read</span></>
                                  : <><Check size={12} aria-hidden /><span>Sent</span></>
                              )}
                            </>
                          )}
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
        {composerExtra}
        {channels && (
          <ChannelPicker
            value={channel}
            onChange={setChannel}
            whatsappAvailable={channels.whatsapp_available}
          />
        )}
        {refusal && (
          <p className="px-3 pt-1.5 text-[11px] font-[600]" style={{ color: palette.red[600] }} aria-live="polite">
            {refusal}
          </p>
        )}
        <ChatComposer
          onSend={submit}
          accent={accent}
          draftText={activeDraft?.text}
          draftKey={activeDraft?.key}
          draftNote={activeDraft?.note}
          onEdit={() => setRefusal(null)}
        />
      </div>
    </div>
  );
}
