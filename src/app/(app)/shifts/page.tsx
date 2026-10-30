"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
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
          <Button render={<Link href="/pos" />} nativeButton={false}>
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
        <CardDescription>
          <span>{shift.register?.name ?? "Kassa"}</span>
          <span className="ml-3">{formatDateTime(shift.openedAt)} dan beri</span>
          <span className="ml-3">{shift.cashierName}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ShiftStats shift={shift} />
        <div className="flex flex-wrap gap-2">
          <Button render={<Link href="/pos" />} nativeButton={false}>
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

  return (
    <div className="space-y-6">
      <PageHeader title="Smenalar" description="Joriy smena va smenalar tarixi" />
      <CurrentShiftCard />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Smenalar tarixi</h2>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label htmlFor="f-status" className="text-xs text-muted-foreground">
              Holati
            </label>
            <select
              id="f-status"
              value={status}
              onChange={(e) => url.set({ status: e.target.value, page: 1 })}
              className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
            >
              <option value="">Barchasi</option>
              <option value="OPEN">Ochiq</option>
              <option value="CLOSED">Yopilgan</option>
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="f-from" className="text-xs text-muted-foreground">
              Sanadan
            </label>
            <Input id="f-from" type="date" className="h-10" value={dateFrom} onChange={(e) => url.set({ dateFrom: e.target.value, page: 1 })} />
          </div>
          <div className="space-y-1">
            <label htmlFor="f-to" className="text-xs text-muted-foreground">
              Sanagacha
            </label>
            <Input id="f-to" type="date" className="h-10" value={dateTo} onChange={(e) => url.set({ dateTo: e.target.value, page: 1 })} />
          </div>
          {(status || dateFrom || dateTo) && (
            <Button variant="ghost" className="h-10" onClick={() => url.set({ status: null, dateFrom: null, dateTo: null, page: 1 })}>
              Filtrni tozalash
            </Button>
          )}
        </div>

        {list.isError ? (
          <ErrorState error={list.error} onRetry={() => list.refetch()} />
        ) : list.isLoading || !list.data ? (
          <LoadingRows />
        ) : list.data.items.length === 0 ? (
          <EmptyState title="Smenalar topilmadi" description="Filtrlarni o‘zgartirib ko‘ring." />
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border bg-card">
              <Table>
                <TableHeader className="bg-muted/50 text-xs font-medium text-muted-foreground">
                  <TableRow>
                    <TableHead>Ochilgan</TableHead>
                    {showCashier && <TableHead>Kassir</TableHead>}
                    <TableHead className="hidden md:table-cell">Yopilgan</TableHead>
                    <TableHead>Holati</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Boshlang‘ich</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Kutilgan</TableHead>
                    <TableHead className="text-right">Farq</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.data.items.map((s) => (
                    <TableRow key={s.id} className="min-h-11 cursor-pointer" onClick={() => router.push(`/shifts/${s.id}`)}>
                      <TableCell className="whitespace-nowrap">
                        <Link href={`/shifts/${s.id}`} className="font-medium hover:underline" onClick={(e) => e.stopPropagation()}>
                          {formatDateTime(s.openedAt)}
                        </Link>
                      </TableCell>
                      {showCashier && <TableCell>{s.cashierName ?? "—"}</TableCell>}
                      <TableCell className="hidden whitespace-nowrap md:table-cell">{s.closedAt ? formatDateTime(s.closedAt) : "—"}</TableCell>
                      <TableCell>
                        <ShiftStatusBadge status={s.status} />
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
