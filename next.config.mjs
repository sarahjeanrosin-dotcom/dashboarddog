/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Konva/react-konva are browser-only; prevent server-side canvas resolution
    config.resolve.alias = { ...config.resolve.alias, canvas: false }
    return config
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
}

export default nextConfig
