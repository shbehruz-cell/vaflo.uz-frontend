import { NextRequest, NextResponse } from "next/server"

/**
 * Har bir sahifa so‘roviga nonce asosidagi Content-Security-Policy qo‘yadi (XSS, clickjacking,
 * begona skript yuklashga qarshi). Next.js nonce’ni CSP sarlavhasidan o‘zi o‘qiydi va o‘z
 * skriptlariga qo‘shadi; buning uchun sahifalar dinamik render qilinadi (`app/layout.tsx` → `connection()`).
 *
 * `style-src 'unsafe-inline'`: Tailwind/recharts/sidebar inline `style=` atributlardan foydalanadi;
 * style orqali hujum yuzasi juda kichik, skriptlar esa qat’iy (nonce + strict-dynamic).
 */
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64")
  const isDev = process.env.NODE_ENV === "development"
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'" + (isDev ? " ws: wss:" : ""),
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-nonce", nonce)
  requestHeaders.set("Content-Security-Policy", csp)

  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set("Content-Security-Policy", csp)
  return response
}

export const config = {
  matcher: [
    {
      // API rewrite, Next statikasi va ikonkalar bundan tashqari; prefetch so‘rovlarga ham kerak emas
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|logo.png|cards/|auth/).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
}
