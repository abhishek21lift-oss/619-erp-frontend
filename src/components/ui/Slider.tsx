'use client';

interface SliderProps {
  label: string;
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
 *  (PhotoCropModal's zoom control) uses the same `accent-[#F59E0B]` convention. */
export function Slider({ label, value, min, max, step = 1, onChange, formatValue, scaleLabels }: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      {label && (
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11.5px] font-[620] uppercase tracking-wider" style={{ color: 'rgb(148,163,184)' }}>{label}</p>
          <span className="rounded-full px-2.5 py-1 text-[12px] font-[800]" style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706' }}>
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}
      <input aria-label={label}
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#F59E0B]"
        style={{ background: `linear-gradient(90deg, #F59E0B ${pct}%, #e2e8f0 ${pct}%)`, height: 6, borderRadius: 999, appearance: 'none', outline: 'none' }}
      />
      {scaleLabels && scaleLabels.length > 0 && (
        <div className="mt-1.5 flex justify-between text-[10.5px] font-[600]" style={{ color: '#94a3b8' }}>
          {scaleLabels.map((l, i) => <span key={i}>{l}</span>)}
        </div>
      )}
    </div>
  );
}
