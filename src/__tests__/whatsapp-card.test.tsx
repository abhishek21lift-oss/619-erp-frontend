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

/**
 * Find a button by its accessible name and click it once it can ACTUALLY be
 * clicked.
 *
 * The `toBeEnabled` wait is the whole point and is not defensive padding — see
 * the long note in the 'pairing' describe block. This card renders its primary
 * button `disabled` until the status request resolves, `findByRole` matches a
 * disabled button perfectly happily, and `fireEvent.click` on a disabled button
 * is a silent no-op. Querying and clicking in one step is therefore a race with
 * the status mock's microtask, and on a loaded runner the test loses it: the
 * click evaporates and the modal it should have opened never arrives.
 *
 * Waiting for enabled is also the more honest assertion. A person cannot click
 * a disabled button either.
 */
async function clickButton(name: RegExp, options: { timeout?: number } = {}): Promise<void> {
  const el = await screen.findByRole('button', { name }, options);
  await waitFor(() => expect(el).toBeEnabled(), options);
  await act(async () => { fireEvent.click(el); });
}

// Widened `findBy*` window for a query immediately following a click that
// opens a NEW AnimatePresence-wrapped modal (RiskModal, the QR modal, the
// unlink-confirm modal — all rendered through Overlay/useDialogA11y). See the
// long comment in the 'pairing' describe block below for what this is
// mitigating and what was actually ruled out before reaching for it — this
// is not a blanket "tests are flaky, add a timeout" reflex.
const MODAL_TIMEOUT = { timeout: 3000 };

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

    await clickButton(/connect whatsapp/i);

    expect(screen.getByText(/before you connect/i)).toBeInTheDocument();
    expect(screen.getByText(/permanently ban the number/i)).toBeInTheDocument();
    expect(connect).not.toHaveBeenCalled();
    expect(qr).not.toHaveBeenCalled();
  });

  it('starts pairing only after it is acknowledged', async () => {
    render(<WhatsAppCard />);

    await clickButton(/connect whatsapp/i);
    await clickButton(/i understand/i, MODAL_TIMEOUT);

    await waitFor(() => expect(connect).toHaveBeenCalledTimes(1));
  });

  it('cancels without starting anything', async () => {
    render(<WhatsAppCard />);

    await clickButton(/connect whatsapp/i);
    await clickButton(/^cancel$/i, MODAL_TIMEOUT);

    expect(connect).not.toHaveBeenCalled();
    expect(screen.queryByText(/before you connect/i)).not.toBeInTheDocument();
  });
});

