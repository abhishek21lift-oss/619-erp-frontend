'use client';

// The Client Interview's compact hero and its section navigator.
//
// The hero is the client profile's colour mesh — the page a trainer arrives
// from and this one read as one family — compressed into a single band. The
// ring says how far the interview has got without spending height on a
// full-width stat block, and the strip underneath shows which answers are in.
// The navigator is a row of tone pills that jump to each topic and tick off in
// emerald once it is complete.

import { useId } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Check, MessagesSquare } from 'lucide-react';
import { rgba, semantic } from '@/lib/palette';
import { gradient, heroMesh, ringStops, tones } from '@/components/profile/profileTheme';
import {
  INTERVIEW_FIELDS, INTERVIEW_QUESTIONS, topicAnswered, topicComplete, type Answers,
} from './questions';

/** The profile mesh, a shade deeper so white type clears AA on the warm end. */
const HERO_BACKGROUND = [
  `radial-gradient(circle 240px at 6% 120%, ${heroMesh.glowA}, transparent 72%)`,
  `radial-gradient(circle 220px at 100% -30%, ${heroMesh.glowB}, transparent 72%)`,
  'linear-gradient(125deg, rgba(15,23,42,0.12) 0%, rgba(15,23,42,0.10) 45%, rgba(15,23,42,0.30) 100%)',
  heroMesh.base,
].join(', ');

