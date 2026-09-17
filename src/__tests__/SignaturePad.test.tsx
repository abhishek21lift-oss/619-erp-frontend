// Deep-audit finding: SignaturePad's own code comment used to record, as a
// "known gap rather than papered over", that drawing a signature is a pointer
// gesture with no keyboard path — meaning a keyboard-only or switch-access
// user could not complete the legally-operative PAR-Q or Informed Consent
// signatures at all. Fixed by adding a typed-name alternative that renders
// onto the same canvas and calls the same onChange with a real PNG data URL,
// so every consumer (enrolment, PAR-Q, informed consent) needed no change.
//
// jsdom has no canvas 2D context, so — like consent-signature-step.test.tsx,
// which mocks the whole component out for this exact reason — canvas calls
// are stubbed here rather than pulling in a canvas-emulation dependency this
// repo does not otherwise need. Unlike that file, this one renders the REAL
// component: the point is to prove the typed-name path actually calls the
// canvas API and the same onChange contract a drawn stroke uses.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SignaturePad from '@/components/pt-os/shared/SignaturePad';

const DATA_URL = 'data:image/png;base64,MOCKED_TYPED_SIGNATURE';

function stubCanvasContext() {
  const ctx = {
    scale: vi.fn(),
    clearRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    lineCap: '', lineJoin: '', lineWidth: 0, strokeStyle: '',
    font: '', fillStyle: '', textAlign: '', textBaseline: '',
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(DATA_URL);
  return ctx;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('SignaturePad — typed-name accessible alternative', () => {
  it('offers a keyboard-operable text field alongside the canvas', () => {
    stubCanvasContext();
    render(<SignaturePad label="Client Signature" onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/type your full name to sign/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^sign$/i })).toBeInTheDocument();
  });

  it('typing a name and pressing Sign calls onChange with a real PNG data URL, same as a drawn stroke', () => {
    const ctx = stubCanvasContext();
    const onChange = vi.fn();
    render(<SignaturePad label="Client Signature" onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText(/type your full name to sign/i), {
      target: { value: 'Riya Sharma' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign$/i }));

    expect(ctx.fillText).toHaveBeenCalledWith('Riya Sharma', expect.any(Number), expect.any(Number), expect.any(Number));
    expect(onChange).toHaveBeenCalledWith(DATA_URL);
  });

  it('pressing Enter in the field also signs, without submitting a surrounding form', () => {
    stubCanvasContext();
    const onChange = vi.fn();
    render(<SignaturePad label="Client Signature" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/type your full name to sign/i);
    fireEvent.change(input, { target: { value: 'Riya Sharma' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onChange).toHaveBeenCalledWith(DATA_URL);
  });

  it('the canvas reports itself as signed after a typed signature, the same as after a drawn one', () => {
    stubCanvasContext();
    render(<SignaturePad label="Client Signature" onChange={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText(/type your full name to sign/i), {
      target: { value: 'Riya Sharma' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^sign$/i }));

    expect(screen.getByLabelText('Client Signature')).toHaveAttribute('data-signed', 'true');
    expect(screen.queryByText('Sign here')).not.toBeInTheDocument();
  });

  it('does nothing on blank or whitespace-only input', () => {
    stubCanvasContext();
    const onChange = vi.fn();
    render(<SignaturePad label="Client Signature" onChange={onChange} />);

    const signButton = screen.getByRole('button', { name: /^sign$/i });
    expect(signButton).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/type your full name to sign/i), {
      target: { value: '   ' },
    });
    expect(signButton).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('Clear also resets the typed-name field, not just the canvas', () => {
    stubCanvasContext();
    const onChange = vi.fn();
    render(<SignaturePad label="Client Signature" onChange={onChange} />);

    const input = screen.getByPlaceholderText(/type your full name to sign/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Riya Sharma' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign$/i }));
    onChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /^clear/i }));

    expect(input.value).toBe('');
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('the typed-name field and Sign button are disabled when the pad is disabled', () => {
    stubCanvasContext();
    render(<SignaturePad label="Client Signature" onChange={vi.fn()} disabled />);

    expect(screen.getByPlaceholderText(/type your full name to sign/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /^sign$/i })).toBeDisabled();
  });
});
