'use client';
import { useState } from 'react';

/**
 * The signed-in person's My Profile photo, or whatever the caller puts in its
 * place.
 *
 * The top bar and the sidebar used to show only letters, even for a trainer
 * who had uploaded a photo. The photo rides on the session (`avatar_url`), so
 * this needs no request of its own; `fallback` renders when there is no photo
 * or it fails to load, so a broken image never replaces the letters.
 */
export default function UserPhoto({
  url,
  name,
  size,
  radius,
  ring,
  fallback,
}: {
  url?: string | null;
  name?: string | null;
  size: number;
  /** Defaults to a circle. */
  radius?: number;
  /** A CSS background painted as a ring around the photo. */
  ring?: string;
  fallback: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  if (!url || broken) return <>{fallback}</>;
  const r = radius ?? size / 2;
  return (
    <span
      className="inline-flex shrink-0"
      style={{
        width: size, height: size, borderRadius: r,
        padding: ring ? 2 : 0,
        background: ring,
        boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
      }}
    >
      {/* Plain <img>: /uploads/* is proxied to the backend by next.config rewrites. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={name ?? ''}
        width={size}
        height={size}
        onError={() => setBroken(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: ring ? r - 2 : r }}
      />
    </span>
  );
}
