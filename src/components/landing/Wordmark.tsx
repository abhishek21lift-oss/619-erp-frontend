'use client';

import Image from 'next/image';
import { C } from './tokens';
import { BRAND_TINT_FROM } from '@/lib/brand';
import { gray } from '@/lib/palette';

/**
 * The MY PT STUDIO lockup for dark surfaces: cube mark + two-tone wordmark
 * (blue "MY PT", ink "STUDIO"), matching the artwork's own colours.
 * `priority` is for the nav instance only — the footer copy must not preload.
 *
 * The mark image is `/icon-512.png` — a tight crop of just the cube — not
 * `/mypt-logo.png`, which is the full lockup (cube stacked over the baked-in
 * wordmark text) meant to be shown large. At nav size that second image
 * squeezed both the cube AND its own copy of "MY PT STUDIO" into a ~38px
 * square, crushing the text into an illegible smudge underneath the cube
 * while this component's own text span rendered a second, legible copy right
 * next to it. `/icon-512.png` is the same cube artwork with no baked-in text,
 * cropped to fill its square — see the app's own icon set, which already
 * uses it correctly.
 *
 * `tile` wraps the mark in a pale brand-tint tile. The cube artwork's navy
 * body (see src/lib/brand.ts for the sampled brand blues) drops onto the dark
 * glass chip at ~3:1 and disappears; the tile lifts it to ~6:1 without
 * touching the artwork's own colours. Only the navbar passes `tile`.
 */
export function Wordmark({ size = 34, priority = false, tile = false }: { size?: number; priority?: boolean; tile?: boolean }) {
  const mark = tile ? (
    <span
      className="flex shrink-0 items-center justify-center rounded-[9px]"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(165deg, ${gray[0]} 0%, ${BRAND_TINT_FROM} 100%)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(2,6,23,0.45)',
      }}
    >
      <Image
        src="/icon-512.png"
        alt="MY PT STUDIO"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 object-contain"
        style={{ width: size * 0.72, height: size * 0.72 }}
      />
    </span>
  ) : (
    <Image
      src="/icon-512.png"
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