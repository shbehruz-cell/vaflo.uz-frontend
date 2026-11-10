"use client"

import { Suspense, useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { AlertTriangle, CreditCard, Download, Layers, LineChart, Monitor, Package, Tag, Users } from "lucide-react"
import { toast } from "sonner"
import { InlineSelect } from "@/components/app/inline-select"
import { PageHeader } from "@/components/app/page-header"
import { MetricList, Panel, PanelHeader, type MetricRow } from "@/components/app/panel"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { ViewTabs } from "@/components/app/view-tabs"
import { TABLE_CARD, THEAD } from "@/components/inventory/common"
import { PeriodFilter, usePeriod } from "@/components/reports/period-filter"
import { SalesChart } from "@/components/reports/sales-chart"
import type { CashierRow, LowStock, SalesByDay, TopProducts } from "@/components/reports/types"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUrlState } from "@/hooks/use-url-state"
import { api, download, toQuery } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDate, formatMoney, formatQty, PAYMENT_LABELS, UNIT_LABELS } from "@/lib/format"

interface Named {
  id: string
  name: string
}

/** Panel ichidagi yuklanish / xato / bo‘sh holat o‘rami. */
function PanelBody<T>({
  q,
  isEmpty,
  children,
  rows = 4,
}: {
  q: { isLoading: boolean; isError: boolean; error: unknown; refetch: () => unknown; data: T | undefined }
  isEmpty: (d: T) => boolean
  children: (d: T) => React.ReactNode
  rows?: number
}) {
  if (q.isLoading)
    return (
      <div className="space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    )
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (!q.data || isEmpty(q.data)) return <p className="py-6 text-center text-sm text-muted-foreground">Bu davrda ma’lumot yo‘q</p>
  return <>{children(q.data)}</>
}

const share = (part: number, total: number) => (total > 0 && Number.isFinite(part) ? (part / total) * 100 : 0)

function Reports() {
  const { get, set } = useUrlState()
  const { query, ready } = usePeriod("month")
  const [exporting, setExporting] = useState(false)
  const [metric, setMetric] = useState<"revenue" | "receipts">("revenue")
  const registerId = get("registerId")
  const paymentMethod = get("paymentMethod")
  const categoryId = get("categoryId")

  const filters = { ...query, registerId, paymentMethod, categoryId }

  const registers = useQuery({ queryKey: ["registers"], queryFn: () => api.get<Named[]>("/registers") })
  const categories = useQuery({ queryKey: ["categories"], queryFn: () => api.get<Named[]>("/categories"), retry: false })

  const byDay = useQuery({
    queryKey: ["reports", "sales-by-day", filters],
    queryFn: () => api.get<SalesByDay>("/reports/sales-by-day", filters),
    enabled: ready,
  })
  const top = useQuery({
    queryKey: ["reports", "top-products", filters, 100],
    queryFn: () => api.get<TopProducts>("/reports/top-products", { ...filters, limit: 100 }),
    enabled: ready,
  })
  const cashiers = useQuery({
    queryKey: ["reports", "by-cashier", filters],
    queryFn: () => api.get<CashierRow[]>("/reports/by-cashier", filters),
    enabled: ready,
  })
  const low = useQuery({ queryKey: ["reports", "low-stock"], queryFn: () => api.get<LowStock>("/reports/low-stock") })

  const totals = useMemo(() => {
    const s = byDay.data?.series ?? []
    return { gross: s.reduce((n, r) => n + Number(r.gross), 0), receipts: s.reduce((n, r) => n + r.receipts, 0) }
  }, [byDay.data])

  const cashierRows: MetricRow[] = useMemo(() => {
    const rows = [...(cashiers.data ?? [])].sort((a, b) => Number(b.grossSales) - Number(a.grossSales))
    const sum = rows.reduce((n, r) => n + Number(r.grossSales), 0)
    return rows.map((r) => ({
      key: r.cashierId,
      icon: <Users />,
      label: r.name ?? "—",
      count: formatMoney(r.grossSales),
      pct: share(Number(r.grossSales), sum),
    }))
  }, [cashiers.data])

  const categoryRows: MetricRow[] = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of top.data?.byRevenue ?? []) {
      const k = p.category ?? "Kategoriyasiz"
      map.set(k, (map.get(k) ?? 0) + Number(p.revenue))
    }
    const entries = [...map.entries()].sort((a, b) => b[1] - a[1])
    const sum = entries.reduce((n, [, v]) => n + v, 0)
    return entries.slice(0, 8).map(([name, v]) => ({ key: name, icon: <Tag />, label: name, count: formatMoney(v), pct: share(v, sum) }))
  }, [top.data])

  const productRows: MetricRow[] = useMemo(() => {
    return (top.data?.byRevenue ?? []).slice(0, 8).map((p) => ({
      key: p.productId,
      icon: <Package />,
      label: p.name,
      count: formatMoney(p.revenue),
      pct: share(Number(p.revenue), totals.gross),
    }))
  }, [top.data, totals.gross])

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

  const allOpt = (label: string) => ({ value: "", label })
  const noData = (d: SalesByDay) => d.series.every((x) => x.receipts === 0 && Number(x.refunds) === 0)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hisobotlar"
        description="Savdo, mahsulot va kassirlar bo‘yicha tahlil"
        actions={
          <Button
            variant="outline"
            className="h-8 shrink-0 rounded-lg px-2.5 text-sm max-sm:w-8 max-sm:px-0"
            aria-label="CSV yuklab olish"
            onClick={() => void exportCsv()}
            disabled={!ready || exporting}
          >
            {exporting ? <Spinner /> : <Download />}
            <span className="hidden sm:inline">CSV yuklab olish</span>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <InlineSelect
          ariaLabel="Kassa"
          icon={<Monitor />}
          value={registerId}
          onChange={(v) => set({ registerId: v })}
          options={[allOpt("Barcha kassalar"), ...(registers.data ?? []).map((r) => ({ value: r.id, label: r.name }))]}
        />
        <InlineSelect
          ariaLabel="To‘lov usuli"
          icon={<CreditCard />}
          value={paymentMethod}
          onChange={(v) => set({ paymentMethod: v })}
          options={[allOpt("Barcha to‘lovlar"), ...Object.entries(PAYMENT_LABELS).map(([value, label]) => ({ value, label }))]}
        />
        <InlineSelect
          ariaLabel="Kategoriya"
          icon={<Layers />}
          value={categoryId}
          onChange={(v) => set({ categoryId: v })}
          options={[allOpt("Barcha kategoriyalar"), ...(categories.data ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>

      <Panel>
        <PanelHeader
          icon={<LineChart />}
          title={metric === "revenue" ? "Sotuv:" : "Cheklar:"}
          value={byDay.data ? (metric === "revenue" ? formatMoney(totals.gross) : String(totals.receipts)) : <Skeleton className="inline-block h-6 w-28 align-middle" />}
          actions={
            <>
              <ViewTabs
                variant="pill"
                value={metric}
                onChange={(v) => setMetric(v as "revenue" | "receipts")}
                tabs={[
                  { value: "revenue", label: "Tushum" },
                  { value: "receipts", label: "Cheklar" },
                ]}
              />
              <PeriodFilter defaultPreset="month" variant="inline" />
            </>
          }
        />
        <PanelBody q={byDay} rows={5} isEmpty={noData}>
          {(d) => <SalesChart data={d.series} metric={metric} />}
        </PanelBody>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader icon={<Users />} title="Kassirlar" />
          <PanelBody q={cashiers} isEmpty={(d) => d.length === 0}>
            {() => <MetricList columns={["Kassir", "Yalpi sotuv", "%"]} rows={cashierRows} />}
          </PanelBody>
        </Panel>
        <Panel>
          <PanelHeader icon={<Layers />} title="Kategoriyalar" />
          <PanelBody q={top} isEmpty={(d) => d.byRevenue.length === 0}>
            {() => (
              <>
                <MetricList columns={["Kategoriya", "Tushum", "%"]} rows={categoryRows} />
                <p className="mt-3 text-xs text-muted-foreground">Eng ko‘p sotilgan 100 ta mahsulot asosida.</p>
              </>
            )}
          </PanelBody>
        </Panel>
        <Panel className="lg:col-span-2 xl:col-span-1">
          <PanelHeader icon={<Package />} title="Top mahsulotlar" />
          <PanelBody q={top} isEmpty={(d) => d.byRevenue.length === 0}>
            {() => <MetricList columns={["Mahsulot", "Tushum", "Ulushi"]} rows={productRows} />}
          </PanelBody>
        </Panel>
      </div>

      <Panel>
        <PanelHeader icon={<LineChart />} title="Kunlik tafsilot" />
        <PanelBody q={byDay} rows={4} isEmpty={noData}>
          {(d) => {
            const rows = [...d.series].reverse()
            return (
              <>
                <ul className="divide-y md:hidden">
                  {rows.map((r) => (
                    <li key={r.date} className="space-y-1 py-2.5 text-sm">
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
                <div className={`hidden md:block ${TABLE_CARD}`}>
                  <Table>
                    <TableHeader className={THEAD}>
                      <TableRow>
                        <TableHead>Sana</TableHead>
                        <TableHead className="text-right">Cheklar</TableHead>
                        <TableHead className="text-right">Yalpi sotuv</TableHead>
                        <TableHead className="text-right">Qaytarishlar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
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
            )
          }}
        </PanelBody>
      </Panel>

      <Panel>
        <PanelHeader
          icon={<AlertTriangle />}
          title="Kam qolgan mahsulotlar"
          actions={low.data ? <span className="text-xs text-muted-foreground">Ombor: {low.data.warehouse.name} (davrga bog‘liq emas)</span> : null}
        />
        {low.isLoading ? (
          <LoadingRows rows={3} />
        ) : low.isError ? (
          <ErrorState error={low.error} onRetry={() => void low.refetch()} />
        ) : !low.data || low.data.items.length === 0 ? (
          <EmptyState title="Kam qolgan mahsulot yo‘q" description="Qoldig‘i minimaldan past mahsulotlar shu yerda ko‘rinadi." />
        ) : (
          <div className={TABLE_CARD}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Mahsulot</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">Kategoriya</TableHead>
                  <TableHead className="text-right">Qoldiq</TableHead>
                  <TableHead className="text-right">Minimal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {low.data.items.map((p) => (
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
        )}
      </Panel>
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
