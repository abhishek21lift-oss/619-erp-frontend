// The training brief panel must not be able to break /pt-os.
//
// It shipped reading `sections.<name>.<field>` straight off the response, so
// any payload missing one key threw a TypeError mid-render — and because the
// panel mounts under /pt-os, that throw took the whole segment to its error
// boundary ("this part of the app failed to load") rather than degrading the
// one tab. These tests pin the two halves of the fix:
//
//   1. the render is TOTAL — no payload makes it throw;
//   2. a payload it cannot read is SAID OUT LOUD, not rendered as a blank tab,
//      because silence there reads as "this client has nothing on file".
//
// The shapes below are the ones that actually reach a browser: a client with
// no assessments, a response from a build that predates a field, and JSONB
// columns that hold a string where a list was expected.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

const trainingBrief = vi.fn();
const toastError = vi.fn();
vi.mock('@/lib/api', () => ({ api: { pt: { trainingBrief: (id: string) => trainingBrief(id) } } }));
vi.mock('@/lib/toast', () => ({ useToast: () => ({ toast: { error: toastError } }) }));

import TrainingBriefPanel, { normaliseBrief, briefAsText } from '@/components/pt-os/TrainingBriefPanel';
import type { TrainingBrief } from '@/lib/api';

const FULL = {
  client: { id: 'c1', name: 'Ajeet Yadav', gender: 'male', age: 28, goal: 'muscle_gain', notes: null },
  sections: {
    readiness: { present: true, as_of: '2026-07-01', risk_level: 'low', current_health: [], past_history: [] },
    body: { present: true, as_of: '2026-07-01', weight_kg: 72, height_cm: 175 },
    capacity: { present: true, as_of: '2026-07-01', strength: { score: 6, category: 'fair' } },
    limitations: {
      present: true,
      posture: { as_of: '2026-07-01', risk_level: 'low', issues: ['rounded shoulders'], notes: null },
      mobility: {
        as_of: '2026-07-01', category: 'fair', score: 5, notes: null,
        findings: [{ region: 'Neck', pain: true, restriction: true, score: 3 }],
      },
      injuries: null, has_asymmetry: null,
    },
    lifestyle: { present: true, as_of: '2026-07-01', sleep_hours: 7 },
    goal: { present: true, as_of: '2026-07-01', priority: 'muscle_gain', challenges: ['time'] },
    history: { present: false },
  },
  missing: ['history'],
  completeness_pct: 86,
};

const render_ = (payload: unknown, onLoaded?: (b: TrainingBrief) => void) => {
  trainingBrief.mockResolvedValue({ data: payload });
  return render(<TrainingBriefPanel clientId="c1" onLoaded={onLoaded} />);
};

