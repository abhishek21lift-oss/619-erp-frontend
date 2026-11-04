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
  const keys: JourneyStep['key'][] = ['welcome_tour', 'enrolment', 'consent', 'parq', 'interview', 'goals', 'assessment', 'program_design'];
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
  it('runs welcome/tour → enrolment → consent → PAR-Q → interview → goals → assessment → program design', () => {
    expect(stepAfter('welcome_tour')).toBe('enrolment');
    expect(stepAfter('enrolment')).toBe('consent');
    expect(stepAfter('parq')).toBe('interview');
    expect(stepAfter('interview')).toBe('goals');
    expect(stepAfter('goals')).toBe('assessment');
    expect(stepAfter('program_design')).toBeNull();
  });

  it('every step has a page; renewal goes to Renew, not Enrol', () => {
    expect(stepHref('welcome_tour', 'c1')).toBe('/pt-os/welcome-tour?client_id=c1');
    expect(stepHref('program_design', 'c1')).toBe('/pt-os/program-design?client_id=c1');
    expect(stepHref('interview', 'c1')).toBe('/pt-os/interview?client_id=c1');
    expect(stepHref('enrolment', 'c1')).toBe('/pt-os/clients/c1/enroll');
    expect(stepHref('enrolment', 'c1', 'renew')).toBe('/pt-os/clients/c1/renew');
  });
});

describe('ClientJourneyCard', () => {
  it('shows every step with its state and offers the server\'s next step', async () => {
    mockJourney.mockResolvedValue(journeyOf({ welcome_tour: 'done', enrolment: 'done', consent: 'done' }, 'parq'));
    render(<ClientJourneyCard clientId="c1" />);
    await screen.findByText(STEP_LABEL.program_design);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '3');
    expect(screen.getByRole('link', { name: /Next: PAR-Q screening/ }))
      .toHaveAttribute('href', '/pt-os/parq?client_id=c1');
  });

  it('never offers a blocked step: it shows why instead', async () => {
    mockJourney.mockResolvedValue(journeyOf({ welcome_tour: 'done', enrolment: 'done', consent: 'blocked' }, 'consent', 'This client has revoked their Informed Consent.'));
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByRole('status')).toHaveTextContent(/revoked/);
    expect(screen.queryByRole('link', { name: /^Next:/ })).toBeNull();
  });

  it('an expired client is offered Renew PT', async () => {
    mockJourney.mockResolvedValue(journeyOf({ welcome_tour: 'done', enrolment: 'renew' }, 'enrolment'));
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByRole('link', { name: /Renew PT/ }))
      .toHaveAttribute('href', '/pt-os/clients/c1/renew');
  });

  it('shows a provisional enrolment as done, with the activation note', async () => {
    mockJourney.mockResolvedValue({ data: {
      steps: [
        { key: 'welcome_tour', state: 'done' },
        { key: 'enrolment', state: 'done', detail: 'PT enrolled — activation pending screening.' },
        { key: 'consent', state: 'done' },
        { key: 'parq', state: 'todo' },
        { key: 'interview', state: 'todo', optional: true },
        { key: 'goals', state: 'todo' },
        { key: 'assessment', state: 'todo' },
        { key: 'program_design', state: 'blocked' },
      ],
      next: 'parq',
      screening: {},
    } });
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByText(/activation pending screening/)).toBeTruthy();
  });

  it('shows an untouched enrolment as optional and offers the rest of intake', async () => {
    mockJourney.mockResolvedValue({ data: {
      steps: [
        { key: 'welcome_tour', state: 'done' },
        { key: 'enrolment', state: 'todo', optional: true },
        { key: 'consent', state: 'todo' },
        { key: 'parq', state: 'todo' },
        { key: 'interview', state: 'todo', optional: true },
        { key: 'goals', state: 'todo' },
        { key: 'assessment', state: 'todo' },
        { key: 'program_design', state: 'blocked' },
      ],
      next: 'consent',
      screening: {},
    } });
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByText(/PT Enrolment/)).toHaveTextContent('optional');
    expect(screen.getByRole('link', { name: /Next: Informed Consent/ }))
      .toHaveAttribute('href', '/pt-os/informed-consent?client_id=c1');
  });

  it('a completed journey links to the ongoing tools', async () => {
    mockJourney.mockResolvedValue(journeyOf(
      { welcome_tour: 'done', enrolment: 'done', consent: 'done', parq: 'done', interview: 'done',
        goals: 'done', assessment: 'done', program_design: 'done' }, null));
    render(<ClientJourneyCard clientId="c1" />);
    expect(await screen.findByText('Onboarding steps complete.')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Workout Log/ }))
      .toHaveAttribute('href', '/pt-os/clients/c1/workout-log');
    expect(screen.getByRole('link', { name: /Progress & Retest/ }))
      .toHaveAttribute('href', '/pt-os/progress?client_id=c1');
  });
});

