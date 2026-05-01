/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Suppress hydration warnings from browser extensions
  // that inject attributes into the HTML
  compiler: { styledComponents: false },
}
module.exports = nextConfig
