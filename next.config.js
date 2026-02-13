/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Disable telemetry to fix Node.js 25 compatibility issue
  telemetry: false,
  // For product card in carousel example
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'img.chewy.com',
        port: '',
        pathname: '/is/catalog/**',
      },
    ],
  },
}

module.exports = nextConfig;
