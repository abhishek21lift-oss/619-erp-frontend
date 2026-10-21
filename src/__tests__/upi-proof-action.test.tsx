/**
 * The member UPI proof form against a mocked API.
 *
 * The schema tests pin the rules; this file pins the call site: a valid form
 * uploads the optional proof first and sends the exact old payload, invalid
 * text never reaches either mutation, a same-frame double tap submits once, a
 * failed upload still records the reference, and a failed submit keeps the
 * values on screen.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/http';

const mocks = vi.hoisted(() => ({
  submitUtr: vi.fn(),
  uploadProof: vi.fn(),
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock('@/lib/api', () => ({
  api: {
    upiPayments: {
      submitUtr: mocks.submitUtr,
      uploadProof: mocks.uploadProof,
    },
  },
}));

import { UtrForm } from '@/components/payments/UpiPayScreen';

const VALID_UTR = '012345678901';

function renderForm() {
  const onSubmitted = vi.fn().mockResolvedValue(undefined);
  render(
    <UtrForm
      orderId="order-1"
      isBalance={false}
      previousRejection={null}
      onSubmitted={onSubmitted}
      toast={mocks.toast as never}
    />,
  );
  return { onSubmitted };
}

const utrInput = () => screen.getByLabelText(/upi reference number/i) as HTMLInputElement;
const noteInput = () => screen.getByLabelText(/note for the studio/i) as HTMLTextAreaElement;
const proofInput = () => screen.getByLabelText(/payment screenshot/i) as HTMLInputElement;
const submitButton = () => screen.getByRole('button', { name: /submit for verification/i });

function fillUtr(value: string) {
  fireEvent.change(utrInput(), { target: { value } });
}

function fillNotes(value: string) {
  fireEvent.change(noteInput(), { target: { value } });
}

function submit() {
  fireEvent.click(submitButton());
}

function pdf(name = 'proof.pdf') {
  return new File(
    [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])],
    name,
    { type: 'application/pdf' },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.submitUtr.mockResolvedValue({ data: {} });
  mocks.uploadProof.mockResolvedValue({ data: {} });
});

afterEach(cleanup);

describe('a valid reference', () => {
  it('submits the exact old payload with no proof or note', async () => {
    const { onSubmitted } = renderForm();
    fillUtr(` ${VALID_UTR} `);

    submit();

    await waitFor(() => expect(mocks.submitUtr).toHaveBeenCalledWith('order-1', {
      utr: VALID_UTR,
      screenshot_url: null,
      screenshot_mime: null,
      notes: null,
    }));
    expect(mocks.uploadProof).not.toHaveBeenCalled();
    expect(mocks.toast.success).toHaveBeenCalledWith(
      'Reference submitted. The studio will verify it shortly.',
    );
    await waitFor(() => expect(onSubmitted).toHaveBeenCalledTimes(1));
  });

  it('keeps a leading zero and trims the note', async () => {
    renderForm();
    fillUtr(VALID_UTR);
    fillNotes('  paid from HDFC  ');

    submit();

    await waitFor(() => expect(mocks.submitUtr).toHaveBeenCalledWith('order-1', {
      utr: VALID_UTR,
      screenshot_url: null,
      screenshot_mime: null,
      notes: 'paid from HDFC',
    }));
  });

  it('strips non-digits as they are typed', () => {
    renderForm();

    fillUtr('12ab34-5678 9012');

    expect(utrInput()).toHaveValue('123456789012');
    expect(screen.getByText('12/16')).toBeTruthy();
  });

  it('uploads the proof first and sends its URL and MIME', async () => {
    const proof = pdf();
    mocks.uploadProof.mockResolvedValueOnce({
      data: { screenshot_url: 'https://cdn.example/proofs/abc.pdf', mime: 'application/pdf' },
    });
    renderForm();

    fireEvent.change(proofInput(), { target: { files: [proof] } });
    expect(await screen.findByText('proof.pdf')).toBeTruthy();
    fillUtr(VALID_UTR);

    submit();

    await waitFor(() => expect(mocks.uploadProof).toHaveBeenCalledWith('order-1', proof));
    await waitFor(() => expect(mocks.submitUtr).toHaveBeenCalledWith('order-1', {
      utr: VALID_UTR,
      screenshot_url: 'https://cdn.example/proofs/abc.pdf',
      screenshot_mime: 'application/pdf',
      notes: null,
    }));
  });

  it('still records the reference when the optional upload fails', async () => {
    mocks.uploadProof.mockRejectedValueOnce(new Error('network down'));
    renderForm();

    fireEvent.change(proofInput(), { target: { files: [pdf()] } });
    expect(await screen.findByText('proof.pdf')).toBeTruthy();
    fillUtr(VALID_UTR);

    submit();

    await waitFor(() => expect(mocks.toast.error).toHaveBeenCalledWith(
      'Screenshot could not be uploaded — submitting the reference without it.',
    ));
    await waitFor(() => expect(mocks.submitUtr).toHaveBeenCalledWith('order-1', {
      utr: VALID_UTR,
      screenshot_url: null,
      screenshot_mime: null,
      notes: null,
    }));
  });

  it('clears the fields and asks for a refresh after success', async () => {
    const { onSubmitted } = renderForm();
    const proof = pdf();
    fireEvent.change(proofInput(), { target: { files: [proof] } });
    expect(await screen.findByText('proof.pdf')).toBeTruthy();
    fillUtr(VALID_UTR);
    fillNotes('paid');

    submit();

    await waitFor(() => expect(utrInput()).toHaveValue(''));
    expect(noteInput()).toHaveValue('');
    await waitFor(() => expect(screen.queryByText('proof.pdf')).toBeNull());
    expect(onSubmitted).toHaveBeenCalledTimes(1);
  });
});

describe('invalid input cannot reach the mutation', () => {
  it('blocks a blank reference', async () => {
    renderForm();

    submit();

    expect(await screen.findByText('UPI reference number is required.')).toBeTruthy();
    expect(mocks.submitUtr).not.toHaveBeenCalled();
    expect(mocks.uploadProof).not.toHaveBeenCalled();
  });

  it('blocks a reference shorter than 12 digits', async () => {
    renderForm();
    fillUtr('1'.repeat(11));

    submit();

    expect(await screen.findByText('UPI reference number must be at least 12 characters.')).toBeTruthy();
    expect(mocks.submitUtr).not.toHaveBeenCalled();
  });

  it('blocks a note over 500 characters instead of silently truncating it', async () => {
    renderForm();
    fillUtr(VALID_UTR);
    fillNotes('x'.repeat(501));

    submit();

    expect(await screen.findByText(
      'Note for the studio cannot be more than 500 characters (currently 501).',
    )).toBeTruthy();
    expect(mocks.submitUtr).not.toHaveBeenCalled();
    expect(noteInput()).toHaveValue('x'.repeat(501));
  });

  it('reports a screenshot whose bytes are not a PDF, without uploading it', async () => {
    renderForm();
    const fake = new File([new Uint8Array([0x4d, 0x5a, 0x90, 0x00])], 'proof.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(proofInput(), { target: { files: [fake] } });

    expect(await screen.findByText(/not a PDF document/i)).toBeTruthy();
    expect(proofInput()).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.uploadProof).not.toHaveBeenCalled();
  });
});

describe('the existing failure paths are unchanged', () => {
  it('issues one submit when the same frame gets two clicks', async () => {
    renderForm();
    fillUtr(VALID_UTR);

    const button = submitButton();
    act(() => { button.click(); button.click(); });

    await waitFor(() => expect(mocks.submitUtr).toHaveBeenCalledTimes(1));
  });

  it('shows the server sentence and keeps the values on failure', async () => {
    mocks.submitUtr.mockRejectedValueOnce(
      new ApiError('This reference has already been submitted.', 409),
    );
    renderForm();
    fillUtr(VALID_UTR);
    fillNotes('paid');

    submit();

    expect(await screen.findByText(/This reference has already been submitted\./)).toBeTruthy();
    expect(utrInput()).toHaveValue(VALID_UTR);
    expect(noteInput()).toHaveValue('paid');
  });

  it('attributes the server UTR sentence to the field, not the banner', async () => {
    mocks.submitUtr.mockRejectedValueOnce(
      new ApiError('UPI reference must be 12 to 16 digits', 400),
    );
    renderForm();
    fillUtr(VALID_UTR);

    submit();

    expect(await screen.findByText('UPI reference must be 12 to 16 digits')).toBeTruthy();
    expect(screen.queryByText(/Some of the details are not valid/)).toBeNull();
  });
});
