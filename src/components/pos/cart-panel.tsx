"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CustomerPicker, type PickedCustomer } from "./customer-picker"
import { cartMath, isIntegerUnit, lineMath, sanitizeQty, som, type CartLine } from "./types"

export interface CartActions {
  setQty: (productId: string, qty: string) => void
  remove: (productId: string) => void
  clear: () => void
}

export function CartPanel({
  lines,
  actions,
  customer,
  onCustomer,
  onPay,
  onClose,
}: {
  lines: CartLine[]
  actions: CartActions
  customer: PickedCustomer | null
  onCustomer: (c: PickedCustomer | null) => void
  onPay: () => void
  /** Mobil pastki oynada: yopish tugmasi sarlavha qatoriga qo‘shiladi (tozalash bilan yopishib qolmasligi uchun). */
  onClose?: () => void
}) {
  const [confirmClear, setConfirmClear] = useState(false)
  const totals = cartMath(lines)

  const step = (l: CartLine, delta: number) => {
    const cur = Number(l.qty || 0)
    const next = Math.max(0, Math.round((cur + delta) * 1000) / 1000)
    if (next <= 0) return actions.remove(l.product.id)
    actions.setQty(l.product.id, String(next))
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      {/* Sarlavha: savat, tozalash, (mobilda) yopish */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-4 text-primary" /> Savat
          {lines.length > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary tabular-nums">{lines.length}</span>
          )}
        </h2>
        <div className="flex items-center gap-1">
          {lines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-muted-foreground hover:bg-destructive/10 hover:text-destructive lg:h-8"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 /> Tozalash
            </Button>
          )}
          {onClose && (
            <Button variant="ghost" size="icon" className="size-10" aria-label="Savatni yopish" onClick={onClose}>
              <X />
            </Button>
          )}
        </div>
      </div>

      <CustomerPicker value={customer} onChange={onCustomer} />

      {/* Mahsulotlar: bitta yuzada, ixcham qatorlar */}
      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            <ShoppingCart className="size-8 opacity-50" />
            Savat bo‘sh. Shtrix-kodni skanerlang yoki mahsulotni tanlang.
          </div>
        ) : (
          <ul className="divide-y rounded-xl border bg-card">
            {lines.map((l) => {
              const m = lineMath(l)
              const stock = l.product.qty != null ? Number(l.product.qty) : null
              const over = stock != null && Number(l.qty || 0) > stock
              const last = Number(l.qty || 0) <= 1
              return (
                <li key={l.product.id} className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="line-clamp-2 min-w-0 text-sm leading-snug font-medium">{l.product.name}</div>
                    <div className="shrink-0 pt-px text-sm font-semibold tabular-nums">{formatMoney(som(m.gross))}</div>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="min-w-0 text-xs tabular-nums">
                      <div className="truncate text-muted-foreground">
                        {formatMoney(l.product.salePrice)} / {UNIT_LABELS[l.product.unit]}
                      </div>
                      {over && (
                        <div className="truncate font-medium text-amber-700 dark:text-amber-300">
                          Omborda {formatQty(stock)} {UNIT_LABELS[l.product.unit]}
                        </div>
                      )}
                    </div>
                    {/* Miqdor: 1 da "−" o‘rnida savatdan olib tashlash */}
                    <div className="flex shrink-0 items-center rounded-xl border bg-background">
                      <button
                        type="button"
                        aria-label={last ? `${l.product.name} ni olib tashlash` : "Kamaytirish"}
                        onClick={() => step(l, -1)}
                        className={cn(
                          "flex size-10 items-center justify-center rounded-l-xl outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:size-8",
                          last ? "text-destructive" : "text-foreground",
                        )}
                      >
                        {last ? <Trash2 className="size-4" /> : <Minus className="size-4" />}
                      </button>
                      <input
                        inputMode={isIntegerUnit(l.product.unit) ? "numeric" : "decimal"}
                        aria-label={`${l.product.name}: miqdor`}
                        className="h-10 w-12 border-x bg-transparent text-center text-sm font-semibold tabular-nums outline-none focus-visible:bg-muted/50 lg:h-8"
                        value={l.qty}
                        onChange={(e) => actions.setQty(l.product.id, sanitizeQty(e.target.value, l.product.unit))}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button
                        type="button"
                        aria-label="Ko‘paytirish"
                        onClick={() => step(l, 1)}
                        className="flex size-10 items-center justify-center rounded-r-xl text-foreground outline-none active:bg-muted focus-visible:ring-2 focus-visible:ring-ring lg:size-8"
                      >
                        <Plus className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Hisob: kompyuterda chek ko‘rinishi, telefonda ixcham qator */}
      <div className="shrink-0">
        <div className="receipt hidden px-4 pt-4 text-sm lg:block">
          <div className="flex justify-between text-muted-foreground">
            <span>Oraliq summa</span>
            <span className="tabular-nums">{formatMoney(som(totals.subtotal))}</span>
          </div>
          {totals.discount > 0 && (
            <div className="mt-1.5 flex justify-between text-primary">
              <span>Chegirma</span>
              <span className="tabular-nums">−{formatMoney(som(totals.discount))}</span>
            </div>
          )}
          <hr className="receipt-rule my-3" />
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-medium">Jami</span>
            <span className="text-3xl font-bold tracking-tight tabular-nums">{formatMoney(som(totals.total))}</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-1 text-sm lg:hidden">
          <span className="text-muted-foreground tabular-nums">
            {lines.length} ta mahsulot
          </span>
          {totals.discount > 0 && <span className="text-primary tabular-nums">Chegirma −{formatMoney(som(totals.discount))}</span>}
        </div>

        <Button size="lg" className="mt-2.5 h-14 w-full justify-between rounded-xl px-5 text-base lg:mt-3 lg:h-12" disabled={!totals.valid} onClick={onPay}>
          <span className="flex items-center gap-2">
            To‘lash
            <Kbd className="hidden bg-primary-foreground/20 text-primary-foreground pointer-fine:inline-flex">F9</Kbd>
          </span>
          <span className="text-lg font-bold tabular-nums lg:text-base">{formatMoney(som(totals.total))}</span>
        </Button>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Savat tozalansinmi?</AlertDialogTitle>
            <AlertDialogDescription>Savatdagi barcha mahsulotlar olib tashlanadi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                actions.clear()
                setConfirmClear(false)
              }}
            >
              Tozalash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
