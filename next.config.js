/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Privy optional peer deps we don't use — stub them out so webpack doesn't error
    config.resolve.alias = {
      ...config.resolve.alias,
      '@farcaster/mini-app-solana': false,
      '@farcaster/frame-core': false,
      '@farcaster/core': false,
      '@particle-network/aa': false,
    }
    return config
  },
}

module.exports = nextConfig
