/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

// CSP is now set dynamically in src/middleware.ts with per-request nonces.

const nextConfig = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
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
    // M-02: explicit allowlist - wildcard '**' allows SSRF via Next.js image optimizer
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
    const securityHeaders = [
      { key: 'X-Frame-Options',         value: 'DENY' },
      { key: 'X-Content-Type-Options',  value: 'nosniff' },
      { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',      value: 'camera=self, microphone=(), geolocation=()' },
      {
        key: 'Content-Security-Policy',
        value: [
          "default-src 'self'",
          // Scripts: self + inline (Next.js needs unsafe-inline for hydration);
          // blob: for face-api.js web workers
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://accounts.google.com",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com",
          // Images: self + data URIs (canvas toDataURL) + Supabase storage
          "img-src 'self' data: blob: https://*.supabase.co",
          // Connect: self + backend API + Supabase + Google auth
          "connect-src 'self' https://*.supabase.co https://accounts.google.com",
          // Camera access for face check-in
          "media-src 'self' blob:",
          // Web workers for face-api.js
          "worker-src 'self' blob:",
          "frame-ancestors 'none'",
          "form-action 'self'",
        ].join('; '),
      },
    ];

    return [
      // Security headers on all HTML responses
      {
        source: '/((?!api|_next/static|_next/image|favicon.ico).*)',
        headers: securityHeaders,
      },
      // Versioned path (/models/v2/...) gets long-lived immutable caching.
      {
        source: '/models/v:version/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Unversioned path (/models/...) gets a 24-hour TTL.
      {
        source: '/models/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
    ];
  },

  async redirects() {
    return [
      { source: '/pt-os',                         destination: '/',                   permanent: true },
      { source: '/pt-os/clients',                 destination: '/clients',            permanent: true },
      { source: '/pt-os/clients/:id',             destination: '/clients/:id',        permanent: true },
      { source: '/pt-os/clients/:id/:path*',      destination: '/clients/:id',        permanent: true },
      { source: '/pt-os/new-client',              destination: '/clients/new',        permanent: true },
      { source: '/pt-os/schedule-session',        destination: '/schedule/book',      permanent: true },
      { source: '/pt-os/sessions',                destination: '/schedule',           permanent: true },
      { source: '/pt-os/session-balance',         destination: '/schedule',           permanent: true },
      { source: '/pt-os/workout-plans',           destination: '/programs',           permanent: true },
      { source: '/pt-os/exercise-library',        destination: '/programs',           permanent: true },
      { source: '/pt-os/diet-plans',              destination: '/programs',           permanent: true },
      { source: '/pt-os/:path*',                  destination: '/',                   permanent: true },
      { source: '/finance',                       destination: '/payments',           permanent: true },
      { source: '/finance/record-payment',        destination: '/payments/new',       permanent: true },
      { source: '/finance/:path*',                destination: '/payments',           permanent: true },
      { source: '/subscription/:path*',           destination: '/settings',           permanent: true },
      { source: '/settings/:path*',               destination: '/settings',           permanent: true },
      { source: '/admin/:path*',                  destination: '/',                   permanent: true },
      { source: '/member/:path*',                 destination: '/',                   permanent: true },
      { source: '/trainer/:path*',                destination: '/',                   permanent: true },
      { source: '/operations/:path*',             destination: '/',                   permanent: true },
      { source: '/attendance/:path*',             destination: '/schedule',           permanent: true },
      { source: '/checkin/:path*',                destination: '/schedule',           permanent: true },
      { source: '/ai/:path*',                     destination: '/programs',           permanent: true },
      { source: '/ai-coach',                      destination: '/programs',           permanent: true },
      { source: '/engagement/:path*',             destination: '/clients',            permanent: true },
      { source: '/insights/:path*',               destination: '/',                   permanent: true },
      { source: '/reports/:path*',                destination: '/',                   permanent: true },
      { source: '/sales/:path*',                  destination: '/payments',           permanent: true },
      { source: '/staff/:path*',                  destination: '/settings',           permanent: true },
      { source: '/trainers/:path*',               destination: '/settings',           permanent: true },
      { source: '/training/:path*',               destination: '/programs',           permanent: true },
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
