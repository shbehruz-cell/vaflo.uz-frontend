/**
 * Ilova serverda `/app` yo‘li ostida ishlaydi (landing `/` da). `next/link` va router buni o‘zi qo‘shadi,
 * lekin statik rasm yo‘llariga (`/logo.png`, `/cards/...`) qo‘lda qo‘shish kerak.
 * Lokal ishlashda BASE_PATH bo‘sh — yo‘llar o‘zgarmaydi.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

export const withBase = (path: string) => `${BASE_PATH}${path}`