describe('JourneyNextButton', () => {
  it('skips the step the screen is, and offers the next outstanding one', async () => {
    mockJourney.mockResolvedValue(journeyOf({ welcome_tour: 'done', enrolment: 'done', consent: 'done', parq: 'in_progress' }, 'parq'));
    render(<JourneyNextButton clientId="c1" current="parq" />);
    fireEvent.click(await screen.findByRole('button', { name: /Continue to Client Interview/ }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/interview?client_id=c1');
  });

  it('skips an optional, untouched enrolment', async () => {
    mockJourney.mockResolvedValue({ data: {
      steps: [
        { key: 'welcome_tour', state: 'done' },
        { key: 'enrolment', state: 'todo', optional: true },
        { key: 'consent', state: 'todo' },
      ],
      next: 'consent',
      screening: {},
    } });
    render(<JourneyNextButton clientId="c1" current="welcome_tour" />);
    fireEvent.click(await screen.findByRole('button', { name: /Continue to Informed Consent/ }));
    expect(mockPush).toHaveBeenCalledWith('/pt-os/informed-consent?client_id=c1');
  });

  it('a blocked next step shows its reason, not a button', async () => {
    mockJourney.mockResolvedValue(journeyOf({ welcome_tour: 'done', enrolment: 'done', consent: 'done', parq: 'done', interview: 'done', goals: 'done', assessment: 'blocked' }, 'assessment', 'This client is enrolled but not active yet.'));
    render(<JourneyNextButton clientId="c1" current="goals" />);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/not active/));
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

  it('the interview ends with the server-driven next step and keeps its scoped draft', () => {
    const src = read('interview/page.tsx');
    expect(src).toMatch(/current="interview"/);
    expect(src).not.toMatch(/stepHref\('assessment', clientId\)/);
    expect(src).toMatch(/client-interview-draft\.v2:\$\{clientId\}/);
    expect('client-interview-draft.v2:c1').toMatch(/-draft\.v\d+:/);
  });

  it('the new-client success screen starts the welcome tour', () => {
    const src = read('new-client/page.tsx');
    expect(src).toMatch(/\/pt-os\/welcome-tour\?client_id=\$\{createdId\}/);
    expect(src).toMatch(/Start Welcome & Tour/);
    expect(src).not.toMatch(/createdId\}\/enroll/);
  });

  it('the client list distinguishes a provisional enrolment from a bare add', () => {
    const src = read('clients/page.tsx');
    expect(src).toMatch(/Activation Pending/);
    expect(src).toMatch(/has_pt_term/);
    expect(src).toMatch(/label: 'Pending'/);
  });

  it('the enrol page warns about missing screening instead of stopping', () => {
    const src = read('clients/[id]/enroll/page.tsx');
    expect(src).not.toMatch(/if \(screeningMissing\) \{/);
    expect(src).toMatch(/activation pending screening/i);
    expect(src).toMatch(/Complete Informed Consent/);
    expect(src).toMatch(/Complete PAR-Q/);
  });

  it('the profile shows the journey on its overview', () => {
    expect(read('clients/[id]/page.tsx')).toMatch(/<ClientJourneyCard clientId=\{client\.id\} \/>/);
  });
});
