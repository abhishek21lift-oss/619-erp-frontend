// The Consent wizard's Next button, tested as a button.
//
// The existing consent tests all call `validateStep`, a payload builder, or a
// bare step component. None of them ever press Next. That gap is the whole
// point of this file: `handleNext` validates, then PERSISTS, then only then
// calls `setStep(next)`. A failure anywhere in the persist path returns early
// and the step never changes — the button appears dead, with no error on the
// step itself. Every one of those failures is invisible to a test that stops at
// validation.
//
// So this drives the real page: fill in step 1 the way a trainer would, press
// the real button, and assert the wizard actually moved to step 2.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

// These drive the whole page — router, Guard, framer-motion, the hub, the
// wizard — rather than a single component, so each one costs seconds rather
// than milliseconds. At the 5s default they passed alone and timed out under
// the full suite's parallel load, which says nothing about the wizard.
vi.setConfig({ testTimeout: 20000 });
import { todayISO } from '@/lib/forms/domain';
import type { InformedConsent } from '@/lib/api';
import {
  buildCreatePayload, formFromRecord, initInformedConsentForm, validateStep,
} from '@/components/pt-os/informed-consent/types';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('client_id=c1'),
}));

const clientRow = vi.fn();
const consentList = vi.fn();
const consentCreate = vi.fn();
const consentUpdate = vi.fn();
vi.mock('@/lib/api', () => ({
  api: {
    pt: { client: (...a: unknown[]) => clientRow(...a) },
    progress: {
      informedConsent: {
        list: (...a: unknown[]) => consentList(...a),
        create: (...a: unknown[]) => consentCreate(...a),
        update: (...a: unknown[]) => consentUpdate(...a),
        sign: async () => ({ data: {} }),
      },
    },
  },
  ApiError: class ApiError extends Error {
    status: number; code?: string; payload?: unknown;
    constructor(status: number, code?: string, payload?: unknown) {
      super(code ?? 'error'); this.status = status; this.code = code; this.payload = payload;
    }
  },
}));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({ toast: { error: toastError, success: toastSuccess, warning: vi.fn(), info: vi.fn() } }),
}));

vi.mock('@/components/pt-os/shared/SignaturePad', () => ({
  default: ({ label }: { label: string }) => <div data-testid="signature-pad">{label}</div>,
}));

// The page is a client component reading search params behind a Guard; render
// the content component directly so the test exercises the wizard, not the
// auth shell.
import InformedConsentPage from '@/app/(chrome)/pt-os/informed-consent/page';

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

/** Opens the hub and starts the wizard for a client with no consent on file. */
async function openWizard() {
  render(<InformedConsentPage />);
  const start = await screen.findByRole('button', { name: /start consent/i });
  fireEvent.click(start);
  await screen.findByRole('button', { name: /^next$/i });
}

/** Fills step 1 exactly as a trainer would: tick, then answer the question. */
function completeStep1() {
  fireEvent.click(screen.getByRole('button', { name: /agree to participate in the exercise programme/i }));
  fireEvent.click(screen.getByRole('radio', { name: 'No' }));
}

const next = () => screen.getByRole('button', { name: /^next$/i });

/**
 * The server's rule for `exercise_consent_date`, mirrored from the backend's
 * `updateSchema` (informed-consent.routes.js). Mocking a PATCH that accepts
 * anything would let a wizard walk through a save the real API rejects, and the
 * test would pass while the trainer's button stayed dead — which is precisely
 * the bug these tests exist to catch.
 */
function rejectsStaleConsentDate(body: Record<string, unknown>): boolean {
  const v = body.exercise_consent_date;
  if (v == null || v === '') return false;
  const t = Date.parse(String(v));
  return Number.isNaN(t) || t > Date.now() + 86400000 || t < Date.now() - 8 * 86400000;
}

/**
 * The server's rule for `full_name` on create, mirrored from the same file:
 *
 *     values[key] = b[key] !== undefined && b[key] !== null ? b[key] : snapshot[key]
 *     if (!values.full_name) return 400 FULL_NAME_REQUIRED
 *
 * A blank name in the body therefore SUPPRESSES the profile snapshot the server
 * was going to fill it from, and is then refused. `null` asks for the snapshot;
 * `''` overrides it with nothing.
 */
function rejectsBlankFullName(body: Record<string, unknown>): boolean {
  const sent = body.full_name;
  const filledFromProfile = sent === undefined || sent === null;
  const effective = filledFromProfile ? 'Mina Rao' : sent;
  return !String(effective ?? '').trim();
}

beforeEach(() => {
  push.mockClear();
  toastError.mockClear();
  toastSuccess.mockClear();
  clientRow.mockReset().mockResolvedValue({ data: { id: 'c1', name: 'Mina Rao' } });
  consentList.mockReset().mockResolvedValue({ data: [] });
  consentCreate.mockReset().mockResolvedValue({ data: { id: 'ic-1' } });
  consentUpdate.mockReset().mockImplementation(async (_id: string, body: Record<string, unknown>) => {
    if (rejectsStaleConsentDate(body)) {
      throw Object.assign(new Error('Invalid request'), {
        status: 400, payload: { error: { message: 'Consent date must be within the last 7 days and not in the future' } },
      });
    }
    return { data: { id: 'ic-1' } };
  });
});
afterEach(cleanup);

