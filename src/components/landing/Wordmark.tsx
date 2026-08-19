'use client';

import Image from 'next/image';
import { C } from './tokens';
import { BRAND_TINT_FROM } from '@/lib/brand';

/**
 * The MY PT STUDIO lockup for dark surfaces: cube mark + two-tone wordmark
 * (blue "MY PT", ink "STUDIO"), matching the artwork's own colours.
 * `priority` is for the nav instance only — the footer copy must not preload.
 *
 * `tile` wraps the mark in a pale brand-tint tile. The cube artwork is dark
 * navy (sampled #0059CE–#0067E0 body), so dropped directly onto the dark
 * glass chip it reads at ~3:1 and disappears; the tile lifts it to ~6:1
 * without touching the artwork's own colours. Only the navbar passes `tile`.
 */
export function Wordmark({ size = 34, priority = false, tile = false }: { size?: number; priority?: boolean; tile?: boolean }) {
  const mark = tile ? (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(165deg, #FFFFFF 0%, ${BRAND_TINT_FROM} 100%)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(2,6,23,0.45)',
      }}
    >
      <Image
        src="/mypt-logo.png"
        alt="MY PT STUDIO"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 object-contain"
        style={{ width: size, height: size }}
      />
    </span>
  ) : (
    <Image
      src="/mypt-logo.png"
      alt="MY PT STUDIO"
      width={size}
      height={size}
      priority={priority}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );

  return (
    <span className="inline-flex items-center gap-2.5">
      {mark}
      <span className="text-[15px] font-[800] tracking-[-0.01em]" style={{ color: C.ink }}>
        <span style={{ color: C.blueHi }}>MY&nbsp;PT&nbsp;</span>STUDIO
      </span>
    </span>
  );
}