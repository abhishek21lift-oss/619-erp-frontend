'use client';
import { useState } from 'react';

/**
 * StudioMark — per-studio logo used in the top bar and side-nav.
 *
 * Renders the organization's uploaded logo when `logoUrl` is set (served via
 * the /uploads proxy). When there's no logo — or the image fails to load — it
 * falls back to an auto-generated monogram: the first two letters of the
 * studio name on a colour deterministically derived from the name, so every
 * studio looks visually distinct without needing an upload.
 */
function monogram(name: string): string {
  const first = (name || '').trim().split(/\s+/)[0] || 'PT';
  return first.slice(0, 2).toUpperCase();
}

function hueFromName(name: string): number {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export default function StudioMark({
  name,
  logoUrl,
  size = 36,
  radius,
}: {
  name: string;
  logoUrl?: string | null;
  size?: number;
  radius?: number;
}) {
  const [failed, setFailed] = useState(false);
  const r = radius ?? Math.round(size * 0.26);

  if (logoUrl && !failed) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: r, flexShrink: 0,
          overflow: 'hidden', background: 'var(--bg-white)',
          border: '1px solid var(--border)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {/* Plain <img>: /uploads/* is proxied to the backend by next.config rewrites. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={name}
          width={size}
          height={size}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>
    );
  }

  const hue = hueFromName(name);
  return (
    <div
      aria-label={name}
      style={{
        width: size, height: size, borderRadius: r, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: `linear-gradient(135deg, hsl(${hue} 62% 48%), hsl(${(hue + 28) % 360} 68% 38%))`,
        color: '#fff',
        fontWeight: 800,
        fontSize: Math.round(size * 0.38),
        letterSpacing: '-0.02em',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {monogram(name)}
    </div>
  );
}
