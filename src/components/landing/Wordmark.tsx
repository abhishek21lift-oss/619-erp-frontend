'use client';

import Image from 'next/image';
import { C } from './tokens';

/**
 * The MY PT STUDIO lockup for dark surfaces: cube mark + two-tone wordmark
 * (blue "MY PT", ink "STUDIO"), matching the artwork's own colours.
 * `priority` is for the nav instance only — the footer copy must not preload.
 */
export function Wordmark({ size = 34, priority = false }: { size?: number; priority?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src="/mypt-logo.png"
        alt="MY PT STUDIO"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
      <span className="text-[15px] font-[800] tracking-[-0.01em]" style={{ color: C.ink }}>
        <span style={{ color: C.blueHi }}>MY&nbsp;PT&nbsp;</span>STUDIO
      </span>
    </span>
  );
}