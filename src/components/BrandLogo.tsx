'use client';
import { useState } from 'react';
import Image from 'next/image';

type Props = {
  size?: number;
  showText?: boolean;
  textPosition?: 'right' | 'below';
};

/**
 * BrandLogo — MY PT STUDIO mark.
 * Renders the transparent logo with a soft drop-shadow (matching the landing
 * and login treatment). Falls back to a maroon "PT" tile if the file is
 * missing.
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
      aria-label="MY PT STUDIO"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #6E1230 0%, #4A0A1E 100%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.32),
        letterSpacing: '-0.02em',
        boxShadow: '0 6px 20px rgba(74,10,30,0.28), inset 0 1px 0 rgba(255,255,255,0.30)',
        flexShrink: 0,
      }}
    >
      PT
    </div>
  ) : (
    <Image
      src="/mypt-logo.png"
      alt="MY PT STUDIO"
      width={size}
      height={size}
      priority
      className="object-contain"
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        filter: 'drop-shadow(0 12px 26px rgba(74,10,30,0.20))',
        flexShrink: 0,
      }}
    />
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
        MY PT STUDIO
      </div>
      <div className="brand-619-tag">
        The operating system for fitness professionals
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
