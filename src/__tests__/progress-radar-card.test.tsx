// The cockpit's Progress Radar card.
//
// The dashboard has no client in context, so the card shows the studio's most
// recent fitness test that actually carries scores and names its client from
// the roster. The traps: inheriting the endpoint's ordering instead of the
// dates it sent, saying "no tests yet" over a test that is merely
// under-measured, and letting a junk row take the whole card down.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

const { radarSpy } = vi.hoisted(() => ({ radarSpy: vi.fn() }));
vi.mock('@/components/pt-os/FitnessRadarChart', () => ({
  default: (props: unknown) => { radarSpy(props); return <div data-testid="radar-mock" />; },
}));

const { httpMock } = vi.hoisted(() => ({ httpMock: vi.fn() }));
vi.mock('@/lib/http', () => ({ default: httpMock }));

import ProgressRadarCard from '@/components/dashboards/cockpit/ProgressRadarCard';

// A sparse row can still be the newest — the card must look past it.
const SPARSE = {
  id: 'a2', client_id: 'c2', assessment_date: '2026-10-01', assessment_number: 2,
  cardio_score_computed: '10',
};
const FULL = {
  id: 'a1', client_id: 'c1', assessment_date: '2026-09-12', assessment_number: 1,
  bp_points: '7', anthropometric_points: '6', body_composition_score: '11',
  cardio_score_computed: '13', strength_score_computed: '7.5',
  endurance_score_computed: null, mobility_score_computed: '12',
  overall_fitness_score: '66', overall_points: '49.5', overall_max: '85',
};
const CLIENTS = [{ id: 'c1', name: 'Asha Nair', photo_url: null }];

function route(rows: unknown[], clients: unknown[] = CLIENTS) {
  httpMock.mockImplementation((url: string) => {
    if (url.startsWith('/api/progress/assessments')) return Promise.resolve({ data: rows });
    if (url.startsWith('/api/pt-os/clients')) return Promise.resolve({ data: clients, total: clients.length });
    return Promise.resolve({ data: [] });
  });
}

describe('progress radar card', () => {
  beforeEach(() => { httpMock.mockReset(); radarSpy.mockReset(); });

  it('plots the newest row that carries enough scores, skipping the one that does not', async () => {
    route([SPARSE, FULL]);
    render(<ProgressRadarCard />);
    expect(await screen.findByTestId('radar-mock')).toBeTruthy();
    const props = radarSpy.mock.calls[0][0] as {
      data: Array<{ category: string; score: number | null }>;
      variant?: string;
    };
    expect(props.data.map((r) => r.category)).toEqual(
      ['Blood Pressure', 'Anthropometrics', 'Body Comp.', 'Cardio', 'Strength', 'Endurance', 'Flexibility']);
    expect(props.data.map((r) => r.score)).toEqual([70, 60, 73.3, 65, 50, null, 80]);
    expect(props.variant).toBe('onCard');
  });

  it('speaks about the newest test by date, not the order the endpoint happened to send', async () => {
    const older = { ...FULL };
    const newer = { ...FULL, id: 'a3', assessment_date: '2026-10-05', cardio_score_computed: '16' };
    route([older, newer]); // oldest first: the card's claim is "the latest"
    render(<ProgressRadarCard />);
    expect(await screen.findByTestId('radar-mock')).toBeTruthy();
    const props = radarSpy.mock.calls[0][0] as { data: Array<{ category: string; score: number | null }> };
    expect(props.data.find((r) => r.category === 'Cardio')?.score).toBe(80);
  });

  it('names the client from the roster, dates the test and shows the overall', async () => {
    route([FULL]);
    render(<ProgressRadarCard />);
    expect(await screen.findByText('Asha Nair')).toBeTruthy();
    expect(screen.getByText(/12-09-2026/)).toBeTruthy();
    expect(screen.getByText('Overall 66/100')).toBeTruthy();
    // The radar is a shape; these are its readings as text.
    expect(screen.getByText('Cardio: 65 out of 100')).toBeTruthy();
    expect(screen.getByText('Endurance: not measured')).toBeTruthy();
  });

  it('never reads "no tests yet" over a test that is simply under-measured', async () => {
    // An overall score with one category measured: a radar needs three, but
    // saying the studio has never tested anyone would be false.
    route([{
      id: 'a9', client_id: 'c1', assessment_date: '2026-10-08',
      cardio_score_computed: '10', overall_fitness_score: '66',
      overall_points: '13.2', overall_max: '20',
    }]);
    render(<ProgressRadarCard />);
    expect(await screen.findByText('Overall 66/100')).toBeTruthy();
    expect(screen.queryByTestId('radar-mock')).toBeNull();
    expect(screen.getByText(/no radar to draw/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /open assessment/i }).getAttribute('href'))
      .toBe('/pt-os/assessment?client_id=c1');
    expect(screen.queryByText(/No fitness tests yet/i)).toBeNull();
  });

  it('does not plot a legacy v1 row as 100-point step scores', async () => {
    // v1 stored 0-100 component averages with no denominator; 55 "strength"
    // would otherwise be plotted as 55 of 15 points. The card names the test
    // but claims no radar and no overall.
    route([{
      id: 'a7', client_id: 'c1', assessment_date: '2026-10-19', assessment_number: 1,
      cardio_score_computed: '20', strength_score_computed: '55',
      endurance_score_computed: '20', overall_fitness_score: '38',
      overall_points: null, overall_max: null,
    }]);
    render(<ProgressRadarCard />);
    expect(await screen.findByText('Asha Nair')).toBeTruthy();
    expect(screen.queryByTestId('radar-mock')).toBeNull();
    expect(screen.queryByText(/Overall 38\/100/)).toBeNull();
    expect(screen.getByText(/scored on the old formula/i)).toBeTruthy();
  });

  it('ignores junk rows rather than letting them take the card down', async () => {
    route([null, 'nope', FULL]);
    render(<ProgressRadarCard />);
    expect(await screen.findByTestId('radar-mock')).toBeTruthy();
    expect(screen.getByText('Asha Nair')).toBeTruthy();
  });

  it('points at the wizard when nothing has been measured yet', async () => {
    route([]);
    render(<ProgressRadarCard />);
    expect(await screen.findByText(/No fitness tests yet/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /assessment/i }).getAttribute('href')).toBe('/pt-os/assessment');
  });

  it('renders nothing when the endpoint fails', async () => {
    httpMock.mockImplementation((url: string) =>
      url.startsWith('/api/progress/assessments')
        ? Promise.reject(new Error('down'))
        : Promise.resolve({ data: [] }));
    const { container } = render(<ProgressRadarCard />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });

  it('renders nothing when the body is not a list at all', async () => {
    httpMock.mockImplementation((url: string) =>
      url.startsWith('/api/progress/assessments')
        ? Promise.resolve({ data: {} })
        : Promise.resolve({ data: [] }));
    const { container } = render(<ProgressRadarCard />);
    await waitFor(() => expect(container.firstChild).toBeNull());
  });
});
