// A CSP is a string. A wrong directive does not fail the build, does not fail
// a type check, and does not throw — it silently blocks a script in production
// only. These tests are the only thing standing between an edit here and a
// blank page for every user.

const { securityHeaders, buildCsp, HSTS } = require('../lib/security-headers');

type Header = { key: string; value: string };
const byKey = (hs: Header[], k: string) => hs.find((h) => h.key === k)?.value;

describe('buildCsp', () => {
  it('uses the API origin — scheme, host AND port', () => {
    // Regression: an earlier version took .hostname and re-prefixed https://,
    // which dropped the port and blocked every local API call under CSP.
    const csp = buildCsp({ NEXT_PUBLIC_API_URL: 'http://localhost:5000' });
    expect(csp).toContain('http://localhost:5000');
    expect(csp).not.toContain('https://localhost;');
  });

  it('falls back to a wildcard Supabase host, not to nothing', () => {
    expect(buildCsp({})).toContain('*.supabase.co');
  });

  it('survives a malformed API URL instead of throwing at build time', () => {
    expect(() => buildCsp({ NEXT_PUBLIC_API_URL: 'not a url' })).not.toThrow();
  });

  it('denies framing, objects and stray base tags', () => {
    const csp = buildCsp({});
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("form-action 'self'");
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('keeps the origins the app actually depends on', () => {
    const csp = buildCsp({});
    // SheetJS (spreadsheet member import) is a script tag from cdnjs.
    expect(csp).toContain('https://cdnjs.cloudflare.com');
    // Google Sign-In needs both a script and a frame.
    expect(csp).toContain('https://accounts.google.com/gsi/');
    expect(csp).toMatch(/frame-src[^;]*https:\/\/accounts\.google\.com/);
    // Google avatar images.
    expect(csp).toContain('https://lh3.googleusercontent.com');
  });
});

describe('securityHeaders', () => {
  it('emits HSTS in production only', () => {
    // Sending HSTS from a dev server pins localhost to HTTPS in the
    // developer's browser for a year and survives a cache clear.
    expect(byKey(securityHeaders(true, {}), 'Strict-Transport-Security')).toBe(HSTS);
    expect(byKey(securityHeaders(false, {}), 'Strict-Transport-Security')).toBeUndefined();
  });

  it('sets a one-year HSTS with subdomains and WITHOUT preload', () => {
    expect(HSTS).toBe('max-age=31536000; includeSubDomains');
    // preload is a one-way door — opting out takes months. It stays the
    // owner's explicit decision, never a default.
    expect(HSTS).not.toContain('preload');
  });

  it('allows popups in COOP so Google Sign-In keeps working', () => {
    // 'same-origin' would sever window.opener and break login outright.
    expect(byKey(securityHeaders(true, {}), 'Cross-Origin-Opener-Policy'))
      .toBe('same-origin-allow-popups');
  });

  it('does not set COEP', () => {
    // require-corp would break Google's iframe and Supabase-hosted images for
    // an isolation guarantee this app has no use for.
    expect(byKey(securityHeaders(true, {}), 'Cross-Origin-Embedder-Policy')).toBeUndefined();
  });

  it('disables the legacy XSS auditor rather than enabling it', () => {
    expect(byKey(securityHeaders(true, {}), 'X-XSS-Protection')).toBe('0');
  });

  it('keeps the camera for QR check-in and denies the rest', () => {
    const pp = byKey(securityHeaders(true, {}), 'Permissions-Policy') as string;
    expect(pp).toContain('camera=(self)');
    expect(pp).toContain('microphone=()');
    expect(pp).toContain('geolocation=()');
  });

  it('includes every header the hardening pass promised', () => {
    const keys = securityHeaders(true, {}).map((h: Header) => h.key);
    for (const k of [
      'Content-Security-Policy',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
      'Cross-Origin-Resource-Policy',
      'Origin-Agent-Cluster',
      'X-DNS-Prefetch-Control',
      'X-Permitted-Cross-Domain-Policies',
      'Strict-Transport-Security',
    ]) {
      expect(keys).toContain(k);
    }
  });

  it('never emits the same header twice', () => {
    // Duplicate headers are the classic outcome of two config sources, and
    // browsers resolve the conflict inconsistently.
    const keys = securityHeaders(true, {}).map((h: Header) => h.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
