// The Client Interview, as four conversation sections (2026-11-01).
//
// The screen asks work & lifestyle, training background, training challenges and
// an interview summary. Occupation, screen time and activity are read-only here
// because the Lifestyle Assessment owns them; showing an editable second copy
// is how two answers start to disagree.
//
// What these tests protect:
//   · the four sections, in order, and the conditional fields inside them;
//   · progress that counts only what is on screen;
//   · a save that writes only what changed, so legacy columns this form does
//     not ask survive;
//   · a completed interview that can be corrected in place, and a "start new"
//     that keeps the old record;
//   · the client's words and the trainer's summary staying labelled apart.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INTERVIEW_SECTIONS } from '@/components/pt-os/interview/questions';

const mockPush = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockToast = { info: vi.fn(), error: vi.fn(), success: vi.fn() };
let mockInterviews: unknown[] = [];
let mockLifestyle: unknown[] = [];

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('client_id=c1'),
}));
vi.mock('@/components/Guard', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useAutoSaveDraft', () => ({ useAutoSaveDraft: () => ({ restore: () => null, clear: vi.fn() }) }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: mockToast }) }));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      client: async () => ({ data: { name: 'Mina Rao' } }),
      journey: async () => ({
        data: {
          steps: [
            { key: 'welcome_tour', state: 'done' },
            { key: 'enrolment', state: 'done' },
            { key: 'consent', state: 'done' },
            { key: 'parq', state: 'done' },
            { key: 'interview', state: 'done', optional: true },
            { key: 'goals', state: 'done' },
            { key: 'assessment', state: 'todo' },
            { key: 'program_design', state: 'todo' },
          ],
          next: 'assessment',
          screening: {},
        },
      }),
      interviews: {
        list: async () => ({ data: mockInterviews }),
        create: (...a: unknown[]) => mockCreate(...a),
        update: (...a: unknown[]) => mockUpdate(...a),
      },
    },
    progress: {
      lifestyleAssessments: {
        list: async () => ({ data: mockLifestyle }),
      },
    },
  },
}));

// framer-motion's whileInView needs an IntersectionObserver; jsdom has none.
class IO { observe() {} unobserve() {} disconnect() {} takeRecords() { return []; } }
(globalThis as unknown as { IntersectionObserver: typeof IO }).IntersectionObserver = IO;

import InterviewPage from '@/app/(chrome)/pt-os/interview/page';

const textField = (label: string) => screen.getByLabelText(label) as HTMLTextAreaElement;
const select = (label: string) => screen.getByLabelText(label) as HTMLSelectElement;
const answeredCount = () =>
  screen.getByRole('progressbar', { name: 'Interview progress' }).getAttribute('aria-valuenow');
const clientHeading = () => screen.findByText("Mina Rao's Interview");

beforeEach(() => {
  mockInterviews = [];
  mockLifestyle = [];
  mockPush.mockReset();
  mockToast.info.mockReset();
  mockToast.error.mockReset();
  mockToast.success.mockReset();
  mockCreate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  mockUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
});

