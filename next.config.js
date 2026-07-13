/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

// CSP is now set dynamically in src/middleware.ts with per-request nonces.

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  serverExternalPackages: [
    '@vladmandic/face-api',
    'canvas',
  ],

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
    if (isServer) {
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...existing,
        '@vladmandic/face-api',
        'canvas',
      ];
    }
    return config;
  },

  async headers() {
    // Security headers (CSP, X-Frame-Options, X-Content-Type-Options,
    // Referrer-Policy, Permissions-Policy) are set dynamically per-request
    // in src/proxy.ts (nonce-based CSP) — that is the single source of
    // truth. Do not duplicate them here; proxy.ts runs on every request
    // and its headers.set() calls would silently override anything
    // declared in this file, leaving a second copy to bit-rot.
    return [
      // Versioned path (/models/v2/…) gets long-lived immutable caching.
      {
        source: '/models/v:version/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Unversioned path (/models/…) gets a 24-hour TTL.
      {
        source: '/models/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
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
    ];
  },

  async rewrites() {
    const passThrough = [
      { source: '/models/:path*', destination: '/models/:path*' },
    ];

    if (!IS_PROD) {
      return passThrough;
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
      ...passThrough,
      { source: '/api/:path*', destination: `${backendUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
