'use client';

/**
 * Member — AI coach.
 *
 * The member's own assistant. The page is a chat, not a report: one card fills
 * the space between the status bar and the tab bar, the same geometry as
 * /member/messages, so the composer sits just above the tabs and only the
 * thread scrolls.
 *
 * The studio's `ai_suite` flag decides whether this page exists for them. The
 * server enforces the same flag; this only stops a dead composer being drawn.
 */

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import Guard from '@/components/Guard';
import MemberShell from '@/components/member/MemberShell';
import { MEMBER_NAV_CLEARANCE } from '@/components/member/MemberNav';
import { LoadError, MC, PageSkeleton } from '@/components/member/MemberUI';
import MemberAiThread from '@/components/member/MemberAiThread';
import { useFeatures } from '@/lib/features-context';
import { api } from '@/lib/api';
import type { MeAiHistory } from '@/lib/api';
import { rgba } from '@/lib/palette';

export default function MemberAiPage() {
  return (
    <Guard role="member">
      <MemberShell>
        <AiBody />
      </MemberShell>
    </Guard>
  );
}

function AiBody() {
  const { enabled } = useFeatures();
  const on = enabled('ai_suite');
  const [history, setHistory] = useState<MeAiHistory | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    // Do not call an endpoint the mount will refuse with 403.
    if (!on) return;
    api.me.aiHistory()
      .then((r) => setHistory(r.data))
      .catch(() => setFailed(true));
  }, [on]);

  if (!on) {
    return (
      <div
        className="rounded-[22px] p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-card)' }}
      >
        <span
          className="mb-3 grid h-11 w-11 place-items-center rounded-full"
          style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}
        >
          <Sparkles size={19} aria-hidden />
        </span>
        <h1 className="text-[16px] font-[820] tracking-[-0.02em]" style={{ color: MC.ink }}>
          AI isn&apos;t enabled for your studio
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed" style={{ color: MC.muted }}>
          Ask your trainer to turn on the AI suite. Until then, your plan and messages are still here.
        </p>
      </div>
    );
  }

  if (failed) return <LoadError what="AI coach" />;
  if (!history) return <PageSkeleton />;

  return (
    <div
      className="flex flex-col overflow-hidden rounded-[22px]"
      // Same viewport maths as /member/messages: status-bar inset, the
      // shell's pt-5 and the tab bar. Keep in step with MemberShell/MemberNav.
      style={{
        height: `calc(100dvh - env(safe-area-inset-top, 0px) - 20px - ${MEMBER_NAV_CLEARANCE})`,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <header
        className="flex shrink-0 items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full"
          style={{ background: rgba(MC.primary, 0.12), color: MC.primary }}
        >
          <Sparkles size={18} aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-[820] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>
            AI coach
          </h1>
          <p className="mt-0.5 truncate text-[11.5px] font-[600]" style={{ color: MC.muted }}>
            Your plan, progress and payments
          </p>
        </div>
      </header>

      <MemberAiThread initial={history.messages} configured={history.configured} />
    </div>
  );
}
