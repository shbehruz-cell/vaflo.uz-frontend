"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Banknote, CalendarClock, CircleDot, Clock, Scale, Store, Timer, User, UserRound } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PeriodPicker } from "@/components/app/period-picker"
import { PageHeader } from "@/components/app/page-header"
import { ColumnHead } from "@/components/app/column-head"
import { StatusChip } from "@/components/app/status-chip"
import { ViewTabs } from "@/components/app/view-tabs"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { PaginationBar } from "@/components/app/pagination-bar"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { CURRENT_SHIFT_KEY } from "@/components/pos/use-current-shift"
import type { ShiftDetail, ShiftRow } from "@/components/pos/types"
import { CashMovementDialog } from "@/components/shifts/cash-movement-dialog"
import { CloseShiftDialog } from "@/components/shifts/close-shift-dialog"
import { DifferenceText, ShiftStats, ShiftStatusBadge } from "@/components/shifts/shift-summary"
import { useUrlState } from "@/hooks/use-url-state"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime, formatMoney } from "@/lib/format"

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

function ShiftChip({ status }: { status: "OPEN" | "CLOSED" }) {
  return <StatusChip tone={status === "OPEN" ? "success" : "neutral"}>{status === "OPEN" ? "Ochiq" : "Yopilgan"}</StatusChip>
}

export default function ShiftsPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ShiftsContent />
    </Suspense>
  )
}

function CurrentShiftCard() {
  const { can } = useAuth()
  const current = useQuery({
    queryKey: CURRENT_SHIFT_KEY,
    queryFn: () => api.get<ShiftDetail | null>("/shifts/current"),
    refetchInterval: 15_000,
    enabled: can("shifts.manage"),
  })

  if (!can("shifts.manage")) return null
  if (current.isLoading) return <Skeleton className="h-48 w-full rounded-2xl" />
  if (current.isError) return <ErrorState error={current.error} onRetry={() => current.refetch()} />
  const shift = current.data
  if (!shift) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Smena ochilmagan</CardTitle>
          <CardDescription>Sotuvni boshlash uchun kassa sahifasida smenani oching.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="h-11 w-full md:h-8 md:w-auto" render={<Link href="/pos" />} nativeButton={false}>
            Kassaga o‘tish
          </Button>
        </CardContent>
      </Card>
    )
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Joriy smena <ShiftStatusBadge status={shift.status} />
        </CardTitle>
        <CardDescription className="flex flex-col gap-1 md:block">
          <span className="inline-flex items-center gap-1.5">
            <Store className="size-3.5 md:hidden" aria-hidden />
            {shift.register?.name ?? "Kassa"}
          </span>{" "}
          <span className="inline-flex items-center gap-1.5 md:ml-3">
            <Clock className="size-3.5 md:hidden" aria-hidden />
            {formatDateTime(shift.openedAt)} dan beri
          </span>{" "}
          <span className="inline-flex items-center gap-1.5 md:ml-3">
            <User className="size-3.5 md:hidden" aria-hidden />
            {shift.cashierName}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShiftStats shift={shift} />
        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <Button className="h-11 w-full md:h-8 md:w-auto" render={<Link href="/pos" />} nativeButton={false}>
            Kassaga qaytish
          </Button>
          <CashMovementDialog shiftId={shift.id} />
          <CloseShiftDialog shift={shift} />
        </div>
      </CardContent>
    </Card>
  )
}

