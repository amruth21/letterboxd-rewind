/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable Python serverless functions
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

module.exports = nextConfig
