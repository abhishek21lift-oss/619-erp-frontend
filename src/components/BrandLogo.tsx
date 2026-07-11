'use client';
import { useState } from 'react';
import Image from 'next/image';

type Props = {
  size?: number;
  showText?: boolean;
  textPosition?: 'right' | 'below';
};

/**
 * BrandLogo — COACH ABHISHEK mark.
 * Falls back to a gradient "CA" tile if logo file not found.
 */
export default function BrandLogo({
  size = 40,
  showText = false,
  textPosition = 'right',
}: Props) {
  const [failed, setFailed] = useState(false);

  const radius = Math.round(size * 0.22);

  const Mark = failed ? (
    <div
      aria-label="COACH ABHISHEK"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'linear-gradient(135deg, var(--brand-hi) 0%, var(--brand-lo) 100%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.34),
        letterSpacing: '-0.02em',
        boxShadow:
          '0 6px 20px var(--brand-glow), inset 0 1px 0 rgba(255,255,255,0.40)',
        flexShrink: 0,
        fontFeatureSettings: '"tnum"',
      }}
    >
      CA
    </div>
  ) : (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        padding: Math.round(size * 0.10),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-white)',
        border: '2px solid color-mix(in srgb, var(--danger) 35%, transparent)',
        boxShadow:
          '0 0 16px var(--brand-glow), 0 2px 8px var(--border)',
        flexShrink: 0,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Image
        src="/logo.png"
        alt="COACH ABHISHEK"
        fill
        className="object-contain"
        onError={() => setFailed(true)}
        sizes={`${size}px`}
      />
    </div>
  );

  if (!showText) return Mark;

  const isBelow = textPosition === 'below';
  const textBlock = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: isBelow ? 'center' : 'flex-start',
        lineHeight: 1,
      }}
    >
      <div className="brand-619-name">
        COACH ABHISHEK
      </div>
      <div className="brand-619-tag">
        Strength · Motivation · Trust
      </div>
    </div>
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isBelow ? 'column' : 'row',
        alignItems: 'center',
        gap: isBelow ? '0.85rem' : '0.6rem',
      }}
    >
      {Mark}
      {textBlock}
    </div>
  );
}
