"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const KEY = "vaflo:hint:"

function readDismissed(id: string) {
  try {
    return localStorage.getItem(KEY + id) === "1"
  } catch {
    return true
  }
}

/**
 * Yangi funksiya haqida qorong‘i maslahat oynasi (bir marta ko‘rsatiladi, "Tushunarli" bilan yopiladi).
 * Faqat kompyuterda (md+) — telefonda joyni egallamaydi. Bolani (tugmani) o‘rab, ostida chiqadi.
 */
export function FeatureHint({
  id,
  title,
  children,
  align = "end",
  className,
  hint,
}: {
  id: string
  title: string
  /** Maslahat matni. */
  hint: React.ReactNode
  children: React.ReactNode
  align?: "start" | "end"
  className?: string
}) {
  // SSR va birinchi render’da yopiq — localStorage mountdan keyin o‘qiladi.
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setOpen(!readDismissed(id)), 600)
    return () => clearTimeout(t)
  }, [id])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(KEY + id, "1")
    } catch {}
  }

  // Escape bilan yopiladi.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Boshqa oyna (sheet/dialog) ochilsa, maslahat yopiladi (qayta ko‘rsatilmaydi).
  useEffect(() => {
    if (!open) return
    const sel = '[data-slot="sheet-content"], [role="dialog"][data-open], [data-slot="dialog-content"]'
    const check = () => {
      if (document.querySelector(sel)) dismiss()
    }
    const mo = new MutationObserver(check)
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-open"] })
    return () => mo.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <span className={cn("relative inline-flex", className)} onClickCapture={(e) => {
      if (open && !(e.target as HTMLElement).closest('[role="dialog"]')) dismiss()
    }}>
      {children}
      {open && (
        <span
          role="dialog"
          aria-label={title}
          className={cn(
            "absolute top-full z-30 mt-2.5 hidden w-64 rounded-lg bg-neutral-900 p-3 text-left text-white shadow-lg animate-in fade-in-0 slide-in-from-top-1 md:block dark:bg-neutral-100 dark:text-neutral-900",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          <span
            aria-hidden
            className={cn("absolute -top-1 size-2.5 rotate-45 bg-neutral-900 dark:bg-neutral-100", align === "end" ? "right-5" : "left-5")}
          />
          <span className="block text-sm font-semibold">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed opacity-75">{hint}</span>
          <span className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md bg-white/15 px-2.5 py-1 text-xs font-medium outline-none hover:bg-white/25 focus-visible:ring-2 focus-visible:ring-white/60 dark:bg-black/10 dark:hover:bg-black/15"
            >
              Tushunarli
            </button>
          </span>
        </span>
      )}
    </span>
  )
}