function ShiftsContent() {
  const router = useRouter()
  const { can } = useAuth()
  const url = useUrlState()
  const page = Number(url.get("page", "1")) || 1
  const status = url.get("status")
  const dateFrom = url.get("dateFrom")
  const dateTo = url.get("dateTo")

  const list = useQuery({
    queryKey: ["shifts", "list", { page, status, dateFrom, dateTo }],
    queryFn: () => api.get<Paginated<ShiftRow>>("/shifts", { page, pageSize: 20, status, dateFrom, dateTo }),
    placeholderData: (p) => p,
  })

  const showCashier = can("shifts.read.all")
  const preset = presetOf(dateFrom, dateTo)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Timer /> Smenalar
          </>
        }
        title="Smenalar"
        description="Joriy smena va smenalar tarixi"
      />
      <CurrentShiftCard />

      <section className="space-y-3">
        <ViewTabs
          variant="pill"
          value={status || "all"}
          onChange={(v) => url.set({ status: v === "all" ? null : v, page: 1 })}
          tabs={[
            { value: "all", label: "Barchasi" },
            { value: "OPEN", label: "Ochiq" },
            { value: "CLOSED", label: "Yopilgan" },
          ]}
          toolbar={
            <PeriodPicker
              variant="inline"
              options={PERIOD_OPTIONS}
              value={preset ?? "all"}
              onChange={(v) => {
                const r = presetRange(v)
                url.set({ dateFrom: r.from || null, dateTo: r.to || null, page: 1 })
              }}
              custom={{
                active: preset === null,
                from: dateFrom,
                to: dateTo,
                onFrom: (v) => url.set({ dateFrom: v || null, page: 1 }),
                onTo: (v) => url.set({ dateTo: v || null, page: 1 }),
                invalid: !!dateFrom && !!dateTo && dateFrom > dateTo,
              }}
            />
          }
        />

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.isLoading || !list.data ? (
          <LoadingRows />
        ) : list.data.items.length === 0 ? (
          <EmptyState title="Smenalar topilmadi" description="Davr yoki holatni o‘zgartirib ko‘ring." />
        ) : (
          <>
            <div className="space-y-2 md:hidden">
              {list.data.items.map((s) => (
                <Link key={s.id} href={`/shifts/${s.id}`} className="block rounded-2xl border bg-card p-3 active:bg-muted/50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{formatDateTime(s.openedAt)}</span>
                    <ShiftChip status={s.status} />
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0 truncate">{showCashier ? (s.cashierName ?? "—") : s.closedAt ? formatDateTime(s.closedAt) : "Ochiq"}</span>
                    <span className="flex items-center gap-1.5">
                      Farq <DifferenceText value={s.difference} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
            <div className={`hidden md:block ${TABLE_CARD}`}>
              <Table>
                <TableHeader className={THEAD}>
                  <TableRow>
                    <TableHead><ColumnHead icon={CalendarClock}>Ochilgan</ColumnHead></TableHead>
                    {showCashier && <TableHead><ColumnHead icon={UserRound}>Kassir</ColumnHead></TableHead>}
                    <TableHead className="hidden md:table-cell"><ColumnHead icon={Clock}>Yopilgan</ColumnHead></TableHead>
                    <TableHead><ColumnHead icon={CircleDot}>Holati</ColumnHead></TableHead>
                    <TableHead className="hidden text-right md:table-cell"><ColumnHead icon={Banknote}>Boshlang‘ich</ColumnHead></TableHead>
                    <TableHead className="hidden text-right md:table-cell"><ColumnHead icon={Banknote}>Kutilgan</ColumnHead></TableHead>
                    <TableHead className="text-right"><ColumnHead icon={Scale}>Farq</ColumnHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((s) => (
                    <TableRow key={s.id} className={`${TROW} cursor-pointer`} onClick={() => router.push(`/shifts/${s.id}`)}>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/shifts/${s.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {formatDateTime(s.openedAt)}
                        </Link>
                      </TableCell>
                      {showCashier && <TableCell>{s.cashierName ?? "—"}</TableCell>}
                      <TableCell className="hidden whitespace-nowrap md:table-cell">{s.closedAt ? formatDateTime(s.closedAt) : "—"}</TableCell>
                      <TableCell>
                        <ShiftChip status={s.status} />
                      </TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">{formatMoney(s.openingCash)}</TableCell>
                      <TableCell className="hidden text-right tabular-nums md:table-cell">{s.expectedCash ? formatMoney(s.expectedCash) : "—"}</TableCell>
                      <TableCell className="text-right">
                        <DifferenceText value={s.difference} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <PaginationBar page={list.data.page} pages={list.data.pages} total={list.data.total} onPage={(p) => url.set({ page: p })} />
          </>
        )}
      </section>
    </div>
  )
}
