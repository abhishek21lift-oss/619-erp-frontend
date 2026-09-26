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
 */

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, MessagesSquare, PenSquare, Search, UserX, X } from 'lucide-react';
import Guard from '@/components/Guard';
import ChatThread from '@/components/chat/ChatThread';
import ClientPicker, { ClientAvatar } from '@/components/pt-os/shared/ClientPicker';
import { api } from '@/lib/api';
import type { StudioConversation, StudioMessageThread } from '@/lib/api';
import { palette, rgba } from '@/lib/palette';

const INK = 'var(--text-primary)';
const MUTED = 'var(--text-muted)';
const ACCENT = palette.blue[500];

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
  return <div className="flex min-h-[50vh] items-center justify-center">{children}</div>;
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
    return (
      <div className="mx-auto w-full max-w-7xl py-6 sm:py-8">
        <button type="button" onClick={() => setPicking(false)}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-[700]" style={{ color: ACCENT }}>
          <X size={15} aria-hidden /> Cancel
        </button>
        <ClientPicker title="New message" subtitle="Who do you want to message?"
          icon={<PenSquare size={20} color="#fff" />} basePath="/pt-os/messages" />
      </div>
    );
  }

  const totalUnread = (inbox ?? []).reduce((n, c) => n + c.unread, 0);

  return (
    <div className="mx-auto w-full max-w-7xl py-4 sm:py-6">
      <div className="grid overflow-hidden rounded-[22px] lg:grid-cols-[340px_1fr]"
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          height: 'calc(100dvh - 150px)', minHeight: 480,
        }}>
        {/* ── Inbox ── */}
        <aside className={`${openId ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col`}
          style={{ borderRight: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
            <div>
              <h1 className="text-[18px] font-[820] tracking-[-0.02em]" style={{ color: INK }}>Messages</h1>
              <p className="text-[12px] font-[600]" style={{ color: MUTED }}>
                {inbox ? (totalUnread ? `${totalUnread} unread` : 'All caught up') : ' '}
              </p>
            </div>
            <button type="button" onClick={() => setPicking(true)}
              className="inline-flex items-center gap-1.5 rounded-[12px] px-3 py-2 text-[12.5px] font-[750] text-white"
              style={{ background: ACCENT }}>
              <PenSquare size={14} aria-hidden /> New
            </button>
          </div>
          <div className="px-4 pb-2">
            <label className="relative block">
              <span className="sr-only">Search conversations</span>
              <Search size={14} aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: MUTED }} />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search"
                className="h-9 w-full rounded-[11px] pl-8 pr-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                style={{ background: 'var(--bg-subtle)', color: INK }} />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {failed ? (
              <p className="px-4 py-6 text-[13px]" style={{ color: MUTED }}>Could not load conversations. They will retry shortly.</p>
            ) : !inbox ? (
              <div className="space-y-2 px-4 py-2">
                {[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-[12px]" style={{ background: 'var(--bg-subtle)' }} />)}
              </div>
            ) : shown.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <MessagesSquare size={22} aria-hidden className="mx-auto mb-2" style={{ color: MUTED }} />
                <p className="text-[13.5px] font-[720]" style={{ color: INK }}>
                  {query ? 'No matching conversations' : 'No messages yet'}
                </p>
                <p className="mt-1 text-[12px]" style={{ color: MUTED }}>
                  {query ? 'Try another name.' : 'When a member writes to you from their app, it shows up here.'}
                </p>
              </div>
            ) : (
              <ul>
                {shown.map((c) => {
                  const active = c.client_id === openId;
                  return (
                    <li key={c.client_id}>
                      <Link href={`/pt-os/messages?client=${encodeURIComponent(c.client_id)}`}
                        aria-current={active ? 'true' : undefined}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-subtle)]"
                        style={active ? { background: rgba(ACCENT, 0.08) } : undefined}>
                        <ClientAvatar name={c.client_name} photoUrl={c.photo_url} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-[13.5px]" style={{ color: INK, fontWeight: c.unread ? 800 : 650 }}>
                              {c.client_name}
                            </span>
                            <span className="shrink-0 text-[11px] font-[600]" style={{ color: c.unread ? ACCENT : MUTED }}>
                              {when(c.last_at)}
                            </span>
                          </span>
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[12.5px]" style={{ color: c.unread ? INK : MUTED }}>
                              {c.last_sender === 'studio' ? 'You: ' : ''}{c.last_body}
                            </span>
                            {c.unread > 0 && (
                              <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full px-1.5 text-[10.5px] font-[800] text-white"
                                style={{ background: ACCENT }}>
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
        <section className={`${openId ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col`}>
          {openId ? <ThreadPane key={openId} clientId={openId} onChanged={loadInbox} />
            : (
              <Centered>
                <div className="px-6 text-center">
                  <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full"
                    style={{ background: rgba(ACCENT, 0.1), color: ACCENT }}>
                    <MessagesSquare size={20} aria-hidden />
                  </span>
                  <p className="text-[14px] font-[750]" style={{ color: INK }}>Pick a conversation</p>
                  <p className="mt-1 text-[12.5px]" style={{ color: MUTED }}>Or start a new one with any client.</p>
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
        <p className="px-6 text-center text-[13px]" style={{ color: MUTED }}>
          {state === 'missing' ? 'This client is not in your studio.' : 'Could not load this conversation.'}
        </p>
      </Centered>
    );
  }

  const first = thread.client.name.split(' ')[0];

  return (
    <>
      <header className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <Link href="/pt-os/messages" aria-label="Back to conversations"
          className="grid h-9 w-9 place-items-center rounded-[10px] lg:hidden" style={{ color: INK }}>
          <ArrowLeft size={18} aria-hidden />
        </Link>
        <ClientAvatar name={thread.client.name} photoUrl={thread.client.photo_url} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-[800]" style={{ color: INK }}>{thread.client.name}</p>
          <p className="truncate text-[11.5px] font-[600]" style={{ color: MUTED }}>
            {thread.client.member_code ? `#${thread.client.member_code} · ` : ''}
            <Link href={`/pt-os/clients/${encodeURIComponent(thread.client.id)}`} className="underline-offset-2 hover:underline">
              View profile
            </Link>
          </p>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col px-3">
        <ChatThread
          me="studio"
          initial={thread.messages}
          reload={reload}
          send={send}
          placeholder={`Message ${first}…`}
          notice={thread.client.has_login ? null : (
            <p className="mx-1 mb-1 flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-[600]"
              style={{ background: rgba(palette.amber[500], 0.12), color: 'var(--warning-text)' }}>
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
