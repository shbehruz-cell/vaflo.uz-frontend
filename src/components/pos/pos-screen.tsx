"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ChevronUp, Clock, Search, Store, User } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { EmptyState, ErrorState } from "@/components/app/states"
import { api, ApiError, type Paginated } from "@/lib/api"
import { formatDateTime, formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CartPanel, type CartActions } from "./cart-panel"
import type { PickedCustomer } from "./customer-picker"
import { PaymentDialog } from "./payment-dialog"
import { ReceiptDialog } from "./receipt-dialog"
import {
  applyCartDiscount,
  cartMath,
  NO_DISCOUNT,
  som,
  type CartDiscount,
  type CartLine,
  type PosProduct,
  type Receipt,
  type ShiftDetail,
} from "./types"
import { useRegisters } from "./use-current-shift"
import { uuid } from "@/lib/uuid"

export function PosScreen({ shift }: { shift: ShiftDetail }) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState("")
  const [dq, setDq] = useState("")
  const [lines, setLines] = useState<CartLine[]>([])
  const [customer, setCustomer] = useState<PickedCustomer | null>(null)
  const [discount, setDiscount] = useState<CartDiscount>(NO_DISCOUNT)
  const [payOpen, setPayOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [receipt, setReceipt] = useState<Receipt | null>(null)
  const keyRef = useRef<{ sig: string; key: string } | null>(null)

  const registers = useRegisters()
  const warehouseId = registers.data?.find((r) => r.id === shift.registerId)?.warehouseId

  useEffect(() => {
    const t = setTimeout(() => setDq(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const products = useQuery({
    queryKey: ["pos-products", dq, warehouseId],
    queryFn: () => api.get<Paginated<PosProduct>>("/products", { q: dq, isActive: true, pageSize: 24, warehouseId }),
    enabled: registers.isSuccess || registers.isError,
    placeholderData: (prev) => prev,
  })

  const focusSearch = useCallback(() => {
    searchRef.current?.focus()
    searchRef.current?.select()
  }, [])

  const addProduct = useCallback((p: PosProduct) => {
    if (p.qty != null && Number(p.qty) <= 0) {
      toast.error(`"${p.name}" — qoldiq yo‘q`)
      return
    }
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id)
      if (i < 0) return [...prev, { product: p, qty: "1", discount: "" }]
      return prev.map((l, j) => (j === i ? { ...l, product: p, qty: String(Math.round((Number(l.qty || 0) + 1) * 1000) / 1000) } : l))
    })
  }, [])

  const onEnter = async () => {
    const code = q.trim()
    if (!code) return
    try {
      const p = await api.get<PosProduct>("/products/lookup", { barcode: code, warehouseId })
      addProduct(p)
      setQ("")
      setDq("")
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setDq(code) // nom bo‘yicha qidiruv natijalari ko‘rsatiladi
      } else {
        toast.error(e instanceof ApiError ? e.message : "Qidirishda xatolik")
      }
    }
    searchRef.current?.focus()
  }

  const actions: CartActions = useMemo(
    () => ({
      setQty: (id, qty) => setLines((p) => p.map((l) => (l.product.id === id ? { ...l, qty } : l))),
      remove: (id) => setLines((p) => p.filter((l) => l.product.id !== id)),
      clear: () => {
        setLines([])
        setCustomer(null)
        setDiscount(NO_DISCOUNT)
        keyRef.current = null
        focusSearch()
      },
    }),
    [focusSearch],
  )

  // Umumiy chegirma qatorlarga taqsimlangan holda — savat, to‘lov va backendga shu yuboriladi
  const pricedLines = useMemo(() => applyCartDiscount(lines, discount), [lines, discount])
  const totals = cartMath(pricedLines)
  const itemCount = lines.length

  const openPay = useCallback(() => {
    if (!cartMath(pricedLines).valid) {
      toast.error("Savatdagi miqdorlarni tekshiring")
      return
    }
    setSheetOpen(false)
    setPayOpen(true)
  }, [pricedLines])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault()
        focusSearch()
      } else if (e.key === "F9") {
        e.preventDefault()
        if (!receipt && !payOpen) openPay()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [focusSearch, openPay, receipt, payOpen])

  // Bir to‘lov urinishi uchun bitta idempotencyKey; savat o‘zgarsa yangisi.
  const getKey = () => {
    const sig = JSON.stringify([customer?.id, pricedLines.map((l) => [l.product.id, l.qty, l.discount])])
    if (!keyRef.current || keyRef.current.sig !== sig) keyRef.current = { sig, key: uuid() }
    return keyRef.current.key
  }

  const newSale = () => {
    setReceipt(null)
    setPayOpen(false)
    setLines([])
    setCustomer(null)
    setDiscount(NO_DISCOUNT)
    keyRef.current = null
    setQ("")
    setDq("")
    products.refetch()
    setTimeout(focusSearch, 50)
  }

  return (
    // Desktopda POS ekran balandligiga sig‘adi (header 3.5rem + sahifa paddingi 3rem): sahifa scroll bo‘lmaydi,
    // faqat mahsulotlar ro‘yxati ichida scroll — savat doim joyida turadi.
    <div className="flex flex-1 flex-col gap-4 pb-20 lg:h-[calc(100svh-6.5rem)] lg:min-h-0 lg:flex-none lg:pb-0">
      {/* Smena qatori */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5 font-medium text-foreground">
          <Store className="size-4" /> {shift.register?.name ?? "Kassa"}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="size-4" /> Smena: {formatDateTime(shift.openedAt)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <User className="size-4" /> {shift.cashierName ?? "Kassir"}
        </span>
        <Link href="/shifts" className="ml-auto flex min-h-10 items-center text-foreground underline-offset-4 hover:underline">
          Smena sahifasi
        </Link>
      </div>

      <div className="grid flex-1 items-start gap-4 lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_400px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
        {/* Chap: qidiruv (joyida) + mahsulotlar (ichki scroll) */}
        <div className="flex min-w-0 flex-col gap-3 lg:min-h-0">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchRef}
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  void onEnter()
                }
              }}
              placeholder="Shtrix-kod yoki nom bo‘yicha qidirish"
              aria-label="Mahsulot qidirish"
              autoComplete="off"
              className="h-12 pr-12 pl-9 text-base"
            />
            <Kbd className="absolute top-1/2 right-3 -translate-y-1/2">F2</Kbd>
          </div>

          <div className="lg:-mx-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:px-1 lg:pb-1">
            {products.isError ? (
              <ErrorState error={products.error} onRetry={() => products.refetch()} />
            ) : products.isLoading || !products.data ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className="h-28 rounded-lg" />
                ))}
              </div>
            ) : products.data.items.length === 0 ? (
              <EmptyState title="Mahsulot topilmadi" description="Boshqa nom yoki shtrix-kod bilan urinib ko‘ring." />
            ) : (
              <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4", products.isPlaceholderData && "opacity-70")}>
                {products.data.items.map((p) => {
                  const out = p.qty != null && Number(p.qty) <= 0
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={out}
                      onClick={() => {
                        addProduct(p)
                        focusSearch()
                      }}
                      className="flex min-h-28 flex-col justify-between gap-2 rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:border-dashed disabled:bg-muted/40 disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-muted/40"
                    >
                      <span className="line-clamp-2 text-sm leading-snug font-medium">{p.name}</span>
                      <span>
                        <span className="block text-base font-bold tabular-nums">
                          {formatMoney(p.salePrice)}
                          <span className="text-xs font-normal text-muted-foreground"> / {UNIT_LABELS[p.unit]}</span>
                        </span>
                        {out ? (
                          <span className="text-xs text-muted-foreground">Qoldiq yo‘q</span>
                        ) : (
                          p.qty != null && (
                            <span className="text-xs text-muted-foreground tabular-nums">
                              Qoldiq: {formatQty(p.qty)} {UNIT_LABELS[p.unit]}
                            </span>
                          )
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* O‘ng: savat (desktop) — ekranga qotirilgan, butun balandlik */}
        <aside className="hidden min-h-0 rounded-2xl border bg-card p-3 lg:block">
          <CartPanel
            lines={pricedLines}
            actions={actions}
            customer={customer}
            onCustomer={setCustomer}
            onPay={openPay}
          />
        </aside>
      </div>

      {/* Mobil: pastki panel */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur lg:hidden">
        <Button className="h-12 w-full justify-between text-base" onClick={() => setSheetOpen(true)}>
          <span className="flex items-center gap-2">
            <ChevronUp /> Savat ({itemCount})
          </span>
          <span className="tabular-nums">{formatMoney(som(totals.total))}</span>
        </Button>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="h-[88svh] p-3 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>Savat</SheetTitle>
            <SheetDescription>Savatdagi mahsulotlar va to‘lov</SheetDescription>
          </SheetHeader>
          <CartPanel
            lines={pricedLines}
            actions={actions}
            customer={customer}
            onCustomer={setCustomer}
            onPay={openPay}
          />
        </SheetContent>
      </Sheet>

      <PaymentDialog
        open={payOpen}
        onOpenChange={(o) => {
          setPayOpen(o)
          if (!o) setTimeout(focusSearch, 50)
        }}
        lines={pricedLines}
        baseLines={lines}
        discount={discount}
        onDiscount={setDiscount}
        customer={customer}
        getIdempotencyKey={getKey}
        onSuccess={(r) => {
          setPayOpen(false)
          setReceipt(r)
        }}
      />
      <ReceiptDialog receipt={receipt} onNewSale={newSale} />
    </div>
  )
}