function AnsweredRing({ answered, total }: { answered: number; total: number }) {
  const size = 54;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const percent = total ? Math.round((answered / total) * 100) : 0;
  // SVG ids cannot carry React's colons without escaping the url() reference.
  const gradientId = `interview-ring-${useId().replace(/:/g, '')}`;
  return (
    <div aria-hidden className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={ringStops[0]} />
            <stop offset="55%" stopColor={ringStops[1]} />
            <stop offset="100%" stopColor={ringStops[2]} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke="rgba(255,255,255,0.24)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradientId})`} strokeWidth={stroke} strokeLinecap="round"
          pathLength={100} strokeDasharray={`${percent} 100`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray 600ms cubic-bezier(0.16,1,0.3,1)' }} />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none text-white">
        <span className="text-[16px] font-[850] tabular-nums tracking-[-0.03em]">{answered}</span>
        <span className="mt-[2px] text-[8px] font-[750] uppercase tracking-[0.06em] opacity-80">of {total}</span>
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
  const reduce = useReducedMotion();
  const total = INTERVIEW_FIELDS.length;
  const done = answered === total;
  const remaining = total - answered;

  return (
    <m.header
      initial={reduce ? false : { opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-[26px] px-4 py-4 text-white sm:px-5 sm:py-[18px]"
      style={{
        background: HERO_BACKGROUND,
        border: '1px solid rgba(255,255,255,0.18)',
        boxShadow: `0 12px 28px -18px rgba(15,23,42,0.28), 0 16px 36px -28px ${rgba(tones.violet.to, 0.45)}, inset 0 1px 0 rgba(255,255,255,0.18)`,
      }}
    >
      {/* Top sheen and a deeper bottom edge for depth without a blurred child
          (WebKit clips filtered children to a rectangle — see ProfileHero). */}
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.14), transparent 44%, rgba(15,23,42,0.18))' }} />
      {/* One pass of light on arrival, not a loop: this page is opened to be
          filled in, not watched. */}
      {!reduce && (
        <m.span aria-hidden className="pointer-events-none absolute inset-y-[-40%] left-0 w-1/3 -rotate-12"
          initial={{ x: '-160%' }}
          animate={{ x: '420%' }}
          transition={{ duration: 1.1, delay: 0.35, ease: 'easeInOut' }}
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />
      )}

      <div className="relative flex items-center gap-3">
        <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px]"
          style={{
            background: 'rgba(255,255,255,0.18)',
            border: '1px solid rgba(255,255,255,0.28)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.25)',
          }}>
          <MessagesSquare size={19} strokeWidth={2.2} />
        </span>

        <div className="min-w-0 flex-1">
          <p className="truncate whitespace-nowrap text-[9.5px] font-[800] uppercase tracking-[0.16em] text-white/70">
            Client interview · step 4
          </p>
          <h1 className="mt-0.5 truncate text-[21px] font-[860] leading-tight tracking-[-0.025em] sm:text-[23px]">
            {clientName}
          </h1>
          <p className="mt-0.5 truncate text-[11.5px] font-[560] text-white/85 sm:text-[12px]">
            {done ? <>{`All ${total} answers captured`}<span className="hidden sm:inline"> — ready to complete</span></>
              : resumed ? <>{'Resumed from your draft'}<span className="hidden sm:inline">{` · ${remaining} ${remaining === 1 ? 'answer' : 'answers'} left`}</span></>
              : <>{`${INTERVIEW_QUESTIONS.length} topics · ${total} answers`}<span className="hidden sm:inline"> · optional, never blocks enrolment</span></>}
          </p>
        </div>

        <span className="grid h-[60px] w-[60px] shrink-0 place-items-center rounded-full"
          style={{
            background: 'rgba(15,23,42,0.26)',
            border: '1px solid rgba(255,255,255,0.24)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
          }}>
          <AnsweredRing answered={answered} total={total} />
        </span>
      </div>

      {/* Filled = answered, dimmed = open, so the trainer can see at a glance
          what is still missing. */}
      <div role="progressbar" aria-valuemin={0} aria-valuenow={answered} aria-valuemax={total}
        aria-label="Interview progress" className="relative mt-3">
        <div aria-hidden className="flex gap-1">
          {INTERVIEW_QUESTIONS.flatMap((q) => q.controls.map((c) => {
            const filled = (answers[c.key] ?? '').trim() !== '';
            return (
              <span key={c.key} className="h-[5px] flex-1 rounded-full transition-all duration-300"
                style={{
                  background: filled ? gradient(tones[q.tone], 90) : 'rgba(255,255,255,0.22)',
                  boxShadow: filled ? `0 0 10px -1px ${tones[q.tone].glow}` : undefined,
                }} />
            );
          }))}
        </div>
      </div>
    </m.header>
  );
}

/**
 * Tone pills that jump to each topic — a swipeable row on a phone, a
 * wrapping table of contents on wider screens. Not sticky: the shell's main
 * column is its own overflow container that never scrolls (the window does),
 * so `position: sticky` inside a page never engages.
 */
export function SectionNav({ answers }: { answers: Answers }) {
  const reduce = useReducedMotion();
  return (
    <nav aria-label="Interview topics">
      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible [&::-webkit-scrollbar]:hidden">
        {INTERVIEW_QUESTIONS.map((q, i) => {
          const tone = tones[q.tone];
          const done = topicComplete(q, answers);
          const started = topicAnswered(q, answers);
          return (
            <li key={q.id} className="shrink-0">
              <m.a href={`#q-${q.id}`}
                whileTap={reduce ? undefined : { scale: 0.96 }}
                onClick={(e) => {
                  // Smooth in-page scroll without pushing a history entry per tap.
                  e.preventDefault();
                  document.getElementById(`q-${q.id}`)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
                }}
                className="flex items-center gap-1.5 rounded-full py-1.5 pl-1.5 pr-3 text-[12px] font-[700] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: done ? rgba(semantic.success, 0.10) : started ? tone.wash : 'var(--bg-card, var(--bg-elevated))',
                  border: `1px solid ${done ? rgba(semantic.success, 0.28) : started ? rgba(tone.from, 0.24) : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                  outlineColor: tone.from,
                  boxShadow: started && !done ? `0 6px 14px -12px ${tone.glow}` : undefined,
                }}>
                <span aria-hidden className="flex h-5 w-5 items-center justify-center rounded-full text-white"
                  style={{
                    background: done ? semantic.success : gradient(tone),
                    boxShadow: `0 4px 10px -5px ${done ? rgba(semantic.success, 0.7) : tone.glow}`,
                  }}>
                  {done ? <Check size={11} strokeWidth={3.2} /> : <span className="text-[9.5px] font-[800]">{i + 1}</span>}
                </span>
                {/* The visible label is the link's name — no aria-label, which
                    would also make each pill a match for getByLabel(control)
                    beside the select it points at. */}
                {q.label}
                {done && <span className="sr-only">, answered</span>}
              </m.a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
