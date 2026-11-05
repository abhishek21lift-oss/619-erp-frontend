'use client';

/**
 * "Rate your last session" on the member's Home.
 *
 * One row, only when something is actually pending: a client who has answered
 * everything should not be nagged by a card with nothing to do. It loads its
 * own request after the page, so a slow or failed call costs only this row.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { ChevronRight, Star } from 'lucide-react';
import { EASE, MC } from './MemberUI';
import { api } from '@/lib/api';
import type { SessionFeedback } from '@/lib/api';
import { rgba } from '@/lib/palette';

export default function FeedbackPrompt() {
  const [pending, setPending] = useState<SessionFeedback[] | null>(null);

  useEffect(() => {
    let live = true;
    api.me.feedback('pending')
      .then((r) => { if (live) setPending(r.data); })
      .catch(() => { /* a prompt is not worth an error; the page also has the list */ });
    return () => { live = false; };
  }, []);

  if (!pending || pending.length === 0) return null;
  const first = pending[0];

  return (
    <m.section
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <Link
        href="/member/feedback"
        className="flex items-center gap-3 rounded-[18px] px-4 py-3.5"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[13px]"
          style={{ background: rgba(MC.warning, 0.14), color: MC.warning }}>
          <Star size={18} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-[800]" style={{ color: MC.ink }}>
            How was your session?
          </span>
          <span className="mt-0.5 block truncate text-[11.5px]" style={{ color: MC.muted }}>
            {first.session_title ? `${first.session_title} · ` : ''}
            {pending.length === 1 ? 'Four taps, and it is done.' : `${pending.length} sessions are waiting for a rating.`}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden style={{ color: MC.muted }} />
      </Link>
    </m.section>
  );
}
