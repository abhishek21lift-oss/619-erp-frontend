// Settings → Integrations → WhatsApp.
//
// The three things worth pinning here are the ones a studio owner would be hurt
// by if they broke silently:
//
//   • the ban-risk disclosure appears BEFORE any QR is requested
//   • the QR is rendered from the raw string and never leaves component state
//   • "disconnect" and "unlink" stay distinguishable — one needs a new QR scan
//     and the other does not, and confusing them costs a re-pairing

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// fireEvent + act, not user-event: the latter is not a dependency of this
// repo, and adding one for a single test file is not worth it. This is the
// idiom the existing component tests use (see add-exercises-page.test.tsx).
import { render, screen, waitFor, cleanup, fireEvent, act } from '@testing-library/react';
import type { WhatsAppStatus } from '@/lib/api';

const status = vi.fn();
const connect = vi.fn();
const qr = vi.fn();
const reconnect = vi.fn();
const disconnect = vi.fn();
const unlink = vi.fn();

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { whatsapp: { status, connect, qr, reconnect, disconnect, unlink } },
  };
});

// framer-motion is deliberately NOT mocked. It works in jsdom, and the first
// attempt here mocked `m` as a Proxy that returned a component for any
// property — including `then`, which makes the object look thenable and stops
// the component rendering at all. Testing the real thing is both simpler and
// closer to what ships.

const { default: WhatsAppCard } = await import('@/components/modules/WhatsAppCard');

/** A click wrapped in act(), so state updates it triggers are flushed. */
async function click(el: HTMLElement): Promise<void> {
  await act(async () => { fireEvent.click(el); });
}

// Widened `findBy*` window for a query immediately following a click that
// opens a NEW AnimatePresence-wrapped modal (RiskModal, the QR modal, the
// unlink-confirm modal — all rendered through Overlay/useDialogA11y). See the
// long comment in the 'pairing' describe block below for what this is
// mitigating and what was actually ruled out before reaching for it — this
// is not a blanket "tests are flaky, add a timeout" reflex.
const MODAL_TIMEOUT = { timeout: 5000 };

function aStatus(over: Partial<WhatsAppStatus> = {}): WhatsAppStatus {
  return { state: 'never_connected', phone_e164: null, configured: true, stale: false, ...over };
}

beforeEach(() => {
  vi.clearAllMocks();
  status.mockResolvedValue(aStatus());
  connect.mockResolvedValue({ success: true, state: 'connecting' });
  qr.mockResolvedValue({ qr: 'PAIRING-CREDENTIAL-STRING', expires_in_ms: 20000 });
  reconnect.mockResolvedValue({ success: true, state: 'connecting' });
  disconnect.mockResolvedValue({ success: true, state: 'disconnected' });
  unlink.mockResolvedValue({ success: true });
});

afterEach(cleanup);

describe('disconnected state', () => {
  it('offers Connect and asks for nothing to paste', async () => {
    render(<WhatsAppCard />);
    expect(await screen.findByRole('button', { name: /connect whatsapp/i })).toBeInTheDocument();
    // The old static card asked for an API key that nothing ever read.
    expect(screen.queryByPlaceholderText(/api key/i)).not.toBeInTheDocument();
  });

  it('says so plainly when the gateway is not deployed', async () => {
    status.mockResolvedValue(aStatus({ configured: false }));
    render(<WhatsAppCard />);

    expect(await screen.findByText(/not set up on this server/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect whatsapp/i })).toBeDisabled();
  });

  it('keeps showing the last known state when the status call fails', async () => {
    // An unreachable optional service must not turn the settings page into an
    // error page.
    status.mockRejectedValue(new Error('network'));
    render(<WhatsAppCard />);

    expect(await screen.findByText(/not connected/i)).toBeInTheDocument();
  });
});

describe('the risk disclosure', () => {
  it('appears before any QR is requested', async () => {
    // The property that matters: pressing Connect must not start a pairing
    // until the ban risk has been shown. Meta can permanently ban the number.
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /connect whatsapp/i }));

    expect(screen.getByText(/before you connect/i)).toBeInTheDocument();
    expect(screen.getByText(/permanently ban the number/i)).toBeInTheDocument();
    expect(connect).not.toHaveBeenCalled();
    expect(qr).not.toHaveBeenCalled();
  });

  it('starts pairing only after it is acknowledged', async () => {
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /connect whatsapp/i }));
    await click(await screen.findByRole('button', { name: /i understand/i }, MODAL_TIMEOUT));

    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  });

  it('cancels without starting anything', async () => {
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /connect whatsapp/i }));
    await click(await screen.findByRole('button', { name: /^cancel$/i }, MODAL_TIMEOUT));

    expect(connect).not.toHaveBeenCalled();
    expect(screen.queryByText(/before you connect/i)).not.toBeInTheDocument();
  });
});

