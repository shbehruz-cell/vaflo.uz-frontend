"use client"

import { Suspense, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { toast } from "sonner"
import { FilterBar, FilterField, type FilterChip } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { NativeSelect } from "@/components/reports/native-select"
import { PeriodFilter, usePeriod } from "@/components/reports/period-filter"
import { SalesChart } from "@/components/reports/sales-chart"
import type { CashierRow, LowStock, SalesByDay, TopProduct, TopProducts } from "@/components/reports/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUrlState } from "@/hooks/use-url-state"
import { api, download, toQuery } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDate, formatMoney, formatQty, PAYMENT_LABELS, UNIT_LABELS } from "@/lib/format"

interface Named {
  id: string
  name: string
}

function Section<T>({
  q,
  isEmpty,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; data: T | undefined }
  isEmpty: (d: T) => boolean
  children: (d: T) => React.ReactNode
}) {
  if (q.isLoading) return <LoadingRows />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (!q.data || isEmpty(q.data)) return <EmptyState title="Bu davrda ma’lumot yo‘q" description="Davrni kengaytiring yoki filtrlarni tozalang." />
  return <>{children(q.data)}</>
}

function ProductsTable({ rows }: { rows: TopProduct[] }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/50 text-xs [&_th]:text-muted-foreground">
          <TableRow>
            <TableHead>Mahsulot</TableHead>
            <TableHead className="hidden md:table-cell">Kategoriya</TableHead>
            <TableHead className="text-right">Miqdor</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Qaytgan</TableHead>
            <TableHead className="text-right">Tushum</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => (
            <TableRow className="h-11" key={p.productId}>
              <TableCell className="max-w-48 truncate font-medium">{p.name}</TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">{p.category ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatQty(p.qty)}</TableCell>
              <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatQty(p.refundedQty)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(p.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function Reports() {
  const { get, set } = useUrlState()
  const { query, ready } = usePeriod("month")
  const [exporting, setExporting] = useState(false)
  const registerId = get("registerId")
  const paymentMethod = get("paymentMethod")
  const categoryId = get("categoryId")
  const tab = get("tab", "dynamics")

  const filters = { ...query, registerId, paymentMethod, categoryId }

  const registers = useQuery({ queryKey: ["registers"], queryFn: () => api.get<Named[]>("/registers") })
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.get<Named[]>("/categories"), retry: false })

  const byDay = useQuery({
    queryKey: ["reports", "sales-by-day", filters],
    queryFn: () => api.get<SalesByDay>("/reports/sales-by-day", filters),
    enabled: ready,
  })
  const top = useQuery({
    queryKey: ["reports", "top-products", filters, 20],
    queryFn: () => api.get<TopProducts>("/reports/top-products", { ...filters, limit: 20 }),
    enabled: ready,
  })
  const cashiers = useQuery({
    queryKey: ["reports", "by-cashier", filters],
    queryFn: () => api.get<CashierRow[]>("/reports/by-cashier", filters),
    enabled: ready,
  })
  const low = useQuery({ queryKey: ["reports", "low-stock"], queryFn: () => api.get<LowStock>("/reports/low-stock") })

  const chips: FilterChip[] = []
  if (registerId) chips.push({ key: "registerId", label: `Kassa: ${registers.data?.find((r) => r.id === registerId)?.name ?? "tanlangan"}`, onRemove: () => set({ registerId: null }) })
  if (paymentMethod) chips.push({ key: "paymentMethod", label: `To‘lov: ${PAYMENT_LABELS[paymentMethod] ?? paymentMethod}`, onRemove: () => set({ paymentMethod: null }) })
  if (categoryId) chips.push({ key: "categoryId", label: `Kategoriya: ${categories.data?.find((c) => c.id === categoryId)?.name ?? "tanlangan"}`, onRemove: () => set({ categoryId: null }) })

  async function exportCsv() {
    setExporting(true)
    try {
      await download(`/reports/sales.csv${toQuery(filters)}`, "sotuvlar.csv")
      toast.success("CSV fayl yuklab olindi")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Eksportda xatolik")
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Hisobotlar" description="Savdo, mahsulot va kassirlar bo‘yicha tahlil" />

      <div className="space-y-2.5">
        <PeriodFilter defaultPreset="month" />
        <FilterBar
          activeCount={chips.length}
          chips={chips}
          onReset={() => set({ registerId: null, paymentMethod: null, categoryId: null })}
          actions={
            <Button
              variant="outline"
              className="h-11 shrink-0 max-sm:w-11 max-sm:px-0 md:h-10"
              aria-label="CSV yuklab olish"
              onClick={() => void exportCsv()}
              disabled={!ready || exporting}
            >
              {exporting ? <Spinner /> : <Download />}
              <span className="hidden sm:inline">CSV yuklab olish</span>
            </Button>
          }
        >
          <FilterField label="Kassa">
            <NativeSelect
            aria-label="Kassa"
            value={registerId}
            onChange={(e) => set({ registerId: e.target.value })}
            options={[{ value: "", label: "Barcha kassalar" }, ...(registers.data ?? []).map((r) => ({ value: r.id, label: r.name }))]}
          />
          </FilterField>
          <FilterField label="To‘lov usuli">
            <NativeSelect
            aria-label="To‘lov usuli"
            value={paymentMethod}
            onChange={(e) => set({ paymentMethod: e.target.value })}
            options={[{ value: "", label: "Barcha to‘lov usullari" }, ...Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))]}
          />
          </FilterField>
          <FilterField label="Kategoriya">
            <NativeSelect
            aria-label="Kategoriya"
            value={categoryId}
            onChange={(e) => set({ categoryId: e.target.value })}
            options={[{ value: "", label: "Barcha kategoriyalar" }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
          />
          </FilterField>
        </FilterBar>
      </div>

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "dynamics" ? "" : String(v) })}>
        <div className="scroll-row -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList variant="line" className="h-auto w-max max-md:gap-2 max-md:p-0">
            <TabsTrigger value="dynamics" className="shrink-0 px-3 max-md:h-9 max-md:rounded-full max-md:border-border max-md:px-3.5 max-md:after:hidden max-md:data-active:border-primary! max-md:data-active:bg-primary/10! max-md:data-active:text-primary!">Savdo dinamikasi</TabsTrigger>
            <TabsTrigger value="products" className="shrink-0 px-3 max-md:h-9 max-md:rounded-full max-md:border-border max-md:px-3.5 max-md:after:hidden max-md:data-active:border-primary! max-md:data-active:bg-primary/10! max-md:data-active:text-primary!">Mahsulotlar</TabsTrigger>
            <TabsTrigger value="cashiers" className="shrink-0 px-3 max-md:h-9 max-md:rounded-full max-md:border-border max-md:px-3.5 max-md:after:hidden max-md:data-active:border-primary! max-md:data-active:bg-primary/10! max-md:data-active:text-primary!">Kassirlar</TabsTrigger>
            <TabsTrigger value="low" className="shrink-0 px-3 max-md:h-9 max-md:rounded-full max-md:border-border max-md:px-3.5 max-md:after:hidden max-md:data-active:border-primary! max-md:data-active:bg-primary/10! max-md:data-active:text-primary!">Kam qolganlar</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dynamics" className="space-y-4">
          <Section q={byDay} isEmpty={(d) => d.series.every((x) => x.receipts === 0 && Number(x.refunds) === 0)}>
            {(d) => (
              <>
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Kunlik yalpi sotuv va qaytarishlar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SalesChart data={d.series} />
                  </CardContent>
                </Card>
                <ul className="divide-y rounded-xl border bg-card md:hidden">
                  {[...d.series].reverse().map((r) => (
                    <li key={r.date} className="space-y-1 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-medium">{formatDate(r.date + "T12:00:00+05:00")}</span>
                        <span className="font-semibold tabular-nums">{formatMoney(r.gross)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>Cheklar: {r.receipts}</span>
                        <span className="tabular-nums">Qaytarishlar: {formatMoney(r.refunds)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="hidden overflow-hidden rounded-xl border bg-card md:block">
                  <Table>
                    <TableHeader className="bg-muted/50 text-xs [&_th]:text-muted-foreground">
                      <TableRow>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Cheklar</TableHead>
                        <TableHead className="text-right">Yalpi sotuv</TableHead>
                        <TableHead className="text-right">Qaytarishlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...d.series].reverse().map((r) => (
                        <TableRow className="h-11" key={r.date}>
                          <TableCell>{formatDate(r.date + "T12:00:00+05:00")}</TableCell>
                          <TableCell className="text-right tabular-nums">{r.receipts}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(r.gross)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatMoney(r.refunds)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Section q={top} isEmpty={(d) => d.byQty.length === 0}>
            {(d) => (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Miqdor bo‘yicha</h3>
                  <ProductsTable rows={d.byQty} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-base font-semibold">Tushum bo‘yicha</h3>
                  <ProductsTable rows={d.byRevenue} />
                </div>
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="cashiers">
          <Section q={cashiers} isEmpty={(d) => d.length === 0}>
            {(rows) => (
              <div className="overflow-hidden rounded-xl border bg-card">
                <Table>
                  <TableHeader className="bg-muted/50 text-xs [&_th]:text-muted-foreground">
                    <TableRow>
                      <TableHead>Kassir</TableHead>
                      <TableHead className="text-right">Cheklar</TableHead>
                      <TableHead className="text-right">Yalpi sotuv</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Qaytarilgan</TableHead>
                      <TableHead className="hidden text-right md:table-cell">O‘rtacha chek</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow className="h-11" key={r.cashierId}>
                        <TableCell className="font-medium">{r.name ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.receiptCount}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatMoney(r.grossSales)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatMoney(r.refundedTotal)}</TableCell>
                        <TableCell className="hidden text-right tabular-nums md:table-cell">{formatMoney(r.averageReceipt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Section>
        </TabsContent>

        <TabsContent value="low">
          <Section q={low} isEmpty={(d) => d.items.length === 0}>
            {(d) => (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Ombor: {d.warehouse.name} (davr filtriga bog‘liq emas)</p>
                <div className="overflow-hidden rounded-xl border bg-card">
                  <Table>
                    <TableHeader className="bg-muted/50 text-xs [&_th]:text-muted-foreground">
                      <TableRow>
                        <TableHead>Mahsulot</TableHead>
                        <TableHead className="hidden sm:table-cell">SKU</TableHead>
                        <TableHead className="hidden md:table-cell">Kategoriya</TableHead>
                        <TableHead className="text-right">Qoldiq</TableHead>
                        <TableHead className="text-right">Minimal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {d.items.map((p) => (
                        <TableRow className="h-11" key={p.id}>
                          <TableCell className="max-w-48 truncate font-medium">{p.name}</TableCell>
                          <TableCell className="hidden text-muted-foreground sm:table-cell">{p.sku ?? "—"}</TableCell>
                          <TableCell className="hidden text-muted-foreground md:table-cell">{p.category ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-xs tabular-nums text-amber-700 dark:text-amber-300">
                              {formatQty(p.qty)} {UNIT_LABELS[p.unit] ?? ""}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatQty(p.minStock)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default function ReportsPage() {
  const { can } = useAuth()
  if (!can("reports.read")) return <NoAccess />
  return (
    <Suspense>
      <Reports />
    </Suspense>
  )
}
