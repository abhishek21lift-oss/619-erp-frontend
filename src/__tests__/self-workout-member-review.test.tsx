// The member's history is where the trainer's verdict lands. Before this,
// review_feedback was fetched and never shown — the feedback loop ended at the
// API. This pins the two visible facts: the decision, and the note.

import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import SessionHistory from '@/components/member/SessionHistory';
import type { MeSession } from '@/lib/api';

const session = {
  id: 'ws1',
  session_date: '2026-11-12',
  program_name: 'Strength',
  workout_day: 'Thursday',
  duration_minutes: 52,
  status: 'completed',
  source: 'member',
  review_status: 'changes_requested',
  review_feedback: 'Good depth — slow the eccentric next time.',
  exercises: [{ name: 'Squat', sets: [{ weight_kg: 60, reps: 8, is_pr: false }] }],
} as unknown as MeSession;

describe('member session history review', () => {
  it('shows the trainer decision and feedback', () => {
    render(<SessionHistory sessions={[session]} />);
    expect(screen.getByText(/changes requested/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /12 Nov|November|2026/i }));
    expect(screen.getByText(/good depth — slow the eccentric next time/i)).toBeInTheDocument();
  });

  it('does not call an abandoned session "In progress"', () => {
    render(<SessionHistory sessions={[{
      ...session, status: 'abandoned', review_status: null, review_feedback: null,
    }]} />);
    expect(screen.getByText('Abandoned')).toBeInTheDocument();
    expect(screen.queryByText('In progress')).not.toBeInTheDocument();
  });

  // session_date is the studio's day. A phone in another zone would otherwise
  // count the 1st of the month in the previous month's total.
  it('counts the studio month when the page passes one', () => {
    render(<SessionHistory sessions={[session]} today="2026-11-30" />);
    expect(screen.getByText('1 this month')).toBeInTheDocument();
  });

  it('does not count a session from another studio month', () => {
    render(<SessionHistory sessions={[session]} today="2026-12-01" />);
    expect(screen.getByText('0 this month')).toBeInTheDocument();
  });
});
