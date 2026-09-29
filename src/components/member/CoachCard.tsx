'use client';
/**
 * The member's coach, as a card: photo in a gradient ring, name, what they
 * do, how long they have done it, and a few specialisations. Opens the full
 * profile at /member/coach.
 *
 * Everything shown is what the trainer wrote on their own My Profile page
 * (GET /api/me/coach). Nothing here is invented: a field the trainer left
 * blank is left out, not filled with a placeholder claim.
 */

import Link from 'next/link';
import { m } from 'framer-motion';
import { Award, ChevronRight, Clock, MessageCircle } from 'lucide-react';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import type { MeCoach } from '@/lib/api';
import { rgba } from '@/lib/palette';
import { EASE, MC } from './MemberUI';
import { accentGradient, spectrum } from './memberTheme';

/** "Head coach", else the job title, else a plain description. */
export function coachRole(c: Pick<MeCoach, 'designation' | 'job_title'>): string {
  return c.designation || c.job_title || 'Personal trainer';
}

export function CoachRing({ coach, size }: { coach: Pick<MeCoach, 'name' | 'photo_url'>; size: number }) {
  return (
    <span className="grid shrink-0 place-items-center rounded-full p-[3px]"
      style={{
        width: size, height: size,
        background: `conic-gradient(from 200deg, ${spectrum.pink[500]}, ${spectrum.orange[400]}, ${spectrum.cyan[400]}, ${spectrum.violet[500]}, ${spectrum.pink[500]})`,
      }}>
      <ClientAvatar name={coach.name} photoUrl={coach.photo_url}
        className="grid h-full w-full place-items-center rounded-full font-[820] text-white"
        style={{
          background: accentGradient('workout'),
          border: '2.5px solid var(--bg-card)',
          fontSize: Math.round(size * 0.3),
        }} />
    </span>
  );
}

export default function CoachCard({ coach, delay = 0 }: { coach: MeCoach; delay?: number }) {
  const certs = coach.certifications.length;
  return (
    <m.section
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
      aria-label="Your coach"
      className="relative mb-5 overflow-hidden rounded-[22px]"
      style={{
        background: `radial-gradient(260px circle at 0% 0%, ${rgba(spectrum.violet[500], 0.12)}, transparent 70%), radial-gradient(240px circle at 100% 100%, ${rgba(spectrum.orange[400], 0.12)}, transparent 70%), var(--bg-card)`,
        border: '1px solid var(--border)',
        boxShadow: `0 18px 36px -26px ${rgba(spectrum.violet[600], 0.6)}`,
      }}
    >
      <Link href="/member/coach" className="flex items-center gap-3.5 p-4 pb-3">
        <CoachRing coach={coach} size={64} />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-[780] uppercase tracking-[0.12em]" style={{ color: spectrum.violet[600] }}>
            Your coach
          </span>
          <span className="block truncate text-[18px] font-[830] leading-tight tracking-[-0.02em]" style={{ color: MC.ink }}>
            {coach.name}
          </span>
          <span className="block truncate text-[12.5px] font-[600]" style={{ color: MC.muted }}>{coachRole(coach)}</span>
        </span>
        <ChevronRight size={18} aria-hidden style={{ color: MC.muted }} />
      </Link>

      {(coach.years_experience || certs > 0 || coach.specialisations.length > 0) && (
        <div className="flex flex-wrap gap-1.5 px-4 pb-3">
          {coach.years_experience ? (
            <Chip icon={<Clock size={11} aria-hidden />} label={`${coach.years_experience} yr${coach.years_experience === 1 ? '' : 's'} coaching`} bg={accentGradient('checkin')} />
          ) : null}
          {certs > 0 && (
            <Chip icon={<Award size={11} aria-hidden />} label={`${certs} certification${certs === 1 ? '' : 's'}`} bg={accentGradient('diet')} />
          )}
          {coach.specialisations.slice(0, 3).map((sp) => (
            <span key={sp} className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-[700]"
              style={{ background: rgba(spectrum.violet[500], 0.1), color: spectrum.violet[700] }}>
              {sp}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 px-4 pb-4">
        <Link href="/member/coach"
          className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[14px] text-[13px] font-[780] text-white transition-transform active:scale-[0.98]"
          style={{ background: accentGradient('plan'), boxShadow: `0 10px 22px -12px ${rgba(spectrum.pink[500], 0.7)}` }}>
          View profile
        </Link>
        <Link href="/member/messages"
          className="flex h-11 items-center justify-center gap-1.5 rounded-[14px] px-4 text-[13px] font-[750] transition-transform active:scale-[0.98]"
          style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: MC.ink }}>
          <MessageCircle size={15} aria-hidden /> Message
        </Link>
      </div>
    </m.section>
  );
}

function Chip({ icon, label, bg }: { icon: React.ReactNode; label: string; bg: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-[760] text-white" style={{ background: bg }}>
      {icon} {label}
    </span>
  );
}
