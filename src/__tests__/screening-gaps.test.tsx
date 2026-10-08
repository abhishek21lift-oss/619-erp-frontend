// Clients not cleared to train, on the dashboard (screening audit 2026-10-08, H1).
//
// The gate blocks only a client with no PT term yet; an existing client with
// no consent or an incomplete PAR-Q was trained with a warning nobody saw.
// This pins the list that surfaces them: what it says, where it links, and
// that it stays out of the way when there is nothing to say.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { gapChips, gapHref, sortGaps, type ScreeningGap } from '@/lib/screening-gaps';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock('@/lib/auth-context', () => ({ useAuth: () => ({ user: { name: 'T', organization_name: 'S' } }) }));
vi.mock('@/components/ui', () => ({
  PullToRefresh: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

let response: Promise<unknown> = Promise.resolve({ data: [], total: 0 });
vi.mock('@/lib/http', () => ({ default: () => response }));

import { ScreeningGaps } from '@/components/dashboards/PtOsDashboard';

const gap = (extra: Partial<ScreeningGap>): ScreeningGap => ({
  client_id: 'c1', client_name: 'Mina Rao', client_photo: null, missing: [], block: null, ...extra,
});

describe('screening gap rules', () => {
  it('sends a client to the hard stop first, else the first missing step', () => {
    expect(gapHref(gap({ block: 'PARQ_BLOCKED', missing: ['informed_consent'] }))).toBe('/pt-os/parq?client_id=c1');
    expect(gapHref(gap({ block: 'PHYSICIAN_ADVISED_AGAINST' }))).toBe('/pt-os/informed-consent?client_id=c1');
    expect(gapHref(gap({ missing: ['informed_consent', 'parq'] }))).toBe('/pt-os/informed-consent?client_id=c1');
    expect(gapHref(gap({ missing: ['parq'] }))).toBe('/pt-os/parq?client_id=c1');
  });

  it('labels a hard stop as danger and does not repeat a revoked consent as missing', () => {
    expect(gapChips(gap({ block: 'CONSENT_REVOKED', missing: ['informed_consent', 'parq'] }))).toEqual([
      { label: 'Consent revoked', severity: 'danger' },
      { label: 'PAR-Q incomplete', severity: 'warning' },
    ]);
  });

  it('puts hard stops first and keeps name order otherwise', () => {
    const out = sortGaps([
      gap({ client_id: 'a', missing: ['parq'] }),
      gap({ client_id: 'b', missing: ['informed_consent', 'parq'] }),
      gap({ client_id: 'c', block: 'PARQ_BLOCKED' }),
      gap({ client_id: 'd', missing: ['parq'] }),
    ]);
    expect(out.map((g) => g.client_id)).toEqual(['c', 'b', 'a', 'd']);
  });
});

describe('<ScreeningGaps />', () => {
  beforeEach(() => { response = Promise.resolve({ data: [], total: 0 }); });

  it('lists each client as a link to the step that clears them', async () => {
    response = Promise.resolve({
      data: [gap({ client_id: 'c1', missing: ['informed_consent', 'parq'] }), gap({ client_id: 'c2', client_name: 'Ravi', block: 'PARQ_BLOCKED' })],
      total: 2,
    });
    render(<ScreeningGaps />);
    expect(await screen.findByText('2 clients are not cleared to train')).toBeTruthy();
    const links = screen.getAllByRole('link');
    // The hard stop comes first.
    expect(links[0].getAttribute('href')).toBe('/pt-os/parq?client_id=c2');
    expect(links[1].getAttribute('href')).toBe('/pt-os/informed-consent?client_id=c1');
    expect(screen.getByText('No consent')).toBeTruthy();
  });

  it('shows five and points to the rest', async () => {
    const data = Array.from({ length: 7 }, (_, i) => gap({ client_id: `c${i}`, client_name: `Client ${i}`, missing: ['parq'] }));
    response = Promise.resolve({ data, total: 7 });
    render(<ScreeningGaps />);
    expect(await screen.findByText('2 more in Clients')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });

  it('renders nothing when every client is cleared', async () => {
    const { container } = render(<ScreeningGaps />);
    await waitFor(() => expect(container.innerHTML).toBe(''));
  });

  it('renders nothing when the read fails, rather than an alarm it cannot back', async () => {
    response = Promise.reject(new Error('down'));
    const { container } = render(<ScreeningGaps />);
    await new Promise((r) => setTimeout(r, 0));
    expect(container.innerHTML).toBe('');
  });
});
