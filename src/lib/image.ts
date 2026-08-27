// Pure canvas helpers for the photo upload pipeline (crop + compress).
// No dependency beyond the browser Canvas API.

export interface CropPixels {
  x: number;
  y: number;
  width: number;
  height: number;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image.'));
    img.src = src;
  });
}

/** Draws the cropped region of `imageSrc` onto an offscreen canvas and returns it. */
export async function getCroppedImageCanvas(
  imageSrc: string,
  crop: CropPixels,
  shape: 'round' | 'rect' = 'round',
): Promise<HTMLCanvasElement> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');

  if (shape === 'round') {
    ctx.beginPath();
    ctx.arc(crop.width / 2, crop.height / 2, Math.min(crop.width, crop.height) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  ctx.drawImage(
    image,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height,
  );

  return canvas;
}

/**
 * Resizes `sourceCanvas` so its longest side is `maxDim`, and re-encodes as
 * JPEG at `quality`.
 *
 * JPEG, so: no alpha. A canvas clipped to a circle by getCroppedImageCanvas
 * arrives here with transparent corners and leaves with BLACK ones — measured,
 * rgb(0,0,0). Pair `shape: 'round'` with this and the circle is baked into the
 * file, which then shows four black corners in any square or rounded-square
 * frame. If a round crop is ever genuinely wanted, it needs a PNG path.
 */
export function compressCanvas(sourceCanvas: HTMLCanvasElement, maxDim = 800, quality = 0.8): string {
  const { width, height } = sourceCanvas;
  const scale = Math.min(1, maxDim / Math.max(width, height));
  const outW = Math.max(1, Math.round(width * scale));
  const outH = Math.max(1, Math.round(height * scale));

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported.');
  ctx.drawImage(sourceCanvas, 0, 0, outW, outH);

  return out.toDataURL('image/jpeg', quality);
}

/** Convenience: crop then compress in one call, returning the final base64 JPEG data URL. */
export async function cropAndCompressImage(
  imageSrc: string,
  crop: CropPixels,
  shape: 'round' | 'rect' = 'round',
  maxDim = 800,
  quality = 0.8,
): Promise<string> {
  const canvas = await getCroppedImageCanvas(imageSrc, crop, shape);
  return compressCanvas(canvas, maxDim, quality);
}