describe('Consent wizard — Next actually navigates', () => {
  it('moves from Consent to Agreement, saving the draft on the way past', async () => {
    await openWizard();
    completeStep1();
    fireEvent.click(next());

    // Step 2 is the Agreement step. If Next is dead this never appears.
    await waitFor(() => expect(screen.getByText(/voluntary and I can withdraw at any time/i)).toBeTruthy());
    // The save happens before setStep, so this is also the assertion that the
    // step was reached by persisting rather than by skipping the write.
    expect(consentCreate).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it('says why it did not move, rather than doing nothing', async () => {
    await openWizard();
    fireEvent.click(next());

    // Step 1 unanswered: still on step 1, and the reason is on screen.
    expect(screen.queryByText(/voluntary and I can withdraw/i)).toBeNull();
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/acknowledgement/i));
  });

  it('surfaces a save failure instead of silently staying put', async () => {
    // The regression this file exists for: persist() runs BEFORE setStep, so a
    // rejected save returns early and the wizard sits on step 1 looking broken.
    consentCreate.mockRejectedValue(new Error('boom'));
    await openWizard();
    completeStep1();
    fireEvent.click(next());

    await waitFor(() => expect(toastError).toHaveBeenCalled());
    expect(screen.queryByText(/voluntary and I can withdraw/i)).toBeNull();
  });

  it('reaches the signature step and signs on Finish', async () => {
    await openWizard();
    completeStep1();
    fireEvent.click(next());
    await screen.findByText(/voluntary and I can withdraw/i);

    // The agreement items are <button>s, not role=checkbox — matched as buttons.
    for (const label of [/remain confidential/i, /withdraw at any time/i, /voluntarily agree to participate/i]) {
      fireEvent.click(screen.getByRole('button', { name: label }));
    }
    fireEvent.click(next());

    await waitFor(() => expect(screen.getAllByTestId('signature-pad').length).toBeGreaterThanOrEqual(2));
    // Not yet finished — signing is what produces the completion screen.
    expect(screen.queryByText(/Consent Completed/i)).toBeNull();
  });
});

