"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DateRangeFields, FilterBar } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PaginationBar } from "@/components/app/pagination-bar"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { CustomerFilter } from "@/components/sales/customer-filter"
import { NativeSelect } from "@/components/sales/native-select"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import type { SaleListRow } from "@/components/sales/types"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlState } from "@/hooks/use-url-state"
import { PAYMENT_LABELS, SALE_STATUS_LABELS, formatDateTime, formatMoney } from "@/lib/format"

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

  const chip = (label: string, f: string, t: string) => {
    const active = from === f && to === t
    return (
      <Button
        key={label}
        type="button"
        size="sm"
        className="shrink-0"
        variant={active ? "default" : "outline"}
        onClick={() => url.set({ from: f, to: t, page: 1 })}
      >
        {label}
      </Button>
    )
  }
  const today = tashkentDate(0)
  const yesterday = tashkentDate(1)

  return (
    <div className="space-y-4">
      <PageHeader title="Sotuvlar tarixi" description="Cheklar, qaytarishlar va bekor qilingan sotuvlar" />
      {!readAll && (
        <p className="rounded-lg border bg-card px-3 py-2 text-sm text-muted-foreground">Faqat o‘z sotuvlaringiz</p>
      )}

      <FilterBar
        search={<Input className="h-10" placeholder="Chek raqami" aria-label="Chek raqami" value={receipt} onChange={(e) => setReceipt(e.target.value)} />}
        activeCount={Object.keys(url.all).filter((k) => k !== "page").length}
        onReset={() => {
          setReceipt("")
          setBarcode("")
          router.replace("/sales")
        }}
      >
        <div className="scroll-row flex gap-2">
          {chip("Bugun", today, today)}
          {chip("Kecha", yesterday, yesterday)}
          {chip("7 kun", tashkentDate(6), today)}
          {chip("Oy", today.slice(0, 8) + "01", today)}
        </div>
          <label className="space-y-1 text-xs text-muted-foreground">
            Mahsulot shtrix-kodi
            <Input className="h-10" placeholder="Shtrix-kod" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          </label>
        <DateRangeFields from={from} to={to} onFrom={(v) => url.set({ from: v, page: 1 })} onTo={(v) => url.set({ to: v, page: 1 })} />
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
          <div className="space-y-2 md:hidden">
            {q.data.items.map((s) => (
              <Link key={s.id} href={`/sales/${s.id}`} className="block">
                <div className="space-y-1.5 rounded-2xl border bg-card p-3 active:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium tabular-nums">№ {s.receiptNo}</span>
                    <SaleStatusBadge status={s.status} />
                  </div>
                  <div className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</div>
                  <div className="flex flex-wrap items-center gap-1">
                    {s.payments.map((p, i) => (
                      <Badge key={i} variant="outline">
                        {PAYMENT_LABELS[p.method] ?? p.method}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{s.customerName ?? ""}</span>
                    <span className="font-semibold tabular-nums">{formatMoney(s.total)}</span>
                  </div>
                  {Number(s.refundedTotal) > 0 && (
                    <div className="text-xs text-destructive tabular-nums">Qaytarilgan: {formatMoney(s.refundedTotal)}</div>
                  )}
                </div>
              </Link>
            ))}
          </div>

          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Chek №</TableHead>
                  <TableHead>Sana</TableHead>
                  <TableHead>Kassir</TableHead>
                  <TableHead className="hidden lg:table-cell">Xaridor</TableHead>
                  <TableHead>To‘lov</TableHead>
                  <TableHead className="text-right">Jami</TableHead>
                  <TableHead className="text-right">Qaytarilgan</TableHead>
                  <TableHead>Holat</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((s) => (
                  <TableRow key={s.id} className={`${TROW} cursor-pointer`} onClick={() => router.push(`/sales/${s.id}`)}>
                    <TableCell className="font-medium">
                      <Link href={`/sales/${s.id}`} onClick={(e) => e.stopPropagation()}>
                        {s.receiptNo}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(s.createdAt)}</TableCell>
                    <TableCell>{s.cashierName ?? "—"}</TableCell>
                    <TableCell className="hidden lg:table-cell">{s.customerName ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.payments.map((p, i) => (
                          <Badge key={i} variant="outline">
                            {PAYMENT_LABELS[p.method] ?? p.method}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(s.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-destructive">
                      {Number(s.refundedTotal) > 0 ? formatMoney(s.refundedTotal) : ""}
                    </TableCell>
                    <TableCell>
                      <SaleStatusBadge status={s.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={q.data.page} pages={q.data.pages} total={q.data.total} onPage={(p) => url.set({ page: p })} />
        </>
      )}
    </div>
  )
}
