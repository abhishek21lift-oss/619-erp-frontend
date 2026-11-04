// The Client Interview, as four conversation sections (2026-11-04).
//
// The screen asks the ten agreed intake questions: occupation, sitting hours,
// training background, barriers and readiness, and the trainer's summary. Four
// older answers (meal regularity, training days, availability, and the client's
// own words) are no longer asked — they remain as read-only history under
// "Earlier interview answers" on the completed record.
//
// What these tests protect:
//   · the ten questions, in the four sections, in order, and the conditional
//     fields inside them;
//   · progress that counts only what is on screen;
//   · a save that writes only what changed, so legacy columns this form does
//     not ask survive;
//   · a completed interview that can be corrected in place, and a "start new"
//     that keeps the old record;
//   · earlier answers staying labelled apart from the trainer's summary.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INTERVIEW_QUESTIONS, INTERVIEW_SECTIONS } from '@/components/pt-os/interview/questions';

const mockPush = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockToast = { info: vi.fn(), error: vi.fn(), success: vi.fn() };
let mockInterviews: unknown[] = [];
let mockRestore: () => Record<string, unknown> | null = () => null;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => new URLSearchParams('client_id=c1'),
}));
vi.mock('@/components/Guard', () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock('@/hooks/useAutoSaveDraft', () => ({ useAutoSaveDraft: () => ({ restore: () => mockRestore(), clear: vi.fn() }) }));
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
  mockRestore = () => null;
  mockPush.mockReset();
  mockToast.info.mockReset();
  mockToast.error.mockReset();
  mockToast.success.mockReset();
  mockCreate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  mockUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
});

