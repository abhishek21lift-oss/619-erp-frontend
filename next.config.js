/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

const { securityHeaders } = require('./src/lib/security-headers');

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

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
