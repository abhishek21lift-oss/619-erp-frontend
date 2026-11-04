// The Client Interview, as four selection-led conversation sections.
//
// The screen asks twenty counted questions across four sections, one section
// per screen, then a review. Every counted answer is a selection: searchable
// occupation, cards, dropdowns, chips, segmented choices or the 1–10 scale.
// Optional free text exists so the trainer can keep the client's own words,
// but it never counts and never has to be filled in.
//
// What these tests protect:
//   · the twenty counted questions, their order, and that none is free text;
//   · one section on screen at a time, with a stepper that never loses answers;
//   · selection, deselection, and the conditional Other fields;
//   · a save that writes only what changed, so legacy columns survive;
//   · a local draft restored after a refresh;
//   · review, completion, and the completed record's edit/start-new paths.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import {
  INTERVIEW_QUESTIONS, INTERVIEW_SECTIONS, answersFrom,
} from '@/components/pt-os/interview/questions';

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

const progressBar = () => screen.getByRole('progressbar', { name: 'Interview progress' });
const answered = () => progressBar().getAttribute('aria-valuenow');
const region = (prompt: string) => screen.getByRole('region', { name: prompt });
const group = (name: string) => screen.getByRole('group', { name });
const clientHeading = () => screen.findByText("Mina Rao's Interview");
const stepper = () => screen.getByRole('navigation', { name: 'Interview steps' });
const stepTo = (label: string) => fireEvent.click(within(stepper()).getByRole('button', { name: label }));
const saveDraft = () => fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

beforeEach(() => {
  mockInterviews = [];
  mockRestore = () => null;
  mockPush.mockReset();
  mockToast.info.mockReset();
  mockToast.error.mockReset();
  mockToast.success.mockReset();
  mockCreate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  mockUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  window.scrollTo = vi.fn();
});

