/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Python serverless functions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // Allow external images from Letterboxd
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'a.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: '*.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: 'letterboxd.com',
      },
    ],
  },
}

module.exports = nextConfig
