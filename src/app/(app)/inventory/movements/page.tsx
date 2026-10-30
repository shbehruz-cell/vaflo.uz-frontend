"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { MOVEMENT_LABELS, MovementBadge, NATIVE_SELECT, ProductPicker, TABLE_CARD, THEAD, TOOLBAR_CARD, TROW, REFERENCE_LABELS, useWarehouses, type Movement, type Product } from "@/components/inventory/common"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
import { PaginationBar } from "@/components/app/pagination-bar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Paginated } from "@/lib/api"
import { formatDateTime, formatQty, UNIT_LABELS } from "@/lib/format"
import { useUrlState } from "@/hooks/use-url-state"
import { cn } from "@/lib/utils"

export default function MovementsPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <MovementsView />
    </Suspense>
  )
}

function MovementsView() {
  const { get, set } = useUrlState()
  const page = Number(get("page", "1")) || 1
  const warehouseId = get("warehouse")
  const type = get("type")
  const productId = get("product")
  const from = get("from")
  const to = get("to")

  const { data: warehouses } = useWarehouses()
  const productQ = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.get<Product>(`/products/${productId}`),
    enabled: !!productId,
  })

  const params = {
    warehouseId,
    type,
    productId,
    dateFrom: from ? `${from}T00:00:00+05:00` : undefined,
    dateTo: to ? `${to}T23:59:59.999+05:00` : undefined,
    page,
    pageSize: 25,
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["movements", params],
    queryFn: () => api.get<Paginated<Movement>>("/inventory/movements", params),
    placeholderData: (prev) => prev,
  })

  const qtyText = (m: Movement) => (
    <span className={cn("tabular-nums", Number(m.qty) >= 0 ? "text-primary" : "text-destructive")}>
      {Number(m.qty) > 0 ? "+" : ""}
      {formatQty(m.qty)} {UNIT_LABELS[m.product.unit]}
    </span>
  )
  const source = (m: Movement) => (m.referenceType ? (REFERENCE_LABELS[m.referenceType] ?? m.referenceType) : "—")

  return (
    <div className="space-y-4">
      <PageHeader title="Ombor harakatlari" description="Kirim, chiqim va tuzatishlar tarixi" />

      <div className={`${TOOLBAR_CARD} grid gap-2 sm:grid-cols-2 lg:grid-cols-5`}>
        <select className={NATIVE_SELECT} aria-label="Ombor" value={warehouseId} onChange={(e) => set({ warehouse: e.target.value, page: 1 })}>
          <option value="">Barcha omborlar</option>
          {warehouses?.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
        <select className={NATIVE_SELECT} aria-label="Tur" value={type} onChange={(e) => set({ type: e.target.value, page: 1 })}>
          <option value="">Barcha turlar</option>
          {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <Input type="date" className="h-10" aria-label="Sanadan" value={from} max={to || undefined} onChange={(e) => set({ from: e.target.value, page: 1 })} />
        <Input type="date" className="h-10" aria-label="Sanagacha" value={to} min={from || undefined} onChange={(e) => set({ to: e.target.value, page: 1 })} />
        {productId ? (
          <div className="flex h-10 items-center justify-between gap-2 rounded-lg border px-2.5 text-sm">
            <span className="truncate">{productQ.data?.name ?? "Mahsulot…"}</span>
            <Button variant="ghost" size="icon-sm" aria-label="Mahsulot filtrini olib tashlash" onClick={() => set({ product: null, page: 1 })}>
              <X />
            </Button>
          </div>
        ) : (
          <ProductPicker label="Mahsulot bo‘yicha" onPick={(p) => set({ product: p.id, page: 1 })} />
        )}
      </div>

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Harakatlar topilmadi" description="Filtrlarni o‘zgartirib ko‘ring." />
      ) : (
        <>
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Sana</TableHead>
                  <TableHead>Mahsulot</TableHead>
                  <TableHead>Tur</TableHead>
                  <TableHead className="text-right">Miqdor</TableHead>
                  <TableHead className="text-right">Qoldiq keyin</TableHead>
                  <TableHead>Sabab</TableHead>
                  <TableHead>Manba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((m) => (
                  <TableRow key={m.id} className={TROW}>
                    <TableCell className="whitespace-nowrap">{formatDateTime(m.createdAt)}</TableCell>
                    <TableCell className="max-w-56">
                      <div className="truncate font-medium">{m.product.name}</div>
                      <div className="text-xs text-muted-foreground">{m.warehouse.name}</div>
                    </TableCell>
                    <TableCell>
                      <MovementBadge type={m.type} />
                    </TableCell>
                    <TableCell className="text-right">{qtyText(m)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatQty(m.balanceAfter)}</TableCell>
                    <TableCell className="max-w-48 truncate text-muted-foreground">{m.reason ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{source(m)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {data.items.map((m) => (
              <div key={m.id} className="rounded-xl border bg-card p-3 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 font-medium">{m.product.name}</div>
                  {qtyText(m)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <MovementBadge type={m.type} />
                  <span>{formatDateTime(m.createdAt)}</span>
                  <span>Qoldiq: {formatQty(m.balanceAfter)}</span>
                </div>
                {(m.reason || m.referenceType) && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {m.reason && <span className="mr-2">{m.reason}</span>}
                    {m.referenceType && <span>{source(m)}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>

          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={(n) => set({ page: n })} />
        </>
      )}
    </div>
  )
}
