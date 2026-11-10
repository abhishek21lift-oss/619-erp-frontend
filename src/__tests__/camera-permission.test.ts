import { describe, expect, it } from 'vitest';
import { cameraBlockedHint } from '@/lib/camera-permission';

describe('cameraBlockedHint', () => {
  it('names the Android app settings path on Android', () => {
    const hint = cameraBlockedHint(
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0 Mobile Safari/537.36',
    );

    expect(hint).toContain('Android Settings');
    expect(hint).toContain('MY PT STUDIO');
  });

  it('sends everyone else to the browser site settings', () => {
    const hint = cameraBlockedHint(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    );

    expect(hint).toContain('site settings');
    expect(hint).not.toContain('Android Settings');
  });
});
