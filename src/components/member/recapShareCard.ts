/**
 * The monthly recap as an image — 1080 × 1920, the size Instagram and
 * WhatsApp stories use — drawn on a canvas so it needs no server and no
 * screenshot library. Shared through the phone's share sheet when it can
 * take files, downloaded otherwise.
 *
 * Only the member's own figures and their studio's name are on it; nothing a
 * member would not choose to post.
 */

import { palette } from '@/lib/palette';
import type { MeRecap } from '@/lib/api';
import { headlineStats, monthName } from './recap';

const W = 1080;
const H = 1920;
const FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Shrink the font until `text` fits in `max` px. */
function fit(ctx: CanvasRenderingContext2D, text: string, weight: number, size: number, max: number): number {
  let s = size;
  ctx.font = `${weight} ${s}px ${FONT}`;
  while (s > 20 && ctx.measureText(text).width > max) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${FONT}`;
  }
  return s;
}

export function drawRecapCard(canvas: HTMLCanvasElement, r: MeRecap): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Background: deep navy into the brand blue, with two soft glows.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, palette.gray[900]);
  bg.addColorStop(0.55, palette.blue[900]);
  bg.addColorStop(1, palette.blue[700]);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  for (const [x, y, rad, color] of [[900, 260, 520, 'rgba(59,141,245,0.35)'], [120, 1650, 600, 'rgba(16,185,129,0.22)']] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  const pad = 96;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText('MONTHLY RECAP', pad, 250);

  ctx.fillStyle = '#fff';
  const month = monthName(r.month);
  fit(ctx, month, 850, 150, W - pad * 2);
  ctx.fillText(month, pad, 410);

  if (r.first_name) {
    ctx.fillStyle = 'rgba(255,255,255,0.82)';
    fit(ctx, `${r.first_name}'s month in training`, 600, 54, W - pad * 2);
    ctx.fillText(`${r.first_name}'s month in training`, pad, 490);
  }

  // Stat tiles, two by two.
  const stats = headlineStats(r);
  const gap = 32;
  const tileW = (W - pad * 2 - gap) / 2;
  const tileH = 300;
  const top = 610;
  stats.forEach((s, i) => {
    const x = pad + (i % 2) * (tileW + gap);
    const y = top + Math.floor(i / 2) * (tileH + gap);
    roundRect(ctx, x, y, tileW, tileH, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.09)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    fit(ctx, s.value, 850, 120, tileW - 80);
    ctx.fillText(s.value, x + 40, y + 170);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    fit(ctx, s.label.toUpperCase(), 700, 32, tileW - 80);
    ctx.fillText(s.label.toUpperCase(), x + 40, y + 240);
  });

  // The headline lift, if there was one.
  let y = top + Math.ceil(stats.length / 2) * (tileH + gap) + 40;
  if (r.top_lift) {
    roundRect(ctx, pad, y, W - pad * 2, 220, 44);
    ctx.fillStyle = 'rgba(16,185,129,0.16)';
    ctx.fill();
    ctx.fillStyle = palette.emerald[300];
    ctx.font = `700 32px ${FONT}`;
    ctx.fillText('HEAVIEST LIFT', pad + 44, y + 72);
    ctx.fillStyle = '#fff';
    const lift = `${r.top_lift.exercise} · ${Math.round(r.top_lift.weight_kg * 10) / 10} kg${r.top_lift.reps ? ` × ${r.top_lift.reps}` : ''}`;
    fit(ctx, lift, 800, 64, W - pad * 2 - 88);
    ctx.fillText(lift, pad + 44, y + 160);
    y += 260;
  }

  // Footer: the studio.
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = `600 34px ${FONT}`;
  ctx.fillText('Trained at', pad, H - 190);
  ctx.fillStyle = '#fff';
  const studio = r.studio_name || 'my studio';
  fit(ctx, studio, 800, 60, W - pad * 2);
  ctx.fillText(studio, pad, H - 120);
}

/** A PNG of the card, or null when the browser cannot make one. */
export function recapCardBlob(r: MeRecap): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  drawRecapCard(canvas, r);
  return new Promise((resolve) => {
    try { canvas.toBlob((b) => resolve(b), 'image/png'); } catch { resolve(null); }
  });
}

/**
 * Share the card through the phone's share sheet, or download it.
 * Resolves 'shared' | 'downloaded' | 'cancelled' | 'failed'.
 */
export async function shareRecapCard(r: MeRecap): Promise<'shared' | 'downloaded' | 'cancelled' | 'failed'> {
  const blob = await recapCardBlob(r);
  if (!blob) return 'failed';
  const name = `recap-${r.month}.png`;
  const file = new File([blob], name, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: `My ${monthName(r.month)} in training` });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // Fall through to a download: some browsers refuse file shares late.
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}
