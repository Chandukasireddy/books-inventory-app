import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        // Any request to /api/:path* gets forwarded to FastAPI
        // Browser → localhost:3000/api/books → localhost:8000/books
        // Same origin = no CORS at all.
        source: "/api/:path*",
        destination: "http://localhost:8000/:path*",
      },
    ];
  },
};

export default nextConfig;
