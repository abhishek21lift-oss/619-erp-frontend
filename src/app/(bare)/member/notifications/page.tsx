'use client';
/**
 * Member — Notifications.
 *
 * What the studio has told this member in the app: a payment confirmed or
 * turned down, a reminder. Same /api/v1/notifications feed the trainer's bell
 * reads — it is scoped server-side to the signed-in user, so a member only
 * ever sees their own.
 *
 * Opening one marks it read and follows its link when the link is somewhere
 * a member can go; anything else (a stale trainer-side path) just marks read.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import {
  Card, EmptyState, LoadError, MC, PageSkeleton, PageTitle, Section,
} from '@/components/member/MemberUI';
import { loadMemberNotifications } from '@/components/member/memberNotifications';
import { api } from '@/lib/api';
import type { MeNotification } from '@/lib/api';
import { rgba } from '@/lib/palette';
import { useToast } from '@/lib/toast';

export default function MemberNotificationsPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <NotificationsBody />
      </MemberShell>
    </Guard>
  );
}

function when(v: string): string {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function NotificationsBody() {
  const router = useRouter();
  const { toast } = useToast();
  const [items, setItems] = useState<MeNotification[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    loadMemberNotifications().then(setItems).catch(() => setFailed(true));
  }, []);

  const unread = items?.filter((n) => !n.read_at).length ?? 0;
  const title = (
    <PageTitle icon={<Bell size={20} />} title="Notifications"
      sub={items ? (unread ? `${unread} unread` : 'All caught up') : null} />
  );
  if (failed) return <>{title}<LoadError what="notifications" /></>;
  if (!items) return <PageSkeleton />;

  const markLocal = (ids: string[] | 'all') => setItems((prev) => prev?.map((n) =>
    (ids === 'all' || ids.includes(n.id)) && !n.read_at ? { ...n, read_at: new Date().toISOString() } : n) ?? prev);

  const markAll = async () => {
    try {
      await api.notifications.markAllRead();
      markLocal('all');
    } catch {
      toast.error('Could not mark them read. Try again.');
    }
  };

  const open = (n: MeNotification) => {
    if (!n.read_at) {
      markLocal([n.id]);
      // Not awaited: failing to record "read" must not block following the
      // link. If it does fail, the item goes back to unread rather than
      // showing a state the server never saved.
      api.notifications.markRead(n.id).catch(() => {
        setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read_at: null } : x)) ?? prev);
      });
    }
    if (n.link && n.link.startsWith('/member/')) router.push(n.link);
  };

  if (items.length === 0) {
    return (
      <>
        {title}
        <EmptyState icon={<Bell size={18} />} title="Nothing yet"
          body="When your trainer confirms a payment or sends you an update, it will show up here." />
      </>
    );
  }

  return (
    <>
      {title}
      <Section title="Recent"
        aside={unread > 0 ? (
          <button type="button" onClick={() => void markAll()}
            className="inline-flex items-center gap-1 text-[11.5px] font-[720]" style={{ color: MC.primary }}>
            <CheckCheck size={13} aria-hidden /> Mark all read
          </button>
        ) : null}>
        <Card>
          <ul>
            {items.map((n, i) => {
              const isUnread = !n.read_at;
              const followable = Boolean(n.link?.startsWith('/member/'));
              return (
                <li key={n.id} style={i === items.length - 1 ? undefined : { borderBottom: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => open(n)}
                    className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-subtle)]"
                    style={isUnread ? { background: rgba(MC.primary, 0.05) } : undefined}>
                    <span aria-hidden className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ background: isUnread ? MC.primary : 'transparent' }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-[13.5px]" style={{ color: MC.ink, fontWeight: isUnread ? 780 : 650 }}>
                          {n.title}
                        </span>
                        <span className="shrink-0 text-[11px] font-[600]" style={{ color: MC.muted }}>{when(n.created_at)}</span>
                      </span>
                      {n.body && (
                        <span className="mt-0.5 block text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>{n.body}</span>
                      )}
                      {isUnread && <span className="sr-only">Unread.</span>}
                    </span>
                    {followable && <ChevronRight size={16} aria-hidden className="mt-1 shrink-0" style={{ color: MC.muted }} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>
    </>
  );
}
