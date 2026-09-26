'use client';

/**
 * The member's weight over time: one series, so no legend — the section title
 * names it. A 2px line on a 10% wash, hairline gridlines, the latest value
 * labelled at the line's end, and a crosshair that snaps to the nearest
 * reading. Arrow keys move the same crosshair for keyboard and screen-reader
 * users; the weight log under the chart is the table view.
 *
 * The y-axis does not start at zero on purpose: a line reads change, and a
 * 2 kg drop on a 0–80 axis is a flat line.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { MC } from './MemberUI';
import { rgba } from '@/lib/palette';

export type WeightPoint = { date: string; kg: number; source: 'trainer' | 'checkin' };

const H = 184;
const PAD = { top: 18, right: 62, bottom: 26, left: 34 };

function shortDate(v: string) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** Clean ticks: a 0.5 / 1 / 2 / 5 kg step giving three to five lines. */
function ticks(min: number, max: number): number[] {
  const span = Math.max(max - min, 1);
  const step = [0.5, 1, 2, 5, 10].find((s) => span / s <= 4) ?? 10;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out: number[] = [];
  for (let v = lo; v <= hi + 1e-9; v += step) out.push(Number(v.toFixed(1)));
  return out.length >= 2 ? out : [lo, lo + step];
}

export default function WeightChart({ points }: { points: WeightPoint[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(320);
  const [active, setActive] = useState<number | null>(null);
  const descId = useId();

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(240, Math.round(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const geo = useMemo(() => {
    const kgs = points.map((p) => p.kg);
    const yt = ticks(Math.min(...kgs), Math.max(...kgs));
    const y0 = yt[0], y1 = yt[yt.length - 1];
    const t = points.map((p) => new Date(p.date).getTime());
    const t0 = t[0], t1 = t[t.length - 1];
    const iw = w - PAD.left - PAD.right, ih = H - PAD.top - PAD.bottom;
    const x = (i: number) => PAD.left + (t1 === t0 ? iw / 2 : ((t[i] - t0) / (t1 - t0)) * iw);
    const y = (kg: number) => PAD.top + (1 - (kg - y0) / (y1 - y0 || 1)) * ih;
    const xs = points.map((_, i) => x(i));
    const ys = points.map((p) => y(p.kg));
    const line = xs.map((px, i) => `${i ? 'L' : 'M'}${px.toFixed(1)},${ys[i].toFixed(1)}`).join('');
    const area = `${line}L${xs[xs.length - 1].toFixed(1)},${H - PAD.bottom}L${xs[0].toFixed(1)},${H - PAD.bottom}Z`;
    return { yt, y, xs, ys, line, area };
  }, [points, w]);

  const last = points.length - 1;
  const nearest = (clientX: number) => {
    const rect = wrap.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left;
    let best = 0;
    geo.xs.forEach((x, i) => { if (Math.abs(x - px) < Math.abs(geo.xs[best] - px)) best = i; });
    return best;
  };

  const shown = active ?? null;
  const tipLeft = shown !== null ? Math.min(Math.max(geo.xs[shown] - 70, 4), w - 144) : 0;

  return (
    <div ref={wrap} className="relative select-none">
      <svg
        width={w} height={H} role="img" tabIndex={0}
        aria-label={`Weight trend, ${points.length} readings from ${shortDate(points[0].date)} to ${shortDate(points[last].date)}`}
        aria-describedby={descId}
        className="block touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] rounded-[10px]"
        onPointerMove={(e) => setActive(nearest(e.clientX))}
        onPointerDown={(e) => setActive(nearest(e.clientX))}
        onPointerLeave={() => setActive(null)}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            const cur = active ?? last;
            setActive(Math.min(last, Math.max(0, cur + (e.key === 'ArrowRight' ? 1 : -1))));
          } else if (e.key === 'Home') { e.preventDefault(); setActive(0); }
          else if (e.key === 'End') { e.preventDefault(); setActive(last); }
          else if (e.key === 'Escape') setActive(null);
        }}
      >
        {geo.yt.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={w - PAD.right} y1={geo.y(v)} y2={geo.y(v)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD.left - 6} y={geo.y(v)} dy="0.32em" textAnchor="end" fontSize={10} fontWeight={600}
              fill="var(--text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>{v}</text>
          </g>
        ))}
        <text x={PAD.left} y={H - 8} fontSize={10} fontWeight={600} fill="var(--text-muted)">{shortDate(points[0].date)}</text>
        {last > 0 && (
          <text x={w - PAD.right} y={H - 8} textAnchor="end" fontSize={10} fontWeight={600} fill="var(--text-muted)">
            {shortDate(points[last].date)}
          </text>
        )}

        {last > 0 && <path d={geo.area} fill={rgba(MC.primary, 0.1)} />}
        {last > 0 && (
          <path d={geo.line} fill="none" stroke={MC.primary} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        )}

        {shown !== null && (
          <line x1={geo.xs[shown]} x2={geo.xs[shown]} y1={PAD.top - 6} y2={H - PAD.bottom}
            stroke="var(--text-muted)" strokeWidth={1} opacity={0.5} />
        )}

        {/* End dot + direct label on the latest reading; the hovered one when active. */}
        {[shown ?? last].map((i) => (
          <circle key={i} cx={geo.xs[i]} cy={geo.ys[i]} r={4.5} fill={MC.primary}
            stroke="var(--bg-card)" strokeWidth={2} />
        ))}
        {shown === null && (
          <text x={geo.xs[last] + 9} y={geo.ys[last]} dy="0.32em" fontSize={11.5} fontWeight={780}
            fill="var(--text-primary)" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {points[last].kg} kg
          </text>
        )}
      </svg>

      {shown !== null && (
        <div role="status" aria-live="polite"
          className="pointer-events-none absolute top-0 w-[140px] rounded-[10px] px-2.5 py-1.5 text-[11.5px] shadow-lg"
          style={{ left: tipLeft, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="font-[650]" style={{ color: MC.muted }}>{shortDate(points[shown].date)}</p>
          <p className="flex items-center gap-1.5 font-[800] tabular-nums" style={{ color: 'var(--text-primary)' }}>
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: MC.primary }} />
            {points[shown].kg} kg
          </p>
          <p className="text-[10.5px]" style={{ color: MC.muted }}>
            {points[shown].source === 'trainer' ? 'Measured at the studio' : 'Your check-in'}
          </p>
        </div>
      )}
      <p id={descId} className="sr-only">Use the left and right arrow keys to step through readings.</p>
    </div>
  );
}
