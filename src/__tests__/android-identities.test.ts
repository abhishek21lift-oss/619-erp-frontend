// The Android identity rules, tested without needing the Android folders.
//
// `scripts/verify-android-identities.mjs` is run by hand before building a
// release; these cases pin the rules it applies, including the collision that
// actually shipped (two apps named com.myptstudio.member, different keys).

import { describe, it, expect } from 'vitest';
import {
  lintIdentities,
  normalizeFingerprint,
} from '../../scripts/verify-android-identities.mjs';

const twa = (packageId, fingerprint) => ({
  kind: 'twa',
  source: `android-twa/${packageId}/twa-manifest.json`,
  packageId,
  fingerprints: [fingerprint],
});
const webview = (packageId, source) => ({
  kind: 'webview',
  source,
  packageId,
  fingerprints: [],
});
const link = (packageId, fingerprint) => ({
  relation: ['delegate_permission/common.handle_all_urls'],
  target: {
    namespace: 'android_app',
    package_name: packageId,
    sha256_cert_fingerprints: [fingerprint],
  },
});

describe('normalizeFingerprint', () => {
  it('compares digit groups case- and colon-insensitively', () => {
    expect(normalizeFingerprint('aa:bb:cc')).toBe('AABBCC');
    expect(normalizeFingerprint('AA BB CC')).toBe('AABBCC');
  });
});

describe('lintIdentities', () => {
  it('accepts one TWA per package with a matching assetlinks entry', () => {
    expect(lintIdentities([twa('com.example.app', 'AA:BB')], [link('com.example.app', 'AA:BB')]))
      .toEqual([]);
  });

  it('rejects a WebView shell sharing a TWA package id', () => {
    const errors = lintIdentities(
      [
        twa('com.example.member', 'AA:BB'),
        webview('com.example.member', 'android-webview/capacitor.member.config.json'),
      ],
      [link('com.example.member', 'AA:BB')],
    );
    expect(errors.join('\n')).toMatch(/com\.example\.member is declared by/);
    expect(errors.join('\n')).toMatch(/identity decision/);
  });

  it('rejects a TWA fingerprint that assetlinks would not verify', () => {
    const errors = lintIdentities([twa('com.example.app', 'AA:BB')], [link('com.example.app', 'CC:DD')]);
    expect(errors.join('\n')).toMatch(/is not listed for com\.example\.app/);
  });

  it('rejects a published package with no project behind it', () => {
    const errors = lintIdentities([], [link('com.example.old', 'AA:BB')]);
    expect(errors.join('\n')).toMatch(/no Android project declares it/);
  });
});
