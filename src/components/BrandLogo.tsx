'use client';
import { useState } from 'react';

type Props = {
  size?: number;
  showText?: boolean;
  textPosition?: 'right' | 'below';
};

/**
 * BrandLogo — Displays the 619 Fitness Studio logo.
 * Tries logo.PNG, logo.png, logo.jpg, logo.svg in order.
 * Logo is shown in a white pill container so it pops on dark navy backgrounds.
 * Falls back to a styled "619" badge if no image found.
 *
 * To update the logo: replace frontend/public/logo.PNG with your image.
 */
export default function BrandLogo({ size = 48, showText = false, textPosition = 'right' }: Props) {
  // Try both cases — Vercel (Linux) is case-sensitive
  const candidates = ['/logo.PNG', '/logo.png', '/logo.jpg', '/logo.jpeg', '/logo.svg'];
  const [idx, setIdx] = useState(0);
  const [failed, setFailed] = useState(false);

  const onError = () => {
    if (idx < candidates.length - 1) setIdx(idx + 1);
    else setFailed(true);
  };

  const imgSize = size;
  const wrapPad = Math.round(size * 0.10);
  const wrapRadius = Math.round(size * 0.22);

  const Mark = failed ? (
    /* Fallback badge */
    <div
      aria-label="619 Fitness Studio"
      style={{
        width: size, height: size,
        borderRadius: wrapRadius,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand2) 100%)',
        color: '#fff',
        fontWeight: 900,
        fontSize: size * 0.36,
        letterSpacing: '-0.02em',
        boxShadow: '0 8px 28px rgba(255,71,87,0.45)',
        flexShrink: 0,
      }}
    >
      619
    </div>
  ) : (
    /* Real logo — white container makes it sharp on dark backgrounds */
    <div
      className="brand-logo-wrap"
      style={{
        width: size + wrapPad * 2,
        height: size + wrapPad * 2,
        borderRadius: wrapRadius,
        padding: wrapPad,
      }}
    >
      <img
        src={candidates[idx]}
        alt="619 Fitness Studio"
        onError={onError}
        style={{
          width: imgSize,
          height: imgSize,
          objectFit: 'contain',
          display: 'block',
        }}
      />
    </div>
  );

  if (!showText) return Mark;

  const textBlock = (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: textPosition === 'below' ? 'center' : 'flex-start',
      lineHeight: 1,
    }}>
      <div style={{
        fontSize: textPosition === 'below' ? 22 : 16,
        fontWeight: 800,
        letterSpacing: '-0.025em',
        background: 'linear-gradient(135deg, var(--text) 0%, var(--brand) 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        619 Fitness
      </div>
      <div style={{
        fontSize: textPosition === 'below' ? 11 : 9,
        color: 'var(--muted)',
        letterSpacing: textPosition === 'below' ? '2.6px' : '1.8px',
        textTransform: 'uppercase',
        fontWeight: 700,
        marginTop: textPosition === 'below' ? 6 : 5,
      }}>
        Studio
      </div>
    </div>
  );

  return (
    <div style={{
      display: 'flex',
      flexDirection: textPosition === 'below' ? 'column' : 'row',
      alignItems: 'center',
      gap: textPosition === 'below' ? '0.9rem' : '0.65rem',
    }}>
      {Mark}
      {textBlock}
    </div>
  );
}
