// The cockpit's Progress Radar card.
//
// The dashboard has no client in context, so the card shows the studio's most
// recent fitness test that actually carries scores — the endpoint is
// tenant-scoped and newest-first — and names its client from the roster.
// A row with fewer than three measured categories cannot draw a radar, and an
// empty card is honest where a placeholder shape would not be.
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
  cardio_score_computed: '50',
};
const FULL = {
  id: 'a1', client_id: 'c1', assessment_date: '2026-09-12', assessment_number: 1,
  cardio_score_computed: '70', strength_score_computed: '64',
  endurance_score_computed: null, mobility_score_computed: '61',
  body_composition_score: '58', health_risk_score: '80',
  overall_fitness_score: '66',
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
      ['Cardio', 'Strength', 'Endurance', 'Mobility', 'Body Comp.', 'Health Risk']);
    expect(props.data.map((r) => r.score)).toEqual([70, 64, null, 61, 58, 80]);
    expect(props.variant).toBe('onCard');
  });

  it('names the client from the roster, dates the test and shows the overall', async () => {
    route([FULL]);
    render(<ProgressRadarCard />);
    expect(await screen.findByText('Asha Nair')).toBeTruthy();
    expect(screen.getByText(/12-09-2026/)).toBeTruthy();
    expect(screen.getByText('Overall 66')).toBeTruthy();
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
});
