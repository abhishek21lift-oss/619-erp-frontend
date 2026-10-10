// Phase 2 — screening visibility is display-only: server verdicts rendered
// verbatim, never computed or reinterpreted. Synthetic fixtures only.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  ScreeningStatusCard,
  ScreeningWarningsNotice,
  asScreeningSummary,
} from '@/components/pt-os/fitness-testing/ScreeningStatusCard';

const FULL = {
  consent: { status: 'completed' },
  parq: { status: 'submitted', risk_level: 'high', has_valid_clearance: true, complete: true, stale: false },
  block: null,
  warnings: [],
  complete: false,
};

const BLOCKED = {
  consent: { status: 'completed' },
  parq: { status: 'submitted', risk_level: 'high', has_valid_clearance: false, complete: true, stale: true },
  block: { code: 'PARQ_BLOCKED', message: 'Server block message verbatim.' },
  warnings: ['Server warning verbatim.'],
  complete: false,
};

describe('asScreeningSummary', () => {
  it('passes records through and rejects non-records', () => {
    expect(asScreeningSummary(FULL)).toBe(FULL);
    expect(asScreeningSummary(null)).toBeNull();
    expect(asScreeningSummary(undefined)).toBeNull();
    expect(asScreeningSummary('high')).toBeNull();
    expect(asScreeningSummary(42)).toBeNull();
  });
});

describe('ScreeningStatusCard', () => {
  it('renders available server fields verbatim', () => {
    const { container } = render(<ScreeningStatusCard screening={FULL} clientId="c1" />);
    expect(screen.getByText(/Risk level: High/)).toBeTruthy();
    expect(screen.getByText('Valid')).toBeTruthy();
    expect(screen.getByText('Completed')).toBeTruthy();
    expect(screen.getByText(/Submitted/)).toBeTruthy();
    expect(container.textContent).toContain('Medical clearance');
    expect(container.textContent).toContain('Informed consent');
  });

  it('renders a server block message verbatim without inventing states', () => {
    render(<ScreeningStatusCard screening={BLOCKED} clientId="c1" />);
    expect(screen.getByText('Server block message verbatim.')).toBeTruthy();
    expect(screen.getByText('Server warning verbatim.')).toBeTruthy();
    // The card must not present its own combined clinical verdict.
    expect(screen.queryByText(/^\s*Cleared\s*$/)).toBeNull();
    expect(screen.queryByText(/^\s*Blocked\s*$/)).toBeNull();
    // …but it must say the snapshot is not the live authorization.
    expect(screen.getByText(/re-checks eligibility every time you save/)).toBeTruthy();
  });

  it('keeps consent and medical clearance distinct', () => {
    const { container } = render(
      <ScreeningStatusCard
        screening={{ consent: { status: 'none' }, parq: { status: 'none', has_valid_clearance: false } }}
        clientId="c1"
      />,
    );
    const text = container.textContent ?? '';
    expect(text).toContain('Medical clearance');
    expect(text).toContain('Informed consent');
    expect(text).toContain('None recorded');
  });

  it('null or absent screening renders nothing and never implies a finding', () => {
    for (const v of [null, undefined, 'high', 42]) {
      const { container, unmount } = render(<ScreeningStatusCard screening={v} clientId="c1" />);
      expect(container.textContent).toBe('');
      unmount();
    }
  });

  it('partial shapes render without crashing', () => {
    const { container } = render(<ScreeningStatusCard screening={{ parq: {} }} clientId="c1" />);
    expect(container.textContent).toContain('Medical screening');
    expect(container.textContent).toContain('Not recorded');
  });

  it('links to the established PAR-Q and consent routes only', () => {
    render(<ScreeningStatusCard screening={FULL} clientId="c9" />);
    const parq = screen.getByText('Review PAR-Q').closest('a');
    const consent = screen.getByText('Open consent').closest('a');
    expect(parq?.getAttribute('href')).toBe('/pt-os/parq?client_id=c9');
    expect(consent?.getAttribute('href')).toBe('/pt-os/informed-consent?client_id=c9');
  });
});

describe('ScreeningWarningsNotice', () => {
  it('renders existing warnings with fix links', () => {
    render(<ScreeningWarningsNotice warnings={['No PAR-Q on file.']} clientId="c1" />);
    expect(screen.getByText('Screening notes')).toBeTruthy();
    expect(screen.getByText('No PAR-Q on file.')).toBeTruthy();
    expect(screen.getByText('Review PAR-Q')).toBeTruthy();
  });

  it('empty or absent warnings render nothing', () => {
    for (const w of [[], null, undefined, 'x'] as unknown as string[][]) {
      const { container, unmount } = render(<ScreeningWarningsNotice warnings={w} clientId="c1" />);
      expect(container.textContent).toBe('');
      unmount();
    }
  });
});