describe('<InterviewPage />', () => {
  it('asks twenty counted questions in four sections, none of them free text', () => {
    expect(INTERVIEW_SECTIONS.map((s) => s.label))
      .toEqual(['Work & Lifestyle', 'Training Background', 'Motivation & Barriers', 'Trainer Summary']);
    expect(INTERVIEW_QUESTIONS).toHaveLength(20);
    expect(INTERVIEW_QUESTIONS.map((q) => q.label)).toEqual([
      'What is their occupation?',
      'What type of work do they do?',
      'How many hours do they work a day?',
      'How many hours do they spend sitting at work?',
      'How active are they outside training?',
      'What is their previous workout experience?',
      'How long have they trained?',
      'Have they played any sports?',
      'Which sports have they played?',
      'What physical activities have they done before?',
      'What exercise do they prefer?',
      'What are their fitness goals?',
      'What are their biggest barriers to exercise?',
      'What motivates them to train?',
      'How ready are they to start a fitness programme?',
      'How would you describe their attitude?',
      'How confident are they?',
      'How committed are they?',
      'What coaching style suits them?',
      'What level should they start at?',
    ]);
    // The acceptance bar: at least 90% selection. Here it is 100%.
    expect(INTERVIEW_QUESTIONS.filter((q) => q.kind !== 'text')).toHaveLength(20);
  });

  it('trims Postgres numeric scale but never rewrites free text', () => {
    const row = answersFrom({ lifestyle_sitting_hours: '7.0', programme_readiness: '8.0', job_details: 'Version 7.0 rollout' });
    expect(row.lifestyle_sitting_hours).toBe('7');
    expect(row.programme_readiness).toBe('8');
    expect(row.job_details).toBe('Version 7.0 rollout');
  });

  it('shows one section at a time and moves between sections without losing answers', async () => {
    render(<InterviewPage />);
    await clientHeading();

    expect(region('What do they do all day?')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'What are they bringing with them?' })).toBeNull();
    expect(answered()).toBe('0');
    expect(progressBar().getAttribute('aria-valuemax')).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: 'What is their occupation?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Software engineer' }));
    expect(answered()).toBe('1');

    stepTo('Training Background');
    expect(region('What are they bringing with them?')).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'What do they do all day?' })).toBeNull();

    stepTo('Work & Lifestyle');
    expect(screen.getByRole('button', { name: 'What is their occupation?' }).textContent).toContain('Software engineer');
    expect(answered()).toBe('1');
  });

  it('selects, deselects, and does not count optional text', async () => {
    render(<InterviewPage />);
    await clientHeading();

    const workType = group('What type of work do they do?');
    const desk = within(workType).getByRole('button', { name: /^Desk-based/ });
    fireEvent.click(desk);
    expect(desk.getAttribute('aria-pressed')).toBe('true');
    expect(answered()).toBe('1');

    fireEvent.click(desk);
    expect(desk.getAttribute('aria-pressed')).toBe('false');
    expect(answered()).toBe('0');

    fireEvent.change(screen.getByLabelText('Role details'), { target: { value: 'Warehouse team lead, rotating shifts' } });
    expect(answered()).toBe('0');
  });

  it('reveals the occupation detail only for Other, and clears it when the selection is cleared', async () => {
    mockInterviews = [{ id: 'iv-4', status: 'draft', updated_at: '2026-10-26T10:00:00Z', occupation_type: 'other', occupation_other_details: 'Long-haul driver' }];
    render(<InterviewPage />);
    await clientHeading();

    expect(screen.getByLabelText('Describe their occupation')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'What is their occupation?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }));

    expect(screen.queryByLabelText('Describe their occupation')).toBeNull();
    saveDraft();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).toEqual({
      occupation_title: '',
      occupation_type: '',
      occupation_other_details: '',
      status: 'draft',
    });
  });

  it('reveals the barrier detail only while Other is chosen', async () => {
    render(<InterviewPage />);
    await clientHeading();
    stepTo('Motivation & Barriers');

    expect(screen.queryByLabelText('What else gets in the way?')).toBeNull();
    const barriers = group('What are their biggest barriers to exercise?');
    const other = within(barriers).getByRole('button', { name: 'Other' });
    fireEvent.click(other);
    expect(screen.getByLabelText('What else gets in the way?')).toBeTruthy();
    expect(answered()).toBe('1');
    expect(progressBar().getAttribute('aria-valuemax')).toBe('20');

    fireEvent.click(other);
    expect(screen.queryByLabelText('What else gets in the way?')).toBeNull();
    expect(answered()).toBe('0');
  });

  it('resumes a draft, trims the numeric scale, and saves only what changed', async () => {
    mockInterviews = [{
      id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z',
      occupation_title: 'Accountant', occupation_type: 'desk_job', work_type: 'desk',
      lifestyle_sitting_hours: '7.0',
      pain_and_injuries: 'Left knee', lifestyle_occupation: 'Software engineer',
      lifestyle_meal_regularity: 'irregular',
    }];
    render(<InterviewPage />);
    await clientHeading();

    expect(screen.getByRole('button', { name: 'What is their occupation?' }).textContent).toContain('Accountant');
    expect((screen.getByLabelText('How many hours do they spend sitting at work?') as HTMLSelectElement).value).toBe('7');

    const workType = group('What type of work do they do?');
    fireEvent.click(within(workType).getByRole('button', { name: /^On feet/ }));
    saveDraft();
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());

    expect(mockUpdate.mock.calls[0][0]).toBe('iv-9');
    expect(mockUpdate.mock.calls[0][1]).toEqual({ work_type: 'on_feet', status: 'draft' });
    const body = mockUpdate.mock.calls[0][1] as Record<string, unknown>;
    for (const old of ['pain_and_injuries', 'lifestyle_occupation', 'lifestyle_meal_regularity']) {
      expect(body).not.toHaveProperty(old);
    }
  });

  it('saves nothing when Save draft is pressed with no changes', async () => {
    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z' }];
    render(<InterviewPage />);
    await clientHeading();

    saveDraft();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockToast.info).toHaveBeenCalledWith('Nothing to save yet.');
  });

  it('clears a conditional answer the trainer switches off, and an array as an array', async () => {
    mockInterviews = [{
      id: 'iv-3', status: 'draft', updated_at: '2026-10-20T10:00:00Z',
      training_challenges: ['other'], challenge_other: 'Gym closes before I finish work',
    }];
    render(<InterviewPage />);
    await clientHeading();
    stepTo('Motivation & Barriers');

    expect((screen.getByLabelText('What else gets in the way?') as HTMLTextAreaElement).value).toBe('Gym closes before I finish work');
    fireEvent.click(within(group('What are their biggest barriers to exercise?')).getByRole('button', { name: 'Other' }));
    saveDraft();

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).toEqual({
      training_challenges: [],
      challenge_other: '',
      status: 'draft',
    });
  });

  it('clears the sport list when participation is answered No', async () => {
    mockInterviews = [{
      id: 'iv-5', status: 'draft', updated_at: '2026-10-20T10:00:00Z',
      sports_participation: 'currently', sports_played: ['cricket'],
    }];
    render(<InterviewPage />);
    await clientHeading();
    stepTo('Training Background');

    fireEvent.click(within(group('Have they played any sports?')).getByRole('button', { name: 'No' }));
    saveDraft();

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).toEqual({
      sports_participation: 'never',
      sports_played: [],
      status: 'draft',
    });
  });

  it('restores a local draft when the server has no interview yet', async () => {
    mockRestore = () => ({ occupation_title: 'Nurse', occupation_type: 'healthcare', work_type: 'on_feet' });
    render(<InterviewPage />);
    await clientHeading();

    await waitFor(() => expect(screen.getByRole('button', { name: 'What is their occupation?' }).textContent).toContain('Nurse'));
    expect(mockToast.info).toHaveBeenCalledWith('Restored your unsaved draft.');
  });

  it('walks all twenty selections to review, then completes with only the selections', async () => {
    render(<InterviewPage />);
    await clientHeading();

    // 1 · Work & Lifestyle
    fireEvent.click(screen.getByRole('button', { name: 'What is their occupation?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Software engineer' }));
    fireEvent.click(within(group('What type of work do they do?')).getByRole('button', { name: /^Desk-based/ }));
    fireEvent.change(screen.getByLabelText('How many hours do they work a day?'), { target: { value: '8_10' } });
    fireEvent.change(screen.getByLabelText('How many hours do they spend sitting at work?'), { target: { value: '7' } });
    fireEvent.click(within(group('How active are they outside training?')).getByRole('button', { name: /^Mostly seated/ }));
    expect(answered()).toBe('5');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // 2 · Training Background
    fireEvent.click(within(group('What is their previous workout experience?')).getByRole('button', { name: /^Intermediate/ }));
    fireEvent.change(screen.getByLabelText('How long have they trained?'), { target: { value: '1_2_years' } });
    fireEvent.click(within(group('Have they played any sports?')).getByRole('button', { name: 'Yes' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cricket' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gym weights' }));
    fireEvent.click(screen.getByRole('button', { name: 'Free weights' }));
    expect(answered()).toBe('11');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // 3 · Motivation & Barriers
    fireEvent.click(screen.getByRole('button', { name: 'Lose fat' }));
    fireEvent.click(screen.getByRole('button', { name: 'Time' }));
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    fireEvent.change(screen.getByLabelText('What else gets in the way?'), { target: { value: 'Gym closes early' } });
    fireEvent.click(screen.getByRole('button', { name: 'Health' }));
    fireEvent.click(screen.getByRole('button', { name: '8 out of 10' }));
    expect(answered()).toBe('15');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    // 4 · Trainer Summary
    fireEvent.click(within(group('How would you describe their attitude?')).getByRole('button', { name: /^Motivated/ }));
    fireEvent.click(within(group('How confident are they?')).getByRole('button', { name: 'High' }));
    fireEvent.click(within(group('How committed are they?')).getByRole('button', { name: 'Moderate' }));
    fireEvent.click(within(group('What coaching style suits them?')).getByRole('button', { name: 'Balanced' }));
    fireEvent.click(within(group('What level should they start at?')).getByRole('button', { name: 'Beginner' }));
    expect(answered()).toBe('20');

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText(/Review · 20 of 20 answered/)).toBeTruthy();
    expect(screen.getByText('Gym closes early')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(mockCreate.mock.calls[0][0]).toBe('c1');
    expect(mockCreate.mock.calls[0][1]).toEqual({
      occupation_title: 'Software engineer',
      occupation_type: 'desk_job',
      work_type: 'desk',
      work_hours_band: '8_10',
      lifestyle_sitting_hours: '7',
      daily_activity_level: 'mostly_seated',
      previous_workout_experience: 'intermediate',
      training_duration: '1_2_years',
      sports_participation: 'currently',
      sports_played: ['cricket'],
      previous_activities: ['gym_weights'],
      exercise_preferences: ['free_weights'],
      fitness_goals: ['fat_loss'],
      training_challenges: ['time', 'other'],
      challenge_other: 'Gym closes early',
      motivation_factors: ['health'],
      programme_readiness: '8',
      client_attitude: 'motivated',
      confidence_level: 'high',
      commitment_level: 'moderate',
      coaching_preference: 'balanced',
      initial_training_level: 'beginner',
      status: 'completed',
    });

    fireEvent.click(await screen.findByRole('button', { name: /continue to fitness assessment/i }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/assessment?client_id=c1');
  }, 30_000);

  it('disables Complete on an empty review, and completes an answered draft without an edit', async () => {
    const first = render(<InterviewPage />);
    await clientHeading();
    stepTo('Review');
    expect((screen.getByRole('button', { name: 'Complete' }) as HTMLButtonElement).disabled).toBe(true);
    first.unmount();

    mockInterviews = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', occupation_title: 'Nurse', occupation_type: 'healthcare' }];
    mockUpdate.mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-9', status: 'completed', ...body } }));
    render(<InterviewPage />);
    await clientHeading();
    stepTo('Review');
    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(mockUpdate.mock.calls[0][1]).toEqual({ status: 'completed' });
  });

  it('opens a completed interview as a record, keeps earlier answers labelled apart, and edits in place', async () => {
    mockInterviews = [{
      id: 'iv-1', status: 'completed', completed_at: '2026-10-22T09:00:00Z', updated_at: '2026-10-22T09:00:00Z',
      occupation_title: 'Software engineer', occupation_type: 'desk_job', work_type: 'desk',
      previous_workout_experience: 'beginner',
      training_challenges: ['time', 'gym_access'],
      lifestyle_meal_regularity: 'regular', lifestyle_training_days: 3,
      availability: 'Weekday mornings',
      important_client_statements: '"I want to keep up with my kids."',
      notes: 'Knees flare on deep lunges — keep range short.',
    }];
    mockUpdate.mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', status: 'completed', notes: body.notes } }));
    render(<InterviewPage />);

    expect(await screen.findByText('Interview completed')).toBeTruthy();
    expect(screen.getByText('Time, Gym access')).toBeTruthy();
    expect(screen.getByText('Software engineer')).toBeTruthy();

    const earlier = screen.getByRole('heading', { name: 'Earlier interview answers' }).closest('section')!;
    expect(within(earlier).getByText('Days a week they could train')).toBeTruthy();
    expect(within(earlier).getByText('Weekday mornings')).toBeTruthy();
    expect(within(earlier).queryByText("In the client's words")).toBeNull();

    const barriers = screen.getByRole('heading', { name: 'What gets in the way, and what pulls them forward?' }).closest('section')!;
    expect(within(barriers).getByText('"I want to keep up with my kids."')).toBeTruthy();

    const summary = screen.getByRole('heading', { name: 'What should the team remember?' }).closest('section')!;
    expect(within(summary).getByText('Trainer observation')).toBeTruthy();
    expect(within(summary).getByText('Knees flare on deep lunges — keep range short.')).toBeTruthy();
    expect(within(summary).queryByText("In the client's words")).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Edit answers' }));
    stepTo('Trainer Summary');
    const notes = screen.getByLabelText('Trainer observation') as HTMLTextAreaElement;
    expect(notes.value).toBe('Knees flare on deep lunges — keep range short.');

    fireEvent.change(notes, { target: { value: 'Knees flare on deep lunges; use a box.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockUpdate.mock.calls[0][1]).toEqual({ notes: 'Knees flare on deep lunges; use a box.' });
    expect(await screen.findByText('Interview completed')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Edit answers' }));
    stepTo('Trainer Summary');
    fireEvent.change(screen.getByLabelText('Trainer observation'), { target: { value: 'Something not saved' } });
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
    expect(answered()).toBe('0');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('stores every canonical challenge key the server accepts', () => {
    const chips = INTERVIEW_SECTIONS
      .flatMap((section) => section.controls)
      .find((control) => control.key === 'training_challenges')!;
    expect(chips.kind).toBe('chips');
    if (chips.kind !== 'chips') return;
    expect(chips.options.map((o) => o.value)).toEqual([
      'time', 'work_schedule', 'motivation', 'confidence', 'pain_or_injury',
      'fatigue', 'family', 'travel', 'nutrition', 'gym_access', 'cost', 'other',
    ]);
  });
});