describe('TrainingBriefPanel — the render is total', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders a complete brief', async () => {
    render_(FULL);
    await waitFor(() => expect(screen.getByText(/86% complete/)).toBeTruthy());
    expect(screen.getByText('Neck')).toBeTruthy();
    expect(screen.getByText('rounded shoulders')).toBeTruthy();
  });

  // The exact shape that took the segment down: mobility present, `findings`
  // absent, because the server that answered predates the findings reader.
  it('renders when a present section is missing a nested list', async () => {
    render_({
      ...FULL,
      sections: {
        ...FULL.sections,
        limitations: {
          present: true,
          posture: { as_of: '2026-07-01', risk_level: 'low', notes: null },
          mobility: { as_of: '2026-07-01', category: 'fair' },
          injuries: null, has_asymmetry: null,
        },
      },
    });
    await waitFor(() => expect(screen.getByText(/Training brief/)).toBeTruthy());
    expect(screen.getByText(/No painful or restricted regions found/)).toBeTruthy();
  });

  it('renders when `sections` is absent entirely', async () => {
    render_({ client: { id: 'c1', name: 'A' }, missing: [], completeness_pct: 0 });
    await waitFor(() => expect(screen.getByText(/Training brief/)).toBeTruthy());
    // Every section falls back to "nobody has checked", never to "clear".
    expect(screen.getAllByText(/Not assessed/).length).toBe(7);
  });

  // These JSONB columns hold three different shapes depending on which
  // assessment screen wrote them. A string has a `.length` but no `.map`.
  it('renders when a list field arrives as a string', async () => {
    render_({
      ...FULL,
      sections: {
        ...FULL.sections,
        readiness: { present: true, as_of: '2026-07-01', current_health: 'asthma', past_history: null },
      },
    });
    await waitFor(() => expect(screen.getByText(/Training brief/)).toBeTruthy());
  });

  it('says so when the brief cannot be read, rather than rendering nothing', async () => {
    render_(null);
    await waitFor(() => expect(screen.getByText(/Could not load this client/)).toBeTruthy());
    expect(screen.getByRole('button', { name: /try again/i })).toBeTruthy();
  });

  it('says so when the request fails', async () => {
    trainingBrief.mockRejectedValue(new Error('500'));
    render(<TrainingBriefPanel clientId="c1" />);
    await waitFor(() => expect(screen.getByText(/Could not load this client/)).toBeTruthy());
    expect(toastError).toHaveBeenCalled();
  });

  // The page reads the client off this callback to title its hero. A brief it
  // could not read must not hand the page a half-built client.
  it('only calls onLoaded with a readable brief', async () => {
    const onLoaded = vi.fn();
    render_(null, onLoaded);
    await waitFor(() => expect(screen.getByText(/Could not load this client/)).toBeTruthy());
    expect(onLoaded).not.toHaveBeenCalled();
  });
});

describe('normaliseBrief', () => {
  it('fills shape but never presence', () => {
    const b = normaliseBrief({ client: {}, sections: { readiness: {} } })!;
    // `{}` is not `{ present: true }`, so it must come back unassessed —
    // filling it in would make a client nobody screened look screened.
    expect(b.sections.readiness.present).toBe(false);
    expect(b.missing).toEqual([]);       // the server's list, not one we invent
    expect(b.completeness_pct).toBe(0);
  });

  it('keeps a present section intact', () => {
    const b = normaliseBrief(FULL)!;
    expect(b.sections.capacity.strength).toEqual({ score: 6, category: 'fair' });
    expect(b.sections.limitations.mobility?.findings).toHaveLength(1);
  });

  // Pinned here rather than only through the render: the render also reads
  // these two with `?? []`, so a render-level test passes whether or not the
  // normaliser repairs them, and the repair would go untested.
  it('repairs the nested lists the render walks', () => {
    const b = normaliseBrief({
      ...FULL,
      sections: {
        ...FULL.sections,
        limitations: {
          present: true,
          mobility: { as_of: '2026-07-01', category: 'fair' },   // no findings
          posture: { as_of: '2026-07-01', issues: 'rounded shoulders' }, // a string
        },
      },
    })!;
    expect(b.sections.limitations.mobility?.findings).toEqual([]);
    expect(b.sections.limitations.posture?.issues).toEqual([]);
    expect(b.sections.limitations.mobility?.category).toBe('fair');  // content survives
  });

  it('rejects a payload that is not an object', () => {
    expect(normaliseBrief(null)).toBeNull();
    expect(normaliseBrief('nope')).toBeNull();
    expect(normaliseBrief([FULL])).toBeNull();
  });
});

describe('briefAsText', () => {
  it('carries the gaps, so a model reading it does not treat them as clear', () => {
    const text = briefAsText(normaliseBrief(FULL)!);
    expect(text).toContain('NOT ASSESSED');
    expect(text).toContain('Current programme');
    expect(text).toContain('Neck: pain + restricted');
  });

  it('does not throw on a degraded brief', () => {
    const b = normaliseBrief({
      ...FULL,
      sections: { ...FULL.sections, goal: { present: true, challenges: 'time' } },
    })!;
    expect(() => briefAsText(b)).not.toThrow();
  });
});
