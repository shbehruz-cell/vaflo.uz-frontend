import type { Metadata } from "next";
import { headers } from "next/headers";
import { connection } from "next/server";
import { Geist_Mono, Onest } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

// Onest: lotin va kirillda ekranda yaxshi o‘qiladi, raqamlari jadvalda tekis
const onest = Onest({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "VAFLO.UZ", template: "%s — VAFLO.UZ" },
  description: "VAFLO.UZ — POS, ombor, CRM va statistika boshqaruv paneli",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Har bir so‘rov dinamik render qilinadi: CSP nonce (src/proxy.ts) faqat shunda skriptlarga qo‘shiladi.
  await connection();
  // src/proxy.ts qo‘ygan nonce: Next o‘z skriptlariga o‘zi qo‘shadi, next-themes inline skriptiga qo‘lda uzatiladi
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${onest.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
