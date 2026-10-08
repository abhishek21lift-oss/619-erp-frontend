'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
  label?: string;
  /**
   * A signature already captured (a data URL). Drawn onto the pad when it
   * mounts, so returning to this step — or opening a saved record — shows the
   * signature that will be submitted. The pad used to come up blank while the
   * old signature was still sent.
   */
  value?: string;
  onChange: (dataUrl: string) => void;
  onClear?: () => void;
  /** Fixed aspect ratio (width / height) for the canvas box. Defaults to a wide signature strip. */
  aspectRatio?: number;
  disabled?: boolean;
  error?: string;
  required?: boolean;
}

/** Hand-rolled HTML5 canvas signature pad — no signature library exists
 *  anywhere in the repo, and this is a genuinely small (~100 line) capture
 *  surface, so a new npm dependency isn't warranted. Uses Pointer Events,
 *  which unify mouse/touch/pen input in one listener set. */
// The canvas' backing store is scaled by the screen's pixel ratio, capped at
// 2. A 3x phone screen exported signatures 2.25x the size of a 2x one with no
// visible difference on the PDF, and a signature travels in a JSON body with
// a size limit — two of them in the PAR-Q consent.
const MAX_PIXEL_RATIO = 2;
function pixelRatio() {
  return Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
}

export function SignaturePad({ label, value, onChange, onClear, aspectRatio = 3, disabled, error, required }: SignaturePadProps) {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const hintId = `${baseId}-hint`;
  const errorId = `${baseId}-error`;
  const describedBy = [hintId, error ? errorId : null].filter(Boolean).join(' ');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);
  const [typedName, setTypedName] = useState('');

  // Size the canvas' backing store to the container's CSS box * devicePixelRatio,
  // so strokes stay crisp on high-DPI screens without blurring.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cssWidth = container.clientWidth;
    const cssHeight = Math.round(cssWidth / aspectRatio);
    const dpr = pixelRatio();

    // Preserve existing ink across a resize (e.g. orientation change) by
    // snapshotting first — resizing the backing store clears the canvas.
    const prev = hasStroke ? canvas.toDataURL('image/png') : null;

    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    canvas.height = Math.max(1, Math.round(cssHeight * dpr));

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2.4;
    ctx.strokeStyle = '#0f172a';

    if (prev) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, cssWidth, cssHeight);
      img.src = prev;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aspectRatio]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Paint a signature captured earlier. Only onto an empty pad: once the
  // person draws, what they draw is the value, and it is not repainted.
  useEffect(() => {
    if (!value || hasStroke) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      const dpr = pixelRatio();
      ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
      setHasStroke(true);
    };
    img.src = value;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getPoint(e);
    const last = lastPointRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPointRef.current = point;
    if (!hasStroke) setHasStroke(true);
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas) {
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const dpr = pixelRatio();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setHasStroke(false);
    setTypedName('');
    onChange('');
    onClear?.();
  };

  /**
   * The keyboard-operable alternative the component's own comment used to
   * flag as a "known gap" rather than papering over: drawing a signature is a
   * pointer gesture with no honest ARIA role, so someone who cannot use a
   * pointer needs a different path to the SAME result, not a fake one.
   *
   * Renders the typed name onto the actual canvas and calls onChange with the
   * resulting PNG data URL — identical to what a drawn stroke produces — so
   * every consumer of this component (enrolment, PAR-Q, informed consent)
   * needs no change at all to accept it as a signature.
   */
  const applyTypedSignature = () => {
    const name = typedName.trim();
    if (!name || disabled) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = pixelRatio();
    const cssWidth = canvas.width / dpr;
    const cssHeight = canvas.height / dpr;

    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.font = `italic 600 ${Math.round(cssHeight * 0.45)}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, cssWidth / 2, cssHeight / 2, cssWidth - 24);

    setHasStroke(true);
    onChange(canvas.toDataURL('image/png'));
  };

  return (
    <div>
      {label && (
        <p id={labelId} className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
          {required && <span className="ml-0.5 text-[var(--gold,#0067E0)]" aria-hidden>*</span>}
        </p>
      )}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[14px]"
        style={{
          background: disabled ? 'var(--bg-subtle)' : '#fff',
          border: error ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px dashed rgba(15,23,42,0.18)',
          touchAction: 'none',
        }}
      >
        {/*
          A bare <canvas> is anonymous to assistive technology: no name, no
          role, no state — on a control the enrolment form refuses to submit
          without. It is named here, told whether it is required, whether it
          currently holds a signature and whether it is in error, and given an
          instruction that says what to do with it.

          This still does NOT claim the canvas itself is keyboard-operable —
          drawing a signature is a pointer gesture with no honest ARIA role for
          it, so none is declared on the canvas. What used to be recorded here
          as a known gap is the typed-name field below instead: a keyboard- and
          screen-reader-operable path to the identical result (a signature
          image passed to the same onChange), not a fake drawing interaction.
        */}
        <canvas
          ref={canvasRef}
          aria-label={label || 'Signature'}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          data-signed={hasStroke ? 'true' : 'false'}
          className="block w-full"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2" style={{ color: 'var(--border-2)' }}>
            <PenLine size={14} aria-hidden />
            <span className="text-[12px] font-[600]">Sign here</span>
          </div>
        )}
        <p id={hintId} className="sr-only">
          Draw the signature with a mouse, pen or finger inside this box, or use the
          &quot;type your full name to sign&quot; field below if you cannot use a
          pointing device. Use the Clear button to start again.
        </p>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor={`${baseId}-typed`} className="sr-only">
          Type your full name to sign {label || ''}
        </label>
        <input
          id={`${baseId}-typed`}
          type="text"
          value={typedName}
          disabled={disabled}
          placeholder="Or type your full name to sign"
          onChange={(e) => setTypedName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              applyTypedSignature();
            }
          }}
          className="min-w-0 flex-1 rounded-[8px] px-2.5 py-1.5 text-[12px] disabled:opacity-40"
          style={{ color: 'var(--text-primary)', background: '#fff', border: '1px solid var(--border)' }}
        />
        <button
          type="button"
          onClick={applyTypedSignature}
          disabled={disabled || !typedName.trim()}
          className="flex-shrink-0 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[650] transition-all disabled:opacity-40"
          style={{ color: '#fff', background: '#0F172A' }}
        >
          Sign
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        {error ? (
          <p id={errorId} role="alert" className="text-[11px] font-medium" style={{ color: 'var(--danger-text)' }}>{error}</p>
        ) : <span />}
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          aria-label={`Clear ${label || 'signature'}`}
          className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[650] transition-all disabled:opacity-40"
          style={{ color: 'var(--text-muted)', background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}
        >
          <Eraser size={12} aria-hidden /> Clear
        </button>
      </div>
    </div>
  );
}

export default SignaturePad;
