'use client';
/**
 * Trainer — Member messages.
 *
 * Every member conversation in the studio: an inbox (latest message, unread
 * count) and the open thread beside it on a wide screen; one at a time on a
 * phone. `?client=<id>` opens a thread directly — the notification a member's
 * message raises links here, and so does "Message" on a client's profile.
 * `client_id` is accepted too, because ClientPicker's default writes that.
 *
 * Opening a thread marks the member's messages read. A client with no app
 * login can still be written to — they will see it when they sign in — and
 * the thread says so, so a reply is not sent into silence unknowingly.
 *
 * Laid out as a chat, not a page: the surface cancels the shell's padding,
 * fills the space between the top bar and the bottom tab bar, and only the
 * message list scrolls. The inbox keeps the app's tokens; the thread gets a
 * tinted wallpaper so the bubbles read as a conversation rather than as
 * cards on a report page.
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, Loader2, MessagesSquare, PenSquare, Search, UserX, X } from 'lucide-react';
import Guard from '@/components/Guard';
import ChatThread from '@/components/chat/ChatThread';
import ClientPicker, { ClientAvatar } from '@/components/pt-os/shared/ClientPicker';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import type { StudioConversation, StudioMessageThread } from '@/lib/api';
import { palette } from '@/lib/palette';

const INK = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const ACCENT = palette.indigo[500];

export default function TrainerMessagesPage() {
  return (
    <Guard>
      <Suspense fallback={<Centered><Loader2 size={24} className="animate-spin" style={{ color: ACCENT }} /></Centered>}>
        <MessagesContent />
      </Suspense>
    </Guard>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-0 flex-1 items-center justify-center py-10">{children}</div>;
}

function when(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
  if (days < 7) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function MessagesContent() {
  const sp = useSearchParams();
  const openId = sp.get('client') || sp.get('client_id') || '';
  const [inbox, setInbox] = useState<StudioConversation[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState('');

  const loadInbox = useCallback(() => {
    api.clientMessages.inbox()
      .then((r) => { setInbox(r.data); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => { loadInbox(); setPicking(false); }, [loadInbox, openId]);

  // Keep the inbox's unread counts moving while the page is open.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadInbox(); }, 20_000);
    return () => clearInterval(t);
  }, [loadInbox]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (inbox ?? []).filter((c) => !q || c.client_name.toLowerCase().includes(q));
  }, [inbox, query]);

  if (picking) {
    // ClientPicker brings its own PageContainer and PageHero, so this branch
    // hands it the Cancel control instead of wrapping it in a second page.
    return (
      <ClientPicker
        title="New message"
        icon={<PenSquare size={20} color="#fff" />}
        basePath="/pt-os/messages"
        actions={(
          <Button variant="outline" iconLeft={<X size={14} />} onClick={() => setPicking(false)}>
            Cancel
          </Button>
        )}
      />
    );
  }

  const totalUnread = (inbox ?? []).reduce((n, c) => n + c.unread, 0);

  return (
    <div className="messages-shell flex flex-col">
      {/* The shell's padding differs by breakpoint, and on mobile it also
          reserves the tab bar. Cancel each breakpoint's own padding, then
          subtract only what is genuinely unavailable: the top bar always,
          plus the tab bar where it exists. Keep in step with .shell-main. */}
      <style>{`
        .messages-shell {
          margin: -16px;
          margin-bottom: calc(-1 * (var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 16px));
          height: calc(100dvh - var(--topbar-h, 46px) - var(--bottom-nav-h) - env(safe-area-inset-bottom, 0px));
          overflow: hidden;
        }
        @media (min-width: 768px) {
          .messages-shell {
            margin: -24px;
            margin-bottom: calc(-1 * (var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px) + 16px));
          }
        }
        @media (min-width: 1024px) {
          .messages-shell { margin: -24px; margin-bottom: -32px; height: calc(100dvh - var(--topbar-h, 46px)); }
        }
      `}</style>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[340px_1fr]">
        {/* ── Inbox ── */}
        <aside className={`${openId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col`}
          style={{ background: 'var(--bg-card)', borderRight: '1px solid var(--border)' }}>
          <div className="px-4 pb-3 pt-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="text-[19px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: INK }}>
                  Messages
                </h1>
                <p className="mt-0.5 text-[11.5px] font-[600]" style={{ color: totalUnread ? ACCENT : MUTED }}>
                  {totalUnread > 0 ? `${totalUnread} unread` : 'All caught up'}
                </p>
              </div>
              <Button size="md" iconLeft={<PenSquare size={14} />} onClick={() => setPicking(true)}
                aria-label="New message" className="shrink-0 px-3">
                <span className="hidden sm:inline">New</span>
              </Button>
            </div>
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-full rounded-[12px] pl-8 pr-8 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: INK }} />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full"
                  style={{ color: MUTED }}>
                  <X size={13} aria-hidden />
                </button>
              )}
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {failed ? (
              <div className="px-4 py-6 text-center">
                <p className="text-[13px] font-[650]" style={{ color: INK }}>Could not load conversations</p>
                <p className="mt-1 text-[12px]" style={{ color: MUTED }}>Retrying automatically.</p>
              </div>
            ) : !inbox ? (
              <div className="space-y-2 px-3 py-2.5">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-[14px]" style={{ background: 'var(--bg-subtle)' }} />)}
              </div>
            ) : shown.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <span aria-hidden className="mx-auto mb-2.5 grid h-11 w-11 place-items-center rounded-full"
                  style={{ background: 'var(--info-soft)', color: ACCENT }}>
                  <MessagesSquare size={19} />
                </span>
                <p className="text-[13.5px] font-[720]" style={{ color: INK }}>
                  {query ? 'No matching conversations' : 'No messages yet'}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
                  {query ? 'Try another name.' : 'Messages from your clients arrive here.'}
                </p>
              </div>
            ) : (
              <ul className="space-y-0.5 px-2 py-2">
                {shown.map((c) => {
                  const active = c.client_id === openId;
                  return (
                    <li key={c.client_id}>
                      <Link href={`/pt-os/messages?client=${encodeURIComponent(c.client_id)}`}
                        aria-current={active ? 'true' : undefined}
                        className="relative flex items-center gap-3 rounded-[14px] px-2.5 py-2.5 transition-colors hover:bg-[var(--bg-subtle)]"
                        style={active ? {
                          background: 'var(--info-soft)',
                          boxShadow: 'inset 0 0 0 1px var(--info-border)',
                        } : undefined}>
                        {active && (
                          <span aria-hidden className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full"
                            style={{ background: ACCENT }} />
                        )}
                        <ClientAvatar name={c.client_name} photoUrl={c.photo_url} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13.5px]" style={{ color: INK, fontWeight: c.unread ? 800 : 650 }}>
                              {c.client_name}
                            </span>
                            <span className="shrink-0 text-[11px] font-[650]" style={{ color: c.unread ? ACCENT : MUTED }}>
                              {when(c.last_at)}
                            </span>
                          </span>
                          <span className="mt-0.5 flex items-center justify-between gap-2">
                            <span className="truncate text-[12.5px]" style={{ color: c.unread ? INK : MUTED, fontWeight: c.unread ? 600 : 500 }}>
                              {c.last_sender === 'studio' ? 'You: ' : ''}{c.last_body}
                            </span>
                            {c.unread > 0 && (
                              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10.5px] font-[800] text-white"
                                style={{ background: 'var(--gradient-brand)' }}>
                                {c.unread}<span className="sr-only"> unread</span>
                              </span>
                            )}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* ── Thread ── */}
        <section className={`${openId ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 flex-col`}
          style={{ background: 'var(--bg-card)' }}>
          {openId ? <ThreadPane key={openId} clientId={openId} onChanged={loadInbox} />
            : (
              <Centered>
                <div className="px-6 text-center">
                  <span aria-hidden className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-[20px] text-white"
                    style={{ background: 'var(--gradient-brand)', boxShadow: 'var(--shadow-brand)' }}>
                    <MessagesSquare size={22} />
                  </span>
                  <p className="text-[15px] font-[780]" style={{ color: INK }}>Pick a conversation</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>Open a client on the left, or start a new message.</p>
                </div>
              </Centered>
            )}
        </section>
      </div>
    </div>
  );
}

