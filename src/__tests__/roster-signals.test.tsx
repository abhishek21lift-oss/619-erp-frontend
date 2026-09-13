// The roster sweep, rendered.
//
// GET /api/pt-os/signals has swept the whole roster since the training-signals
// work landed and nothing displayed it — 7 clients paying and absent, 8 whose
// term had finished, 1 who paid and never came, all computed server-side and
// visible on no screen in the app.
//
// The interesting failure modes are not "does it render a list". They are:
//
//   · re-sorting the server's order, so this card and the endpoint disagree
//     about who to call first;
//   · flattening the severities, so the finished-term clients sit in the same
//     list as the paying ones and the trainer learns to ignore both;
//   · rendering an empty list after a failed request, which reads as "nobody
//     needs calling" — the one wrong answer a trainer cannot recover from,
//     because it tells them to stop looking;
//   · paraphrasing the evidence, which is the audit trail the trainer is about
//     to quote on the phone.
//
// Each test below is one of those.

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import type { RosterSignalClient, RosterSignalSweep } from '@/lib/api';
import RosterSignalsCard, { summariseUnobservable } from '@/components/pt-os/RosterSignalsCard';

const mockSignals = vi.fn();

vi.mock('@/lib/api', () => ({
  api: { pt: { signals: (...args: unknown[]) => mockSignals(...args) } },
}));

beforeEach(() => {
  mockSignals.mockReset();
});

function client(over: Partial<RosterSignalClient> = {}): RosterSignalClient {
  return {
    client_id: 'c-1',
    client_name: 'Rahul Sharma',
    term: { state: 'current', end: '2026-12-31', days_left: 109 },
    last_session: '2026-08-01',
    days_quiet: 43,
    signals: [{
      id: 'gone_quiet',
      severity: 'critical',
      headline: 'Paying, and stopped coming',
      evidence: 'last trained 2026-08-01, 43 days ago; term runs to 2026-12-31',
      recommendation: 'Contact them this week.',
      days_quiet: 43,
    }],
    unobservable: [],
    worst: 'critical',
    ...over,
  };
}

function sweep(over: Partial<RosterSignalSweep> = {}): RosterSignalSweep {
  const detail = over.clients_detail ?? [client()];
  return {
    clients: 34,
    clients_with_signals: detail.length,
    critical: detail.filter((r) => r.worst === 'critical').length,
    warning: detail.filter((r) => r.worst === 'warning').length,
    info: detail.filter((r) => r.worst === 'info').length,
    by_signal: [],
    not_assessable: 0,
    ...over,
    clients_detail: detail,
  };
}

const resolve = (data: RosterSignalSweep) => mockSignals.mockResolvedValue({ data });

