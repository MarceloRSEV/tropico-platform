import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "tropico.escaladavirtual.com.br",
        "*.vercel.app",
      ],
    },
  },
};

export default nextConfig;
