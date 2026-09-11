/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

const { securityHeaders } = require('./src/lib/security-headers');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  // Allow cross-origin requests from 127.0.0.1 (used by Playwright tests).
  allowedDevOrigins: ['127.0.0.1', 'localhost'],

  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@dnd-kit/core',
    ],
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    // Never optimize/serve SVGs through the image optimizer (SVG DoS + stored
    // XSS surface — GHSA-q8wf-6r8g-63ch). Force any served image to download
    // rather than render inline, under a locked-down CSP.
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'none'; sandbox;",
    // M-02: explicit allowlist — wildcard '**' allows SSRF via Next.js image optimizer
    remotePatterns: [
      // Supabase storage (replace <project-ref> with your actual project ref via env)
      {
        protocol: 'https',
        hostname: process.env.NEXT_PUBLIC_SUPABASE_HOST || '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Add your CDN hostname here if you serve user avatars from one
    ],
  },

  webpack(config, { isServer }) {
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
      };
    }
    return config;
  },

  // Security headers — single source of truth is src/lib/security-headers.js.
  //
  // These lived in src/proxy.ts until now. The middleware matcher excludes
  // `api`, `_next/static`, `_next/image`, favicon and every image/font
  // extension, so API responses and static assets were served with no
  // security headers whatsoever — including no HSTS. A matcher cannot express
  // "every path"; this can, and it also applies to the /api/:path* rewrite
  // below, which is how the backend is reached in production.
  //
  // Do not also set these in proxy.ts or vercel.json: a middleware
  // headers.set() overrides this file silently, which is exactly how the two
  // copies drifted apart before.
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders(IS_PROD) }];
  },

  async redirects() {
    return [
      { source: '/admin',              destination: '/admin/dashboard',         permanent: true },
      { source: '/member',             destination: '/member/dashboard',         permanent: true },
      { source: '/pt-os',              destination: '/',                         permanent: true },
      { source: '/trainer',            destination: '/trainer/dashboard',        permanent: true },
      { source: '/operations',         destination: '/operations/leaderboard',   permanent: true },
      { source: '/checkin/reports',    destination: '/attendance/reports',       permanent: true },
      { source: '/pt-os/plans',        destination: '/subscription/packages',    permanent: true },
      // The check-in hub (face / QR / passkey method picker) is gone — the
      // route now goes straight to the QR scanner, which is the only
      // in-app check-in method left. permanent:false because this may
      // change again as the product settles; a 307 doesn't get cached
      // the way a 308 would.
      { source: '/checkin',            destination: '/checkin/qr-scanner',       permanent: false },

      // ── The workout module consolidation ────────────────────────────────
      //
      // There were two ways to author a workout and two URL shapes onto the
      // one that survived. Backend migrations 193 and 195 archived the tables
      // behind the Training OS builder, so these four sources have nothing
      // left to render — but they are in trainers' history and bookmarks, and
      // one of them is the URL the "Create and add exercises" button pushed
      // for months. A 404 is not the right answer to any of them.
      //
      // permanent, because none of these shapes is coming back: the tables are
      // archived and the client segment addressed nothing.

      // The Training OS builder. A template id belongs to an archived table
      // and cannot name a plan, so the deep link lands on the index rather
      // than on a plan that is not the one asked for.
      { source: '/pt-os/training/templates',     destination: '/pt-os/workout-plans', permanent: true },
      { source: '/pt-os/training/templates/:id', destination: '/pt-os/workout-plans', permanent: true },

      // The client-scoped builder. It always carried the plan in ?plan=, so
      // the deep link survives in full — the named capture moves the plan id
      // into the path. `day` rides along on its own: Next appends the original
      // query to the destination, and both pages read it from there.
      {
        source: '/pt-os/clients/:clientId/training/builder/add-exercises',
        has: [{ type: 'query', key: 'plan', value: '(?<plan>.+)' }],
        destination: '/pt-os/workout-plans/:plan/builder/add-exercises',
        permanent: true,
      },
      {
        source: '/pt-os/clients/:clientId/training/builder',
        has: [{ type: 'query', key: 'plan', value: '(?<plan>.+)' }],
        destination: '/pt-os/workout-plans/:plan/builder',
        permanent: true,
      },
      // Without ?plan= there is no plan to open. This is what the old route
      // rendered an empty state for; the index is the same answer with
      // somewhere to go next.
      {
        source: '/pt-os/clients/:clientId/training/builder/:rest*',
        destination: '/pt-os/workout-plans',
        permanent: true,
      },
    ];
  },

  async rewrites() {
    if (!IS_PROD) {
      return [];
    }

    const backendUrl = (
      process.env.NEXT_PUBLIC_API_URL || ''
    ).trim().replace(/\/+$/, '');

    if (!backendUrl) {
      throw new Error(
        'NEXT_PUBLIC_API_URL is not set. Set it as a build arg in the compose file '
        + 'on the VPS (see infra/nginx/README.md in the backend repo), or in .env.local '
        + 'for local development.'
      );
    }

    // The AI service (repo: mps-ai) runs as its own container. It is routed
    // through the same same-origin rewrite as /api so the browser never makes a
    // cross-origin call. That keeps CORS out of the picture, and — the part
    // that actually matters — means the httpOnly `token` cookie is sent: it is
    // sameSite:'strict' and would not survive a cross-site request. Without
    // this the Ask AI panel would be unauthenticated in production while
    // working fine against localhost.
    //
    // Optional on purpose. A deploy that has not stood the AI service up yet
    // omits AI_SERVICE_URL and /ai/* simply 404s, rather than the whole
    // frontend refusing to build.
    const aiUrl = (process.env.AI_SERVICE_URL || '').trim().replace(/\/+$/, '');

    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
      ...(aiUrl ? [{ source: '/ai/:path*', destination: `${aiUrl}/ai/:path*` }] : []),
    ];
  },
};

module.exports = nextConfig;
