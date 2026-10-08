// The Client Interview, redesigned (2026-10-08).
//
// The page was restyled, not re-specified: it must still resume a saved
// draft, send every answer with its status, refuse to complete an empty
// interview, and hand off to the Fitness Assessment. What is new is the
// progress the trainer can see — the ring, the section pills, the count on
// the action bar — and those must agree with what is actually written.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { INTERVIEW_QUESTIONS } from '@/components/pt-os/interview/questions';

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

const textareas = () => screen.getAllByRole('textbox') as HTMLTextAreaElement[];

beforeEach(() => {
  mockDrafts = [];
  mockPush.mockReset();
  mockCreate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
  mockUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => ({ data: { id: 'iv-1', ...body } }));
});

describe('<InterviewPage />', () => {
  it('asks every question, in order, each as its own labelled field', async () => {
    render(<InterviewPage />);
    expect(await screen.findByText('Mina Rao · Client Interview')).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Interview questions' });
    expect(within(nav).getAllByRole('link').map((a) => a.getAttribute('href')))
      .toEqual(INTERVIEW_QUESTIONS.map((q) => `#q-${q.key}`));
    for (const q of INTERVIEW_QUESTIONS) expect(screen.getByRole('textbox', { name: q.label })).toBeTruthy();
  });

  it('counts an answer only once something is written, and cannot complete an empty interview', async () => {
    render(<InterviewPage />);
    await screen.findByText('Mina Rao · Client Interview');
    const complete = screen.getByRole('button', { name: 'Complete interview' }) as HTMLButtonElement;
    expect(complete.disabled).toBe(true);
    expect(screen.getByRole('img', { name: '0 of 7 questions answered' })).toBeTruthy();

    fireEvent.change(textareas()[0], { target: { value: '   ' } });
    expect(screen.getByRole('img', { name: '0 of 7 questions answered' })).toBeTruthy();

    fireEvent.change(textareas()[1], { target: { value: 'Left knee, old ACL repair' } });
    expect(screen.getByRole('img', { name: '1 of 7 questions answered' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Pain & injuries, answered' })).toBeTruthy();
    // Each answer box is the only thing its label names (the e2e suite
    // finds fields with getByLabel).
    for (const q of INTERVIEW_QUESTIONS) expect(screen.getAllByLabelText(q.label)).toHaveLength(1);
    expect(complete.disabled).toBe(false);
  });

  it('resumes a saved draft and updates it rather than starting another', async () => {
    mockDrafts = [{ id: 'iv-9', status: 'draft', updated_at: '2026-10-07T10:00:00Z', training_history: 'Ran 5k twice a week' }];
    render(<InterviewPage />);
    expect(await screen.findByText('Resuming a saved draft')).toBeTruthy();
    expect(textareas()[0].value).toBe('Ran 5k twice a week');

    fireEvent.click(screen.getByRole('button', { name: /save draft/i }));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0][0]).toBe('iv-9');
    expect(mockUpdate.mock.calls[0][1]).toMatchObject({ training_history: 'Ran 5k twice a week', status: 'draft' });
  });

  it('completes with every field, then celebrates what was covered and offers the next step', async () => {
    render(<InterviewPage />);
    await screen.findByText('Mina Rao · Client Interview');
    fireEvent.change(textareas()[1], { target: { value: 'Lower back stiffness' } });
    fireEvent.change(textareas()[4], { target: { value: 'Mon, Wed, Fri mornings' } });
    fireEvent.click(screen.getByRole('button', { name: 'Complete interview' }));

    expect(await screen.findByText('Interview complete')).toBeTruthy();
    const body = mockCreate.mock.calls[0][1] as Record<string, string>;
    expect(mockCreate.mock.calls[0][0]).toBe('c1');
    expect(body.status).toBe('completed');
    expect(Object.keys(body).sort()).toEqual([...INTERVIEW_QUESTIONS.map((q) => q.key), 'status'].sort());

    const covered = screen.getByRole('list', { name: 'Topics covered' });
    expect(within(covered).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Pain & injuries', 'Availability']);

    fireEvent.click(screen.getByRole('button', { name: /continue to fitness assessment/i }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/assessment?client_id=c1');
  });
});
