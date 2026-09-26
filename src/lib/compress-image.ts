/**
 * Shrink a phone photo before it is uploaded.
 *
 * A modern phone camera produces 3–8 MB images at 4000+ px. A progress photo
 * is looked at on a phone screen, side by side with another, so the long edge
 * is capped at 1600 px and the result re-encoded as JPEG — typically 200–500
 * KB, which uploads in a second on mobile data instead of a minute.
 *
 * Orientation: `createImageBitmap(..., { imageOrientation: 'from-image' })`
 * applies the camera's EXIF rotation, so a portrait shot stays upright. Where
 * that is unavailable an <img> is used, which modern browsers also orient.
 * Re-encoding through a canvas also drops EXIF metadata — including GPS
 * location — which a progress photo has no business carrying.
 */

const MAX_EDGE = 1600;
const QUALITY = 0.85;

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close?: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() };
    } catch {
      // Falls through to <img>, e.g. for HEIC on browsers that cannot bitmap it.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This photo could not be read. Try a JPG or PNG.'));
      el.src = url;
    });
    return { source: img, width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    // Safe once decoded: the <img> keeps its pixels.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}

export async function compressImage(file: Blob): Promise<Blob> {
  const { source, width, height, close } = await decode(file);
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot prepare the photo for upload.');
    ctx.drawImage(source, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (!blob) throw new Error('This browser cannot prepare the photo for upload.');
    return blob;
  } finally {
    close?.();
  }
}
