/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    devtoolSegmentExplorer: false,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.168.62"],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:64003/api/:path*',
      },
    ];
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': __dirname,
    }
    return config
  },
}

export default nextConfig
