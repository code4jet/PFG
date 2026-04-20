/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["192.168.1.5"],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pkhnrjzeurwcribncphu.supabase.co",
      },
    ],
  },
}

export default nextConfig
