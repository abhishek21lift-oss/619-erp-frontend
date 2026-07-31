// The WhatsApp summary a trainer sends a client.
//
// This is the only string in the app that leaves it and lands in someone's
// personal messages, under their coach's name. So what matters is not that it
// formats nicely but that it never contains something the client cannot check
// or the trainer did not say.

import { describe, it, expect } from 'vitest';
import { composeMessage } from '@/components/pt-os/analytics/WeeklyReport';
import type { TrainingAnalytics } from '@/lib/api';

const stats = (over: Partial<TrainingAnalytics> = {}): TrainingAnalytics => ({
  as_of: '2026-07-30',
  weeks: 12,
  plan: { id: 'p-1', name: 'Upper / Lower', duration_weeks: 12 },
  adherence: { planned: 3, completed: 2, pct: 67, weeks: [] },
  this_week: null,
  prs: [],
  muscles: [],
  unattributed_sets: 0,
  ...over,
});

describe('composeMessage', () => {
  it('reports attendance as the counts, not just a percentage', () => {
    // "67%" alone invites an argument. "2 of 3" is checkable against a diary.
    expect(composeMessage({ clientName: 'Priya', stats: stats() })).toContain('2 of 3');
  });

  it('says nothing about attendance when there is no programme', () => {
    // No target means no figure. A "0 of 0" would read as a failure.
    const msg = composeMessage({
      clientName: 'Priya',
      stats: stats({ adherence: { planned: 0, completed: 0, pct: null, weeks: [] } }),
    });
    expect(msg).not.toMatch(/Sessions:/);
  });

  it('lists at most three records', () => {
    // A message with eleven bullet points is scrolled past, not read.
    const prs = Array.from({ length: 11 }, (_, i) => ({
      session_date: '2026-07-28', exercise_name: `Lift ${i}`, weight_kg: 50 + i, reps: 5,
      kinds: ['weight' as const],
    }));
    const msg = composeMessage({ clientName: 'Priya', stats: stats({ prs }) });
    expect(msg.match(/^• /gm) ?? []).toHaveLength(3);
  });

  it('carries the trainer\'s note verbatim', () => {
    // The note is the only opinion in the message and it must arrive as
    // written — not summarised, not rephrased.
    const note = 'Knee held up all week. Adding a set to squats next block.';
    expect(composeMessage({ clientName: 'Priya', stats: stats(), note })).toContain(note);
  });

  it('invents no praise, score or projection — at ANY attendance', () => {
    // Everything in the message has to be something the client can verify. A
    // generated compliment reads as a judgement from their coach that their
    // coach never made.
    //
    // Both ends of the range, because praise is only ever added to the GOOD
    // week: an earlier version of this test checked a 33% week alone, and a
    // "Great work this week!" line gated on pct >= 60 passed it untouched.
    for (const pct of [0, 33, 67, 100]) {
      const msg = composeMessage({
        clientName: 'Priya',
        stats: stats({ adherence: { planned: 3, completed: Math.round(pct / 33), pct, weeks: [] } }),
      }).toLowerCase();
      for (const word of ['great', 'excellent', 'well done', 'on track', 'behind', 'ahead of', 'keep it up', 'score', 'grade', 'nice']) {
        expect(msg, `pct ${pct} leaked "${word}"`).not.toContain(word);
      }
    }
  });

  it('contains no link, because the client cannot open one', () => {
    // The PDF is behind the studio session and clients have no login. A URL
    // here would send every client a sign-in page.
    const msg = composeMessage({ clientName: 'Priya', stats: stats() });
    expect(msg).not.toMatch(/https?:\/\//);
    expect(msg).not.toMatch(/\/uploads\//);
  });

  it('still composes when there are no stats at all', () => {
    // The button exists before the analytics call returns; a crash here would
    // take the page down rather than send a shorter message.
    expect(composeMessage({ clientName: 'Priya', stats: null })).toContain('Priya');
  });

  it('copes with a client whose name is unknown', () => {
    expect(composeMessage({ clientName: null, stats: stats() })).toMatch(/^Here is your training week/);
  });
});
