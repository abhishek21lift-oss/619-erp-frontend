/** @type {import('next').NextConfig} */

const IS_PROD = process.env.NODE_ENV === 'production';

const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "media-src 'self' blob:",
  "worker-src blob:",
  "frame-ancestors 'none'",
].join('; ');

const CHECKIN_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com",
  "font-src 'self' https://fonts.gstatic.com https://api.fontshare.com",
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
    return [
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
      {
        source: '/clients/:id/biometric',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: CHECKIN_CSP },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          ...BASE_SECURITY_HEADERS,
          { key: 'Content-Security-Policy', value: STRICT_CSP },
        ],
      },
      {
        source: '/models/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
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
