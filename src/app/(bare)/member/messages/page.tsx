'use client';
/**
 * Member — Messages.
 *
 * The member's one conversation, with their studio's trainer. The thread is
 * the signed-in member's own (the API takes no id), and opening it marks the
 * trainer's messages read.
 *
 * Laid out as a chat, not a page: the header and composer stay put and only
 * the messages scroll, in the space between the top of the screen and the
 * tab bar.
 */

import { useCallback, useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { MEMBER_NAV_CLEARANCE } from '@/components/member/MemberNav';
import { LoadError, MC, PageSkeleton } from '@/components/member/MemberUI';
import ChatThread from '@/components/chat/ChatThread';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { api } from '@/lib/api';
import type { MeMessageThread } from '@/lib/api';
import { rgba } from '@/lib/palette';

export default function MemberMessagesPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <MessagesBody />
      </MemberShell>
    </Guard>
  );
}

function MessagesBody() {
  const [thread, setThread] = useState<MeMessageThread | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.me.messages().then((r) => setThread(r.data)).catch(() => setFailed(true));
  }, []);

  const reload = useCallback(async () => (await api.me.messages()).data.messages, []);
  const send = useCallback(async (body: string) => (await api.me.sendMessage(body)).data, []);

  if (failed) return <LoadError what="messages" />;
  if (!thread) return <PageSkeleton />;

  const who = thread.with.trainer_name ?? 'Your trainer';

  return (
    <div className="flex flex-col"
      // The viewport minus the status-bar inset, the shell's pt-5 and the tab
      // bar: the composer sits just above the tabs, and only messages scroll.
      style={{ height: `calc(100dvh - env(safe-area-inset-top, 0px) - 20px - ${MEMBER_NAV_CLEARANCE})` }}>
      <header className="flex items-center gap-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
        <ClientAvatar name={who} photoUrl={null}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-[14px] font-[800]"
          style={{ background: rgba(MC.primary, 0.12), color: MC.primary }} />
        <div className="min-w-0">
          <h1 className="truncate text-[17px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>{who}</h1>
          <p className="truncate text-[12px] font-[600]" style={{ color: MC.muted }}>
            Your trainer · {thread.with.studio_name ?? 'your studio'}
          </p>
        </div>
      </header>

      <ChatThread
        me="member"
        initial={thread.messages}
        reload={reload}
        send={send}
        placeholder={`Message ${who.split(' ')[0]}…`}
        empty={
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <span className="mb-3 grid h-12 w-12 place-items-center rounded-full"
              style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
              <MessageCircle size={20} aria-hidden />
            </span>
            <p className="text-[14px] font-[750]" style={{ color: MC.ink }}>Message {who}</p>
            <p className="mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
              Ask about your plan, move a session or tell them how you are feeling. Only you and your studio can see this.
            </p>
          </div>
        }
      />
    </div>
  );
}
