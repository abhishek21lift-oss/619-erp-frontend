'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/cn';

function formatINR(n: number): string {
  if (n >= 10000000) return (n / 10000000).toFixed(1) + 'Cr';
  if (n >= 100000) return (n / 100000).toFixed(1) + 'L';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
  return Math.round(n).toString();
}

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M${points[0].x} ${points[0].y}`;
  let d = `M${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cx = (prev.x + curr.x) / 2;
    d += ` C${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

export interface RevenueTrendChartProps {
  data: { date: string; amount: number }[];
  height?: number;
  className?: string;
}

export const RevenueTrendChart = React.forwardRef<HTMLDivElement, RevenueTrendChartProps>(
  function RevenueTrendChart({ data, height = 240, className }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);
    const [width, setWidth] = React.useState(560);
    const containerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (!containerRef.current) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setWidth(entry.contentRect.width);
        }
      });
      observer.observe(containerRef.current);
      return () => observer.disconnect();
    }, []);

    const padding = { top: 24, right: 16, bottom: 28, left: 40 };
    const innerW = Math.max(width - padding.left - padding.right, 50);
    const innerH = height - padding.top - padding.bottom;
    const max = data.length > 0 ? Math.max(...data.map((d) => d.amount)) : 1;
    const min = data.length > 0 ? Math.min(0, Math.min(...data.map((d) => d.amount))) : 0;
    const range = max - min || 1;
    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

    const points = data.map((d, i) => ({
      x: padding.left + i * stepX,
      y: padding.top + innerH - ((d.amount - min) / range) * innerH,
    }));

    const linePath = buildSmoothPath(points);
    const areaPath =
      points.length > 0
        ? `${linePath} L${points[points.length - 1].x} ${padding.top + innerH} L${points[0].x} ${padding.top + innerH} Z`
        : '';

    const yTicks = 4;
    const tickValues = Array.from({ length: yTicks + 1 }, (_, i) => min + (range / yTicks) * i);

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn('relative w-full', className)}
        style={{ height }}
        role="img"
        aria-label="Revenue trend chart"
      >
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="block"
        >
          <defs>
            <linearGradient id="revenue-line-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EC4899" />
              <stop offset="25%" stopColor="#A855F7" />
              <stop offset="50%" stopColor="#3B82F6" />
              <stop offset="75%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="revenue-area-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A855F7" stopOpacity={0.35} />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
            </linearGradient>
          </defs>

          {tickValues.map((v, i) => {
            const y = padding.top + innerH - ((v - min) / range) * innerH;
            return (
              <g key={i}>
                <line
                  x1={padding.left}
                  x2={padding.left + innerW}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
                <text
                  x={padding.left - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  ₹{formatINR(v)}
                </text>
              </g>
            );
          })}

          {areaPath && (
            <motion.path
              d={areaPath}
              fill="url(#revenue-area-fill)"
              initial={prefersReducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          )}

          {linePath && (
            <motion.path
              d={linePath}
              fill="none"
              stroke="url(#revenue-line-stroke)"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={prefersReducedMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          {points.map((p, i) => {
            const isActive = hoverIdx === i;
            return (
              <g key={i}>
                <rect
                  x={p.x - stepX / 2}
                  y={padding.top}
                  width={stepX}
                  height={innerH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx((h) => (h === i ? null : h))}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={isActive ? 7 : 4}
                  fill="white"
                  stroke={'#A855F7'}
                  strokeWidth={isActive ? 3 : 2}
                  style={{ transition: 'r 0.15s, stroke-width 0.15s' }}
                />
                <text
                  x={p.x}
                  y={height - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--text-muted)"
                >
                  {data[i]?.date ?? ''}
                </text>
              </g>
            );
          })}
        </svg>

        {hoverIdx !== null && data[hoverIdx] && points[hoverIdx] && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-xl border border-[var(--border-2)] bg-[var(--bg-elevated)] px-3 py-2 text-[11px] font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
            style={{
              left: points[hoverIdx].x,
              top: points[hoverIdx].y - 8,
            }}
          >
            <p className="text-[var(--text-muted)]">{data[hoverIdx].date}</p>
            <p className="text-[14px] font-extrabold text-[var(--text-primary)]">
              ₹{data[hoverIdx].amount.toLocaleString('en-IN')}
            </p>
          </div>
        )}
      </div>
    );
  },
);
