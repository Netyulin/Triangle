/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.168.62"],
}

export default nextConfig
