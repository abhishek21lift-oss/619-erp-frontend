// "Draft with AI" on the weekly report's client note.
//
// The file this belongs to (WeeklyReport.tsx) is explicit that the note has
// to be the trainer's own opinion — no arithmetic-generated judgement sent as
// if a person meant it. Drafting with AI must not relax that: it can only
// ever pre-fill the editable textarea, never build or share anything by
// itself, and a trainer who never touches the button gets exactly today's
// behavior (blank note, unaffected by whatever the generator would have said).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';

const analyzeProgress = vi.fn();
const weeklyReport = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    ai: { analyzeProgress: (...a: unknown[]) => analyzeProgress(...a) },
    progress: { workoutLog: { weeklyReport: (...a: unknown[]) => weeklyReport(...a) } },
  },
}));

const toastError = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: vi.fn(), warning: vi.fn() } }),
}));

import WeeklyReport from '@/components/pt-os/analytics/WeeklyReport';

beforeEach(() => {
  analyzeProgress.mockReset();
  weeklyReport.mockReset();
  toastError.mockReset();
});
afterEach(() => cleanup());

const STATS = { adherence: { completed: 3, planned: 4 }, prs: [] } as any;

describe('Draft with AI', () => {
  it('fills the note with the drafted motivation message, and nothing else happens', async () => {
    analyzeProgress.mockResolvedValue({ data: { motivation_message: 'Great consistency this week, keep it up!' } });
    render(<WeeklyReport clientId="c1" clientName="Ajeet" stats={STATS} />);

    fireEvent.click(screen.getByText('Draft with AI'));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/what you want them to take/i)).toHaveValue(
        'Great consistency this week, keep it up!',
      );
    });
    expect(analyzeProgress).toHaveBeenCalledWith('c1');
    // Drafting is display-only — it must never itself build or share the report.
    expect(weeklyReport).not.toHaveBeenCalled();
  });

  it('a blank note is untouched until the button is pressed', () => {
    render(<WeeklyReport clientId="c1" clientName="Ajeet" stats={STATS} />);
    expect(screen.getByPlaceholderText(/what you want them to take/i)).toHaveValue('');
    expect(analyzeProgress).not.toHaveBeenCalled();
  });

  it('still lets the trainer edit the drafted text before it is used', async () => {
    analyzeProgress.mockResolvedValue({ data: { motivation_message: 'Drafted line.' } });
    render(<WeeklyReport clientId="c1" clientName="Ajeet" stats={STATS} />);

    fireEvent.click(screen.getByText('Draft with AI'));
    const textarea = await screen.findByDisplayValue('Drafted line.');
    fireEvent.change(textarea, { target: { value: 'My own edited note.' } });
    expect(screen.getByPlaceholderText(/what you want them to take/i)).toHaveValue('My own edited note.');
  });

  it('reports an error rather than silently leaving the note unchanged', async () => {
    analyzeProgress.mockRejectedValue(new Error('AI unavailable'));
    render(<WeeklyReport clientId="c1" clientName="Ajeet" stats={STATS} />);

    fireEvent.click(screen.getByText('Draft with AI'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.getByPlaceholderText(/what you want them to take/i)).toHaveValue('');
  });

  it('an empty motivation message is reported, not silently accepted as a blank draft', async () => {
    analyzeProgress.mockResolvedValue({ data: { motivation_message: '' } });
    render(<WeeklyReport clientId="c1" clientName="Ajeet" stats={STATS} />);

    fireEvent.click(screen.getByText('Draft with AI'));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
