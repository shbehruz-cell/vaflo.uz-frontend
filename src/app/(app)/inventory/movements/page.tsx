"use client"

import { Suspense } from "react"
import { useQuery } from "@tanstack/react-query"
import { Boxes, CalendarClock, Layers, Link2, Package, Tag, TextCursorInput, Warehouse, X } from "lucide-react"
import { MOVEMENT_LABELS, MovementBadge, TABLE_CARD, THEAD, TROW, REFERENCE_LABELS, useWarehouses, type Movement, type Product } from "@/components/inventory/common"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { InlineSelect } from "@/components/app/inline-select"
import { PeriodPicker } from "@/components/app/period-picker"
import { PageHeader } from "@/components/app/page-header"
import { ColumnHead } from "@/components/app/column-head"
import { ViewTabs } from "@/components/app/view-tabs"
import { PaginationBar } from "@/components/app/pagination-bar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Paginated } from "@/lib/api"
import { formatDateTime, formatQty, UNIT_LABELS } from "@/lib/format"
import { useUrlState } from "@/hooks/use-url-state"
import { cn } from "@/lib/utils"

const PERIOD_OPTIONS = [
  { value: "all", label: "Barcha davr" },
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Oxirgi 7 kun" },
  { value: "month", label: "Shu oy" },
]

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

function presetRange(v: string): { from: string; to: string } {
  const now = new Date()
  const day = (back: number) => ymd(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back))
  if (v === "today") return { from: day(0), to: day(0) }
  if (v === "yesterday") return { from: day(1), to: day(1) }
  if (v === "week") return { from: day(6), to: day(0) }
  if (v === "month") return { from: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), to: day(0) }
  return { from: "", to: "" }
}

function presetOf(from: string, to: string): string | null {
  if (!from && !to) return "all"
  for (const o of PERIOD_OPTIONS) {
    const r = presetRange(o.value)
    if (o.value !== "all" && r.from === from && r.to === to) return o.value
  }
  return null
}

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

  const preset = presetOf(from, to)
  const showWarehouse = (warehouses?.length ?? 0) > 1

  return (
    <div className="space-y-4">
      <PageHeader eyebrow={<><Boxes /> Ombor</>} title="Ombor harakatlari" description="Kirim, chiqim va tuzatishlar tarixi" />

      <ViewTabs
        variant="pill"
        tabs={[{ value: "", label: "Hammasi" }, ...Object.entries(MOVEMENT_LABELS).map(([value, label]) => ({ value, label }))]}
        value={type}
        onChange={(v) => set({ type: v || null, page: 1 })}
        toolbar={
          <>
            {showWarehouse && (
              <InlineSelect
                ariaLabel="Ombor"
                icon={<Warehouse />}
                value={warehouseId}
                onChange={(v) => set({ warehouse: v || null, page: 1 })}
                options={[{ value: "", label: "Barcha omborlar" }, ...(warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))]}
              />
            )}
            <PeriodPicker
              variant="inline"
              options={PERIOD_OPTIONS}
              value={preset ?? "all"}
              onChange={(v) => {
                const r = presetRange(v)
                set({ from: r.from || null, to: r.to || null, page: 1 })
              }}
              custom={{
                active: preset === null,
                from,
                to,
                onFrom: (v) => set({ from: v || null, page: 1 }),
                onTo: (v) => set({ to: v || null, page: 1 }),
                invalid: !!from && !!to && from > to,
              }}
            />
            {productId && (
              <span className="inline-flex h-8 max-w-full min-w-0 items-center gap-1 rounded-lg border bg-card pl-2.5 text-sm font-medium">
                <span className="truncate">Mahsulot: {productQ.data?.name ?? "…"}</span>
                <button
                  type="button"
                  aria-label="Mahsulot filtrini olib tashlash"
                  onClick={() => set({ product: null, page: 1 })}
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-4" />
                </button>
              </span>
            )}
          </>
        }
      />

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState title="Harakatlar topilmadi" description="Davr yoki turni o‘zgartirib ko‘ring." />
      ) : (
        <>
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead><ColumnHead icon={CalendarClock}>Sana</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={Package}>Mahsulot</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={Tag}>Tur</ColumnHead></TableHead>
                  <TableHead className="text-right"><ColumnHead icon={Layers}>Miqdor</ColumnHead></TableHead>
                  <TableHead className="text-right"><ColumnHead icon={Layers}>Qoldiq keyin</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={TextCursorInput}>Sabab</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={Link2}>Manba</ColumnHead></TableHead>
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
