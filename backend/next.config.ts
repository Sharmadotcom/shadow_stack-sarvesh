import type { NextConfig } from "next";

const allowedOrigins = [
  "http://localhost:5173", // Vite default
  "http://localhost:3001", // CRA / alternate dev
  "http://localhost:4000",
  process.env.FRONTEND_URL ?? "",
].filter(Boolean);

const nextConfig: NextConfig = {
  // Disable the X-Powered-By header
  poweredByHeader: false,

  // CORS headers for all API routes
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: allowedOrigins.join(", ") || "*",
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET, POST, PATCH, PUT, DELETE, OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, X-Requested-With",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
      // Serve uploaded attachments
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
