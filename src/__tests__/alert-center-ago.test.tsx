// "last just now ago"
//
// Seen on a real incident screenshot. The row template appended the word "ago"
// to a helper that already returned "just now" for anything under a minute:
//
//     <span>last {ago(alert.last_seen_at)} ago</span>
//
// Every branch read correctly except that one — and that one is the branch a
// LIVE alert always takes, because a live alert is by definition still firing.
// The bug was invisible in every test fixture with an old timestamp and present
// on screen the whole time anyone was actually watching an incident.
//
// The suffix now lives inside the helper, which is the only place that knows
// whether it makes sense.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import AlertCenter from '@/components/platform/alert-center';

const alerts = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    superAdmin: {
      commandCenterAlerts: () => alerts(),
      acknowledgeAlert: vi.fn(),
      resolveAlert: vi.fn(),
    },
  },
}));

function alert(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    id: 'a1',
    title: 'Email delivery problem',
    severity: 'critical',
    status: 'open',
    reason: '2 invitation(s) created, none delivered',
    source: 'smtp',
    occurrences: 1228,
    first_seen_at: now,
    last_seen_at: now,
    acknowledged_by_name: null,
    resolution: null,
    ...overrides,
  };
}

const respond = (list: unknown[]) =>
  alerts.mockResolvedValue({ data: { alerts: list, stats: { critical: 1, acknowledged: 0, resolved_24h: 0 } } });

beforeEach(() => alerts.mockReset());
afterEach(() => vi.clearAllMocks());

describe('how long ago', () => {
  it('says "just now" without an "ago" glued to it', async () => {
    respond([alert()]);
    render(<AlertCenter />);

    const line = await screen.findByText(/^last /);
    expect(line.textContent).toBe('last just now');
    // The exact string from the screenshot. Named so a regression is
    // recognisable rather than just a failed match.
    expect(document.body.textContent).not.toContain('just now ago');
  });

  it('still says "ago" for every duration that needs it', async () => {
    const mins = (n: number) => new Date(Date.now() - n * 60_000).toISOString();
    respond([
      alert({ id: 'm', last_seen_at: mins(4) }),
      alert({ id: 'h', last_seen_at: mins(60 * 9) }),
      alert({ id: 'd', last_seen_at: mins(60 * 24 * 3) }),
    ]);
    render(<AlertCenter />);

    await waitFor(() => expect(screen.getAllByText(/^last /)).toHaveLength(3));
    expect(screen.getAllByText(/^last /).map((n) => n.textContent))
      .toEqual(['last 4m ago', 'last 9h ago', 'last 3d ago']);
  });

  it('renders an em dash rather than "NaN" for a missing timestamp', async () => {
    respond([alert({ last_seen_at: null })]);
    render(<AlertCenter />);
    const line = await screen.findByText(/^last /);
    expect(line.textContent).toBe('last —');
  });
});
