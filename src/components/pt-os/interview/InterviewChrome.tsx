'use client';

// The Client Interview's hero and its section navigator.
//
// The hero is the profile's colour mesh — the client profile a trainer comes
// from and this page share one family — with an activity ring for how many
// questions have an answer. The navigator is a row of tone pills that jump to
// each question and tick off in emerald as they are answered.

import { m, useReducedMotion } from 'framer-motion';
import { Check, MessagesSquare } from 'lucide-react';
import { PageHero } from '@/components/ui';
import { semantic } from '@/lib/palette';
import { gradient, heroMesh, ringStops, tones } from '@/components/profile/profileTheme';
import { INTERVIEW_QUESTIONS, type Answers } from './questions';

/** The hero surface: the profile mesh, with its two glows. */
const HERO_SURFACE = {
  background: [
    `radial-gradient(circle 300px at 8% 115%, ${heroMesh.glowA}, transparent 70%)`,
    `radial-gradient(circle 260px at calc(100% - 40px) -30px, ${heroMesh.glowB}, transparent 70%)`,
    heroMesh.base,
  ].join(', '),
  shadow: 'rgba(124,58,237,0.45)',
};

function AnsweredRing({ answered, total, size = 76 }: { answered: number; total: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img"
        aria-label={`${answered} of ${total} questions answered`}>
        <defs>
          <linearGradient id="interview-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ringStops[0]} />
            <stop offset="60%" stopColor={ringStops[1]} />
            <stop offset="100%" stopColor={ringStops[2]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#interview-ring)" strokeWidth={stroke}
          strokeLinecap="round" pathLength={100} strokeDasharray={`${pct} 100`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <span aria-hidden className="absolute inset-0 flex flex-col items-center justify-center leading-none text-white">
        <span className="text-[20px] font-[820] tabular-nums tracking-[-0.02em]">{answered}</span>
        <span className="mt-0.5 text-[10px] font-[700] opacity-80">of {total}</span>
      </span>
    </div>
  );
}

export function InterviewHero({ clientName, answers, answered, resumed }: {
  clientName: string;
  answers: Answers;
  answered: number;
  /** A saved draft was picked up, rather than a fresh interview started. */
  resumed: boolean;
}) {
  const total = INTERVIEW_QUESTIONS.length;
  return (
    <PageHero
      icon={<MessagesSquare size={20} />}
      title={`${clientName} · Client Interview`}
      subtitle={resumed ? 'Resuming a saved draft' : 'Get to know your client before the first session'}
      surface={HERO_SURFACE}
    >
      <div className="flex items-center gap-4 rounded-[20px] p-3 sm:p-3.5"
        style={{ background: 'rgba(255,255,255,0.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)', backdropFilter: 'blur(14px)' }}>
        <AnsweredRing answered={answered} total={total} />
        <div className="min-w-0 flex-1 text-white">
          <p className="text-[10.5px] font-[800] uppercase tracking-[0.14em] opacity-80">Step 4 of the intake journey</p>
          <p className="mt-1 text-[15px] font-[760] leading-snug">
            {answered === 0 ? 'Seven questions, in the order you ask them'
              : answered === total ? 'Every question answered'
              : `${total - answered} question${total - answered === 1 ? '' : 's'} to go`}
          </p>
          {/* Seven bars, one per question, in its own tone — a glance tells
              which ones are still open. */}
          <div className="mt-2 flex gap-1" aria-hidden>
            {INTERVIEW_QUESTIONS.map((q) => (
              <span key={q.key} className="h-1.5 flex-1 rounded-full transition-opacity duration-300"
                style={{ background: answers[q.key].trim() ? gradient(tones[q.tone], 90) : 'rgba(255,255,255,0.25)' }} />
            ))}
          </div>
          <p className="mt-1.5 text-[11px] opacity-75">Optional — it never blocks enrolment.</p>
        </div>
      </div>
    </PageHero>
  );
}

/**
 * Tone pills that jump to each question — a swipeable row on a phone, a
 * wrapping table of contents on wider screens. Not sticky: the shell's main
 * column is its own overflow container that never scrolls (the window does),
 * so `position: sticky` inside a page never engages.
 */
export function SectionNav({ answers }: { answers: Answers }) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Interview questions">
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {INTERVIEW_QUESTIONS.map((q, i) => {
          const t = tones[q.tone];
          const done = answers[q.key].trim().length > 0;
          return (
            <li key={q.key} className="shrink-0">
              <m.a href={`#q-${q.key}`}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                onClick={(e) => {
                  // Smooth in-page scroll without pushing a history entry per tap.
                  e.preventDefault();
                  document.getElementById(`q-${q.key}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-[700] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{ background: 'var(--bg-card, var(--bg-elevated))', border: '1px solid var(--border)', color: 'var(--text-primary)', outlineColor: t.from }}
                aria-label={`${i + 1}. ${q.label}${done ? ', answered' : ''}`}>
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{ background: done ? semantic.success : gradient(t) }}>
                  {done ? <Check size={11} strokeWidth={3.2} /> : <span className="text-[9.5px] font-[800]">{i + 1}</span>}
                </span>
                {q.label}
              </m.a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