describe('pairing', () => {
  // ── A CI-only flake, tracked down as far as evidence goes ──────────────────
  //
  // Two separate CI runs each failed once here — on TWO DIFFERENT tests that
  // both go through this same helper's second click — always at the exact
  // same transition: risk modal already open, click "I understand", the QR
  // modal that replaces it (still wrapped in AnimatePresence, still inside
  // Overlay/useDialogA11y) never shows up. Ruled out, with actual evidence
  // rather than assumption, before landing on a mitigation:
  //
  //  - Not a single missed tick: the failing calls already used `findByRole`
  //    (RTL's own default poll is 50ms over a 1000ms window) and still timed
  //    out — a properly-deferred render would have been caught well inside
  //    that window.
  //  - Not `window.matchMedia` being unavailable to framer-motion: it actually
  //    IS `undefined` in this environment too — confirmed by asserting it
  //    directly — and the tests using it pass 18/18 every local run anyway.
  //  - Not deterministic: 'appears before any QR is requested' (above)
  //    exercises the identical click→modal transition with a synchronous
  //    `getByText`, no retry tolerance at all, and has not failed in either
  //    CI run. If the transition itself were reliably slow on CI, that
  //    assertion should fail at least as often as this one. It hasn't. And
  //    across the two failures, it was a DIFFERENT specific test each time —
  //    consistent with a genuine, low-probability race under CI's scheduling,
  //    not something this environment structurally cannot do.
  //
  // What's left standing is a rare race that needs more than the default
  // budget to resolve on a loaded, shared CI runner — the standard case for
  // widening `findBy*`'s timeout, which weakens nothing: the element still
  // has to actually appear, this only stops requiring it within one second.
  // (MODAL_TIMEOUT is declared once, near the top of the file, and reused by
  // every other click-then-immediately-query-the-new-modal call below.)
  //
  // ── Two more failures, and three more hypotheses ruled out ─────────────────
  //
  // It has since failed twice more, both blocking a deploy from main. Four
  // occurrences now, across three different tests, always the same transition.
  // The widened window above did NOT stop it. What the two extra rounds bought
  // is a much narrower search space, recorded here so nobody pays for it again:
  //
  //  - NOT a cumulative timeout ceiling. MODAL_TIMEOUT (5000ms) equals vitest's
  //    default testTimeout, so a query using its full window leaves the test no
  //    room — real, and not the cause. Raising the test budget to 20s was tried
  //    on a branch and CI failed anyway. Its one benefit was diagnostic: the
  //    error stopped being `Test timed out in 5000ms` at the `it(...)` line and
  //    became `Unable to find role="button"` with a DOM dump, which is what
  //    made the next two testable at all.
  //  - NOT requestAnimationFrame starvation. The DOM dump showed the card's own
  //    wrapper still at `opacity: 0; transform: scale(0.92)` — framer-motion's
  //    initial state, never advanced — which looked conclusive. It is not:
  //    overriding rAF to fire only after 4000ms, far beyond any window here,
  //    still passes 18/18. AnimatePresence mounts its children immediately and
  //    defers only the EXIT, so the modal's presence does not depend on the
  //    animation having run. The stalled animation is a symptom of a loaded
  //    runner, not the mechanism.
  //  - NOT fixable by mocking framer-motion, the pattern three other test files
  //    here use. It introduces an order-dependent failure: 'starts pairing only
  //    after it is acknowledged' passes in isolation and fails with the file.
  //    That trades a rare flake for a reliable break.
  //
  // What is actually established: the click takes NO EFFECT. The button is in
  // the DOM, its onClick is a plain synchronous setModal('risk') with no async
  // gate, and afterwards the modal is absent — not late, absent. Never
  // reproduced locally, including under simulated starvation.
  //
  // The next person should start there rather than at the timeouts: something
  // is discarding or not flushing that state update, and the remaining
  // suspects are React 18 scheduling under act() and cross-test pollution of
  // the `status` mock's once-queue (vi.clearAllMocks does not drain it).

  async function openPairing(): Promise<void> {
    render(<WhatsAppCard />);
    await click(await screen.findByRole('button', { name: /connect whatsapp/i }));
    await click(await screen.findByRole('button', { name: /i understand/i }, MODAL_TIMEOUT));
  }

  it('renders the QR as an inline SVG built from the raw string', async () => {
    await openPairing();

    const holder = await screen.findByLabelText(/pairing qr code/i);
    expect(holder.innerHTML).toContain('<svg');

    // The credential itself is never written into the DOM as text — only the
    // rendered code. Anyone who can read the string can link a device.
    expect(document.body.textContent).not.toContain('PAIRING-CREDENTIAL-STRING');
  });

  it('shows the Linked Devices steps a studio owner has to follow', async () => {
    await openPairing();
    expect(await screen.findByText(/linked devices/i)).toBeInTheDocument();
    expect(screen.getByText(/link a device/i)).toBeInTheDocument();
  });

  it('explains an expired code instead of showing a generic error', async () => {
    const { ApiError } = await import('@/lib/http');
    qr.mockRejectedValue(new ApiError('gone', 410, 'QR_EXPIRED'));

    await openPairing();

    expect(await screen.findByText(/code expired/i)).toBeInTheDocument();
  });

  it('closes itself once the phone has scanned', async () => {
    // Leaving a scanned QR on screen invites a second scan, which WhatsApp
    // treats as replacing the device that just linked.
    status
      .mockResolvedValueOnce(aStatus())
      .mockResolvedValueOnce(aStatus())
      .mockResolvedValue(aStatus({ state: 'connected', phone_e164: '+919876543210' }));

    await openPairing();
    await screen.findByLabelText(/pairing qr code/i);

    await waitFor(
      () => expect(screen.queryByLabelText(/pairing qr code/i)).not.toBeInTheDocument(),
      { timeout: 6000 },
    );
  }, 10000);
});

