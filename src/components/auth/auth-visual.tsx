import Image from "next/image"
import { withBase } from "@/lib/base-path"

/**
 * Kirish sahifalarining chap tomonidagi fotosurat (faqat kompyuterda, lg+). Telefonda ko‘rsatilmaydi —
 * joy va ekran klaviaturasi uchun.
 * Rasm tayyor bo‘lgach: faylni `public/auth/` ga qo‘yib, shu yo‘lni yozing (masalan "/auth/store.jpg").
 * `null` — panel yo‘q, sahifa bitta ustunda.
 */
export const AUTH_PHOTO_SRC: string | null = "/auth/pos-checkout.webp"

export function AuthPhoto() {
  if (!AUTH_PHOTO_SRC) return null
  return (
    <aside aria-hidden className="relative hidden overflow-hidden bg-muted lg:sticky lg:top-0 lg:block lg:h-svh">
      <Image src={withBase(AUTH_PHOTO_SRC)} alt="" fill priority sizes="45vw" className="object-cover" />
      {/* Pastdagi matn o‘qilishi uchun yumshoq qoraytirish */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <p className="absolute inset-x-10 bottom-10 max-w-sm text-lg font-medium leading-snug text-white">
        Do‘kon, kassa va ombor — bitta joyda.
      </p>
    </aside>
  )
}
