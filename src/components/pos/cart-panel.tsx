"use client"

import { useState } from "react"
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingCart className="size-4 text-primary" /> Savat
          <span className="text-sm font-normal text-muted-foreground">({lines.length})</span>
        </h2>
        <div className="flex items-center gap-1">
          {lines.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-10 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-8"
              onClick={() => setConfirmClear(true)}
            >
              <Trash2 /> Tozalash
            </Button>
          )}
          {onClose && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px bg-border" />
              <Button variant="ghost" size="icon" className="size-10" aria-label="Savatni yopish" onClick={onClose}>
                <X />
              </Button>
            </>
          )}
        </div>
      </div>

      <CustomerPicker value={customer} onChange={onCustomer} />

      <div className="-mx-1 min-h-0 flex-1 space-y-2 overflow-y-auto px-1">
        {lines.length === 0 ? (
          <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            <ShoppingCart className="size-8 opacity-50" />
            Savat bo‘sh. Shtrix-kodni skanerlang yoki mahsulotni tanlang.
          </div>
        ) : (
          lines.map((l) => {
            const m = lineMath(l)
            const stock = l.product.qty != null ? Number(l.product.qty) : null
            const over = stock != null && Number(l.qty || 0) > stock
            return (
              <div key={l.product.id} className="rounded-lg border bg-card p-3 lg:p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{l.product.name}</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {formatMoney(l.product.salePrice)} / {UNIT_LABELS[l.product.unit]}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mt-1 -mr-1 size-10 shrink-0 text-muted-foreground hover:text-destructive lg:size-8"
                    aria-label={`${l.product.name} ni olib tashlash`}
                    onClick={() => actions.remove(l.product.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 lg:mt-2">
                  <div className="flex items-center gap-1.5 lg:gap-1">
                    <Button variant="outline" size="icon" className="size-11 lg:size-9" aria-label="Kamaytirish" onClick={() => step(l, -1)}>
                      <Minus />
                    </Button>
                    <Input
                      inputMode={isIntegerUnit(l.product.unit) ? "numeric" : "decimal"}
                      aria-label="Miqdor"
                      className="h-11 w-16 text-center tabular-nums lg:h-9"
                      value={l.qty}
                      onChange={(e) => actions.setQty(l.product.id, sanitizeQty(e.target.value, l.product.unit))}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                    <Button variant="outline" size="icon" className="size-11 lg:size-9" aria-label="Ko‘paytirish" onClick={() => step(l, 1)}>
                      <Plus />
                    </Button>
                    <span className="ml-1 text-xs text-muted-foreground">{UNIT_LABELS[l.product.unit]}</span>
                  </div>
                  <div className="text-right text-base font-semibold tabular-nums lg:text-sm">{formatMoney(som(m.gross))}</div>
                </div>
                {over && (
                  <p className="mt-2 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs text-amber-700 dark:text-amber-300">
                    Qoldiqdan ko‘p: omborda {formatQty(stock)} {UNIT_LABELS[l.product.unit]}
                  </p>
                )}
              </div>
            )
          })
        )}
      </div>

      <div>
        <div className="receipt px-4 pt-4 text-sm">
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
            <span className="text-2xl font-bold tracking-tight tabular-nums lg:text-3xl">{formatMoney(som(totals.total))}</span>
          </div>
        </div>
        <Button size="lg" className="mt-3 h-12 w-full text-base" disabled={!totals.valid} onClick={onPay}>
          To‘lovga o‘tish <Kbd className="ml-1 hidden bg-primary-foreground/20 text-primary-foreground pointer-fine:inline-flex">F9</Kbd>
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