describe('<InterviewPage />', () => {
  it('asks exactly the ten agreed questions', () => {
    expect(INTERVIEW_QUESTIONS.map((q) => q.label)).toEqual([
      'What is your occupation?',
      'What type of work do you do?',
      'How many hours do you spend sitting at work?',
      'What is your previous workout experience?',
      'Have you participated in any sports?',
      'What type of physical activities have you performed previously?',
      'What are your exercise preferences?',
      'What are your biggest barriers to exercise?',
      'What motivates you to start training?',
      'How ready are you to start a fitness programme? (1–10)',
    ]);
  });

  it('asks four sections, in order', async () => {
    render(<InterviewPage />);
    await clientHeading();

    expect(INTERVIEW_SECTIONS).toHaveLength(4);
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent))
      .toEqual(INTERVIEW_SECTIONS.map((s) => s.prompt));
    expect(INTERVIEW_SECTIONS.map((s) => s.label))
      .toEqual(['Work', 'Training background', 'Motivation & barriers', 'Trainer summary']);

    // The anchor nav names the same four sections, so a long form has a way
    // back to the one being answered.
    const nav = screen.getByRole('navigation', { name: 'Interview sections' });
    expect(within(nav).getAllByRole('link').map((a) => a.textContent?.replace(/\d+\/\d+$/, '').trim()))
      .toEqual(['Work', 'Training background', 'Motivation & barriers', 'Trainer summary']);
  }, 20_000);

  it('starts at 0 of 10 visible answers and cannot complete an empty interview', async () => {
    render(<InterviewPage />);
    await clientHeading();

    const bar = screen.getByRole('progressbar', { name: 'Interview progress' });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');
    // The occupation detail and the trainer's summary are on the form but not
    // counted; the challenge detail counts only while the Other chip is chosen.
    expect(bar.getAttribute('aria-valuemax')).toBe('10');
    expect(screen.getByText(/client interview · step 4/i)).toBeTruthy();

    const complete = screen.getByRole('button', { name: 'Complete interview' }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);

    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Warehouse team lead' } });
    expect(answeredCount()).toBe('1');
    expect(complete.disabled).toBe(false);
  });

  it('counts a section as answered only when every counted question in it is', async () => {
    render(<InterviewPage />);
    await clientHeading();

    const work = screen.getByRole('region', { name: 'What do they do all day?' });
    expect(within(work).queryByText('Answered')).toBeNull();

    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Warehouse team lead' } });
    expect(within(work).getByText('1/3')).toBeTruthy();
    expect(within(work).queryByText('Answered')).toBeNull();

    fireEvent.change(select('What is your occupation?'), { target: { value: 'desk_job' } });
    fireEvent.change(select('How many hours do you spend sitting at work?'), { target: { value: '5' } });
    expect(within(work).getByText('Answered')).toBeTruthy();
  });

  it('shows the occupation detail only when Other is chosen, without counting it', async () => {
    render(<InterviewPage />);
    await clientHeading();
    expect(screen.queryByLabelText('Describe their occupation')).toBeNull();

    fireEvent.change(select('What is your occupation?'), { target: { value: 'other' } });
    expect(textField('Describe their occupation')).toBeTruthy();
    // The detail is not one of the ten counted questions.
    expect(screen.getByRole('progressbar', { name: 'Interview progress' }).getAttribute('aria-valuemax')).toBe('10');
  });

  it('reveals the "what else" box only after the Other barrier is chosen', async () => {
    render(<InterviewPage />);
    await clientHeading();
    expect(screen.queryByLabelText('What else gets in the way?')).toBeNull();

    const barriers = screen.getByRole('group', { name: 'What are your biggest barriers to exercise?' });
    fireEvent.click(within(barriers).getByRole('button', { name: 'Other' }));
    expect(textField('What else gets in the way?')).toBeTruthy();
  });

  it('resumes a draft, trims Postgres\' numeric scale, and saves only what changed', async () => {
    // lifestyle_sitting_hours is NUMERIC(4,1): a stored 7 arrives as '7.0'.
    mockInterviews = [{
      id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z',
      lifestyle_sitting_hours: '7.0', previous_workout_experience: 'beginner',
      job_details: 'Two years of home workouts',
    }];
    render(<InterviewPage />);
    await clientHeading();

    expect(select('How many hours do you spend sitting at work?').value).toBe('7');
    expect(select('What is your previous workout experience?').value).toBe('beginner');
    expect(textField('What type of work do you do?').value).toBe('Two years of home workouts');
    expect(answeredCount()).toBe('3');

    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Three years of home workouts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    expect(mockUpdate.mock.calls[0][0]).toBe('iv-9');
    expect(mockUpdate.mock.calls[0][1]).toEqual({ job_details: 'Three years of home workouts', status: 'draft' });
  });

  it('does nothing when Save draft is pressed with no changes', async () => {
    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z' }];
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast.info).toHaveBeenCalledWith('Nothing to save yet.');
  });

  it('will not complete on the trainer\'s note alone, but completes an answered draft without an edit', async () => {
    // The note is not one of the counted questions, so it alone cannot complete.
    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', notes: 'Knees flare on lunges' }];
    const first = render(<InterviewPage />);
    await clientHeading();
    expect((screen.getByRole('button', { name: 'Complete interview' }) as HTMLButtonElement).disabled).toBe(true);
    first.unmount();

    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', job_details: 'Warehouse team lead' }];
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

    fireEvent.change(select('What is your occupation?'), { target: { value: 'desk_job' } });
    fireEvent.change(select('How ready are you to start a fitness programme? (1–10)'), { target: { value: '8' } });
    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Warehouse team lead, rotating shifts' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete interview' }));

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(mockCreate.mock.calls[0][0]).toBe('c1');
    expect(mockCreate.mock.calls[0][1]).toEqual({
      occupation_type: 'desk_job',
      programme_readiness: '8',
      job_details: 'Warehouse team lead, rotating shifts',
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

    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Desk work, eight hours' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    const body = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toEqual({ job_details: 'Desk work, eight hours', status: 'draft' });
    for (const old of ['lifestyle_occupation', 'lifestyle_sleep_hours', 'lifestyle_meal_regularity', 'pain_and_injuries']) {
      expect(body).not.toHaveProperty(old);
    }
  });

  it('never sends the four earlier answers when only a current answer changed', async () => {
    mockInterviews = [{
      id: 'iv-legacy', status: 'draft', updated_at: '2026-09-01T10:00:00Z',
      lifestyle_meal_regularity: 'irregular', lifestyle_training_days: 3,
      availability: 'Weekday mornings', important_client_statements: '"Keep going."',
      job_details: 'Desk work, eight hours',
    }];
    render(<InterviewPage />);
    await clientHeading();

    fireEvent.change(textField('What type of work do you do?'), { target: { value: 'Desk work, ten hours' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    const body = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toEqual({ job_details: 'Desk work, ten hours', status: 'draft' });
    for (const old of ['lifestyle_meal_regularity', 'lifestyle_training_days', 'availability', 'important_client_statements']) {
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
    const barriers = screen.getByRole('group', { name: 'What are your biggest barriers to exercise?' });
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

  it('opens a completed interview as a record with the trainer\'s summary apart from the earlier answers', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      previous_workout_experience: 'beginner',
      training_challenges: ['time', 'gym_access'],
      lifestyle_meal_regularity: 'regular', lifestyle_training_days: 3,
      availability: 'Weekday mornings',
      important_client_statements: '"I want to keep up with my kids."',
      notes: 'Knees flare on deep lunges — keep range short.',
    }];
    render(<InterviewPage />);

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(screen.getByText('Time, Gym access')).toBeTruthy();

    const earlier = screen.getByRole('heading', { name: 'Earlier interview answers' }).closest('section')!;
    expect(within(earlier).getByText('When they could train')).toBeTruthy();
    expect(within(earlier).getByText('Weekday mornings')).toBeTruthy();
    expect(within(earlier).getByText("In the client's words")).toBeTruthy();
    expect(within(earlier).getByText('"I want to keep up with my kids."')).toBeTruthy();
    expect(within(earlier).queryByText('Not recorded')).toBeNull();

    const summary = screen.getByRole('heading', { name: 'What should the team remember?' }).closest('section')!;
    expect(within(summary).getByText('Trainer summary')).toBeTruthy();
    expect(within(summary).getByText('Knees flare on deep lunges — keep range short.')).toBeTruthy();
    expect(within(summary).queryByText('In their words')).toBeNull();
  });

  it('edits a completed interview in place, and cancel leaves the record alone', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      job_details: 'Warehouse team lead',
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

  it('restores a local draft when the server has no interview yet', async () => {
    // The record does not exist, but the trainer typed answers and the tab
    // closed. Restoring only when a server draft existed lost exactly this.
    mockRestore = () => ({ job_details: 'Unsaved draft answer' });
    render(<InterviewPage />);
    await clientHeading();

    await waitFor(() => expect(textField('What type of work do you do?').value).toBe('Unsaved draft answer'));
    expect(mockToast.info).toHaveBeenCalledWith('Restored your unsaved draft.');
  });

  it('stores every canonical challenge key the server accepts', () => {
    const chips = INTERVIEW_SECTIONS.find((s) => s.id === 'barriers')!.controls[0];
    expect(chips.kind).toBe('chips');
    if (chips.kind !== 'chips') return;
    expect(chips.options.map((o) => o.value)).toEqual([
      'time', 'work_schedule', 'motivation', 'confidence', 'pain_or_injury',
      'fatigue', 'family', 'travel', 'nutrition', 'gym_access', 'cost', 'other',
    ]);
  });
});
