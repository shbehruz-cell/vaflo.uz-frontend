"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  Info,
  Package,
  Receipt,
  ScanBarcode,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { PeriodFilter, usePeriod } from "@/components/reports/period-filter"
import { SalesChart } from "@/components/reports/sales-chart"
import type { LowStock, SalesByDay, Summary, TopProducts } from "@/components/reports/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth, type PermissionCode } from "@/lib/auth"
import { formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"

function Kpi({ label, value, hint, loading, primary }: { label: string; value: string; hint?: string; loading: boolean; primary?: boolean }) {
  return (
    <div className={cn("-mb-px -mr-px min-w-0 space-y-1 border-b border-r p-3 sm:p-4", primary && "col-span-2 sm:p-5")}>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <span>{label}</span>
        {hint && (
          <Tooltip>
            <TooltipTrigger
              render={<button type="button" aria-label={`${label}: izoh`} className="inline-flex size-5 items-center justify-center rounded-full hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring" />}
            >
              <Info className="size-3.5" />
            </TooltipTrigger>
            <TooltipContent>{hint}</TooltipContent>
          </Tooltip>
        )}
      </div>
      {loading ? (
        <Skeleton className={primary ? "h-9 w-40" : "h-7 w-28"} />
      ) : (
        <div className={cn("truncate font-semibold tabular-nums tracking-tight", primary ? "text-3xl font-bold sm:text-4xl" : "text-lg sm:text-xl")}>{value}</div>
      )}
    </div>
  )
}

const QUICK_ACTIONS: {
  href: string
  title: string
  description: string
  icon: LucideIcon
  permissions: PermissionCode[]
}[] = [
  { href: "/inventory/products", title: "Mahsulotlar", description: "Katalog, narx va qoldiqlar", icon: Boxes, permissions: ["products.read"] },
  { href: "/sales", title: "Sotuvlar tarixi", description: "Cheklar va qaytarishlar", icon: Receipt, permissions: ["sales.read.all", "sales.read.own"] },
  { href: "/customers", title: "Xaridorlar", description: "Mijozlar bazasi", icon: UserRound, permissions: ["customers.read"] },
  { href: "/reports", title: "Hisobotlar", description: "Savdo tahlili va CSV eksport", icon: BarChart3, permissions: ["reports.read"] },
]

function QuickActions() {
  const { can } = useAuth()
  const actions = QUICK_ACTIONS.filter((a) => can(...a.permissions))

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Tez amallar</CardTitle>
        <CardDescription>Ko‘p ishlatiladigan bo‘limlar</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {can("sales.create") && (
          <Item
            render={<Link href="/pos" />}
            className="border-primary/20 bg-primary text-primary-foreground [a]:hover:bg-primary/90"
          >
            <ItemMedia className="size-10 rounded-lg bg-primary-foreground/15">
              <ScanBarcode className="size-5" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>Kassani ochish</ItemTitle>
              <ItemDescription className="text-primary-foreground/75">Yangi sotuvni boshlash</ItemDescription>
            </ItemContent>
            <ItemActions>
              <ChevronRight className="size-4" />
            </ItemActions>
          </Item>
        )}

        <ItemGroup className="grid grid-cols-2 gap-2 has-data-[size=sm]:gap-2">
          {actions.map((a) => (
            <Item
              key={a.href}
              size="sm"
              variant="outline"
              render={<Link href={a.href} />}
              className="flex-col items-start gap-2 p-3 [a]:hover:border-primary/40 [a]:hover:bg-primary/5"
            >
              <ItemMedia className="size-8 rounded-md bg-primary/10 text-primary group-has-data-[slot=item-description]/item:translate-y-0">
                <a.icon className="size-4" />
              </ItemMedia>
              <ItemContent className="w-full gap-0.5">
                <ItemTitle>{a.title}</ItemTitle>
                <ItemDescription className="line-clamp-1 text-xs">{a.description}</ItemDescription>
              </ItemContent>
            </Item>
          ))}
        </ItemGroup>
      </CardContent>
    </Card>
  )
}

