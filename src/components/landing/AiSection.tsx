'use client';

import {
  Sparkles, Dumbbell, ChefHat, FileQuestion, BookOpen, BarChart3,
  ArrowRight, ShieldCheck, UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { Container, Reveal, Section, SectionHeader } from './primitives';
import { C, SHADOW } from './tokens';

const LAYERS = [
  {
    icon: <Sparkles size={17} />,
    title: 'Workout generation',
    body: 'Generates complete, periodised programmes from a client profile, goals, PAR-Q and available equipment — in the trainer’s voice.',
    link: { href: '/ai/workout-generator', label: 'Try the workout generator' },
  },
  {
    icon: <ChefHat size={17} />,
    title: 'Diet generation',
    body: 'Nutrition plans built around the client’s goals, training load and food preferences — Indian meals included, macros tracked.',
    link: { href: '/ai/diet-generator', label: 'Try the diet generator' },
  },
  {
    icon: <BarChart3 size={17} />,
    title: 'Progress analysis',
    body: 'Reads records and measurements to show what is working — strength, adherence and body-composition trends over time.',
    link: { href: '/ai/progress-analysis', label: 'See progress analysis' },
  },
  {
    icon: <BookOpen size={17} />,
    title: 'Training knowledge base',
    body: 'A searchable science library every generation is grounded in — methodology, cues and coaching notes, not guesswork.',
    link: { href: '/ai-coach/knowledge', label: 'Browse the knowledge base' },
  },
  {
    icon: <FileQuestion size={17} />,
    title: 'Client-aware answers',
    body: 'Ask “what should Simran do about her shoulder?” and get an answer that considers her history, programme and constraints.',
    link: { href: '/ai-coach', label: 'Meet the AI Coach' },
  },
  {
    icon: <Dumbbell size={17} />,
    title: 'Exercise library',
    body: 'Hundreds of movements with cues, tempo and equipment tags — the source of every generated set, reviewable at any time.',
    link: { href: '/pt-os/exercise-library', label: 'Open the library' },
  },
];

const PRINCIPLES = [
  { icon: <ShieldCheck size={15} />, t: 'Bounded by what trainers teach', d: 'The knowledge base is seeded and reviewed by professionals.' },
  { icon: <UserRound size={15} />, t: 'Never a black box', d: 'Every AI output arrives with a “why” and a full edit trail.' },
  { icon: <Sparkles size={15} />, t: 'Drafts, not decisions', d: 'AI drafts the work. The trainer decides, edits and owns it.' },
];

/**
 * The AI Training Layer — the centrepiece story. "AI drafts. Trainers decide."
 */
export default function AiSection() {
  return (
    <Section id="ai" alt aria-labelledby="ai-title">
      <Container>
        <SectionHeader
          id="ai-title"
          eyebrow="AI Training Layer"
          title="AI drafts. Trainers decide."
          sub="MY PT STUDIO’s AI doesn’t replace coaching — it removes the hours of drafting, formatting and re-typing so trainers can spend time with clients. Every output is grounded in your studio’s knowledge, reviewable and editable."
        />

        <Reveal delay={0.08}>
          <div
            className="relative mt-14 overflow-hidden rounded-[28px] border p-6 sm:p-8"
            style={{ background: 'linear-gradient(180deg, rgba(0,103,224,0.10) 0%, rgba(14,26,46,0.4) 100%)', borderColor: C.line, boxShadow: SHADOW.panel }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, rgba(28,163,249,0.5), transparent)' }}
            />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {LAYERS.map((l, i) => (
                <Reveal key={l.title} delay={0.05 + i * 0.04} className="h-full">
                  <div
                    className="group flex h-full flex-col rounded-2xl border p-5 transition-colors duration-200"
                    style={{ background: C.panel, borderColor: C.lineSoft }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: C.blueWash, color: C.blueHi }} aria-hidden>
                        {l.icon}
                      </span>
                      <h3 className="text-[14px] font-bold tracking-[-0.01em]" style={{ color: C.ink }}>{l.title}</h3>
                    </div>
                    <p className="mt-3 flex-1 text-[12.5px] leading-[1.6]" style={{ color: C.muted }}>{l.body}</p>
                    <Link
                      href={l.link.href}
                      className="mt-4 inline-flex items-center gap-1.5 text-[12px] font-bold transition-colors"
                      style={{ color: C.blueHi }}
                    >
                      {l.link.label}
                      <ArrowRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden />
                    </Link>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* AI + Human split */}
            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              <Reveal delay={0.1} className="h-full">
                <div
                  className="flex h-full items-start gap-4 rounded-2xl border p-5"
                  style={{ background: C.panelAlt, borderColor: C.lineSoft }}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: 'rgba(28,163,249,0.14)', color: C.blueHi }} aria-hidden>
                    <Sparkles size={18} />
                  </span>
                  <div>
                    <h3 className="text-[14px] font-bold" style={{ color: C.ink }}>The AI does the heavy lifting</h3>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: C.muted }}>
                      Draft programmes, plan diets, summarise client history, spot who is at risk of churning, suggest the next
                      renewal message — in minutes, not evenings.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.16} className="h-full">
                <div
                  className="flex h-full items-start gap-4 rounded-2xl border p-5"
                  style={{ background: C.panelAlt, borderColor: C.lineSoft }}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: C.goldSoft, color: C.goldHi }} aria-hidden>
                    <UserRound size={18} />
                  </span>
                  <div>
                    <h3 className="text-[14px] font-bold" style={{ color: C.ink }}>The trainer stays the expert</h3>
                    <p className="mt-1.5 text-[12.5px] leading-[1.6]" style={{ color: C.muted }}>
                      Review, edit, personalise and send. The client sees the trainer’s name — the AI never talks to clients directly.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Principles */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 border-t pt-6" style={{ borderColor: C.lineSoft }}>
              {PRINCIPLES.map((p) => (
                <div key={p.t} className="flex items-center gap-2.5">
                  <span aria-hidden style={{ color: C.goldHi }}>{p.icon}</span>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: C.ink }}>{p.t}</p>
                    <p className="text-[10.5px] font-medium" style={{ color: C.faint }}>{p.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}