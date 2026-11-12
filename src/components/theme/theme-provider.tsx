"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"

/** `nonce` — CSP (src/proxy.ts): next-themes mavzuni flicker’siz qo‘llash uchun inline skript qo‘yadi. */
export function ThemeProvider({ children, nonce }: { children: React.ReactNode; nonce?: string }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange nonce={nonce}>
      {children}
    </NextThemesProvider>
  )
}
