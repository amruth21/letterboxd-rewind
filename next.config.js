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
        hostname: 's.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: '*.ltrbxd.com',
      },
      {
        protocol: 'https',
        hostname: 'letterboxd.com',
      },
      {
        protocol: 'https',
        hostname: '*.amazonaws.com',
      },
    ],
  },
}

module.exports = nextConfig