describe('roster signals card', () => {
  it('renders the finding, its evidence and its recommendation verbatim', async () => {
    resolve(sweep());
    render(<RosterSignalsCard />);

    expect(await screen.findByText('Paying, and stopped coming')).toBeInTheDocument();
    // Verbatim, dates included. A paraphrase here is a trainer quoting a date
    // the client's record does not hold.
    expect(screen.getByText('last trained 2026-08-01, 43 days ago; term runs to 2026-12-31'))
      .toBeInTheDocument();
    expect(screen.getByText('Contact them this week.')).toBeInTheDocument();
  });

  it('links the client to their profile, where the phone number is', async () => {
    resolve(sweep());
    render(<RosterSignalsCard />);

    const link = await screen.findByRole('link', { name: 'Rahul Sharma' });
    expect(link).toHaveAttribute('href', '/pt-os/clients/c-1');
  });

  it('keeps the server order rather than sorting by how long they have been quiet', async () => {
    // The trap: the INFO client has been silent far longer. A card that sorted
    // by days_quiet would put a finished term above a paying client who has
    // stopped coming — the exact inversion the endpoint's ordering prevents.
    resolve(sweep({
      clients_detail: [
        client({ client_id: 'urgent', client_name: 'Paying Priya', days_quiet: 12 }),
        client({
          client_id: 'quiet',
          client_name: 'Finished Farhan',
          days_quiet: 300,
          worst: 'info',
          term: { state: 'ended', end: '2025-11-30', days_left: -287 },
          signals: [{
            id: 'term_ended_inactive',
            severity: 'info',
            headline: 'Term finished, not training',
            evidence: 'last trained 2025-11-18, 300 days ago; term ended 2025-11-30',
            recommendation: 'Win-back, not a chase.',
          }],
        }),
      ],
    }));
    render(<RosterSignalsCard />);

    expect(await screen.findByText('Paying Priya')).toBeInTheDocument();
    // And the longer-silent info client is not in the urgent list at all.
    expect(screen.queryByText('Finished Farhan')).not.toBeInTheDocument();
  });

  it('puts the info findings behind a disclosure that says what they are', async () => {
    resolve(sweep({
      clients_detail: [
        client(),
        client({
          client_id: 'q1',
          client_name: 'Finished Farhan',
          worst: 'info',
          signals: [{
            id: 'term_ended_inactive',
            severity: 'info',
            headline: 'Term finished, not training',
            evidence: 'term ended 2025-11-30',
            recommendation: 'Win-back, not a chase.',
          }],
        }),
      ],
    }));
    render(<RosterSignalsCard />);

    const toggle = await screen.findByRole('button', { name: /1 more with nothing urgent/i });
    // Not just a count: a trainer deciding whether to open it needs to know
    // these are finished terms and training notes.
    expect(toggle).toHaveTextContent(/finished terms and training notes/i);
    expect(screen.queryByText('Finished Farhan')).not.toBeInTheDocument();

    fireEvent.click(toggle);
    expect(screen.getByText('Finished Farhan')).toBeInTheDocument();
  });

  it('cuts at the first info row as a prefix, so a re-ordered server response is still shown in the order it arrived', async () => {
    // If the cut were a FILTER on severity, this warning would be hoisted above
    // the info row that the server placed before it — silently re-ordering the
    // endpoint's answer. A prefix cannot: everything after the first info row
    // stays where it was sent, whatever its severity.
    resolve(sweep({
      clients_detail: [
        client({ client_id: 'a', client_name: 'First Critical' }),
        client({
          client_id: 'b',
          client_name: 'An Info Row',
          worst: 'info',
          signals: [{ id: 'plateau', severity: 'info', headline: 'Stalled on 1 lift', evidence: 'Bench Press', recommendation: 'Change a variable.' }],
        }),
        client({
          client_id: 'c',
          client_name: 'Late Warning',
          worst: 'warning',
          signals: [{ id: 'deload_due', severity: 'warning', headline: 'Deload indicated', evidence: 'three weeks over MRV', recommendation: 'Drop volume.' }],
        }),
      ],
    }));
    render(<RosterSignalsCard />);

    expect(await screen.findByText('First Critical')).toBeInTheDocument();
    expect(screen.queryByText('Late Warning')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 more with nothing urgent/i })).toBeInTheDocument();
  });

  it('says the list is unknown when the sweep failed, never that it is empty', async () => {
    mockSignals.mockRejectedValue(new Error('network'));
    render(<RosterSignalsCard />);

    expect(await screen.findByText(/did not come back/i)).toBeInTheDocument();
    expect(screen.getByText(/Nobody has been cleared/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('retries the sweep and renders what comes back the second time', async () => {
    mockSignals
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ data: sweep() });
    render(<RosterSignalsCard />);

    fireEvent.click(await screen.findByRole('button', { name: /retry/i }));
    expect(await screen.findByText('Paying, and stopped coming')).toBeInTheDocument();
  });

  it('says the sweep ran when it found nothing, rather than rendering no card', async () => {
    // "No card" and "swept 34 clients and found nothing" are different answers
    // and only one of them tells the trainer the check happened.
    resolve(sweep({ clients_detail: [], clients_with_signals: 0 }));
    render(<RosterSignalsCard />);

    expect(await screen.findByText(/Swept 34 clients — nothing to flag today/)).toBeInTheDocument();
  });

  it('reports the clients nothing could be computed for', async () => {
    resolve(sweep({ not_assessable: 12 }));
    render(<RosterSignalsCard />);

    expect(await screen.findByText(/12 clients could not be assessed at all/)).toBeInTheDocument();
  });

  it('names the checks that could not be run on a client it is reporting on', async () => {
    // Without this, a row showing only "gone quiet" reads as though the engine
    // had looked at their progression and found it fine.
    resolve(sweep({
      clients_detail: [client({
        unobservable: [
          { signal: 'plateau', reason: 'no lift has 3 logged sessions yet' },
          { signal: 'regression', reason: 'no lift has 3 logged sessions yet' },
        ],
      })],
    }));
    render(<RosterSignalsCard />);

    expect(await screen.findByText(/Not checked: plateau, regression — no lift has 3 logged sessions yet/))
      .toBeInTheDocument();
  });

  it('announces severity in words, not colour alone', async () => {
    resolve(sweep());
    render(<RosterSignalsCard />);

    // The word is the accessible label on the finding. A chip that is only red
    // says nothing to a screen reader, or in a screenshot pasted into WhatsApp.
    expect(await screen.findByText('Urgent:')).toBeInTheDocument();
  });

  it('shows the term, because it is the fact that decides whether the silence matters', async () => {
    resolve(sweep());
    render(<RosterSignalsCard />);
    expect(await screen.findByText('term to 2026-12-31')).toBeInTheDocument();
  });

  it('says nothing about a term it has no dates for', async () => {
    resolve(sweep({
      clients_detail: [client({ term: { state: 'unknown', end: null, days_left: null } })],
    }));
    render(<RosterSignalsCard />);

    await screen.findByText('Paying, and stopped coming');
    expect(screen.queryByText(/term to/)).not.toBeInTheDocument();
    expect(screen.queryByText(/term ended/)).not.toBeInTheDocument();
  });

  it('does not fetch the sweep more than once on mount', async () => {
    resolve(sweep());
    render(<RosterSignalsCard />);
    await screen.findByText('Paying, and stopped coming');
    await waitFor(() => expect(mockSignals).toHaveBeenCalledTimes(1));
  });
});

describe('summariseUnobservable', () => {
  it('groups by reason so a shared reason is stated once', () => {
    expect(summariseUnobservable([
      { signal: 'plateau', reason: 'no sets logged' },
      { signal: 'regression', reason: 'no sets logged' },
      { signal: 'deload', reason: 'no training history supplied' },
    ])).toBe('plateau, regression — no sets logged; deload — no training history supplied');
  });

  it('keeps two different reasons apart rather than picking one', () => {
    const out = summariseUnobservable([
      { signal: 'volume', reason: 'no attributable weekly volume' },
      { signal: 'deload', reason: 'none of 4 triggers could be evaluated' },
    ]);
    expect(out).toContain('no attributable weekly volume');
    expect(out).toContain('none of 4 triggers could be evaluated');
  });
});
