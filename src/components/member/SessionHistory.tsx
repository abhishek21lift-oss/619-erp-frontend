'use client';

// One row per session in the member's history. A session the member logged
// themselves can carry the trainer's verdict and note — this is where that
// review reaches the person it was written for.

import { useState } from 'react';
import { ChevronDown, History, Trophy } from 'lucide-react';
import { Card, MC, Section, longDate } from '@/components/member/MemberUI';
import { rgba } from '@/lib/palette';
import type { MeSession, MeSessionSet } from '@/lib/api';

function setLabel(x: MeSessionSet): string {
  if (x.weight_kg != null && x.reps != null) return `${x.weight_kg} kg × ${x.reps}`;
  if (x.reps != null) return `${x.reps} reps`;
  if (x.duration_seconds != null) {
    const min = Math.round(x.duration_seconds / 60);
    const dist = x.distance != null ? ` · ${x.distance} ${x.distance_unit ?? ''}`.trimEnd() : '';
    return `${min} min${dist}`;
  }
  if (x.distance != null) return `${x.distance} ${x.distance_unit ?? ''}`.trim();
  return x.weight_kg != null ? `${x.weight_kg} kg` : '—';
}

export default function SessionHistory({ sessions }: { sessions: MeSession[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (sessions.length === 0) return null;

  const thisMonth = new Date().toISOString().slice(0, 7);
  const doneThisMonth = sessions.filter((s) => s.status === 'completed'
    && String(s.session_date).slice(0, 7) === thisMonth).length;

  return (
    <Section title="Recent sessions"
      aside={<span className="text-[10.5px] font-[600]" style={{ color: MC.muted }}>{doneThisMonth} this month</span>}>
      <div className="space-y-2">
        {sessions.map((s) => {
          const isOpen = open === s.id;
          const prs = s.exercises.reduce((n, e) => n + e.sets.filter((x) => x.is_pr).length, 0);
          const meta = [
            s.workout_day,
            s.duration_minutes ? `${s.duration_minutes} min` : null,
            s.exercises.length ? `${s.exercises.length} exercise${s.exercises.length === 1 ? '' : 's'}` : null,
          ].filter(Boolean).join(' · ');
          return (
            <Card key={s.id}>
              <button type="button" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}
                disabled={s.exercises.length === 0}
                className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                  style={{ background: rgba(MC.primary, 0.1), color: MC.primary }}>
                  <History size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-[720]" style={{ color: MC.ink }}>
                    {longDate(s.session_date) ?? s.session_date}
                    {s.status !== 'completed' && (
                      <span className="ml-2 text-[10.5px] font-[650]" style={{ color: MC.muted }}>In progress</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[11.5px]" style={{ color: MC.muted }}>
                    {[s.source === 'member' ? 'Logged by you' : null, s.program_name, meta].filter(Boolean).join(' · ') || 'Session'}
                  </p>
                </div>
                {s.review_status && (
                  <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-[750]"
                    style={s.review_status === 'approved'
                      ? { background: rgba(MC.success, 0.14), color: MC.successText }
                      : s.review_status === 'changes_requested'
                        ? { background: 'rgba(245,158,11,0.16)', color: '#b45309' }
                        : { background: 'var(--bg-subtle)', color: MC.muted }}>
                    {s.review_status === 'approved'
                      ? 'Approved'
                      : s.review_status === 'changes_requested' ? 'Changes requested' : 'Awaiting review'}
                  </span>
                )}
                {prs > 0 && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-[750]"
                    style={{ background: rgba(MC.success, 0.14), color: MC.success }}>
                    <Trophy size={11} /> {prs} PR{prs === 1 ? '' : 's'}
                  </span>
                )}
                {s.exercises.length > 0 && (
                  <ChevronDown size={16} className="shrink-0 transition-transform"
                    style={{ color: MC.muted, transform: isOpen ? 'rotate(180deg)' : undefined }} />
                )}
              </button>
              {isOpen && (
                <div className="border-t" style={{ borderColor: 'var(--border)' }}>
                  {s.review_feedback && (
                    <div className="px-4 pt-3">
                      <p className="text-[10.5px] font-[750] uppercase tracking-[0.08em]" style={{ color: MC.muted }}>
                        Trainer feedback
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed" style={{ color: MC.ink }}>
                        {s.review_feedback}
                      </p>
                    </div>
                  )}
                  <ul className="px-4 py-2">
                    {s.exercises.map((e, i) => (
                      <li key={`${e.name}-${i}`} className="py-2">
                        <p className="text-[13px] font-[700]" style={{ color: MC.ink }}>{e.name}</p>
                        {e.sets.length > 0 ? (
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {e.sets.map((x, j) => (
                              <span key={j} className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-[650] tabular-nums"
                                style={{
                                  background: x.is_pr ? rgba(MC.success, 0.14) : 'var(--bg-subtle)',
                                  color: x.is_pr ? MC.successText : MC.ink,
                                }}>
                                {x.is_pr && <Trophy size={10} aria-label="Personal best" />}
                                {setLabel(x)}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-0.5 text-[11.5px]" style={{ color: MC.muted }}>No sets recorded</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </Section>
  );
}
