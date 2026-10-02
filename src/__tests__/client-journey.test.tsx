// The intake journey in the UI (Phase 2): the order, the next step, and the
// screens that end a step pointing at the next one.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

const mockJourney = vi.fn();
const mockPush = vi.fn();
vi.mock('@/lib/api', () => ({ api: { pt: { journey: (...a: unknown[]) => mockJourney(...a) } } }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));

import ClientJourneyCard from '@/components/pt-os/client/ClientJourneyCard';
import JourneyNextButton from '@/components/pt-os/client/JourneyNextButton';
import { stepAfter, stepHref, STEP_LABEL, type JourneyStep } from '@/lib/journey';

const APP = path.join(__dirname, '..', 'app', '(chrome)', 'pt-os');
const read = (rel: string) => fs.readFileSync(path.join(APP, rel), 'utf8');

function journeyOf(states: Partial<Record<JourneyStep['key'], JourneyStep['state']>>, next: JourneyStep['key'] | null, detail?: string) {
  const keys: JourneyStep['key'][] = ['registration', 'consent', 'parq', 'interview', 'assessment', 'goals', 'enrolment', 'workout_plan'];
  return {
    data: {
      steps: keys.map((key) => ({ key, state: states[key] ?? 'todo', ...(key === 'interview' ? { optional: true } : {}), ...(detail && states[key] === 'blocked' ? { detail } : {}) })),
      next,
      screening: {},
    },
  };
}

beforeEach(() => { mockJourney.mockReset(); mockPush.mockReset(); });

describe('the journey order and where each step is done', () => {
  it('runs registration → consent → PAR-Q → interview → assessment → goals → enrolment → plan', () => {
    expect(stepAfter('parq')).toBe('interview');
    expect(stepAfter('interview')).toBe('assessment');
    expect(stepAfter('goals')).toBe('enrolment');
    expect(stepAfter('workout_plan')).toBeNull();
  });

  it('every step has a page; renewal goes to Renew, not Enrol', () => {
    expect(stepHref('interview', 'c1')).toBe('/pt-os/interview?client_id=c1');
    expect(stepHref('enrolment', 'c1')).toBe('/pt-os/clients/c1/enroll');
    expect(stepHref('enrolment', 'c1', 'renew')).toBe('/pt-os/clients/c1/renew');
    expect(stepHref('workout_plan', 'c1')).toBe('/pt-os/workout-plans?client_id=c1');
  });
});

describe('ClientJourneyCard', () => {
  it('shows every step with its state and offers the server\'s next step', async () => {
    mockJourney.mockResolvedValue(journeyOf({ registration: 'done', consent: 'done', parq: 'done' }, 'interview'));
    render(<ClientJourneyCard clientId="c1" />);
    await screen.findByText(STEP_LABEL.workout_plan);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    fireEvent.click(screen.getByRole('button', { name: /Next: Client Interview/ }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/interview?client_id=c1');
  });

  it('never offers a blocked step: it shows why instead', async () => {
    mockJourney.mockResolvedValue(journeyOf({ registration: 'done', consent: 'blocked' }, 'consent', 'This client has revoked their Informed Consent.'));
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByRole('status')).toHaveTextContent(/revoked/);
    expect(screen.queryByRole('button', { name: /^Next:/ })).toBeNull();
  });

  it('an expired client is offered Renew PT', async () => {
    mockJourney.mockResolvedValue(journeyOf({ registration: 'done', consent: 'done', parq: 'done', interview: 'done', assessment: 'done', goals: 'done', enrolment: 'renew' }, 'enrolment'));
    render(<ClientJourneyCard clientId="c1" />);
    fireEvent.click(await screen.findByRole('button', { name: /Renew PT/ }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/clients/c1/renew');
  });
});

describe('JourneyNextButton', () => {
  it('skips the step the screen is, and offers the next outstanding one', async () => {
    mockJourney.mockResolvedValue(journeyOf({ registration: 'done', consent: 'done', parq: 'in_progress' }, 'parq'));
    render(<JourneyNextButton clientId="c1" current="parq" />);
    fireEvent.click(await screen.findByRole('button', { name: /Continue to Client Interview/ }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/interview?client_id=c1');
  });

  it('a blocked next step shows its reason, not a button', async () => {
    mockJourney.mockResolvedValue(journeyOf({ registration: 'done', consent: 'done', parq: 'done', interview: 'done', assessment: 'done', goals: 'done', enrolment: 'blocked' }, 'enrolment', 'Complete the Informed Consent and PAR-Q before enrolling.'));
    render(<JourneyNextButton clientId="c1" current="goals" />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/before enrolling/));
  });
});

describe('the screens that end a step point at the next one', () => {
  it('PAR-Q, assessment, goals and enrolment end with the server-driven next step', () => {
    expect(read('parq/page.tsx')).toMatch(/<JourneyNextButton className="mt-8" clientId=\{clientId\} current="parq" \/>/);
    expect(read('parq/page.tsx')).not.toMatch(/Continue to Goal Setting/);
    expect(read('assessment/page.tsx')).toMatch(/current="assessment"/);
    expect(read('goals/page.tsx')).toMatch(/current="goals"/);
    expect(read('clients/[id]/enroll/page.tsx')).toMatch(/current="enrolment"/);
  });

  it('the interview continues to the Fitness Assessment and keeps its draft in the scoped, purged store', () => {
    const src = read('interview/page.tsx');
    expect(src).toMatch(/stepHref\('assessment', clientId\)/);
    expect(src).toMatch(/client-interview-draft\.v1:\$\{clientId\}/);
    expect('client-interview-draft.v1:c1').toMatch(/-draft\.v\d+:/);
  });

  it('the new-client success screen does not offer enrolment before screening', () => {
    const src = read('new-client/page.tsx');
    expect(src).not.toMatch(/createdId\}\/enroll/);
    expect(src).toMatch(/Start Client Screening/);
  });

  it('the enrol page stops a new client whose screening is incomplete, with links to finish it', () => {
    const src = read('clients/[id]/enroll/page.tsx');
    expect(src).toMatch(/if \(screeningMissing\) \{/);
    expect(src).toMatch(/Complete Informed Consent/);
    expect(src).toMatch(/Complete PAR-Q/);
  });

  it('the profile shows the journey on its overview', () => {
    expect(read('clients/[id]/page.tsx')).toMatch(/<ClientJourneyCard clientId=\{client\.id\} \/>/);
  });
});
