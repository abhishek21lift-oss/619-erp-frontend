'use client';

// The member's AI thread: history, streaming answers, and a trainer draft the
// member must review before it is sent.
//
// The draft is a proposal, not a send. This component owns the edit box and
// calls the ordinary member message API only after the member presses "Send
// to trainer". A failed send keeps the edited text — the same rule the Ops
// Queue review sheet follows, because retyping a message to your trainer is
// exactly the moment a member gives up.

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { Send, Sparkles, Square } from 'lucide-react';
import { ChatMarkdown } from '@/components/fitness/ChatMarkdown';
import { MC } from '@/components/member/MemberUI';
import { api } from '@/lib/api';
import type { MeAiMessage } from '@/lib/api';
import { streamMemberAiChat } from '@/lib/ai-stream';
import { rgba } from '@/lib/palette';

type ThreadMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  proposedMessage?: string | null;
};

type Draft = {
  body: string;
  sending: boolean;
  sent: boolean;
  error: string | null;
};

const SUGGESTIONS = [
  "What's my workout today?",
  'What should I eat today?',
  'How has my week gone?',
  'When is my next payment?',
];

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${Date.now()}-${seq++}`;

function errorText(err: unknown): string {
  return err instanceof Error && err.message
    ? err.message
    : 'The assistant is unavailable. Please try again.';
}

export default function MemberAiThread({
  initial,
  configured,
}: {
  initial: MeAiMessage[];
  configured: boolean;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(() =>
    (initial || []).map((m, i) => ({ id: `init-${i}`, role: m.role, content: m.content })));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || sending) return;

    const userId = nextId('u');
    const assistantId = nextId('a');
    setMessages((prev) => [
      ...prev,
      { id: userId, role: 'user', content: text },
      { id: assistantId, role: 'assistant', content: '' },
    ]);
    setInput('');
    setError(null);
    setSending(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await streamMemberAiChat(
        { message: text, signal: controller.signal },
        {
          onText: (partial) => {
            setMessages((prev) => prev.map((m) => (
              m.id === assistantId ? { ...m, content: partial } : m
            )));
          },
        },
      );

      setMessages((prev) => prev.map((m) => (
        m.id === assistantId
          ? { ...m, content: result.text, proposedMessage: result.proposedMessage }
          : m
      )));
      if (result.proposedMessage) {
        setDraft({ body: result.proposedMessage, sending: false, sent: false, error: null });
      }
    } catch (err) {
      // Drop the empty placeholder, keep the member's question and any text
      // that arrived before the failure.
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content));
      setError(errorText(err));
    } finally {
      abortRef.current = null;
      setSending(false);
    }
  }, [sending]);

  const stop = () => abortRef.current?.abort();

  const sendDraft = async () => {
    if (!draft || draft.sending || draft.sent || !draft.body.trim()) return;
    const body = draft.body;
    setDraft({ ...draft, sending: true, error: null });
    try {
      await api.me.sendMessage(body);
      setDraft({ ...draft, sending: false, sent: true, error: null });
    } catch (err) {
      // Keep the edited text. A failed send must not make the member retype it.
      setDraft({ ...draft, sending: false, error: errorText(err) });
    }
  };

  const clearChat = async () => {
    if (!window.confirm('Clear this conversation?')) return;
    try {
      await api.me.aiClear();
      setMessages([]);
      setDraft(null);
      setError(null);
    } catch (err) {
      setError(errorText(err));
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between px-4 pt-3">
        <p className="text-[11px] font-[650]" style={{ color: MC.muted }}>
          Private to you and your studio
        </p>
        <button
          type="button"
          onClick={clearChat}
          className="cursor-pointer rounded-[10px] px-2.5 py-1.5 text-[11.5px] font-[700] transition-opacity hover:opacity-70"
          style={{ color: MC.muted }}
        >
          Clear chat
        </button>
      </div>

      <div
        role="log"
        aria-live="polite"
        aria-busy={sending}
        className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3"
      >
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <span
              className="mb-3 grid h-12 w-12 place-items-center rounded-full"
              style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}
            >
              <Sparkles size={20} aria-hidden />
            </span>
            <p className="text-[14px] font-[750]" style={{ color: MC.ink }}>Ask your AI coach</p>
            <p className="mt-1.5 max-w-[320px] text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
              Your plan, progress and payments — answered from your own records.
            </p>
            <div className="mt-4 flex w-full max-w-[340px] flex-col gap-2">
              {SUGGESTIONS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void send(prompt)}
                  className="min-h-[44px] cursor-pointer rounded-[14px] px-3.5 py-2.5 text-left text-[12.5px] font-[650] transition-transform active:scale-[0.99]"
                  style={{
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                    color: MC.ink,
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
            <div
              className="max-w-[88%] rounded-[18px] px-3.5 py-2"
              style={m.role === 'user'
                ? { background: MC.primary, color: MC.primaryText }
                : { background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
            >
              {m.role === 'assistant' ? (
                m.content
                  ? <ChatMarkdown content={m.content} tone="themed" size={14} />
                  : <p className="text-[13px] font-[650]" style={{ color: MC.muted }}>Thinking…</p>
              ) : (
                <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">{m.content}</p>
              )}
            </div>
          </div>
        ))}

        {draft && (
          <div
            className="rounded-[16px] p-3.5"
            style={{ background: 'var(--bg-subtle)', border: `1px solid ${rgba(MC.primary, 0.35)}` }}
          >
            <label htmlFor="member-ai-draft" className="block text-[12px] font-[750]" style={{ color: MC.ink }}>
              Message to your trainer
            </label>
            <textarea
              id="member-ai-draft"
              aria-label="Message to your trainer"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value, sent: false, error: null })}
              disabled={draft.sending || draft.sent}
              rows={4}
              className="mt-2 w-full resize-none rounded-[12px] px-3 py-2 text-[13px] leading-relaxed outline-none"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: MC.ink,
              }}
            />
            {draft.error && (
              <p role="alert" className="mt-2 text-[12px] font-[650]" style={{ color: MC.dangerText }}>
                {draft.error}
              </p>
            )}
            {draft.sent ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-[12.5px] font-[700]" style={{ color: MC.successText }}>
                  Sent to your trainer
                </p>
                <Link href="/member/messages" className="text-[12px] font-[700] underline" style={{ color: MC.primaryDeep }}>
                  View conversation
                </Link>
              </div>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void sendDraft()}
                  disabled={draft.sending || !draft.body.trim()}
                  className="min-h-[40px] cursor-pointer rounded-[12px] px-3.5 text-[12.5px] font-[750] text-white disabled:opacity-60"
                  style={{ background: MC.primary }}
                >
                  {draft.sending ? 'Sending…' : 'Send to trainer'}
                </button>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  disabled={draft.sending}
                  className="min-h-[40px] cursor-pointer rounded-[12px] px-3.5 text-[12.5px] font-[700] disabled:opacity-60"
                  style={{ color: MC.muted, border: '1px solid var(--border)' }}
                >
                  Discard
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="text-[12.5px] font-[650]" style={{ color: MC.dangerText }}>
            {error}
          </p>
        )}
      </div>

      <div className="shrink-0 px-4 pb-3" style={{ borderTop: '1px solid var(--border)' }}>
        {!configured && (
          <p className="pt-2 text-[11.5px] font-[650]" style={{ color: MC.warningText }}>
            AI isn&apos;t set up for your studio yet.
          </p>
        )}
        <form
          className="mt-2 flex items-end gap-2"
          onSubmit={(e) => { e.preventDefault(); void send(input); }}
        >
          <textarea
            aria-label="Message your AI coach"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder="Ask about your plan, progress or payments"
            className="min-h-[44px] flex-1 resize-none rounded-[14px] px-3 py-2.5 text-[14px] leading-snug outline-none"
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border)',
              color: MC.ink,
            }}
          />
          {sending ? (
            <button
              type="button"
              onClick={stop}
              aria-label="Stop"
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[14px]"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}
            >
              <Square size={16} aria-hidden />
            </button>
          ) : (
            <button
              type="submit"
              aria-label="Send"
              disabled={!input.trim()}
              className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-[14px] text-white disabled:opacity-50"
              style={{ background: MC.primary }}
            >
              <Send size={17} aria-hidden />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[10.5px] leading-relaxed" style={{ color: MC.muted }}>
          AI can make mistakes. For pain, injury or medical advice, talk to your trainer.
        </p>
      </div>
    </div>
  );
}
