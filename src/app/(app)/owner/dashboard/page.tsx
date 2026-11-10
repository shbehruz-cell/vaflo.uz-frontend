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
  CreditCard,
  LayoutDashboard,
  Package,
  Receipt,
  ScanBarcode,
  Timer,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist"
import { Gauge } from "@/components/app/gauge"
import { PeriodPicker } from "@/components/app/period-picker"
import { MetricList, Panel, PanelHeader, PanelIconButton, StatTile, type MetricRow } from "@/components/app/panel"
import { useUrlState } from "@/hooks/use-url-state"
import { PageHeader } from "@/components/app/page-header"
import { ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { PeriodFilter, PRESET_OPTIONS, usePeriod } from "@/components/reports/period-filter"
import { SalesChart } from "@/components/reports/sales-chart"
import type { LowStock, SalesByDay, Summary, TopProducts } from "@/components/reports/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { useAuth, type PermissionCode } from "@/lib/auth"
import { formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"

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

function DesktopStats({ s, loading, profit, series }: { s?: Summary; loading: boolean; profit: boolean; series: SalesByDay["series"] }) {
  const net = series.map((r) => Number(r.gross) - Number(r.refunds))
  const receipts = series.map((r) => r.receipts)
  const avg = series.map((r) => (r.receipts > 0 ? Number(r.gross) / r.receipts : 0))
  const spark = (d: number[]) => (d.length >= 2 ? d : undefined)
  const val = (v: string | number | null | undefined) => (loading ? <Skeleton className="h-8 w-32" /> : <Money value={v} unitClassName="text-muted-foreground" />)
  const showProfit = profit && s?.grossProfit != null

  return (
    <div className={cn("hidden gap-4 md:grid md:grid-cols-2", showProfit ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
      <StatTile label="Sof tushum" value={val(s?.netRevenue)} spark={spark(net)} href="/reports" />
      <StatTile
        label="Cheklar"
        value={loading ? <Skeleton className="h-8 w-16" /> : <span className="tabular-nums">{s?.receiptCount ?? 0}</span>}
        spark={spark(receipts)}
        href="/sales"
      />
      <StatTile label="O‘rtacha chek" value={val(s?.averageReceipt)} spark={spark(avg)} />
      {showProfit && <StatTile label="Yalpi foyda" value={val(s?.grossProfit)} href="/reports" />}
    </div>
  )
}

function finite(n: number) {
  return Number.isFinite(n) ? n : 0
}

function PaymentPanel({ cash, card }: { cash: { data?: Summary; isLoading: boolean; isError: boolean }; card: { data?: Summary; isLoading: boolean; isError: boolean } }) {
  const loading = cash.isLoading || card.isLoading
  const failed = cash.isError || card.isError
  const cashSum = finite(Number(cash.data?.grossSales ?? 0))
  const cardSum = finite(Number(card.data?.grossSales ?? 0))
  const total = cashSum + cardSum
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0)
  return (
    <Panel>
      <PanelHeader icon={<CreditCard />} title="To‘lov turlari" />
      {loading ? (
        <Skeleton className="h-40 w-full" />
      ) : failed ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Ma’lumotni yuklab bo‘lmadi</p>
      ) : total === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Bu davrda sotuv yo‘q</p>
      ) : (
        <>
          <Gauge
            segments={[
              { value: cashSum, color: "var(--chart-1)", label: "Naqd" },
              { value: cardSum, color: "var(--chart-2)", label: "Karta" },
            ]}
            center={`${Math.round(pct(cashSum))}%`}
            sub="Naqd ulushi"
          />
          <MetricList
            className="mt-4"
            rows={[
              { key: "cash", dotColor: "var(--chart-1)", label: "Naqd", count: formatMoney(cashSum), pct: pct(cashSum) },
              { key: "card", dotColor: "var(--chart-2)", label: "Karta", count: formatMoney(cardSum), pct: pct(cardSum) },
            ]}
          />
          <p className="mt-2 text-xs text-muted-foreground">To‘lov turi bo‘yicha; aralash to‘lovli cheklar ikkala qatorda ham hisoblanadi.</p>
        </>
      )}
    </Panel>
  )
}

function Dashboard() {
  const { can } = useAuth()
  const { set } = useUrlState()
  const { query, ready, preset, dateFrom, dateTo } = usePeriod("today")
  const profit = can("reports.profit.read")
  const invalid = preset === "custom" && !!dateFrom && !!dateTo && dateFrom > dateTo

  // Bir kunlik davrda (bugun/kecha) kunlik ustunli grafik ma’nosiz — oxirgi 7 kun ko‘rsatiladi (bugun bilan tugaydi).
  const singleDay = query.preset === "today" || query.preset === "yesterday"
  const summary = useQuery({
    queryKey: ["reports", "summary", query],
    queryFn: () => api.get<Summary>("/reports/summary", query),
    enabled: ready,
  })
  const chart = useQuery({
    queryKey: ["reports", "sales-by-day", query],
    queryFn: () => api.get<SalesByDay>("/reports/sales-by-day", { ...query, preset: singleDay ? "week" : query.preset }),
    enabled: ready,
  })
  const top = useQuery({
    queryKey: ["reports", "top-products", query, 5],
    queryFn: () => api.get<TopProducts>("/reports/top-products", { ...query, limit: 5 }),
    enabled: ready,
  })
  const cash = useQuery({
    queryKey: ["reports", "summary", query, "CASH"],
    queryFn: () => api.get<Summary>("/reports/summary", { ...query, paymentMethod: "CASH" }),
    enabled: ready,
  })
  const card = useQuery({
    queryKey: ["reports", "summary", query, "CARD"],
    queryFn: () => api.get<Summary>("/reports/summary", { ...query, paymentMethod: "CARD" }),
    enabled: ready,
  })
  const low = useQuery({ queryKey: ["reports", "low-stock"], queryFn: () => api.get<LowStock>("/reports/low-stock") })

  const s = summary.data
  const loading = summary.isLoading
  const series = chart.data?.series ?? []
  const chartTotal = series.reduce((acc, r) => acc + (Number.isFinite(Number(r.gross)) ? Number(r.gross) : 0), 0)
  const periodLabel = PRESET_OPTIONS.find((p) => p.value === query.preset)?.label ?? ""
  const gross = Number(s?.grossSales ?? 0)

  const topRows: MetricRow[] = (top.data?.byQty ?? []).map((p) => {
    const rev = Number(p.revenue)
    return {
      key: p.productId,
      label: p.name,
      count: `${formatQty(p.qty)} dona`,
      pct: gross > 0 && Number.isFinite(rev) ? Math.min((rev / gross) * 100, 100) : undefined,
    }
  })

  return (
    <div className="space-y-5 md:space-y-6">
      <MobileGreeting />
      <div className="hidden md:block">
        <PageHeader
          eyebrow={
            <>
              <LayoutDashboard /> Asosiy
            </>
          }
          title="Boshqaruv paneli"
          description="Do‘kon ko‘rsatkichlari bir qarashda"
        />
      </div>
      <div className="md:hidden">
        <PeriodFilter defaultPreset="today" />
      </div>

      {summary.isError ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} />
      ) : (
        <>
          <MobileKpis s={s} loading={loading} profit={profit} periodLabel={periodLabel} />
          <DesktopStats s={s} loading={loading} profit={profit} series={series} />
          {profit && s?.profitNote && !loading && <p className="-mt-3 px-1 text-xs text-muted-foreground md:-mt-4">{s.profitNote}</p>}
        </>
      )}

      <MobileShortcuts />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel className="flex flex-col lg:col-span-2">
          <PanelHeader
            icon={<BarChart3 />}
            title={singleDay ? "Sotuv dinamikasi · oxirgi 7 kun" : `Sotuv dinamikasi${query.preset === "custom" ? " · tanlangan davr" : periodLabel ? ` · ${periodLabel.toLowerCase()}` : ""}`}
            value={chart.isLoading ? undefined : `Jami${singleDay ? " (7 kun)" : ""}: ${formatMoney(chartTotal)}`}
            actions={
              <>
                <div className="hidden md:block">
                  <PeriodPicker
                    variant="inline"
                    options={PRESET_OPTIONS.filter((p) => p.value !== "custom")}
                    value={preset}
                    onChange={(v) => set({ preset: v === "today" ? "" : v, dateFrom: "", dateTo: "", page: "" })}
                    custom={{
                      active: preset === "custom",
                      from: dateFrom,
                      to: dateTo,
                      invalid,
                      onFrom: (v) => set({ preset: "custom", dateFrom: v, page: "" }),
                      onTo: (v) => set({ preset: "custom", dateTo: v, page: "" }),
                    }}
                  />
                </div>
                <PanelIconButton label="Hisobotlarga o‘tish" href="/reports" />
              </>
            }
          />
          {/* Grafik panelning qolgan balandligini to‘ldiradi (o‘ng ustun baland bo‘lsa ham bo‘sh joy qolmaydi) */}
          <div className="flex min-h-64 flex-1 flex-col">
            {chart.isError ? (
              <ErrorState error={chart.error} onRetry={() => void chart.refetch()} />
            ) : chart.isLoading ? (
              <Skeleton className="min-h-64 w-full flex-1" />
            ) : (
              <SalesChart data={series} className="aspect-auto h-full min-h-64 w-full flex-1" />
            )}
          </div>
        </Panel>

        <div className="space-y-4">
          <OnboardingChecklist />
          <QuickActions />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Panel>
          <PanelHeader icon={<Package />} title="Top-5 mahsulot" actions={<PanelIconButton label="Hisobotlarga o‘tish" href="/reports" />} />
          {top.isLoading ? (
            <LoadingRows rows={5} />
          ) : top.isError ? (
            <ErrorState error={top.error} onRetry={() => void top.refetch()} />
          ) : (
            <MetricList columns={["Mahsulot", "Soni", "Ulush"]} rows={topRows} empty="Bu davrda sotuv yo‘q" />
          )}
        </Panel>

        <PaymentPanel cash={cash} card={card} />

        <Panel className="md:col-span-2 xl:col-span-1">
          <PanelHeader
            icon={<AlertTriangle />}
            title="Kam qolgan"
            actions={<PanelIconButton label="Hammasini ko‘rish" href="/inventory/products?low=1" />}
          />
          {low.isLoading ? (
            <LoadingRows rows={5} />
          ) : low.isError ? (
            <ErrorState error={low.error} onRetry={() => void low.refetch()} />
          ) : !low.data?.items.length ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Kam qolgan mahsulot yo‘q</p>
          ) : (
            <>
              <ul className="divide-y divide-border/60 text-sm">
                {low.data.items.slice(0, 6).map((p) => {
                  const q = Number(p.qty)
                  const out = Number.isFinite(q) && q <= 0
                  return (
                    <li key={p.id} className="flex min-h-10 items-center justify-between gap-3 py-1.5">
                      <span className="min-w-0 truncate font-medium">{p.name}</span>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs tabular-nums",
                          out ? "bg-destructive/10 text-destructive" : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                        )}
                      >
                        <span aria-hidden className="size-1.5 rounded-full bg-current" />
                        {formatQty(p.qty)} {UNIT_LABELS[p.unit] ?? ""}
                      </span>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-muted-foreground">Ombor: {low.data.warehouse.name}</p>
            </>
          )}
        </Panel>
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
