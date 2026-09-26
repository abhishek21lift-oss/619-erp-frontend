'use client';
/**
 * Member — More.
 *
 * The bottom bar has room for five tabs plus this one. Everything a member
 * visits less than weekly lives here: progress, notifications, their signed
 * forms, their account — and signing out, which used to hold the sixth slot.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Bell, ChevronRight, FileSignature, IdCard, LineChart, LogOut, Medal, MoreHorizontal, UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { Card, MC, PageTitle } from '@/components/member/MemberUI';
import { loadMemberNotifications } from '@/components/member/memberNotifications';
import { useAuth } from '@/lib/auth-context';
import { rgba } from '@/lib/palette';

export default function MemberMorePage() {
  return (
    <Guard role="member">
      <MemberShell>
        <MoreBody />
      </MemberShell>
    </Guard>
  );
}

const LINKS: { href: string; label: string; sub: string; icon: LucideIcon; badge?: boolean }[] = [
  { href: '/member/card', label: 'Membership card', sub: 'Check-in code and days left', icon: IdCard },
  { href: '/member/records', label: 'Records', sub: 'Streaks, milestones and personal bests', icon: Medal },
  { href: '/member/progress', label: 'Progress', sub: 'Weight trend and body measurements', icon: LineChart },
  { href: '/member/notifications', label: 'Notifications', sub: 'Updates from your studio', icon: Bell, badge: true },
  { href: '/member/forms', label: 'My forms', sub: 'Health screening and signed consent', icon: FileSignature },
  { href: '/member/account', label: 'Account', sub: 'Contact details and password', icon: UserRound },
];

function MoreBody() {
  const { logout } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    loadMemberNotifications(true).then((n) => setUnread(n.length)).catch(() => setUnread(0));
  }, []);

  return (
    <>
      <PageTitle icon={<MoreHorizontal size={20} />} title="More" />
      <Card>
        <ul>
          {LINKS.map(({ href, label, sub, icon: Icon, badge }) => (
            <li key={href} style={{ borderBottom: '1px solid var(--border)' }}>
              <Link href={href} className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--bg-subtle)]">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
                  style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
                  <Icon size={17} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>{label}</span>
                  <span className="block truncate text-[12px]" style={{ color: MC.muted }}>{sub}</span>
                </span>
                {badge && unread > 0 && (
                  <span className="rounded-full px-2 py-0.5 text-[11px] font-[800] text-white tabular-nums"
                    style={{ background: MC.danger }}>
                    {unread > 99 ? '99+' : unread}<span className="sr-only"> unread</span>
                  </span>
                )}
                <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
              </Link>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => logout()}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-subtle)]">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px]"
                style={{ background: rgba(MC.danger, 0.1), color: MC.danger }}>
                <LogOut size={17} aria-hidden />
              </span>
              <span className="text-[14px] font-[750]" style={{ color: MC.danger }}>Sign out</span>
            </button>
          </li>
        </ul>
      </Card>
    </>
  );
}
