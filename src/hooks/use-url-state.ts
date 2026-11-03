"use client"

import { useCallback, useEffect, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

/**
 * Filtrlarni URL query parametrlarida saqlaydi (TZ 9.1: sahifa yangilanganda filtr yo‘qolmaydi).
 * `set({ q: "non", page: 1 })` — bo‘sh qiymatlar URL dan olib tashlanadi.
 */
export function useUrlState() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  // router.replace darhol qo‘llanmaydi: ketma-ket ikki set() bo‘lsa, ikkinchisi birinchisini yo‘qotmasligi
  // uchun hali URL’ga tushmagan oxirgi qiymat shu yerda saqlanadi
  const pending = useRef<string | null>(null)
  useEffect(() => {
    pending.current = null
  }, [params])

  const get = useCallback((key: string, fallback = "") => params.get(key) ?? fallback, [params])

  const set = useCallback(
    (patch: Record<string, string | number | null | undefined>) => {
      const sp = new URLSearchParams(pending.current ?? params.toString())
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === null || v === "") sp.delete(k)
        else sp.set(k, String(v))
      }
      const qs = sp.toString()
      pending.current = qs
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  /** Barcha parametrlarni oddiy obyekt sifatida (API query uchun). */
  const all = Object.fromEntries(params.entries())

  return { get, set, all }
}
