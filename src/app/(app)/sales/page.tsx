"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Banknote, ChevronRight, CreditCard, ReceiptText, Search, Shuffle, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { DateRangeFields, FilterBar } from "@/components/app/filter-bar"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PaginationBar } from "@/components/app/pagination-bar"
import { CustomerFilter } from "@/components/sales/customer-filter"
import { NativeSelect } from "@/components/sales/native-select"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import type { SaleListRow } from "@/components/sales/types"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlState } from "@/hooks/use-url-state"
import { PAYMENT_LABELS, SALE_STATUS_LABELS, dayKey, formatDayLabel, formatMoney, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface UserRow {
  id: string
  name: string
}
interface RegisterRow {
  id: string
  name: string
  code: string
}

/** Toshkent sanasi (YYYY-MM-DD), `offsetDays` kun oldin. */
function tashkentDate(offsetDays = 0) {
  const d = new Date(Date.now() - offsetDays * 86400000)
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" }).format(d)
}

export default function SalesPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <SalesContent />
    </Suspense>
  )
}

function SalesContent() {
  const { can } = useAuth()
  const router = useRouter()
  const url = useUrlState()
  const page = Number(url.get("page", "1")) || 1
  const from = url.get("from")
  const to = url.get("to")
  const customerId = url.get("customerId")
  const cashierId = url.get("cashierId")
  const registerId = url.get("registerId")
  const paymentMethod = url.get("paymentMethod")
  const status = url.get("status")

  const [receipt, setReceipt] = useState(url.get("receiptNo"))
  const [barcode, setBarcode] = useState(url.get("barcode"))
  useEffect(() => {
    const t = setTimeout(() => {
      if (receipt.trim() !== url.get("receiptNo") || barcode.trim() !== url.get("barcode")) {
        url.set({ receiptNo: receipt.trim(), barcode: barcode.trim(), page: 1 })
      }
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt, barcode])

  const readAll = can("sales.read.all")
  const canUsers = can("users.manage")

  const users = useQuery({
    queryKey: ["users", "cashier-filter"],
    queryFn: () => api.get<Paginated<UserRow>>("/users", { pageSize: 100 }),
    enabled: canUsers,
  })
  const registers = useQuery({
    queryKey: ["registers"],
    queryFn: () => api.get<RegisterRow[]>("/registers"),
  })

  const params = {
    page,
    pageSize: 25,
    dateFrom: from ? `${from}T00:00:00+05:00` : undefined,
    dateTo: to ? `${to}T23:59:59.999+05:00` : undefined,
    receiptNo: url.get("receiptNo") || undefined,
    barcode: url.get("barcode") || undefined,
    customerId: customerId || undefined,
    cashierId: cashierId || undefined,
    registerId: registerId || undefined,
    paymentMethod: paymentMethod || undefined,
    status: status || undefined,
  }
  const q = useQuery({
    queryKey: ["sales", params],
    queryFn: () => api.get<Paginated<SaleListRow>>("/sales", params),
  })

  const today = tashkentDate(0)
  const yesterday = tashkentDate(1)
  const presets = [
    { label: "Barchasi", f: "", t: "" },
    { label: "Bugun", f: today, t: today },
    { label: "Kecha", f: yesterday, t: yesterday },
    { label: "7 kun", f: tashkentDate(6), t: today },
    { label: "Shu oy", f: today.slice(0, 8) + "01", t: today },
  ]
  // Sana chiplari alohida ko‘rinadi — filtr panelidagi hisobga faqat qolgan filtrlar kiradi
  const customRange = (!!from || !!to) && !presets.some((p) => p.f === from && p.t === to)
  const activeCount = Object.keys(url.all).filter((k) => !["page", "from", "to", "receiptNo"].includes(k)).length + (customRange ? 1 : 0)

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">Sotuvlar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {q.data ? `${q.data.total} ta chek` : "Cheklar, qaytarishlar va bekor qilinganlar"}
            {!readAll && <span className="ml-2">(faqat o‘zingizniki)</span>}
          </p>
        </div>
      </div>

      <div className="scroll-row -mx-4 gap-2 px-4 sm:mx-0 sm:px-0" role="group" aria-label="Davr">
        {presets.map((p) => {
          const active = from === p.f && to === p.t
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={active}
              onClick={() => url.set({ from: p.f, to: p.t, page: 1 })}
              className={cn(
                "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {p.label}
            </button>
          )
        })}
      </div>

      <FilterBar
        collapsed
        search={
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-10 pl-9"
              placeholder="Chek raqami bo‘yicha qidirish"
              aria-label="Chek raqami"
              inputMode="numeric"
              value={receipt}
              onChange={(e) => setReceipt(e.target.value)}
            />
          </div>
        }
        activeCount={activeCount}
        onReset={() => {
          setReceipt("")
          setBarcode("")
          router.replace("/sales")
        }}
      >
          <label className="space-y-1 text-xs text-muted-foreground">
            Mahsulot shtrix-kodi
            <Input className="h-10" placeholder="Shtrix-kod" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </label>
        <div className="space-y-1 text-xs text-muted-foreground">
          Sana oralig‘i
          <DateRangeFields from={from} to={to} onFrom={(v) => url.set({ from: v, page: 1 })} onTo={(v) => url.set({ to: v, page: 1 })} />
        </div>
          <div className="space-y-1 text-xs text-muted-foreground">
            Xaridor
            <CustomerFilter customerId={customerId} onChange={(id) => url.set({ customerId: id, page: 1 })} />
          </div>
          {canUsers && (
            <label className="space-y-1 text-xs text-muted-foreground">
              Kassir
              <NativeSelect value={cashierId} onChange={(e) => url.set({ cashierId: e.target.value, page: 1 })}>
                <option value="">Barchasi</option>
                {users.data?.items.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
          <label className="space-y-1 text-xs text-muted-foreground">
            Kassa
            <NativeSelect value={registerId} onChange={(e) => url.set({ registerId: e.target.value, page: 1 })}>
              <option value="">Barchasi</option>
              {registers.data?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            To‘lov usuli
            <NativeSelect value={paymentMethod} onChange={(e) => url.set({ paymentMethod: e.target.value, page: 1 })}>
              <option value="">Barchasi</option>
              {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="space-y-1 text-xs text-muted-foreground">
            Holat
            <NativeSelect value={status} onChange={(e) => url.set({ status: e.target.value, page: 1 })}>
              <option value="">Barchasi</option>
              {Object.entries(SALE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </NativeSelect>
          </label>
      </FilterBar>

      {q.isLoading ? (
        <LoadingRows />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.items.length === 0 ? (
        <EmptyState title="Sotuvlar topilmadi" description="Filtrlarni o‘zgartirib ko‘ring." />
      ) : (
        <>
          {groupByDay(q.data.items).map((g) => (
            <section key={g.key} aria-labelledby={`day-${g.key}`}>
              <div className="flex items-baseline justify-between gap-3 px-1 pb-2">
                <h2 id={`day-${g.key}`} className="text-sm font-semibold">
                  {formatDayLabel(g.key)}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">{g.items.length} ta chek</span>
              </div>
              <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
                {g.items.map((s) => (
                  <li key={s.id}>
                    <SaleRow s={s} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          <PaginationBar page={q.data.page} pages={q.data.pages} total={q.data.total} onPage={(p) => url.set({ page: p })} />
        </>
      )}
    </div>
  )
}

function groupByDay(items: SaleListRow[]) {
  const groups: { key: string; items: SaleListRow[] }[] = []
  for (const s of items) {
    const key = dayKey(s.createdAt)
    const last = groups[groups.length - 1]
    if (last?.key === key) last.items.push(s)
    else groups.push({ key, items: [s] })
  }
  return groups
}

function paymentKind(s: SaleListRow): { label: string; icon: LucideIcon } {
  const methods = new Set(s.payments.map((p) => p.method))
  if (methods.size > 1) return { label: "Aralash", icon: Shuffle }
  if (methods.has("CARD")) return { label: "Karta", icon: CreditCard }
  if (methods.has("CASH")) return { label: "Naqd", icon: Banknote }
  return { label: "—", icon: ReceiptText }
}

/** Bitta chek qatori — barcha ekranlarda bir xil tuzilma; kengroq ekranda qo‘shimcha ustunlar chiqadi. */
function SaleRow({ s }: { s: SaleListRow }) {
  const voided = s.status === "VOIDED"
  const refunded = Number(s.refundedTotal) > 0
  const pay = paymentKind(s)
  return (
    <Link
      href={`/sales/${s.id}`}
      className="flex min-h-16 items-center gap-3 px-3 py-2.5 outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted/60 active:bg-muted/70 sm:px-4"
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-xl",
          voided ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary",
        )}
        aria-hidden
      >
        <pay.icon className="size-[18px]" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium tabular-nums">№ {s.receiptNo}</span>
          {s.status !== "COMPLETED" && (
            <span className="hidden sm:inline-flex">
              <SaleStatusBadge status={s.status} />
            </span>
          )}
        </div>
        <div className="mt-0.5 flex min-w-0 items-center gap-x-2 text-xs text-muted-foreground">
          <span className="shrink-0 tabular-nums">{formatTime(s.createdAt)}</span>
          {/* Telefonda holat badge o‘rniga qisqa rangli yozuv — chek raqami kesilmasligi uchun */}
          {s.status !== "COMPLETED" && (
            <span className={cn("shrink-0 font-medium sm:hidden", voided ? "text-destructive" : "text-amber-700 dark:text-amber-300")}>
              {SALE_STATUS_LABELS[s.status] ?? s.status}
            </span>
          )}
          {s.cashierName && <span className="truncate">{s.cashierName}</span>}
          {s.customerName && <span className="truncate text-foreground/80 xl:hidden">{s.customerName}</span>}
        </div>
      </div>

      {/* Keng ekran: xaridor va to‘lov usuli alohida ustunlarda */}
      <div className="hidden w-40 min-w-0 truncate text-sm text-muted-foreground xl:block">{s.customerName ?? ""}</div>
      <div className="hidden w-20 text-sm text-muted-foreground lg:block">{pay.label}</div>

      <div className="shrink-0 text-right">
        <div className={cn("font-semibold tabular-nums", voided && "text-muted-foreground line-through")}>{formatMoney(s.total)}</div>
        {refunded ? (
          <div className="text-xs text-destructive tabular-nums">−{formatMoney(s.refundedTotal)}</div>
        ) : (
          <div className="text-xs text-muted-foreground tabular-nums">{s.itemCount} ta mahsulot</div>
        )}
      </div>
      <ChevronRight className="hidden size-4 shrink-0 text-muted-foreground sm:block" aria-hidden />
    </Link>
  )
}
