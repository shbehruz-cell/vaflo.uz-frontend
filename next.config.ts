import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:4000";
// Serverda ilova `/app` ostida (landing `/` da): BASE_PATH=/app bilan build qilinadi. Lokal — bo‘sh.
const BASE_PATH = process.env.BASE_PATH || undefined;

/** Barcha javoblarga qo‘shiladigan xavfsizlik sarlavhalari (CSP esa `src/proxy.ts` da, har so‘rovga nonce bilan). */
const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Brauzer faqat HTTPS ulanishda e’tiborga oladi; HTTP (faqat IP) serverda zararsiz
  { key: "Strict-Transport-Security", value: "max-age=15552000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  basePath: BASE_PATH,
  // Server versiyasini oshkor qilmaslik
  poweredByHeader: false,
  env: { NEXT_PUBLIC_BASE_PATH: BASE_PATH ?? "" },
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
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
