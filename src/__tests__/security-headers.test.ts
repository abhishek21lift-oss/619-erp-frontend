// A CSP is a string. A wrong directive does not fail the build, does not fail
// a type check, and does not throw — it silently blocks a script in production
// only. These tests are the only thing standing between an edit here and a
// blank page for every user.

const {
  securityHeaders,
  buildCsp,
  buildReportOnlyCsp,
  HSTS,
} = require('../lib/security-headers');

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

  it('allows the WebSocket origin as well as the https one', () => {
    // Not belt-and-braces, and not a duplicate of the case above.
    //
    // `https://api.example.com` in connect-src does NOT permit
    // `wss://api.example.com`. CSP3's scheme-part matching runs
    // http→https/ws/wss, ws→wss and wss→https, and stops there — https→wss is
    // simply absent, so the https origin on its own blocks the socket.
    //
    // Confirmed in Chromium against this exact policy: with only the https
    // origin listed, opening the Command Center's realtime stream fires
    // securitypolicyviolation[connect-src] and the console silently sits on its
    // polling fallback, looking like a backend or nginx fault. With the wss
    // origin listed it connects — and an unlisted wss host is still blocked, so
    // the policy is still doing its job.
    const csp = buildCsp({ NEXT_PUBLIC_API_URL: 'https://api.myptstudio.com' });
    expect(csp).toContain('https://api.myptstudio.com');
    expect(csp).toContain('wss://api.myptstudio.com');
  });

  it('derives ws:// from a plaintext dev API, never wss://', () => {
    // A secure socket to a plaintext dev backend cannot connect at all, and
    // listing one would hide that behind a CSP that looks right.
    const csp = buildCsp({ NEXT_PUBLIC_API_URL: 'http://localhost:5000' });
    expect(csp).toContain('ws://localhost:5000');
    expect(csp).not.toContain('wss://localhost:5000');
  });

  it('adds no socket origin when there is no API URL to derive one from', () => {
    const csp = buildCsp({});
    expect(csp).not.toContain('wss://');
    expect(csp).not.toContain('ws://');
  });

  it('falls back to a wildcard Supabase host, not to nothing', () => {
    expect(buildCsp({})).toContain('*.supabase.co');
  });

  it('survives a malformed API URL instead of throwing at build time', () => {
    expect(() => buildCsp({ NEXT_PUBLIC_API_URL: 'not a url' })).not.toThrow();
  });

  it('never allows eval', () => {
    // Verified in Chromium: the app raises zero CSP violations and mounts
    // without it. If a dependency ever needs eval, replace the dependency —
    // re-adding this hands an attacker arbitrary code execution from any
    // string they can get into the page.
    expect(buildCsp({})).not.toContain('unsafe-eval');
  });

  it('never allows eval in production, whatever else is set', () => {
    expect(buildCsp({ NODE_ENV: 'production' })).not.toContain('unsafe-eval');
    expect(buildCsp({ NODE_ENV: 'production' }, { nonce: 'n1' })).not.toContain('unsafe-eval');
  });

  it('allows eval ONLY when NODE_ENV is explicitly development', () => {
    // `next dev` compiles modules as eval() strings, so without this the dev
    // bundle never executes and the app hangs on its loading state. Production
    // builds emit no eval, so this must never widen the deployed policy.
    expect(buildCsp({ NODE_ENV: 'development' })).toContain("'unsafe-eval'");
    expect(buildCsp({ NODE_ENV: 'development' }, { nonce: 'n1' })).toContain("'unsafe-eval'");
  });

  it('treats an absent or unrecognised NODE_ENV as production, not development', () => {
    // The safe default: a misconfigured environment should break the dev
    // server, never silently weaken a deployed policy.
    for (const env of [{}, { NODE_ENV: '' }, { NODE_ENV: 'staging' }, { NODE_ENV: 'Development' }]) {
      expect(buildCsp(env)).not.toContain('unsafe-eval');
    }
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

describe('buildReportOnlyCsp — the candidate strict policy', () => {
  it('swaps unsafe-inline for the nonce in script-src', () => {
    // The whole point of the measurement: if this policy still allowed inline
    // script it would report nothing and prove nothing.
    // Scoped to script-src deliberately — style-src keeps 'unsafe-inline',
    // because Next.js injects inline styles and inline CSS is a far smaller
    // problem than inline JS. Removing that is a separate exercise.
    const scriptSrc = buildReportOnlyCsp({}, 'abc123')
      .split('; ')
      .find((d: string) => d.startsWith('script-src')) as string;
    expect(scriptSrc).toContain("'nonce-abc123'");
    expect(scriptSrc).not.toContain('unsafe-inline');
    expect(scriptSrc).not.toContain('unsafe-eval');
  });

  it('leaves the enforced policy alone', () => {
    // Report-Only must never be able to break the site. The enforced policy
    // keeps unsafe-inline until the reports say it is safe to drop.
    expect(buildCsp({})).toContain('unsafe-inline');
  });

  it('differs from the enforced policy ONLY in script-src', () => {
    // A violation must be unambiguously about inline script. If any other
    // directive drifted, the reports would be uninterpretable.
    const strip = (csp: string) =>
      csp.split('; ').filter((d) => !d.startsWith('script-src')).join('; ');
    expect(strip(buildReportOnlyCsp({}, 'n1'))).toBe(strip(buildCsp({})));
  });

  it('appends report-uri only when one is configured', () => {
    expect(buildReportOnlyCsp({}, 'n1', 'https://example.com/csp'))
      .toContain('report-uri https://example.com/csp');
    expect(buildReportOnlyCsp({}, 'n1')).not.toContain('report-uri');
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
