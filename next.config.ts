import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone-сборка нужна для Docker и собственного сервера.
  // На Vercel её отключаем — платформа собирает приложение по-своему.
  output: process.env.VERCEL ? undefined : "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
