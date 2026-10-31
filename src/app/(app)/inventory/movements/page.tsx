"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { MOVEMENT_LABELS, MovementBadge, NATIVE_SELECT, ProductPicker, TABLE_CARD, THEAD, TROW, REFERENCE_LABELS, useWarehouses, type Movement, type Product } from "@/components/inventory/common"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { DateRangeFields, FilterBar, FilterField, type FilterChip } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { PaginationBar } from "@/components/app/pagination-bar"
import { Button } from "@/components/ui/button"
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

  const chips: FilterChip[] = []
  if (warehouseId) chips.push({ key: "warehouse", label: `Ombor: ${warehouses?.find((w) => w.id === warehouseId)?.name ?? "…"}`, onRemove: () => set({ warehouse: null, page: 1 }) })
  if (type) chips.push({ key: "type", label: `Tur: ${(MOVEMENT_LABELS as Record<string, string>)[type] ?? type}`, onRemove: () => set({ type: null, page: 1 }) })
  if (from || to) {
    const d = (v: string) => (v ? `${v.slice(8, 10)}.${v.slice(5, 7)}` : "…")
    chips.push({ key: "date", label: `Sana: ${d(from)}–${d(to)}`, onRemove: () => set({ from: null, to: null, page: 1 }) })
  }
  if (productId) chips.push({ key: "product", label: `Mahsulot: ${productQ.data?.name ?? "…"}`, onRemove: () => set({ product: null, page: 1 }) })

  return (
    <div className="space-y-4">
      <PageHeader title="Ombor harakatlari" description="Kirim, chiqim va tuzatishlar tarixi" />

      <FilterBar activeCount={chips.length} chips={chips} onReset={() => set({ warehouse: null, type: null, product: null, from: null, to: null, page: 1 })}>
        <FilterField label="Ombor">
          <select className={NATIVE_SELECT} value={warehouseId} onChange={(e) => set({ warehouse: e.target.value, page: 1 })}>
            <option value="">Barcha omborlar</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Tur">
          <select className={NATIVE_SELECT} value={type} onChange={(e) => set({ type: e.target.value, page: 1 })}>
            <option value="">Barcha turlar</option>
            {Object.entries(MOVEMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Sana" group>
          <DateRangeFields from={from} to={to} onFrom={(v) => set({ from: v, page: 1 })} onTo={(v) => set({ to: v, page: 1 })} />
        </FilterField>
        <FilterField label="Mahsulot" group>
          {productId ? (
            <div className="flex h-10 items-center justify-between gap-2 rounded-lg border px-2.5 text-sm font-normal">
              <span className="truncate">{productQ.data?.name ?? "Mahsulot…"}</span>
              <Button variant="ghost" size="icon-sm" className="max-md:size-9" aria-label="Mahsulot filtrini olib tashlash" onClick={() => set({ product: null, page: 1 })}>
                <X />
              </Button>
            </div>
          ) : (
            <ProductPicker label="Mahsulot bo‘yicha" onPick={(p) => set({ product: p.id, page: 1 })} />
          )}
        </FilterField>
      </FilterBar>

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
                  <div className="min-w-0 font-medium leading-snug">{m.product.name}</div>
                  <span className="shrink-0 font-semibold">{qtyText(m)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <MovementBadge type={m.type} />
                  <span>{formatDateTime(m.createdAt)}</span>
                  <span className="tabular-nums">Qoldiq: {formatQty(m.balanceAfter)}</span>
                </div>
                {(m.reason || m.referenceType) && (
                  <div className="mt-1 break-words text-xs text-muted-foreground">
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
