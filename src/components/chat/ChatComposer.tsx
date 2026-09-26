'use client';

/**
 * The message box under a conversation.
 *
 * One field and a send button, so not a form in the useAppForm sense: there is
 * nothing to validate beyond "not blank, not over the limit", and both are
 * enforced here and again by the server. It carries its own accessible name,
 * a visible character count near the limit and the same 2000-character cap
 * the API has.
 *
 * Enter sends and Shift+Enter starts a new line — on a keyboard. On a touch
 * screen Enter is a new line and the button sends, because a phone keyboard's
 * return key is how people write a second line.
 */

import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { palette } from '@/lib/palette';

export const CHAT_MAX = 2000;
const WARN_AT = 1800;
const MAX_ROWS_PX = 132;

export default function ChatComposer({ onSend, placeholder = 'Write a message…' }: {
  onSend: (body: string) => void;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const ref = useRef<HTMLTextAreaElement>(null);
  const trimmed = text.trim();
  const over = text.length > CHAT_MAX;
  const canSend = trimmed.length > 0 && !over;

  // Grow with the text, up to about five lines, then scroll.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [text]);

  const send = () => {
    if (!canSend) return;
    onSend(trimmed);
    setText('');
    ref.current?.focus();
  };

  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

  return (
    <div className="flex items-end gap-2 border-t px-1 pb-2 pt-2.5" style={{ borderColor: 'var(--border)' }}>
      <div className="min-w-0 flex-1">
        <textarea
          ref={ref}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          aria-label="Message"
          placeholder={placeholder}
          className="block w-full resize-none rounded-[20px] px-4 py-2.5 text-[14px] leading-[1.4] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        />
        {text.length >= WARN_AT && (
          <p className="mt-1 px-3 text-right text-[10.5px] font-[650] tabular-nums"
            style={{ color: over ? palette.red[600] : 'var(--text-muted)' }} aria-live="polite">
            {text.length} / {CHAT_MAX}
          </p>
        )}
      </div>
      <button type="button" onClick={send} disabled={!canSend} aria-label="Send message"
        className="mb-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-full text-white transition-transform active:scale-95 disabled:opacity-40"
        style={{ background: palette.blue[500] }}>
        <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
