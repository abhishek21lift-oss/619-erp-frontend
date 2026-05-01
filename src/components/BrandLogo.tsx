'use client';
import { useState } from 'react';

type Props = {
  size?: number;
  showText?: boolean;
  textPosition?: 'right' | 'below';
};

/**
 * BrandLogo — 619 Fitness Studio mark.
 * Tries multiple casings of /logo so it works on case-sensitive filesystems
 * (Vercel/Linux). Falls back to a sharp red "619" tile if no asset is found.
 */
export default function BrandLogo({ size = 40, showText = false, textPosition = 'right' }: Props) {
  const candidates = ['/logo.PNG', '/logo.png', '/logo.jpg', '/logo.jpeg', '/logo.svg', '/logo.webp'];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (idx < candidates.length - 1) setIdx(idx + 1);
    else setFailed(true);
  };

  const radius = Math.round(size * 0.22);

  const Mark = failed ? (
    <div
      aria-label="619 Fitness Studio"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-lo) 100%)',
        color: '#ffffff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.36),
        letterSpacing: '-0.03em',
        boxShadow: '0 6px 20px var(--brand-glow), inset 0 1px 0 rgba(255,255,255,0.20)',
        flexShrink: 0,
        fontFeatureSettings: '"tnum"',
      }}
    >
      619
    </div>
  ) : (
    <div
      className="brand-logo-wrap"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        padding: Math.round(size * 0.12),
      }}
    >
      <img
        src={candidates[idx]}
        alt="619 Fitness Studio"
        onError={onError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          display: 'block',
          filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.35))',
        }}
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
      <div
        style={{
          fontSize: isBelow ? 22 : 16,
          fontWeight: 800,
          letterSpacing: '-0.028em',
          color: 'var(--text)',
        }}
      >
        619 Fitness
      </div>
      <div
        style={{
          fontSize: isBelow ? 10 : 9,
          color: 'var(--muted)',
          letterSpacing: isBelow ? '2.6px' : '2px',
          textTransform: 'uppercase',
          fontWeight: 700,
          marginTop: isBelow ? 6 : 5,
        }}
      >
        Iron Studio
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
