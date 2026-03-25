import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    // Use API_BASE_URL env var (server-side only); fallback to localhost for development
    const backendUrl = process.env.API_BASE_URL || "http://localhost:8000";
    
    return [
      {
        // Any request to /api/:path* gets forwarded to FastAPI
        // Local dev: /api/books → localhost:8000/books (same origin, no CORS)
        // Vercel: /api/books → https://render.com/books (requires CORS on backend)
        source: "/api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
