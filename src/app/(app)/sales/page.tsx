"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Banknote, ChevronRight, CreditCard, Receipt, ReceiptText, Shuffle, type LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { FilterBar, FilterField, type FilterChip } from "@/components/app/filter-bar"
import { SearchInput } from "@/components/app/search-input"
import { PeriodPicker } from "@/components/app/period-picker"
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
  const chips: FilterChip[] = []
  if (barcode.trim() || url.get("barcode"))
    chips.push({
      key: "barcode",
      label: `Shtrix-kod: ${barcode.trim().length > 6 ? barcode.trim().slice(0, 6) + "…" : barcode.trim()}`,
      onRemove: () => {
        setBarcode("")
        url.set({ barcode: null, page: 1 })
      },
    })
  if (customerId) chips.push({ key: "customerId", label: "Xaridor tanlangan", onRemove: () => url.set({ customerId: null, page: 1 }) })
  if (cashierId) chips.push({ key: "cashierId", label: `Kassir: ${users.data?.items.find((u) => u.id === cashierId)?.name ?? "tanlangan"}`, onRemove: () => url.set({ cashierId: null, page: 1 }) })
  if (registerId) chips.push({ key: "registerId", label: `Kassa: ${registers.data?.find((r) => r.id === registerId)?.name ?? "tanlangan"}`, onRemove: () => url.set({ registerId: null, page: 1 }) })
  if (paymentMethod) chips.push({ key: "paymentMethod", label: `To‘lov: ${PAYMENT_LABELS[paymentMethod] ?? paymentMethod}`, onRemove: () => url.set({ paymentMethod: null, page: 1 }) })
  if (status) chips.push({ key: "status", label: `Holat: ${SALE_STATUS_LABELS[status] ?? status}`, onRemove: () => url.set({ status: null, page: 1 }) })
  const activeCount = chips.length

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 hidden items-center gap-1.5 text-xs font-medium text-muted-foreground md:flex [&_svg]:size-3.5">
            <Receipt /> Sotuvlar
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sotuvlar</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {q.data ? `${q.data.total} ta chek` : "Cheklar, qaytarishlar va bekor qilinganlar"}
            {!readAll && <span className="ml-2">(faqat o‘zingizniki)</span>}
          </p>
        </div>
      </div>

      <PeriodPicker
        options={presets.map((p) => ({ value: p.label, label: p.label }))}
        value={presets.find((p) => p.f === from && p.t === to)?.label ?? ""}
        onChange={(v) => {
          const p = presets.find((x) => x.label === v)
          if (p) url.set({ from: p.f, to: p.t, page: 1 })
        }}
        custom={{
          active: customRange,
          from,
          to,
          invalid: !!from && !!to && from > to,
          onFrom: (v) => url.set({ from: v, page: 1 }),
          onTo: (v) => url.set({ to: v, page: 1 }),
        }}
      />

      <FilterBar
        search={<SearchInput value={receipt} onChange={setReceipt} placeholder="Chek raqami bo‘yicha qidirish" aria-label="Chek raqami" inputMode="numeric" />}
        activeCount={activeCount}
        chips={chips}
        onReset={() => {
          setReceipt("")
          setBarcode("")
          router.replace("/sales")
        }}
      >
        <FilterField label="Mahsulot shtrix-kodi">
          <Input className="h-10 w-full" placeholder="Shtrix-kod" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
        </FilterField>
        <FilterField label="Xaridor" group>
          <CustomerFilter customerId={customerId} onChange={(id) => url.set({ customerId: id, page: 1 })} />
        </FilterField>
        {canUsers && (
          <FilterField label="Kassir">
            <NativeSelect className="w-full" value={cashierId} onChange={(e) => url.set({ cashierId: e.target.value, page: 1 })}>
              <option value="">Barchasi</option>
              {users.data?.items.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </NativeSelect>
          </FilterField>
        )}
        <FilterField label="Kassa">
          <NativeSelect className="w-full" value={registerId} onChange={(e) => url.set({ registerId: e.target.value, page: 1 })}>
            <option value="">Barchasi</option>
            {registers.data?.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="To‘lov usuli">
          <NativeSelect className="w-full" value={paymentMethod} onChange={(e) => url.set({ paymentMethod: e.target.value, page: 1 })}>
            <option value="">Barchasi</option>
            {Object.entries(PAYMENT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
        <FilterField label="Holat">
          <NativeSelect className="w-full" value={status} onChange={(e) => url.set({ status: e.target.value, page: 1 })}>
            <option value="">Barchasi</option>
            {Object.entries(SALE_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </NativeSelect>
        </FilterField>
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
