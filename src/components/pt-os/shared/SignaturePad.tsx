'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

interface SignaturePadProps {
  label?: string;
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
export function SignaturePad({ label, onChange, onClear, aspectRatio = 3, disabled, error, required }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasStroke, setHasStroke] = useState(false);

  // Size the canvas' backing store to the container's CSS box * devicePixelRatio,
  // so strokes stay crisp on high-DPI screens without blurring.
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const cssWidth = container.clientWidth;
    const cssHeight = Math.round(cssWidth / aspectRatio);
    const dpr = window.devicePixelRatio || 1;

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
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    }
    setHasStroke(false);
    onChange('');
    onClear?.();
  };

  return (
    <div>
      {label && (
        <p className="mb-2 text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>
          {label}
          {required && <span className="ml-0.5 text-[var(--gold,#F59E0B)]" aria-hidden>*</span>}
        </p>
      )}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden rounded-[14px]"
        style={{
          background: disabled ? '#f1f5f9' : '#fff',
          border: error ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px dashed rgba(15,23,42,0.18)',
          touchAction: 'none',
        }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full"
          style={{ cursor: disabled ? 'not-allowed' : 'crosshair' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endStroke}
          onPointerLeave={endStroke}
          onPointerCancel={endStroke}
        />
        {!hasStroke && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2" style={{ color: '#cbd5e1' }}>
            <PenLine size={14} />
            <span className="text-[12px] font-[600]">Sign here</span>
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        {error ? (
          <p className="text-[11px] font-medium" style={{ color: 'var(--danger)' }}>{error}</p>
        ) : <span />}
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="flex items-center gap-1.5 rounded-[8px] px-2.5 py-1.5 text-[11.5px] font-[650] transition-all disabled:opacity-40"
          style={{ color: '#64748b', background: '#f8fafc', border: '1px solid #e2e8f0' }}
        >
          <Eraser size={12} /> Clear
        </button>
      </div>
    </div>
  );
}

export default SignaturePad;