/** `todayStr()` shifted back `days`, as YYYY-MM-DD. */
function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('Consent wizard — resuming a draft signed-date ago', () => {
  /**
   * The dead Next button, in full.
   *
   * `exercise_consent_date` is only meaningful once the document is SIGNED, and
   * the backend guards it as signed content: PATCH rejects any date more than
   * ~7 days old (informed-consent.routes.js updateSchema, the `.refine` on
   * exercise_consent_date). That guard is correct and deliberate — it is what
   * stops a consent being back- or future-dated.
   *
   * But `buildUpdatePayload` sends that date on EVERY step's save, including
   * steps 1 and 2, where nothing has been signed yet. So a trainer who starts a
   * consent, abandons it, and returns over a week later resumes a draft whose
   * stored date is now outside the signable window. Step 1's Next calls
   * persist(), the PATCH is rejected, and handleNext returns before setStep —
   * the button does nothing, forever, with only a generic toast. The trainer
   * can never reach step 3, which is the only place the date could be changed.
   *
   * The localStorage draft cannot cause this: restore() discards anything older
   * than its own 7-day TTL, deliberately tighter than the server's window. Only
   * the server-held draft date, which has no TTL, does.
   */
  async function openResumedDraft(exerciseConsentDate: string | null) {
    consentList.mockResolvedValue({
      data: [{
        id: 'ic-1', client_id: 'c1', status: 'draft', version: 1,
        full_name: 'Mina Rao', exercise_consent_checked: true,
        exercise_consent_date: exerciseConsentDate,
        acknowledgements: { understands_confidentiality: true, voluntary_participation: true, final_declaration: true },
        physician_advised_against: false, created_at: '2026-09-01T00:00:00Z',
      }],
    });
    render(<InformedConsentPage />);
    // A draft on file means the hub shows the record, and resuming is the
    // primary action.
    fireEvent.click(await screen.findByRole('button', { name: /continue/i }));
    await screen.findByRole('button', { name: /^next$/i });
    // Re-answer step 1 the way the trainer would if they must.
    if (!screen.queryByRole('radio', { name: 'No' })) completeStep1();
    else fireEvent.click(screen.getByRole('radio', { name: 'No' }));
  }

  it('still advances when the stored date is inside the signable window', async () => {
    await openResumedDraft(daysAgo(2));
    fireEvent.click(next());
    await waitFor(() => expect(screen.getByText(/voluntary and I can withdraw/i)).toBeTruthy());
  });

  it('neither sends a rejected date nor leaves the button dead', async () => {
    await openResumedDraft(daysAgo(30));
    fireEvent.click(next());

    // The invariant is not "sends nothing" but "sends something signable": the
    // stale date must not survive onto the wire. Today is signable, so the save
    // goes through...
    await waitFor(() => expect(consentUpdate).toHaveBeenCalled());
    const sent = consentUpdate.mock.calls[0][1] as Record<string, unknown>;
    expect(rejectsStaleConsentDate(sent)).toBe(false);
    expect(sent.exercise_consent_date).toBe(todayISO());
    // ...and the wizard moves. Before the fix the PATCH was refused, so this
    // arrival is the regression: handleNext returned before setStep every time.
    await waitFor(() => expect(screen.getByText(/voluntary and I can withdraw/i)).toBeTruthy());
    expect(toastError).not.toHaveBeenCalled();
  });

  it('re-dates an aged draft to today, so step 3 is signable too', () => {
    // Pure half of the same fix. The stale value used to be shown in step 3's
    // date box as well, and validateStep refuses anything outside the window —
    // so even reaching the signature step dead-ended. `now` avoids the midnight
    // race a hard-coded clock string would have.
    const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const shift = (days: number) => { const d = new Date(); d.setDate(d.getDate() - days); return d; };

    expect(formFromRecord({ exercise_consent_date: shift(30) } as InformedConsent).exerciseConsentDate)
      .toBe(ymd(new Date()));
    // Inside the window the record's own date is kept — a consent signed three
    // days ago must still show the day it was actually signed. Sent as the
    // string the API actually returns, not a Date.
    expect(formFromRecord({ exercise_consent_date: ymd(shift(3)) } as InformedConsent).exerciseConsentDate)
      .toBe(ymd(shift(3)));
    // And a date the trainer typed that is not signable is still refused, with a
    // message, rather than being silently rewritten behind their back.
    expect(validateStep(3, {
      ...initInformedConsentForm(),
      clientSignature: 'C', trainerSignature: 'T',
      exerciseConsentDate: ymd(shift(30)),
    })).toMatch(/last 7 days/);
  });

  it('advances past step 1 instead of silently doing nothing', async () => {
    await openResumedDraft(daysAgo(30));
    fireEvent.click(next());
    // The regression: this never arrived, because the PATCH 400'd and
    // handleNext returned before setStep.
    await waitFor(() => expect(screen.getByText(/voluntary and I can withdraw/i)).toBeTruthy());
  });
});
describe('Consent wizard — the client profile could not be read', () => {
  /**
   * The same dead button, a second and independent cause, needing no draft
   * history at all.
   *
   * The page fills the form's identity from the client profile on mount, and
   * that fetch is best-effort — the catch is a comment saying "non-fatal". If it
   * fails, the name is ''. `buildCreatePayload` then sent that '' as
   * `full_name`, and the server reads a body value as an override of the profile
   * snapshot it was about to fill from:
   *
   *     values[key] = b[key] !== undefined && b[key] !== null ? b[key] : snapshot[key]
   *     if (!values.full_name) return 400 FULL_NAME_REQUIRED
   *
   * So '' did not merely fail to supply a name, it actively suppressed the
   * perfectly good name already in `pt_clients`, and the create was refused.
   * handleNext returned before setStep and Next did nothing.
   *
   * It could not be worked around on screen: the identity inputs were made
   * read-only in 55f09d7d and the read-only summary has since gone from the
   * page, so there is nowhere to type a name — the one case that needed typing
   * one is the one case with no field. Every sibling field in the same payload
   * already sent `|| null`; only full_name did not.
   */
  it('asks the server to fill the name from the profile, rather than sending a blank that overrides it', () => {
    const blank = buildCreatePayload(initInformedConsentForm(), 'c1');
    expect(rejectsBlankFullName(blank)).toBe(false);
    // Consistent with every sibling identity field, which has always sent null.
    expect(blank.gender).toBeNull();
    expect(blank.full_name).toBeNull();
  });

  it('still advances when the wizard could not read the name back from the profile', async () => {
    // The hub reads the client, then the WIZARD reads it again when it mounts
    // (that second call is what fills the form — the hub passes the name only
    // as a display prop). So a transient failure of the wizard's own call leaves
    // the form's name blank even though the hub had just loaded it fine, and
    // that is the case with nowhere to type one.
    clientRow
      .mockResolvedValueOnce({ data: { id: 'c1', name: 'Mina Rao' } })
      .mockRejectedValueOnce(new Error('network blip'));
    await openWizard();
    completeStep1();
    fireEvent.click(next());

    await waitFor(() => expect(consentCreate).toHaveBeenCalled());
    expect(rejectsBlankFullName(consentCreate.mock.calls[0][0] as Record<string, unknown>)).toBe(false);
    await waitFor(() => expect(screen.getByText(/voluntary and I can withdraw/i)).toBeTruthy());
    expect(toastError).not.toHaveBeenCalled();
  });
});
