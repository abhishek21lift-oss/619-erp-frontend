// The Client Interview, as a set of selects (2026-10-19).
//
// The interview now asks seven topics — eight answers, because smoking and
// alcohol are captured independently — and every answer is chosen from a
// select whose value is already the canonical one the server stores. The page
// must still resume a saved draft, save only what it asks for (the older
// free-text answers stay on the record), refuse to complete an empty
// interview, and hand off to the Fitness Assessment. The progress the trainer
// can see — the bar in the hero, the topic pills, the count on the action bar
// — must agree with what is actually chosen.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INTERVIEW_FIELDS, INTERVIEW_QUESTIONS } from '@/components/pt-os/interview/questions';

const mockPush = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
let mockDrafts: unknown[] = [];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('client_id=c1'),
}));
vi.mock('@/components/Guard', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useAutoSaveDraft', () => ({ useAutoSaveDraft: () => ({ restore: () => null, clear: vi.fn() }) }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }) }));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      client: async () => ({ data: { name: 'Mina Rao' } }),
      interviews: {
        list: async () => ({ data: mockDrafts }),
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
      },
    },
  },
}));

// framer-motion's whileInView needs an IntersectionObserver; jsdom has none.
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as unknown as { IntersectionObserver: typeof IO }).IntersectionObserver = IO;

import InterviewPage from '@/app/(chrome)/pt-os/interview/page';

const controls = () => INTERVIEW_QUESTIONS.flatMap((q) => q.controls);
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const answeredCount = () =>
  screen.getByRole('progressbar', { name: 'Interview progress' }).getAttribute('aria-valuenow');
/** The hero's heading: the client the interview belongs to. */
const clientHeading = () => screen.findByText('Mina Rao');

beforeEach(() => {
  mockDrafts = [];
  mockPush.mockReset();
  mockCreate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  mockUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
});

describe('<InterviewPage />', () => {
  it('asks every topic, in order, each answer as its own labelled select', async () => {
    render(<InterviewPage />);
    await clientHeading();

    // Seven topics, one pill each; the smoking topic carries two answers.
    expect(INTERVIEW_QUESTIONS).toHaveLength(7);
    expect(INTERVIEW_FIELDS).toHaveLength(8);

    const nav = screen.getByRole('navigation', { name: 'Interview topics' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href')))
      .toEqual(INTERVIEW_QUESTIONS.map((q) => `#q-${q.id}`));

    // Each answer is the only thing its label names (the e2e suite finds
    // fields with getByLabel), and it starts unanswered.
    for (const c of controls()) {
      const el = select(c.label);
      expect(el.value).toBe('');
      expect(within(el).getByRole('option', { name: 'Not provided' })).toBeTruthy();
    }
    // Smoke and drink are two independent columns, not one answer.
    expect(select('Smoking')).not.toBe(select('Alcohol'));
    // Rendering seven cards of selects and reading every option's accessible
    // name is slow in jsdom; the default 5s budget is not this test's to spend
    // on a loaded machine.
  }, 20_000);

  it('opens on a hero that says whose interview this is, and how far it has got', async () => {
    render(<InterviewPage />);
    await clientHeading();

    // The hero's own progress: what is answered, out of every answer there is.
    const bar = screen.getByRole('progressbar', { name: 'Interview progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe(String(INTERVIEW_FIELDS.length));
    // The page names itself in the hero, so the trainer knows which step of
    // the intake journey they are in.
    expect(screen.getByText(/client interview · step 4/i)).toBeTruthy();
  });

  it('starts with nothing chosen, and cannot complete an empty interview', async () => {
    render(<InterviewPage />);
    await clientHeading();
    const complete = screen.getByRole('button', { name: 'Complete interview' }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
    expect(answeredCount()).toBe('0');

    // Choosing counts; the "Not provided" placeholder is the unanswered state.
    fireEvent.change(select('Smoking'), { target: { value: 'never' } });
    expect(answeredCount()).toBe('1');
    // Half a topic is not a finished topic: the pill only ticks once every
    // answer it asks for is in.
    expect(screen.getByRole('link', { name: 'Smoking & alcohol' })).toBeTruthy();

    fireEvent.change(select('Alcohol'), { target: { value: 'occasionally' } });
    expect(answeredCount()).toBe('2');
    expect(screen.getByRole('link', { name: 'Smoking & alcohol, answered' })).toBeTruthy();
    expect(complete.disabled).toBe(false);
  });

  it('resumes a saved draft, trims Postgres\' numeric scale, and leaves untouched fields alone', async () => {
    // lifestyle_sitting_hours is NUMERIC(4,1): a stored 7 arrives as '7.0'.
    mockDrafts = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', lifestyle_occupation: 'desk_job', lifestyle_sitting_hours: '7.0' }];
    render(<InterviewPage />);
    expect(await screen.findByText(/Resumed from your draft/)).toBeTruthy();
    expect(select('Type of work').value).toBe('desk_job');
    expect(select('Sitting hours').value).toBe('7');

    // Nothing was edited, so nothing is written: the update carries the
    // status and no columns at all.
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0]).toBe('iv-9');
    expect(mockUpdate.mock.calls[0][1]).toEqual({ status: 'draft' });
  });

  it('writes only what the trainer changed, and never the older free-text columns', async () => {
    render(<InterviewPage />);
    await clientHeading();
    fireEvent.change(select('Smoking'), { target: { value: 'former' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete interview' }));

    expect(await screen.findByText('Interview complete')).toBeTruthy();
    const body = mockCreate.mock.calls[0][1] as Record<string, unknown>;
    expect(mockCreate.mock.calls[0][0]).toBe('c1');
    // One changed answer, and the status. The API reads an empty string as
    // "clear this column", so an unchanged field is omitted, not sent blank.
    expect(body).toEqual({ lifestyle_smoking: 'former', status: 'completed' });
    // The free-text columns this form no longer asks for are not sent at all,
    // so whatever an earlier interview recorded survives.
    for (const text of ['training_history', 'pain_and_injuries', 'lifestyle', 'motivation', 'availability', 'preferences', 'notes']) {
      expect(body).not.toHaveProperty(text);
    }

    const covered = screen.getByRole('list', { name: 'Topics covered' });
    expect(within(covered).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Smoking & alcohol']);

    fireEvent.click(screen.getByRole('button', { name: /continue to fitness assessment/i }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/assessment?client_id=c1');
  });

  it('leaves an answer this form cannot show exactly as the record holds it', async () => {
    // An interview written before these selects existed: the occupation as
    // free text, and numbers that are not one of the bands.
    mockDrafts = [{
      id: 'iv-legacy', status: 'draft', updated_at: '2026-09-01T10:00:00Z',
      lifestyle_occupation: 'Software engineer', lifestyle_sitting_hours: '7.5', lifestyle_sleep_hours: '7',
    }];
    render(<InterviewPage />);
    expect(await screen.findByText(/Resumed from your draft/)).toBeTruthy();

    fireEvent.change(select('Smoking'), { target: { value: 'daily' } });
    // The three stored answers still count as answers.
    expect(answeredCount()).toBe('4');
    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    expect(mockUpdate.mock.calls[0][1]).toEqual({ lifestyle_smoking: 'daily', status: 'draft' });
  });
});
