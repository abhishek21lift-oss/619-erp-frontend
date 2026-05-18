/** @type {import('next').NextConfig} */

// ─── Security headers applied at the Next.js layer so they work on
//     ANY host (Docker VPS, Railway, Render) not just Vercel.
const SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-XSS-Protection',          value: '1; mode=block' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy',        value: 'camera=(self), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy',
    // unsafe-eval removed — face-api uses WebGL workers via blob: URLs, not eval.
    // unsafe-inline kept for Next.js inline styles/scripts (React 18 requirement).
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https: wss:",
      "media-src 'self' blob:",
      "worker-src blob:",
      "frame-ancestors 'none'",
    ].join('; '),
  },
];

const nextConfig = {
  // Required for Docker: generates .next/standalone + server.js
  output: 'standalone',

  reactStrictMode: true,
  poweredByHeader: false,

  experimental: {
    // Reduce bundle size by tree-shaking these packages at the import level.
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

  // ── Webpack: exclude face-api.js + TensorFlow from server bundle ──
  // These libraries use browser-only globals (HTMLCanvasElement, WebGL).
  // The checkin page is already guarded with next/dynamic + ssr:false,
  // but explicitly marking them external prevents any accidental SSR
  // evaluation if a new page forgets the guard.
  webpack(config, { isServer }) {
    if (isServer) {
      const externals = Array.isArray(config.externals)
        ? config.externals
        : config.externals
        ? [config.externals]
        : [];
      config.externals = [
        ...externals,
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
      { source: '/(.*)', headers: SECURITY_HEADERS },
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

  // Proxy /api/* to backend in development so relative fetch('/api/...') works.
  // In production set NEXT_PUBLIC_API_URL to the deployed backend — the rewrites
  // function reads the env var at REQUEST time, not at build time.
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