function Dashboard() {
  const { can } = useAuth()
  const { query, ready } = usePeriod("today")
  const profit = can("reports.profit.read")

  const summary = useQuery({
    queryKey: ["reports", "summary", query],
    queryFn: () => api.get<Summary>("/reports/summary", query),
    enabled: ready,
  })
  const chart = useQuery({
    queryKey: ["reports", "sales-by-day", query],
    queryFn: () => api.get<SalesByDay>("/reports/sales-by-day", { ...query, preset: query.preset === "today" ? "week" : query.preset }),
    enabled: ready,
  })
  const top = useQuery({
    queryKey: ["reports", "top-products", query, 5],
    queryFn: () => api.get<TopProducts>("/reports/top-products", { ...query, limit: 5 }),
    enabled: ready,
  })
  const low = useQuery({ queryKey: ["reports", "low-stock"], queryFn: () => api.get<LowStock>("/reports/low-stock") })

  const s = summary.data
  const m = s?.methodology ?? {}
  const loading = summary.isLoading

  return (
    <div className="space-y-6">
      <PageHeader title="Boshqaruv paneli" description="Do‘kon ko‘rsatkichlari bir qarashda" />
      <PeriodFilter defaultPreset="today" />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border bg-card">
            <div className="grid grid-cols-2 xl:grid-cols-4">
              <Kpi primary label="Yalpi sotuv" value={formatMoney(s?.grossSales)} hint={m.grossSales} loading={loading} />
              <Kpi label="Sof tushum" value={formatMoney(s?.netRevenue)} hint={m.netRevenue} loading={loading} />
              <Kpi label="Cheklar soni" value={String(s?.receiptCount ?? 0)} hint={m.receiptCount} loading={loading} />
              <Kpi label="O‘rtacha chek" value={formatMoney(s?.averageReceipt)} hint={m.averageReceipt} loading={loading} />
              <Kpi label="Qaytarishlar" value={formatMoney(s?.refunds)} hint={m.refunds} loading={loading} />
              {profit && (
                <>
                  <Kpi label="Yalpi foyda" value={formatMoney(s?.grossProfit)} hint={m.grossProfit} loading={loading} />
                  <Kpi label="Ombor qiymati" value={formatMoney(s?.inventoryValue)} hint={m.inventoryValue} loading={loading} />
                </>
              )}
            </div>
          </div>
          {profit && s?.profitNote && !loading && <p className="px-1 text-xs text-muted-foreground">{s.profitNote}</p>}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Sotuv dinamikasi</CardTitle>
            <CardDescription>Kunlar bo‘yicha yalpi sotuv va qaytarishlar</CardDescription>
          </CardHeader>
          <CardContent>
            {chart.isError ? (
              <ErrorState error={chart.error} onRetry={() => void chart.refetch()} />
            ) : chart.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <SalesChart data={chart.data?.series ?? []} />
            )}
          </CardContent>
        </Card>

        <QuickActions />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Eng ko‘p sotilgan 5 mahsulot</CardTitle>
          </CardHeader>
          <CardContent>
            {top.isLoading ? (
              <LoadingRows rows={5} />
            ) : top.isError ? (
              <ErrorState error={top.error} onRetry={() => void top.refetch()} />
            ) : !top.data?.byQty.length ? (
              <EmptyState title="Bu davrda sotuv yo‘q" />
            ) : (
              <ul className="divide-y">
                {top.data.byQty.map((p) => (
                  <li key={p.productId} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="flex shrink-0 items-baseline gap-3 text-right tabular-nums">
                      <span>{formatQty(p.qty)}</span>
                      <span className="min-w-24 text-muted-foreground">{formatMoney(p.revenue)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-300" /> Kam qolgan mahsulotlar
            </CardTitle>
            <CardDescription>{low.data ? `Ombor: ${low.data.warehouse.name}` : undefined}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {low.isLoading ? (
              <LoadingRows rows={5} />
            ) : low.isError ? (
              <ErrorState error={low.error} onRetry={() => void low.refetch()} />
            ) : !low.data?.items.length ? (
              <EmptyState title="Kam qolgan mahsulot yo‘q" />
            ) : (
              <ul className="divide-y">
                {low.data.items.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate font-medium">{p.name}</span>
                    <span className="shrink-0 rounded-lg bg-amber-500/15 px-2 py-0.5 text-xs tabular-nums text-amber-700 dark:text-amber-300">
                      {formatQty(p.qty)} {UNIT_LABELS[p.unit] ?? ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" size="sm" render={<Link href="/inventory/products?lowStock=true" />} nativeButton={false}>
              <Package /> Hammasini ko‘rish
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function OwnerDashboardPage() {
  const { can } = useAuth()
  if (!can("reports.read")) return <NoAccess />
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  )
}
