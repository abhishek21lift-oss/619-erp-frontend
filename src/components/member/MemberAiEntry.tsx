'use client';

// The member's way into their AI coach.
//
// Two shapes for the two surfaces that need it: a card in the Home action
// area, and a row inside Profile's "Your studio" group. Both disappear when
// the studio does not have the AI suite, so a member never taps through to a
// screen the server will refuse.
//
// The gate is the studio's feature flag, not the member's plan: the AI suite
// is sold to the studio, and requireFeature('ai_suite') enforces the same key
// on every request.

import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { MC } from '@/components/member/MemberUI';
import { accentGradient } from '@/components/member/memberTheme';
import { useFeatures } from '@/lib/features-context';
import { rgba } from '@/lib/palette';

const TITLE = 'Ask your AI coach';
const SUB = 'Your plan, progress and payments — answered.';

export default function MemberAiEntry({ variant }: { variant: 'card' | 'row' }) {
  const { enabled } = useFeatures();
  if (!enabled('ai_suite')) return null;

  if (variant === 'row') {
    return (
      <li style={{ borderBottom: '1px solid var(--border)' }}>
        <Link
          href="/member/ai"
          className="flex min-h-[60px] items-center gap-3 px-4 py-3 transition-colors hover:bg-[var(--bg-subtle)] active:bg-[var(--bg-subtle)]"
        >
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-[11px] text-white"
            style={{ background: accentGradient('workout') }}
          >
            <Sparkles size={17} aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-[750]" style={{ color: MC.ink }}>{TITLE}</span>
            <span className="block truncate text-[12px]" style={{ color: MC.muted }}>
              Your plan, progress and payments
            </span>
          </span>
          <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
        </Link>
      </li>
    );
  }

  return (
    <Link
      href="/member/ai"
      className="mb-5 flex items-center gap-3 rounded-[20px] p-4 transition-transform active:scale-[0.99]"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
        style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}
      >
        <Sparkles size={19} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-[780]" style={{ color: MC.ink }}>{TITLE}</span>
        <span className="mt-0.5 block text-[12px] leading-snug" style={{ color: MC.muted }}>{SUB}</span>
      </span>
      <ChevronRight size={17} aria-hidden style={{ color: MC.muted }} />
    </Link>
  );
}
