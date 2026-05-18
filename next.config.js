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
 *   We match ONLY the /checkin route with a relaxed CSP and keep the strict
 *   policy everywhere else. Next.js applies `headers()` rules in order — the
 *   first matching source wins.
 *
 *   /checkin gets: script-src 'self' 'unsafe-inline' 'unsafe-eval'
 *   All other routes keep:  script-src 'self' 'unsafe-inline'
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

  // Exclude face-api.js + TensorFlow from the SSR bundle.
  // Defense-in-depth alongside the next/dynamic ssr:false guard on /checkin.
  webpack(config, { isServer }) {
    if (isServer) {
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...existing,
        'face-api.js',
        '@tensorflow/tfjs',
        '@tensorflow/tfjs-core',
        '@tensorflow/tfjs-backend-webgl',
        '@tensorflow/tfjs-backend-cpu',
        'canvas',
      ];
    }
    return config;
  },

  async headers() {
    return [
      // ── /checkin route: relaxed CSP with unsafe-eval for TF.js ──
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
      // ── All other routes: strict CSP (no unsafe-eval) ──
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
