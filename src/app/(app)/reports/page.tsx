"use client"

import { Suspense, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import { toast } from "sonner"
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

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-3">
          <PeriodFilter defaultPreset="month" />
          <div className="grid gap-2 sm:grid-cols-3">
            <NativeSelect
              aria-label="Kassa"
              value={registerId}
              onChange={(e) => set({ registerId: e.target.value })}
              options={[{ value: "", label: "Barcha kassalar" }, ...(registers.data ?? []).map((r) => ({ value: r.id, label: r.name }))]}
            />
            <NativeSelect
              aria-label="To‘lov usuli"
              value={paymentMethod}
              onChange={(e) => set({ paymentMethod: e.target.value })}
              options={[{ value: "", label: "Barcha to‘lov usullari" }, ...Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))]}
            />
            <NativeSelect
              aria-label="Kategoriya"
              value={categoryId}
              onChange={(e) => set({ categoryId: e.target.value })}
              options={[{ value: "", label: "Barcha kategoriyalar" }, ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            />
          </div>
        </div>
        <Button variant="outline" className="shrink-0 self-start" onClick={() => void exportCsv()} disabled={!ready || exporting}>
          {exporting ? <Spinner /> : <Download />} CSV yuklab olish
        </Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "dynamics" ? "" : String(v) })}>
        <TabsList variant="line" className="h-auto max-w-full flex-wrap">
          <TabsTrigger value="dynamics">Savdo dinamikasi</TabsTrigger>
          <TabsTrigger value="products">Mahsulotlar</TabsTrigger>
          <TabsTrigger value="cashiers">Kassirlar</TabsTrigger>
          <TabsTrigger value="low">Kam qolganlar</TabsTrigger>
        </TabsList>

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
                <div className="overflow-hidden rounded-xl border bg-card">
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
