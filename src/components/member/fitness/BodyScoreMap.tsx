'use client';

/**
 * The five assessed domains on one body, so a member can see where the numbers
 * come from before reading any of them.
 *
 * This is a read-only illustration, not a medical diagram: each marker is a
 * domain and its colour is the same tier the cards below use. The figcaption
 * is the legend and the accessible text, so nothing depends on the SVG being
 * seen.
 */

import { palette } from '@/lib/palette';
import type { DomainKey, DomainScore } from './domains';

/** Marker position on the 200×340 canvas, one per domain. */
const MARKERS: Record<DomainKey, { x: number; y: number; hint: string }> = {
  cardio: { x: 86, y: 101, hint: 'Chest' },
  body: { x: 104, y: 153, hint: 'Abdomen' },
  strength: { x: 49, y: 120, hint: 'Arm' },
  endurance: { x: 79, y: 251, hint: 'Thigh' },
  flexibility: { x: 119, y: 177, hint: 'Hip' },
};

function tierColor(tier: DomainScore['tier']): string {
  if (tier === 'Optimal') return palette.emerald[600];
  if (tier === 'Fit') return palette.mint[600];
  if (tier === 'Moderate') return palette.amber[600];
  if (tier === 'Needs Attention') return palette.red[600];
  return 'var(--text-disabled)';
}

export default function BodyScoreMap({ domains }: { domains: DomainScore[] }) {
  const summary = domains
    .map((d) => `${d.label}: ${d.pct == null ? 'not measured' : `${d.pct}%`}`)
    .join('. ');

  return (
    <figure className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 340" width="168" height="272" role="img" aria-label={`Body map. ${summary}`}>
        <g fill="var(--bg-subtle)" stroke="var(--border)" strokeWidth="1.5">
          <circle cx="100" cy="38" r="20" />
          <rect x="92" y="56" width="16" height="14" rx="4" />
          {/* Torso */}
          <path d="M70 70 Q100 60 130 70 L138 118 Q141 150 126 170 L128 196 L72 196 L74 170 Q59 150 62 118 Z" />
          {/* Arms */}
          <path d="M68 74 Q50 84 45 110 L39 166 Q38 176 46 177 Q53 178 55 169 L63 122 L64 78 Z" />
          <path d="M132 74 Q150 84 155 110 L161 166 Q162 176 154 177 Q147 178 145 169 L137 122 L136 78 Z" />
          {/* Legs */}
          <path d="M78 196 L74 252 L70 316 Q69 326 78 326 Q85 326 86 316 L90 258 L92 210 Z" />
          <path d="M122 196 L126 252 L130 316 Q131 326 122 326 Q115 326 114 316 L110 258 L108 210 Z" />
        </g>

        {domains.map((d, i) => {
          const at = MARKERS[d.key];
          return (
            <g key={d.key}>
              <circle cx={at.x} cy={at.y} r="14" fill="var(--bg-card)" opacity="0.92" />
              <circle cx={at.x} cy={at.y} r="11" fill={tierColor(d.tier)} />
              <text
                x={at.x} y={at.y + 3.5} textAnchor="middle"
                fontSize="11" fontWeight="800" fill="#fff"
              >
                {i + 1}
              </text>
              <title>{`${d.label} (${at.hint}): ${d.pct == null ? 'not measured' : `${d.pct}%`}`}</title>
            </g>
          );
        })}
      </svg>

      <figcaption className="w-full">
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          {domains.map((d, i) => (
            <li key={d.key} className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-full text-[9.5px] font-[800] text-white"
                style={{ background: tierColor(d.tier) }}
              >
                {i + 1}
              </span>
              <span className="truncate text-[11px] font-[620]" style={{ color: 'var(--text-secondary)' }}>
                {d.label}
              </span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
