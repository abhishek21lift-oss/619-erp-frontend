'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export interface ClientGrowthWidgetProps {
  data: { month: string; new: number; lost: number }[];
  className?: string;
  height?: number;
}

export const ClientGrowthWidget = React.forwardRef<HTMLDivElement, ClientGrowthWidgetProps>(
  function ClientGrowthWidget({ data, className, height = 220 }, ref) {
    const prefersReducedMotion = useReducedMotion();
    const max = Math.max(1, ...data.map((d) => d.new + d.lost));
    const padding = { top: 20, right: 12, bottom: 32, left: 36 };
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

    const innerW = Math.max(width - padding.left - padding.right, 50);
    const innerH = height - padding.top - padding.bottom;
    const slotW = data.length > 0 ? innerW / data.length : 0;
    const barW = Math.max(8, Math.min(36, slotW * 0.55));

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        className={
          'rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] ' +
          (className ?? '')
        }
        role="img"
        aria-label="Client growth over the last 6 months"
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[14px] font-semibold text-[var(--text-primary)]">Client Growth</p>
            <p className="text-[11px] text-[var(--text-muted)]">New vs lost over the last 6 months</p>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-semibold text-[var(--text-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#22C55E]" />
              New
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-[#EF4444]" />
              Lost
            </span>
          </div>
        </div>
        <div style={{ height }}>
          <svg
            width="100%"
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="block"
          >
            {[0.25, 0.5, 0.75, 1].map((p, i) => {
              const y = padding.top + innerH - innerH * p;
              return (
                <line
                  key={i}
                  x1={padding.left}
                  x2={padding.left + innerW}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              );
            })}

            {data.map((d, i) => {
              const total = d.new + d.lost;
              const totalH = (total / max) * innerH;
              const newH = total > 0 ? (d.new / total) * totalH : 0;
              const lostH = total > 0 ? (d.lost / total) * totalH : 0;
              const cx = padding.left + slotW * i + slotW / 2;
              const baseY = padding.top + innerH;
              const x = cx - barW / 2;

              return (
                <g key={d.month}>
                  <motion.rect
                    x={x}
                    width={barW}
                    rx={6}
                    fill="#22C55E"
                    initial={prefersReducedMotion ? false : { y: baseY, height: 0 }}
                    animate={{ y: baseY - totalH, height: newH }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <motion.rect
                    x={x}
                    width={barW}
                    rx={6}
                    fill="#EF4444"
                    initial={prefersReducedMotion ? false : { y: baseY - newH, height: 0 }}
                    animate={{ y: baseY - newH - lostH, height: lostH }}
                    transition={{ duration: 0.7, delay: i * 0.08 + 0.05, ease: [0.16, 1, 0.3, 1] }}
                  />
                  <text
                    x={cx}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--text-muted)"
                  >
                    {d.month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  },
);
