"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronsUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api, type Paginated } from "@/lib/api"
import { formatQty, UNIT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface Product {
  id: string
  name: string
  sku: string | null
  unit: string
  salePrice: string
  costPrice?: string
  minStock: string
  isActive: boolean
  categoryId: string | null
  category: { id: string; name: string } | null
  barcodes: { id: string; value: string }[]
  qty: string
  warehouseId?: string | null
}

export interface Category {
  id: string
  name: string
  _count?: { products: number }
}

export interface Warehouse {
  id: string
  name: string
}

export interface Movement {
  id: string
  type: string
  qty: string
  balanceAfter: string
  reason: string | null
  referenceType: string | null
  createdAt: string
  product: { name: string; sku: string | null; unit: string }
  warehouse: { name: string }
}

export const MOVEMENT_LABELS: Record<string, string> = {
  PURCHASE_IN: "Xarid kirimi",
  SALE_OUT: "Sotuv",
  REFUND_IN: "Qaytarish",
  ADJUSTMENT: "Tuzatish",
  TRANSFER_IN: "Ko‘chirish (kirim)",
  TRANSFER_OUT: "Ko‘chirish (chiqim)",
  WRITE_OFF: "Hisobdan chiqarish",
}

export const REFERENCE_LABELS: Record<string, string> = {
  Sale: "Sotuv",
  Refund: "Qaytarish",
  Adjustment: "Qoldiq tuzatish",
  ProductCreate: "Mahsulot yaratildi",
  ProductImport: "Import",
}

export const NATIVE_SELECT =
  "h-10 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"

export const WARN_BADGE = "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-300"

/** Ro‘yxat sahifalari uchun umumiy uslublar (mahsulotlar, harakatlar, sotuvlar, xaridorlar). */
export const TOOLBAR_CARD = "rounded-2xl border bg-card p-3"
export const TABLE_CARD = "overflow-hidden rounded-xl border bg-card"
export const THEAD = "bg-muted/40 [&_th]:h-9 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th_svg]:size-3.5 [&_th_svg]:opacity-70 [&_tr]:hover:bg-transparent"
export const TROW = "h-11"

export function MovementBadge({ type }: { type: string }) {
  return (
    <Badge variant="secondary" className={type === "WRITE_OFF" ? WARN_BADGE : undefined}>
      {MOVEMENT_LABELS[type] ?? type}
    </Badge>
  )
}

export function useWarehouses() {
  return useQuery({ queryKey: ["warehouses"], queryFn: () => api.get<Warehouse[]>("/warehouses"), staleTime: 60_000 })
}

export function useCategories(enabled = true) {
  return useQuery({ queryKey: ["categories"], queryFn: () => api.get<Category[]>("/categories"), staleTime: 30_000, enabled })
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Mahsulot qidiruvi (Command + server qidiruvi). */
export function ProductPicker({
  onPick,
  warehouseId,
  exclude = [],
  label = "Mahsulot qo‘shish…",
  className,
}: {
  onPick: (p: Product) => void
  warehouseId?: string
  exclude?: string[]
  label?: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const dq = useDebounced(q)
  const { data, isFetching } = useQuery({
    queryKey: ["product-picker", dq, warehouseId],
    queryFn: () => api.get<Paginated<Product>>("/products", { q: dq, pageSize: 20, isActive: true, warehouseId }),
    enabled: open,
  })
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button type="button" variant="outline" className={cn("h-10 w-full justify-between font-normal", className)} />
        }
      >
        <span className="truncate text-muted-foreground">{label}</span>
        <ChevronsUpDown className="size-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(24rem,calc(100vw-2rem))] p-1">
        <Command shouldFilter={false}>
          <CommandInput value={q} onValueChange={setQ} placeholder="Nomi, SKU yoki shtrix-kod" />
          <CommandList>
            <CommandEmpty>{isFetching ? "Qidirilmoqda…" : "Mahsulot topilmadi"}</CommandEmpty>
            <CommandGroup>
              {(data?.items ?? []).map((p) => {
                const taken = exclude.includes(p.id)
                return (
                  <CommandItem
                    key={p.id}
                    value={p.id}
                    disabled={taken}
                    onSelect={() => {
                      onPick(p)
                      setOpen(false)
                      setQ("")
                    }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate">{p.name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        <span>{p.sku ?? "SKU yo‘q"}</span>
                        <span className="ml-2 tabular-nums">
                          {formatQty(p.qty)} {UNIT_LABELS[p.unit]}
                        </span>
                      </div>
                    </div>
                    {taken && <Check className="size-4" />}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
