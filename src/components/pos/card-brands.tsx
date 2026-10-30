"use client"

import { useState } from "react"
import { CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

export type CardType = "UZCARD" | "HUMO" | "VISA" | "MASTERCARD" | "UNIONPAY" | "OTHER"

export const CARD_TYPES: { value: CardType; label: string }[] = [
  { value: "UZCARD", label: "Uzcard" },
  { value: "HUMO", label: "Humo" },
  { value: "VISA", label: "Visa" },
  { value: "MASTERCARD", label: "Mastercard" },
  { value: "UNIONPAY", label: "UnionPay" },
  { value: "OTHER", label: "Boshqa" },
]

export const CARD_TYPE_LABELS: Record<string, string> = Object.fromEntries(CARD_TYPES.map((c) => [c.value, c.label]))

/**
 * Rasmiy logo fayllari: `public/cards/<nom>.svg` (yoki .png) qo‘yilsa, avtomatik ishlatiladi.
 * Fayl bo‘lmasa — soxta logo o‘rniga brend nomi yozilgan neytral plitka chiqadi.
 */
// Manbalar (2026-10-29): uzcard.uz sayti logotipi (SVG), humocard.uz sayti logotipi,
// UnionPay International brend markazi — asosiy inglizcha logotip (y-25).
const LOGO_FILES: Partial<Record<CardType, string[]>> = {
  UZCARD: ["/cards/uzcard.svg", "/cards/uzcard.png"],
  HUMO: ["/cards/humo.png", "/cards/humo.svg"],
  UNIONPAY: ["/cards/unionpay.png", "/cards/unionpay.svg"],
}

const tile = "flex h-7 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10"

/** Visa — 2021-yildan joriy tekis belgi (Visa Blue #1434CB). Manba: simple-icons (CC0), Visa brand assets. */
function VisaMark({ className }: { className?: string }) {
  return (
    <span className={cn(tile, className)}>
      <svg viewBox="0 0 24 24" className="h-[70%] w-auto" aria-hidden="true">
        <path
          fill="#1434CB"
          d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"
        />
      </svg>
    </span>
  )
}

/** Mastercard — 2019-yildan joriy belgi: yozuvsiz ikki doira (#EB001B, #F79E1B, kesishma #FF5F00). */
function MastercardMark({ className }: { className?: string }) {
  return (
    <span className={cn(tile, className)}>
      <svg viewBox="0 0 32 20" className="h-[72%] w-auto" aria-hidden="true">
        <circle cx="10" cy="10" r="10" fill="#EB001B" />
        <circle cx="22" cy="10" r="10" fill="#F79E1B" />
        <path d="M16 2a10 10 0 0 1 0 16a10 10 0 0 1 0-16z" fill="#FF5F00" />
      </svg>
    </span>
  )
}

/** Rasmiy fayl bo‘lsa — rasm; bo‘lmasa — brend nomi bilan neytral plitka. */
function FileMark({ type, label, className }: { type: CardType; label: string; className?: string }) {
  const files = LOGO_FILES[type] ?? []
  const [idx, setIdx] = useState(0)
  const src = files[idx]

  if (!src) {
    return (
      <span className={cn(tile, "px-1 text-[8px] font-bold tracking-tight text-slate-700", className)}>
        {label.toUpperCase()}
      </span>
    )
  }
  return (
    <span className={cn(tile, "p-0.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- kichik statik logo, optimizatsiya kerak emas */}
      <img src={src} alt="" className="max-h-full max-w-full object-contain" onError={() => setIdx((i) => i + 1)} />
    </span>
  )
}

export function CardBrandMark({ type, className }: { type: CardType; className?: string }) {
  switch (type) {
    case "VISA":
      return <VisaMark className={className} />
    case "MASTERCARD":
      return <MastercardMark className={className} />
    case "OTHER":
      return (
        <span className={cn(tile, "bg-muted text-muted-foreground", className)}>
          <CreditCard className="size-4" />
        </span>
      )
    default:
      return <FileMark type={type} label={CARD_TYPE_LABELS[type] ?? type} className={className} />
  }
}
