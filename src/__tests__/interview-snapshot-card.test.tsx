// The client profile's interview snapshot: what the trainer sees before
// designing a session. Missing is unknown, not "none", and the client's
// answers are labelled apart from the trainer's own summary.

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockList = vi.fn();
vi.mock('@/lib/api', () => ({ api: { pt: { interviews: { list: (...a: unknown[]) => mockList(...a) } } } }));

import InterviewSnapshotCard from '@/components/pt-os/client/InterviewSnapshotCard';

beforeEach(() => { mockList.mockReset(); });

describe('InterviewSnapshotCard', () => {
  it('summarises a draft and offers to continue it', async () => {
    mockList.mockResolvedValue({ data: [{
      id: 'iv-1', status: 'draft', updated_at: '2026-10-22T09:00:00Z',
      previous_workout_experience: 'beginner',
      training_history: 'Two years of home workouts',
      training_challenges: ['time', 'gym_access'],
      notes: 'Knees flare on deep lunges',
    }] });

    render(<InterviewSnapshotCard clientId="c1" />);
    expect(await screen.findByText('Draft')).toBeTruthy();
    expect(screen.getByText('Beginner · Two years of home workouts')).toBeTruthy();
    expect(screen.getByText('Time, Gym access')).toBeTruthy();
    expect(screen.getByText('Knees flare on deep lunges')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Continue draft/ }))
      .toHaveAttribute('href', '/pt-os/interview?client_id=c1');
  });

  it('opens a completed interview for review, and says whose words are whose', async () => {
    mockList.mockResolvedValue({ data: [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      notes: 'Knees flare on deep lunges',
    }] });

    render(<InterviewSnapshotCard clientId="c1" />);
    expect(await screen.findByText('Completed')).toBeTruthy();
    expect(screen.getByText('Trainer summary')).toBeTruthy();
    // The unanswered answers are unknown, never "no barriers".
    expect(screen.getAllByText('Not recorded').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Review and edit/ })).toBeTruthy();
  });

  it('says no interview exists yet, and distinguishes a failed read', async () => {
    mockList.mockResolvedValue({ data: [] });
    const first = render(<InterviewSnapshotCard clientId="c1" />);
    expect(await screen.findByText('Start the interview')).toBeTruthy();
    expect(screen.getByText(/No interview recorded yet/)).toBeTruthy();
    first.unmount();

    mockList.mockRejectedValue(new Error('offline'));
    render(<InterviewSnapshotCard clientId="c1" />);
    expect(await screen.findByText(/could not be loaded/)).toBeTruthy();
  });
});
