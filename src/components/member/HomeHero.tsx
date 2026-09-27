'use client';
/**
 * The top of the member's Home — who they are, where they stand, and the one
 * thing to do next, on the member app's colour mesh.
 *
 *   • avatar (to Profile), greeting and name, membership card button
 *   • a line that is about THEM: their streak, their plan running out, or an
 *     invitation when there is nothing to report yet
 *   • three numbers — week streak, visits this month, days left on the plan
 *   • Start workout, and Check in
 *
 * Every number is passed in from what the page already loaded (or null while
 * it loads, or when it failed): a dash, never an invented zero.
 */

import Link from 'next/link';
import { m } from 'framer-motion';
import { CalendarCheck, ClipboardCheck, Dumbbell, Flame, Hourglass, IdCard } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import ClientAvatar from '@/components/pt-os/ClientAvatar';
import { EASE } from './MemberUI';
import { heroMesh, spectrum } from './memberTheme';
import { rgba } from '@/lib/palette';

export type HomeHeroProps = {
  name: string;
  photoUrl: string | null;
  studio: string | null;
  /** Consecutive weeks trained; null until known. */
  streak: number | null;
  /** Studio visits this calendar month. */
  visitsThisMonth: number | null;
  /** Whole days left on the plan; null when there is no end date. */
  daysLeft: number | null;
};

/** "Good morning" / "Good afternoon" / "Good evening", on the member's own clock. */
export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

/** The first word of a name, capitalised. Null when there is no usable one. */
export function firstName(name: string | null | undefined): string | null {
  const first = (name ?? '').trim().split(/\s+/)[0];
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null;
}

/** The one line under the name. About the member, from their own numbers. */
export function heroLine({ streak, daysLeft }: Pick<HomeHeroProps, 'streak' | 'daysLeft'>): string {
  if (daysLeft === 0) return 'Your plan has ended — renew to keep going.';
  if (daysLeft != null && daysLeft <= 7) return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on your plan. Finish strong.`;
  if (streak != null && streak >= 2) return `${streak}-week streak. Keep it alive this week.`;
  if (streak === 1) return 'You trained this week. Make it two.';
  return "Let's make today count.";
}

export default function HomeHero({ name, photoUrl, studio, streak, visitsThisMonth, daysLeft }: HomeHeroProps) {
  const first = firstName(name);

  return (
    <m.section
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE }}
      aria-label="Today at a glance"
      className="relative mb-5 overflow-hidden rounded-[26px] p-4 text-white"
      style={{ background: heroMesh.base, boxShadow: `0 22px 48px -22px ${rgba(heroMesh.shadow, 0.75)}` }}
    >
      {/* The mesh: two soft glows that drift slowly. Framer honours the root
          MotionConfig, so they hold still for reduced-motion users. */}
      <m.span aria-hidden className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(heroMesh.glowA, 0.55)}, transparent 68%)` }}
        animate={{ x: [0, 18, 0], y: [0, 12, 0] }} transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }} />
      <m.span aria-hidden className="pointer-events-none absolute -bottom-28 -right-16 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, ${rgba(heroMesh.glowB, 0.5)}, transparent 68%)` }}
        animate={{ x: [0, -16, 0], y: [0, -10, 0] }} transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }} />
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.08), transparent 40%)' }} />

      {/* Who — the studio rides on the greeting line so it costs no row of its own. */}
      <div className="relative flex items-center gap-3">
        <Link href="/member/more" aria-label="Your profile"
          className="shrink-0 rounded-full p-[2px] transition-transform active:scale-95"
          style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.35))' }}>
          <ClientAvatar name={name} photoUrl={photoUrl}
            className="grid h-11 w-11 place-items-center rounded-full text-[15px] font-[820]"
            style={{ background: rgba(spectrum.indigo[700], 0.55), color: '#fff' }} />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-[650] opacity-85">
            {greeting()}{studio ? <span className="opacity-80"> · {studio}</span> : null}
          </p>
          <h1 className="truncate text-[23px] font-[850] leading-tight tracking-[-0.03em]">{first || name}</h1>
        </div>
        <Link href="/member/card" aria-label="Membership card"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full transition-transform active:scale-95"
          style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)' }}>
          <IdCard size={18} aria-hidden />
        </Link>
      </div>

      <p className="relative mt-3 text-[15px] font-[700] leading-snug">
        {heroLine({ streak, daysLeft })}
      </p>

      {/* Where they stand — one glass strip, three cells. */}
      <dl className="relative mt-3 grid grid-cols-3 overflow-hidden rounded-[16px]"
        style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
        <HeroStat icon={Flame} label="Week streak" value={streak} />
        <HeroStat icon={CalendarCheck} label="Visits this month" value={visitsThisMonth} divider />
        <HeroStat icon={Hourglass} label="Days left" value={daysLeft} divider />
      </dl>

      {/* What next */}
      <div className="relative mt-3 grid grid-cols-[1.4fr_1fr] gap-2.5">
        <Link href="/member/workout"
          className="flex h-11 items-center justify-center gap-2 rounded-[14px] text-[14px] font-[800] transition-transform active:scale-[0.98]"
          style={{ background: '#fff', color: spectrum.violet[700], boxShadow: '0 8px 20px -10px rgba(0,0,0,0.45)' }}>
          <Dumbbell size={17} aria-hidden /> Start workout
        </Link>
        <Link href="/member/checkin"
          className="flex h-11 items-center justify-center gap-2 rounded-[14px] text-[14px] font-[750] transition-transform active:scale-[0.98]"
          style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.28)' }}>
          <ClipboardCheck size={16} aria-hidden /> Check in
        </Link>
      </div>
    </m.section>
  );
}

function HeroStat({ icon: Icon, label, value, divider }: { icon: LucideIcon; label: string; value: number | null; divider?: boolean }) {
  return (
    <div className="flex flex-col-reverse items-center px-2 py-2.5 text-center"
      style={divider ? { borderLeft: '1px solid rgba(255,255,255,0.2)' } : undefined}>
      {/* dt before dd in the markup, as the list requires; column-reverse puts
          the number on top for the eye. */}
      <dt className="mt-0.5 text-[11px] font-[650] leading-tight opacity-85">{label}</dt>
      <dd className="flex items-center gap-1.5 text-[19px] font-[850] leading-none tabular-nums tracking-[-0.02em]">
        <Icon size={14} aria-hidden className="opacity-90" />
        {value == null ? '—' : value.toLocaleString('en-IN')}
      </dd>
    </div>
  );
}
