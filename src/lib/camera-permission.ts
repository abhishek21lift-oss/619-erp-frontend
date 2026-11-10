/**
 * What to tell a trainer whose camera permission is already denied.
 *
 * Once a browser or Android app records a denial, getUserMedia rejects without
 * prompting again, so "Try again" alone loops. The way back differs by
 * platform: the installed WebView app grants the camera through Android's app
 * settings, a browser through its site settings.
 */
export function cameraBlockedHint(userAgent: string): string {
  return /Android/i.test(userAgent)
    ? 'Camera access is blocked. Allow it in Android Settings → Apps → MY PT STUDIO → Permissions, or in this browser’s site settings, then try again.'
    : 'Camera access is blocked. Allow it in this browser’s site settings for this page, then try again.';
}
