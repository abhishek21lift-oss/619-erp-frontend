/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  // Proxy /api/* to backend in development so relative fetch('/api/...') works.
  // In production, set NEXT_PUBLIC_API_URL to the deployed backend URL and use
  // the api lib (src/lib/api.ts) for all requests — this rewrite is dev-only.
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    // Don't proxy if the URL is a placeholder
    if (apiUrl.includes('your-619-api')) return [];
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
