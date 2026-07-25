/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

// CSP and the other security headers are set per-request in src/proxy.ts
// (Next.js 16 renamed the middleware convention to proxy.ts).

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

  // Security headers (CSP, X-Frame-Options, X-Content-Type-Options,
  // Referrer-Policy, Permissions-Policy) are set dynamically per-request
  // in src/proxy.ts (nonce-based CSP) — that is the single source of
  // truth. Do not duplicate them here; proxy.ts runs on every request
  // and its headers.set() calls would silently override anything
  // declared in this file, leaving a second copy to bit-rot.
  // (The face-api.js model cache-control rules that used to live here were
  // removed along with the face recognition check-in system — see /models.)

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
        'NEXT_PUBLIC_API_URL is not set. Set it in Vercel project settings or .env.local'
      );
    }

    return [
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
      { source: '/uploads/:path*', destination: `${backendUrl}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
