'use client';

/**
 * A client's face, wherever their name appears.
 *
 * Every screen that listed clients drew its own initials tile, so a photo
 * uploaded on the profile page showed up on exactly one screen. The tiles
 * were also all subtly different — some round, some 10px-radius, some
 * gradient-per-name, some flat — which is why this takes `className` and
 * `style` from the caller instead of imposing a look. It owns one thing:
 * whether you see the photo or the initials.
 *
 * Two details that are not negotiable at the call sites, which is the reason
 * this is a component and not a helper function:
 *
 *   - `onError`. photo_url holds both data URLs (from the in-app crop) and
 *     stored paths. A path this deployment cannot serve has to fall back to
 *     the initials, not leave a broken-image icon repeated down a table.
 *   - Plain <img>, not next/image. Not for the data URLs — Next 16 handles
 *     those by marking them unoptimized — but because these tiles are 26 to
 *     52 px and already inside a sized box, so there is nothing for the
 *     optimizer to do and a loader per row to pay for.
 */

import { useState } from 'react';

export function initialsOf(name: string | null | undefined): string {
  return (name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

export default function ClientAvatar({
  name,
  photoUrl,
  className,
  style,
  children,
}: {
  name: string | null | undefined;
  /** photo_url off the client row. Absent, empty or unloadable → initials. */
  photoUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
  /** Fallback content when there is no photo. Defaults to the initials —
   *  Today's rest days pass a Moon icon instead. */
  children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = !!photoUrl && !broken;

  return (
    // overflow goes first so a caller that wants something else still wins.
    <div className={className} style={{ overflow: 'hidden', ...style }}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl as string}
          alt={name ?? ''}
          onError={() => setBroken(true)}
          style={{ height: '100%', width: '100%', objectFit: 'cover' }}
        />
      ) : (children ?? initialsOf(name))}
    </div>
  );
}