describe('pairing', () => {
  // ── A CI-only flake, and six rounds of wrong answers ──────────────────────
  //
  // This block cost more than any other test in the repository, so what was
  // ruled out is kept rather than deleted — a wrong theory that leaves no
  // trace is one somebody pays for twice.
  //
  // The symptom: a CI run fails on one of the tests below, always at the same
  // transition — a click that should open a modal, and then a wait for a modal
  // that never arrives. A different test each time. Never locally.
  //
  // Ruled out, each with evidence rather than assumption:
  //
  //  - Not a single missed tick. The failing calls already used `findByRole`,
  //    whose default poll is 50ms over a 1000ms window; a merely deferred
  //    render would have been caught well inside it.
  //  - Not `window.matchMedia` missing for framer-motion. It is `undefined`
  //    locally too, and these pass 18/18 every local run.
  //  - Not the default `findBy*` budget. MODAL_TIMEOUT was widened to 5000ms
  //    and CI failed again.
  //  - Not a cumulative timeout ceiling. Raising the test budget to 20s was
  //    tried on a branch; CI failed anyway. Its one benefit was diagnostic —
  //    the error stopped being `Test timed out in 5000ms` at the `it(...)`
  //    line and became a real `Unable to find role=` with a DOM dump.
  //  - Not requestAnimationFrame starvation, though the DOM dump made it look
  //    certain: the card's wrapper sat at framer-motion's initial
  //    `opacity: 0; transform: scale(0.92)`, never advanced. Overriding rAF to
  //    fire only after 4000ms still passes 18/18. AnimatePresence mounts its
  //    children immediately and defers only the EXIT, so a modal's presence
  //    never depended on the animation. The stalled transform is a symptom of
  //    a loaded runner, not the mechanism.
  //  - Not fixable by mocking framer-motion, as three other files here do. It
  //    introduces an order-dependent failure — 'starts pairing only after it
  //    is acknowledged' then passes alone and fails with the file — trading a
  //    rare flake for a reliable break.
  //
  // ── Found. It was never a timeout. ────────────────────────────────────────
  //
  // Six occurrences across three different tests, all of them the same
  // transition, and everything above was chasing the wrong layer. The cause:
  //
  //   <button onClick={() => setModal('risk')}
  //           disabled={loading || notConfigured || busy !== null}>
  //
  // `loading` starts TRUE and only clears when the status request resolves.
  // The button is in the DOM the whole time, with its final label, so
  // `findByRole('button', { name: /connect whatsapp/i })` matches it on the
  // first poll — disabled buttons are matched by role queries, correctly. And
  // `fireEvent.click` on a disabled button dispatches nothing: no onClick, no
  // state change, no error. So `click(await findByRole(...))` is a race with
  // the status mock's microtask. Win it and the test passes; lose it and the
  // click evaporates, and every subsequent wait is for a modal that no longer
  // has any reason to appear.
  //
  // This accounts for every observation recorded above, which is how it was
  // finally believed:
  //
  //  - "the click takes NO EFFECT ... the modal is absent, not late" — exactly
  //    right, and the reason a longer window never helped. Waiting does not
  //    re-fire a click that was swallowed.
  //  - Raising testTimeout to 20s changed nothing but the error message. Of
  //    course: the budget was never the constraint.
  //  - A different test each time — whichever one happens to lose the race.
  //  - Never reproduced locally — a warm, idle machine resolves the mock
  //    before RTL's first 50ms poll essentially every time.
  //
  // Reproducing it needed load, not cleverness: six `yes > /dev/null` against
  // the full 140-file suite fails it within one or two runs. Once reproduced,
  // this pins it with no load at all — a status promise that never resolves,
  // and the button is found, is disabled, and swallows its click:
  //
  //   status.mockReturnValue(new Promise(() => {}));
  //   render(<WhatsAppCard />);
  //   const btn = await screen.findByRole('button', { name: /connect whatsapp/i });
  //   expect(btn).toBeDisabled();                       // passes
  //   fireEvent.click(btn);
  //   expect(screen.queryByText(/before you connect/i)).not.toBeInTheDocument();
  //
  // The fix is `clickButton` near the top of this file: wait for the button to
  // be ENABLED, then click. It is not a widened timeout wearing a disguise —
  // the wait is on a state the component genuinely passes through, and it is
  // what a real person does, since nobody can click a disabled button either.
  //
  // MODAL_TIMEOUT survives at 3000ms, deliberately BELOW vitest's 5000ms
  // default. If any of this ever regresses, an inner query has to be the thing
  // that fails, with its DOM dump, rather than the test budget expiring first
  // and reporting only a line number.

  async function openPairing(): Promise<void> {
    render(<WhatsAppCard />);
    await clickButton(/connect whatsapp/i);
    await clickButton(/i understand/i, MODAL_TIMEOUT);
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

    await clickButton(/reconnect/i);

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

    await clickButton(/unlink this number/i);

    expect(screen.getByText(/unlink whatsapp\?/i)).toBeInTheDocument();
    expect(screen.getByText(/new qr scan/i)).toBeInTheDocument();
    expect(unlink).not.toHaveBeenCalled();
  });

  it('does nothing when the confirmation is declined', async () => {
    render(<WhatsAppCard />);

    await clickButton(/unlink this number/i);
    await clickButton(/keep it connected/i, MODAL_TIMEOUT);

    expect(unlink).not.toHaveBeenCalled();
  });

  it('unlinks once confirmed', async () => {
    render(<WhatsAppCard />);

    await clickButton(/unlink this number/i);
    await clickButton(/^unlink$/i, MODAL_TIMEOUT);

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