describe('connected state', () => {
  beforeEach(() => {
    status.mockResolvedValue(
      aStatus({ state: 'connected', phone_e164: '+919876543210', connected_at: '2026-09-01T10:00:00.000Z' }),
    );
  });

  it('shows Connected with the number masked to its last four digits', async () => {
    render(<WhatsAppCard />);

    expect(await screen.findByText(/^connected$/i)).toBeInTheDocument();
    expect(screen.getByText(/3210/)).toBeInTheDocument();
    // A personal mobile number should not sit in full on a reception screen or
    // in a support screen-share.
    expect(screen.queryByText('+919876543210')).not.toBeInTheDocument();
  });

  it('offers Reconnect and Disconnect, not Connect', async () => {
    render(<WhatsAppCard />);

    expect(await screen.findByRole('button', { name: /reconnect/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect whatsapp/i })).not.toBeInTheDocument();
  });

  it('reconnects without showing the QR modal', async () => {
    // The session is still on disk, so this must not send the studio back
    // through a scan.
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /reconnect/i }));

    await waitFor(() => expect(reconnect).toHaveBeenCalledTimes(1));
    expect(screen.queryByLabelText(/pairing qr code/i)).not.toBeInTheDocument();
    expect(qr).not.toHaveBeenCalled();
  });
});

describe('unlink is separated from disconnect', () => {
  beforeEach(() => {
    status.mockResolvedValue(aStatus({ state: 'connected', phone_e164: '+919876543210' }));
  });

  it('confirms first, and explains that disconnect is the reversible one', async () => {
    // Unlink destroys the session; disconnect keeps it. Confusing them costs a
    // re-pairing, so the confirmation says which is which.
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /unlink this number/i }));

    expect(screen.getByText(/unlink whatsapp\?/i)).toBeInTheDocument();
    expect(screen.getByText(/new qr scan/i)).toBeInTheDocument();
    expect(unlink).not.toHaveBeenCalled();
  });

  it('does nothing when the confirmation is declined', async () => {
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /unlink this number/i }));
    await click(await screen.findByRole('button', { name: /keep it connected/i }, MODAL_TIMEOUT));

    expect(unlink).not.toHaveBeenCalled();
  });

  it('unlinks once confirmed', async () => {
    render(<WhatsAppCard />);

    await click(await screen.findByRole('button', { name: /unlink this number/i }));
    await click(await screen.findByRole('button', { name: /^unlink$/i }, MODAL_TIMEOUT));

    await waitFor(() => expect(unlink).toHaveBeenCalledTimes(1));
  });
});

describe('state copy', () => {
  it('describes every state in words a gym owner can act on', async () => {
    const cases: [WhatsAppStatus['state'], RegExp][] = [
      ['logged_out', /signed out on the phone/i],
      ['qr_timeout', /code expired/i],
      ['failed', /connection failed/i],
      ['disconnected', /disconnected/i],
      ['reconnecting', /reconnecting/i],
    ];

    for (const [state, matcher] of cases) {
      cleanup();
      status.mockResolvedValue(aStatus({ state }));
      render(<WhatsAppCard />);
      expect(await screen.findByText(matcher)).toBeInTheDocument();
    }
  });

  it('marks a stale reading as last-known rather than as a failure', async () => {
    // "We could not check right now" and "your WhatsApp is broken" read very
    // differently to a studio owner.
    status.mockResolvedValue(aStatus({ state: 'connected', phone_e164: '+919876543210', stale: true }));
    render(<WhatsAppCard />);

    expect(await screen.findByText(/last known/i)).toBeInTheDocument();
  });
});
