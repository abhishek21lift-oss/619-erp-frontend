'use client';

import { useId } from 'react';

interface SliderProps {
  /**
   * The visible caption. Pass '' when the call site draws its own caption row —
   * several assessment steps do, because they put a face, an emoji or a status
   * dot beside it — and then `ariaLabel` is required, because a range input
   * showing nothing but a number is unusable without a name.
   */
  label: string;
  /**
   * The accessible name when `label` is ''. Should be the text of whatever
   * caption the call site draws, so the visible and accessible names match.
   */
  ariaLabel?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Formats the value bubble, e.g. (v) => `${v}%`. Defaults to the raw number. */
  formatValue?: (v: number) => string;
  /** Optional labels rendered under the track ends (and center, if 3 given). */
  scaleLabels?: string[];
}

/** Thin wrapper around the native range input — the app's one existing slider
 *  (PhotoCropModal's zoom control) uses the same `accent-[#F59E0B]` convention.
 *
 *  Not built on FormField: a range reads as caption-then-track with the live
 *  value beside the caption, and forcing it into the text-field shape is the
 *  mistake FORM-SYSTEM.md warns about. It follows the rule the system exists
 *  to enforce — a real <label>, associated, that does not disappear — without
 *  borrowing the layout. */
export function Slider({
  label, ariaLabel, value, min, max, step = 1, onChange, formatValue, scaleLabels,
}: SliderProps) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between">
          {/* <label> rather than the <p> this used to be. Both are flex
              children, so both are blockified and nothing moves — but only one
              of them names the control. */}
          <label htmlFor={id} className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</label>
          <span className="rounded-full px-2.5 py-1 text-[12px] font-[800]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}
      <input
        id={id}
        // aria-label only where there is no visible label to associate. Four
        // call sites passed label="" and so carried aria-label="", which is no
        // accessible name at all.
        {...(label ? {} : { 'aria-label': ariaLabel })}
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#F59E0B]"
        style={{ background: `linear-gradient(90deg, #F59E0B ${pct}%, #e2e8f0 ${pct}%)`, height: 6, borderRadius: 999, appearance: 'none' }}
      />
      {scaleLabels && scaleLabels.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[10.5px] font-[600]" style={{ color: '#94a3b8' }}>
          {scaleLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}