function ThreadPane({ clientId, onChanged }: { clientId: string; onChanged: () => void }) {
  const [thread, setThread] = useState<StudioMessageThread | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'error'>('loading');

  useEffect(() => {
    api.clientMessages.thread(clientId)
      .then((r) => { setThread(r.data); setState('ready'); onChanged(); })
      .catch((err: { status?: number }) => setState(err?.status === 404 ? 'missing' : 'error'));
  }, [clientId, onChanged]);

  const reload = useCallback(async () => (await api.clientMessages.thread(clientId)).data.messages, [clientId]);
  const send = useCallback(async (body: string) => {
    const saved = (await api.clientMessages.send(clientId, body)).data;
    onChanged();
    return saved;
  }, [clientId, onChanged]);

  if (state === 'loading') return <Centered><Loader2 size={22} className="animate-spin" style={{ color: ACCENT }} /></Centered>;
  if (state !== 'ready' || !thread) {
    return (
      <Centered>
        <div className="px-6 text-center">
          <p className="text-[14px] font-[750]" style={{ color: INK }}>
            {state === 'missing' ? 'Client not found' : 'Could not load this conversation'}
          </p>
          <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>
            {state === 'missing'
              ? 'This client is not in your studio.'
              : 'Check your connection and open the conversation again.'}
          </p>
        </div>
      </Centered>
    );
  }

  const first = thread.client.name.split(' ')[0];

  return (
    <>
      <header className="flex min-w-0 items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/pt-os/messages" aria-label="Back to conversations"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-[11px] lg:hidden"
          style={{ color: INK, background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <ArrowLeft size={17} aria-hidden />
        </Link>
        <ClientAvatar name={thread.client.name} photoUrl={thread.client.photo_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[800]" style={{ color: INK }}>{thread.client.name}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1.5 truncate text-[11.5px] font-[600]" style={{ color: MUTED }}>
            {thread.client.member_code && (
              <span className="shrink-0 rounded-full px-1.5 py-[1px] text-[10.5px] font-[750]"
                style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MUTED }}>
                #{thread.client.member_code}
              </span>
            )}
            <Link href={`/pt-os/clients/${encodeURIComponent(thread.client.id)}`}
              className="inline-flex items-center gap-0.5 underline-offset-2 hover:underline">
              View profile <ArrowUpRight size={11} aria-hidden />
            </Link>
          </p>
        </div>
      </header>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <ChatThread
          me="studio"
          accent={ACCENT}
          peer={{ name: thread.client.name, photoUrl: thread.client.photo_url }}
          initial={thread.messages}
          reload={reload}
          send={send}
          notice={thread.client.has_login ? null : (
            <p className="mx-2 mb-1 flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12px] font-[600]"
              style={{ background: 'var(--warning-soft)', color: 'var(--warning-text)', border: '1px solid var(--warning-border)' }}>
              <UserX size={14} aria-hidden />
              {first} has no app login yet — they will see this once they sign in.
            </p>
          )}
          empty={
            <Centered>
              <p className="px-6 text-center text-[12.5px]" style={{ color: MUTED }}>
                No messages with {first} yet. Say hello — they will get a notification in their app.
              </p>
            </Centered>
          }
        />
      </div>
    </>
  );
}
