"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronRight,
  ClipboardList,
  Info,
  Package,
  Receipt,
  ScanBarcode,
  Timer,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { PeriodFilter, PRESET_OPTIONS, usePeriod } from "@/components/reports/period-filter"
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
    <Card className="hidden rounded-2xl md:flex">
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

// ---------- Mobil ko‘rinish (telefon ilovalari uslubida) ----------

const WEEKDAYS = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"]
const MONTHS = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"]

function MobileGreeting() {
  const { user } = useAuth()
  const now = new Date()
  const h = now.getHours()
  const hello = h < 5 ? "Xayrli tun" : h < 12 ? "Xayrli tong" : h < 18 ? "Xayrli kun" : "Xayrli kech"
  const first = user?.name.split(" ")[0] ?? ""
  return (
    <div className="md:hidden">
      <p className="text-sm text-muted-foreground">
        {now.getDate()}-{MONTHS[now.getMonth()]}, {WEEKDAYS[now.getDay()]}
      </p>
      <h1 className="mt-0.5 text-2xl font-semibold tracking-tight">
        {hello}, {first}
      </h1>
    </div>
  )
}

/** Summani raqam va valyutaga ajratadi — katta raqam yonida "so‘m" kichikroq turadi. */
function Money({ value, unitClassName }: { value: string | number | null | undefined; unitClassName?: string }) {
  return (
    <span className="tabular-nums">
      {formatMoney(value, false)}
      <span className={cn("ml-1 text-[0.55em] font-medium", unitClassName)}>so‘m</span>
    </span>
  )
}

function MobileKpis({ s, loading, profit, periodLabel }: { s?: Summary; loading: boolean; profit: boolean; periodLabel: string }) {
  const cells: { label: string; value: string | null | undefined }[] = [
    { label: "O‘rtacha chek", value: s?.averageReceipt },
    { label: "Qaytarishlar", value: s?.refunds },
    ...(profit
      ? [
          { label: "Yalpi foyda", value: s?.grossProfit },
          { label: "Ombor qiymati", value: s?.inventoryValue },
        ]
      : []),
  ]

  return (
    <div className="space-y-3 md:hidden">
      {/* Asosiy karta: tanlangan davrdagi savdo */}
      <section aria-label="Savdo" className="rounded-2xl bg-primary p-5 text-primary-foreground">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-primary-foreground/75">Yalpi sotuv</span>
          <span className="rounded-full bg-primary-foreground/15 px-2.5 py-0.5 text-xs font-medium">{periodLabel}</span>
        </div>
        {loading ? (
          <Skeleton className="mt-2 h-10 w-48 bg-primary-foreground/20" />
        ) : (
          <div className="mt-1 truncate text-4xl leading-tight font-bold tracking-tight">
            <Money value={s?.grossSales} unitClassName="text-primary-foreground/75" />
          </div>
        )}
        <div className="mt-4 grid grid-cols-2 border-t border-primary-foreground/20 pt-3">
          <div className="min-w-0 border-r border-primary-foreground/20 pr-3">
            <div className="text-xs text-primary-foreground/75">Sof tushum</div>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-24 bg-primary-foreground/20" />
            ) : (
              <div className="truncate text-lg font-semibold">
                <Money value={s?.netRevenue} unitClassName="text-primary-foreground/75" />
              </div>
            )}
          </div>
          <div className="min-w-0 pl-4">
            <div className="text-xs text-primary-foreground/75">Cheklar soni</div>
            {loading ? (
              <Skeleton className="mt-1 h-6 w-12 bg-primary-foreground/20" />
            ) : (
              <div className="text-lg font-semibold tabular-nums">{s?.receiptCount ?? 0}</div>
            )}
          </div>
        </div>
      </section>

      {/* Qo‘shimcha ko‘rsatkichlar: bitta qog‘oz yuzada, chiziqlar bilan */}
      <section aria-label="Ko‘rsatkichlar" className="grid grid-cols-2 overflow-hidden rounded-2xl border bg-card">
        {cells.map((c) => (
          <div key={c.label} className="-mr-px -mb-px min-w-0 border-r border-b p-4">
            <div className="text-xs text-muted-foreground">{c.label}</div>
            {loading ? (
              <Skeleton className="mt-1.5 h-6 w-24" />
            ) : (
              <div className="mt-0.5 truncate text-lg font-semibold tracking-tight">
                <Money value={c.value} unitClassName="text-muted-foreground" />
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  )
}

const SHORTCUTS: { href: string; label: string; icon: LucideIcon; permissions: PermissionCode[]; primary?: boolean }[] = [
  { href: "/pos", label: "Kassa", icon: ScanBarcode, permissions: ["sales.create"], primary: true },
  { href: "/inventory/products", label: "Mahsulotlar", icon: Boxes, permissions: ["products.read"] },
  { href: "/sales", label: "Sotuvlar", icon: Receipt, permissions: ["sales.read.all", "sales.read.own"] },
  { href: "/customers", label: "Xaridorlar", icon: UserRound, permissions: ["customers.read"] },
  { href: "/reports", label: "Hisobotlar", icon: BarChart3, permissions: ["reports.read"] },
  { href: "/shifts", label: "Smenalar", icon: Timer, permissions: ["shifts.manage", "shifts.read.all"] },
  { href: "/inventory/movements", label: "Harakatlar", icon: ClipboardList, permissions: ["inventory.read"] },
  { href: "/owner/users", label: "Xodimlar", icon: Users, permissions: ["users.manage", "roles.manage"] },
]

function MobileShortcuts() {
  const { can } = useAuth()
  const items = SHORTCUTS.filter((a) => can(...a.permissions))
  if (!items.length) return null
  return (
    <section aria-labelledby="shortcuts-title" className="rounded-2xl border bg-card p-4 md:hidden">
      <h2 id="shortcuts-title" className="text-base font-semibold">
        Tez amallar
      </h2>
      <div className="mt-3 grid grid-cols-4 gap-x-2 gap-y-4">
        {items.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group flex min-w-0 flex-col items-center gap-1.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl transition-colors",
                a.primary ? "bg-primary text-primary-foreground group-active:bg-primary/90" : "bg-primary/10 text-primary group-active:bg-primary/20",
              )}
            >
              <a.icon className="size-5" />
            </span>
            <span className="w-full truncate text-center text-xs font-medium">{a.label}</span>
          </Link>
        ))}
      </div>
    </section>
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
  const periodLabel = PRESET_OPTIONS.find((p) => p.value === query.preset)?.label ?? ""

  return (
    <div className="space-y-5 md:space-y-6">
      <MobileGreeting />
      <div className="hidden md:block">
        <PageHeader title="Boshqaruv paneli" description="Do‘kon ko‘rsatkichlari bir qarashda" />
      </div>
      <PeriodFilter defaultPreset="today" />

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <MobileKpis s={s} loading={loading} profit={profit} periodLabel={periodLabel} />
          <div className="hidden space-y-2 md:block">
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
          </div>
          {profit && s?.profitNote && !loading && <p className="-mt-3 px-1 text-xs text-muted-foreground md:-mt-4">{s.profitNote}</p>}
        </>
      )}

      <MobileShortcuts />

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
