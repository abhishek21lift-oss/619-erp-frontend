/** @type {import('next').NextConfig} */

/**
 * Issue #14 FIX — Route-scoped CSP for face-api.js (unsafe-eval on /checkin only)
 *
 * ROOT CAUSE:
 *   face-api.js / TensorFlow.js WebGL backend uses Function() constructors
 *   internally, which requires 'unsafe-eval' in the script-src CSP directive.
 *   Adding 'unsafe-eval' globally weakens the CSP for every page.
 *
 * FIX:
 *   We match ONLY the routes that use face-api.js with a relaxed CSP and keep
 *   the strict policy everywhere else. Next.js applies `headers()` rules in order
 *   — the first matching source wins.
 *
 *   Relaxed paths: /checkin, /checkin/*, /clients/[id]/biometric
 *   All other routes keep the strict policy.
 *
 * WEBPACK FIX (May 2026):
 *   - Added client-side fs:false fallback to suppress the
 *     "Module not found: Can't resolve 'fs'" warning from face-api.js
 *     during the browser bundle compilation step.
 *   - Added serverExternalPackages (Next.js 15 native API) so the RSC
 *     bundler never attempts to include face-api.js / TensorFlow in the
 *     server bundle — this is the primary fix for the Vercel build warning.
 */

const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob:",
  "worker-src blob:",
  "frame-ancestors 'none'",
].join('; ');

// Relaxed — adds unsafe-eval needed by TensorFlow.js WebGL backend
const CHECKIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob:",
  "worker-src blob:",
  "frame-ancestors 'none'",
].join('; ');

const BASE_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,

  // ── Build: skip TypeScript type-check errors & ESLint during Vercel build ──
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // ── Next.js 15: tell the RSC/server bundler to treat these as external ──────
  // PRIMARY FIX for "Module not found: Can't resolve 'fs'" Vercel warning.
  // face-api.js + TensorFlow are browser-only packages; they must never be
  // included in the server (RSC/SSR) bundle. serverExternalPackages is the
  // correct Next.js 15 API (replaces experimental.serverComponentsExternalPackages).
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
  },

  // Webpack: defense-in-depth — keep both the fs:false client fallback and
  // the server externals even though serverExternalPackages handles the main case.
  webpack(config, { isServer }) {
    // Client-side: tell the browser bundler these Node built-ins don't exist
    if (!isServer) {
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Server-side: belt-and-suspenders — exclude from SSR webpack bundle too
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
    return [
      // ── Relaxed CSP: /checkin routes ────────────────────────────────────
      {
        source: '/checkin',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: CHECKIN_CSP },
        ],
      },
      {
        source: '/checkin/(.*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: CHECKIN_CSP },
        ],
      },
      // ── Relaxed CSP: biometric enrollment page (uses face-api.js) ───────
      {
        source: '/clients/:id/biometric',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: CHECKIN_CSP },
        ],
      },
      // ── All other routes: strict CSP (no unsafe-eval) ────────────────────
      {
        source: '/(.*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: STRICT_CSP },
        ],
      },
      // Static model files: long-lived immutable cache
      {
        source: '/models/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/face-models/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const passThrough = [
      { source: '/models/:path*', destination: '/models/:path*' },
    ];
    if (!apiUrl || apiUrl.includes('your-619-api') || apiUrl.includes('localhost')) {
      return passThrough;
    }
    return [
      ...passThrough,
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
    ];
  },
};

module.exports = nextConfig;
