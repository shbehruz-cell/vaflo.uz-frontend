import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  // `npm run dev` ni bir xil Wi-Fi dagi telefon/planshetdan ochish uchun (IP o‘zgarsa yangilang)
  allowedDevOrigins: ["10.10.2.58", "192.168.0.107"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Brauzer API ga same-origin murojaat qiladi: refresh cookie (httpOnly) shu tarzda ishlaydi, CORS kerak emas.
  async rewrites() {
    return [{ source: "/api/v1/:path*", destination: `${BACKEND_URL}/api/v1/:path*` }];
  },
};

export default nextConfig;
