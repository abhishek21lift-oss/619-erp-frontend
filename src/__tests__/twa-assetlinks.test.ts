import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPublicProxyPath } from '@/proxy';

type AssetLink = {
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

const links = JSON.parse(
  readFileSync(join(process.cwd(), 'public/.well-known/assetlinks.json'), 'utf8'),
) as AssetLink[];

describe('TWA Digital Asset Links', () => {
  it('lists both Android apps with a SHA-256 fingerprint each', () => {
    expect(links.map((l) => l.target.package_name).sort()).toEqual([
      'com.myptstudio.member',
      'com.myptstudio.studio',
    ]);

    for (const link of links) {
      expect(link.relation).toContain('delegate_permission/common.handle_all_urls');
      expect(link.target.namespace).toBe('android_app');
      expect(link.target.sha256_cert_fingerprints).toHaveLength(1);
      expect(link.target.sha256_cert_fingerprints[0]).toMatch(/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/);
    }
  });

  it('is served without a session', () => {
    expect(isPublicProxyPath('/.well-known/assetlinks.json')).toBe(true);
  });
});