describe('<InterviewPage />', () => {
  it('asks four sections, in order, under the read-only work profile', async () => {
    render(<InterviewPage />);
    await clientHeading();

    expect(INTERVIEW_SECTIONS).toHaveLength(4);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent))
      .toEqual(['Work profile', ...INTERVIEW_SECTIONS.map((s) => s.prompt)]);

    // The anchor nav names the same four sections, so a long form has a way
    // back to the one being answered.
    const nav = screen.getByRole('navigation', { name: 'Interview sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent?.replace(/\d+\/\d+$/, '').trim()))
      .toEqual(INTERVIEW_SECTIONS.map((s) => s.label));
  }, 20_000);

  it('shows the Lifestyle Assessment facts read-only, with the way to change them', async () => {
    mockLifestyle = [{
      occupation_type: 'desk_job',
      screen_time_bracket: '6_8',
      daily_steps_bracket: '5000_8000',
    }];
    render(<InterviewPage />);
    await clientHeading();

    const source = screen.getByRole('region', { name: 'Work profile' });
    expect(within(source).getByText('Desk job')).toBeTruthy();
    expect(within(source).getByText('6 – 8 hours')).toBeTruthy();
    expect(within(source).getByText('Moderately Active')).toBeTruthy();
    expect(within(source).getByRole('link', { name: /edit/i }).getAttribute('href'))
      .toBe('/pt-os/lifestyle-assessment?client_id=c1');
    // Read-only means exactly that: there is no Occupation or Screen time control.
    expect(screen.queryByLabelText('Occupation')).toBeNull();
    expect(screen.queryByLabelText('Screen time')).toBeNull();
  });

  it('starts at 0 of 12 visible answers and cannot complete an empty interview', async () => {
    render(<InterviewPage />);
    await clientHeading();

    const bar = screen.getByRole('progressbar', { name: 'Interview progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    // 13 stored fields, but the occupation detail is conditional and hidden
    // until the Lifestyle Assessment says "other", and the challenge detail
    // until the Other chip is chosen.
    expect(bar.getAttribute('aria-valuemax')).toBe('12');
    expect(screen.getByText(/client interview · step 4/i)).toBeTruthy();

    const complete = screen.getByRole('button', { name: 'Complete interview' }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);

    fireEvent.change(textField('Job details'), { target: { value: 'Warehouse team lead' } });
    expect(answeredCount()).toBe('1');
    expect(complete.disabled).toBe(false);
  });

  it('counts a section as answered only when every visible question in it is', async () => {
    render(<InterviewPage />);
    await clientHeading();

    const work = screen.getByRole('region', { name: 'How does their week look?' });
    expect(within(work).queryByText('Answered')).toBeNull();

    fireEvent.change(textField('Job details'), { target: { value: 'Warehouse team lead' } });
    fireEvent.change(select('Sitting hours'), { target: { value: '5' } });
    expect(within(work).queryByText('Answered')).toBeNull();
    expect(within(work).getByText('2/3')).toBeTruthy();

    fireEvent.change(select('Meal regularity'), { target: { value: 'irregular' } });
    expect(within(work).getByText('Answered')).toBeTruthy();
  });

  it('shows the occupation detail only when the Lifestyle Assessment says Other', async () => {
    const first = render(<InterviewPage />);
    await clientHeading();
    expect(screen.queryByLabelText('Describe their occupation')).toBeNull();
    first.unmount();

    mockLifestyle = [{ occupation_type: 'other' }];
    render(<InterviewPage />);
    await clientHeading();
    expect(textField('Describe their occupation')).toBeTruthy();
    // The conditional field is now part of the total, not a free extra.
    expect(screen.getByRole('progressbar', { name: 'Interview progress' }).getAttribute('aria-valuemax')).toBe('13');
  });

  it('reveals the "what else" box only after the Other barrier is chosen', async () => {
    render(<InterviewPage />);
    await clientHeading();
    expect(screen.queryByLabelText('What else gets in the way?')).toBeNull();

    const barriers = screen.getByRole('group', { name: 'Barriers they named' });
    fireEvent.click(within(barriers).getByRole('button', { name: 'Other' }));
    expect(textField('What else gets in the way?')).toBeTruthy();
  });

  it('resumes a draft, trims Postgres\' numeric scale, and saves only what changed', async () => {
    // lifestyle_sitting_hours is NUMERIC(4,1): a stored 7 arrives as '7.0'.
    mockInterviews = [{
      id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z',
      lifestyle_sitting_hours: '7.0', lifestyle_meal_regularity: 'irregular',
      training_history: 'Two years of home workouts',
    }];
    render(<InterviewPage />);
    await clientHeading();

    expect(select('Sitting hours').value).toBe('7');
    expect(select('Meal regularity').value).toBe('irregular');
    expect(answeredCount()).toBe('3');

    fireEvent.change(select('Meal regularity'), { target: { value: 'regular' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    expect(mockUpdate.mock.calls[0][0]).toBe('iv-9');
    expect(mockUpdate.mock.calls[0][1]).toEqual({ lifestyle_meal_regularity: 'regular', status: 'draft' });
  });

  it('does nothing when Save draft is pressed with no changes', async () => {
    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z' }];
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast.info).toHaveBeenCalledWith('Nothing to save yet.');
  });

  it('completes a draft that is already answered, without needing an edit to send', async () => {
    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', notes: 'Knees flare on lunges' }];
    mockUpdate.mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-9', status: 'completed', ...body } }));
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.click(screen.getByRole('button', { name: 'Complete interview' }));
    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(mockUpdate.mock.calls[0][1]).toEqual({ status: 'completed' });
  });

  it('completes with only the changed answers and hands off to the next step', async () => {
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.change(textField('Job details'), { target: { value: 'Warehouse team lead, rotating shifts' } });
    fireEvent.change(select('Meal regularity'), { target: { value: 'irregular' } });
    fireEvent.change(select('Previous experience'), { target: { value: 'intermediate' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete interview' }));

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(mockCreate.mock.calls[0][0]).toBe('c1');
    expect(mockCreate.mock.calls[0][1]).toEqual({
      job_details: 'Warehouse team lead, rotating shifts',
      lifestyle_meal_regularity: 'irregular',
      previous_workout_experience: 'intermediate',
      status: 'completed',
    });

    fireEvent.click(await screen.findByRole('button', { name: /continue to fitness assessment/i }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/assessment?client_id=c1');
  });

  it('keeps legacy columns this form cannot show exactly as the record holds them', async () => {
    mockInterviews = [{
      id: 'iv-legacy', status: 'draft', updated_at: '2026-09-01T10:00:00Z',
      lifestyle_occupation: 'Software engineer', lifestyle_sleep_hours: '7',
      lifestyle_meal_regularity: 'irregular', pain_and_injuries: 'Left knee',
    }];
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.change(textField('Job details'), { target: { value: 'Desk work, eight hours' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    const body = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toEqual({ job_details: 'Desk work, eight hours', status: 'draft' });
    for (const old of ['lifestyle_occupation', 'lifestyle_sleep_hours', 'lifestyle_meal_regularity', 'pain_and_injuries']) {
      expect(body).not.toHaveProperty(old);
    }
  });

  it('clears a conditional answer the trainer has just switched off', async () => {
    mockInterviews = [{
      id: 'iv-3', status: 'draft', updated_at: '2026-10-20T10:00:00Z',
      training_challenges: ['other'], challenge_other: 'Gym closes before I finish work',
    }];
    render(<InterviewPage />);
    await clientHeading();

    expect(textField('What else gets in the way?').value).toBe('Gym closes before I finish work');
    const barriers = screen.getByRole('group', { name: 'Barriers they named' });
    fireEvent.click(within(barriers).getByRole('button', { name: 'Other' }));
    expect(screen.queryByLabelText('What else gets in the way?')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).toEqual({
      training_challenges: [],
      challenge_other: '',
      status: 'draft',
    });
  });

  it('opens a completed interview as a record that keeps the client\'s words and the trainer\'s apart', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      previous_workout_experience: 'beginner',
      training_challenges: ['time', 'gym_access'],
      important_client_statements: '"I want to keep up with my kids."',
      notes: 'Knees flare on deep lunges — keep range short.',
    }];
    render(<InterviewPage />);

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(screen.getByText('Time, Gym access')).toBeTruthy();
    expect(screen.getByText('"I want to keep up with my kids."')).toBeTruthy();

    const summary = screen.getByRole('heading', { name: 'What should the team remember?' }).closest('section')!;
    expect(within(summary).getByText('In their words')).toBeTruthy();
    expect(within(summary).getByText('Trainer summary')).toBeTruthy();
    expect(within(summary).getByText('Knees flare on deep lunges — keep range short.')).toBeTruthy();
  });

  it('edits a completed interview in place, and cancel leaves the record alone', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      notes: 'Knees flare on deep lunges',
    }];
    mockUpdate.mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', status: 'completed', ...body } }));
    render(<InterviewPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Edit answers' }));
    const notes = textField('Trainer summary');
    expect(notes.value).toBe('Knees flare on deep lunges');

    fireEvent.change(notes, { target: { value: 'Knees flare on deep lunges; use a box.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    // No status: a completed interview stays completed when a note is corrected.
    expect(mockUpdate.mock.calls[0][1]).toEqual({ notes: 'Knees flare on deep lunges; use a box.' });
    expect(await screen.findByText('Interview completed')).toBeTruthy();

    // Cancel on a later edit returns to the record without writing.
    fireEvent.click(screen.getByRole('button', { name: 'Edit answers' }));
    fireEvent.change(textField('Trainer summary'), { target: { value: 'Something not saved' } });
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByText('Knees flare on deep lunges; use a box.')).toBeTruthy();
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('starts a new interview without touching the completed one', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      notes: 'First intake',
    }];
    mockCreate.mockResolvedValue({ data: { id: 'iv-2', status: 'draft' } });
    render(<InterviewPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Start new interview' }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith('c1', { status: 'draft' }));

    expect(await screen.findByRole('button', { name: 'Save draft' })).toBeTruthy();
    expect(answeredCount()).toBe('0');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stores every canonical challenge key the server accepts', () => {
    const chips = INTERVIEW_SECTIONS.find((s) => s.id === 'challenges')!.controls[0];
    expect(chips.kind).toBe('chips');
    if (chips.kind !== 'chips') return;
    expect(chips.options.map((o) => o.value)).toEqual([
      'time', 'work_schedule', 'motivation', 'confidence', 'pain_or_injury',
      'fatigue', 'family', 'travel', 'nutrition', 'gym_access', 'cost', 'other',
    ]);
  });
});
