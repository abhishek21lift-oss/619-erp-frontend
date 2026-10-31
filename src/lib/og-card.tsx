import { ImageResponse } from 'next/og';
import { C } from '@/components/landing/tokens';

/**
 * The social card for the public pages.
 *
 * One renderer, one 1200×630 layout, so all three shareable URLs preview the
 * same brand instead of the 512×512 app icon that used to stand in as an OG
 * image. Fonts are left at Next's bundled Geist Regular — loading a second
 * weight means shipping a font file for a card that is mostly size and space.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

const INK = C.ink;
const MUTED = C.muted;
const PLUM = C.blue;
const BAND = C.canvasAlt;

export function renderOgCard({ eyebrow, title }: { eyebrow: string; title: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: C.canvas,
          padding: '68px 76px',
          fontFamily: 'Geist',
          color: INK,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: PLUM }} />
          <div style={{ fontSize: 30, letterSpacing: '-0.02em' }}>MY PT STUDIO</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ fontSize: 27, color: PLUM }}>{eyebrow}</div>
          <div
            style={{
              fontSize: 78,
              lineHeight: 1.06,
              letterSpacing: '-0.038em',
              maxWidth: 960,
            }}
          >
            {title}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 26, color: MUTED }}>myptstudio.com</div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: BAND,
              color: MUTED,
              borderRadius: 999,
              padding: '12px 26px',
              fontSize: 22,
            }}
          >
            Clients · Training · Payments · Analytics
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
