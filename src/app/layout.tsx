import type { Metadata } from "next";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={`${onest.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
