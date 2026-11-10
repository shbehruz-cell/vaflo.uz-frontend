"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Banknote, CalendarClock, FileText, Timer, Wallet } from "lucide-react"
import { ColumnHead } from "@/components/app/column-head"
import { StatusChip } from "@/components/app/status-chip"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import type { ShiftDetail } from "@/components/pos/types"
import { ShiftStats } from "@/components/shifts/shift-summary"
import { api } from "@/lib/api"
import { formatDateTime, formatMoney } from "@/lib/format"

export default function ShiftDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const q = useQuery({
    queryKey: ["shifts", "detail", id],
    queryFn: () => api.get<ShiftDetail>(`/shifts/${id}`),
  })

  const shift = q.data
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <>
            <Timer /> Smenalar
          </>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            Smena {shift && <StatusChip tone={shift.status === "OPEN" ? "success" : "neutral"}>{shift.status === "OPEN" ? "Ochiq" : "Yopilgan"}</StatusChip>}
          </span>
        }
        description={
          shift
            ? `${shift.register?.name ?? "Kassa"}, ${shift.cashierName ?? "—"}. ${formatDateTime(shift.openedAt)}${shift.closedAt ? ` dan ${formatDateTime(shift.closedAt)} gacha` : " dan beri"}`
            : undefined
        }
        actions={
          <Button variant="outline" className="hidden md:inline-flex" render={<Link href="/shifts" />} nativeButton={false}>
            <ArrowLeft /> Smenalar
          </Button>
        }
      />

      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !shift ? (
        <LoadingRows />
      ) : (
        <>
          <ShiftStats shift={shift} />
          <section className="space-y-3">
            <h2 className="text-base font-semibold">Kassa harakatlari</h2>
            {shift.cashMovements.length === 0 ? (
              <EmptyState title="Kassa harakatlari yo‘q" />
            ) : (
              <>
              <ul className="space-y-2 md:hidden">
                {shift.cashMovements.map((m) => (
                  <li key={m.id} className="rounded-2xl border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        {m.type === "CASH_IN" ? <StatusChip tone="success" icon={false}>Kirim</StatusChip> : <StatusChip tone="danger" icon={false}>Chiqim</StatusChip>}
                        <span className="text-xs text-muted-foreground">{formatDateTime(m.createdAt)}</span>
                      </span>
                      <span className="font-semibold tabular-nums">
                        {m.type === "CASH_IN" ? "+" : "−"}
                        {formatMoney(m.amount)}
                      </span>
                    </div>
                    {m.reason && <p className="mt-1 break-words text-sm text-muted-foreground">{m.reason}</p>}
                  </li>
                ))}
              </ul>
              <div className={`hidden md:block ${TABLE_CARD}`}>
                <Table>
                  <TableHeader className={THEAD}>
                    <TableRow>
                      <TableHead><ColumnHead icon={CalendarClock}>Vaqt</ColumnHead></TableHead>
                      <TableHead><ColumnHead icon={Wallet}>Turi</ColumnHead></TableHead>
                      <TableHead><ColumnHead icon={FileText}>Sabab</ColumnHead></TableHead>
                      <TableHead className="text-right"><ColumnHead icon={Banknote}>Summa</ColumnHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shift.cashMovements.map((m) => (
                      <TableRow key={m.id} className={TROW}>
                        <TableCell className="whitespace-nowrap font-medium">{formatDateTime(m.createdAt)}</TableCell>
                        <TableCell>
                          {m.type === "CASH_IN" ? <StatusChip tone="success" icon={false}>Kirim</StatusChip> : <StatusChip tone="danger" icon={false}>Chiqim</StatusChip>}
                        </TableCell>
                        <TableCell className="max-w-64 truncate">{m.reason}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {m.type === "CASH_IN" ? "+" : "−"}
                          {formatMoney(m.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}
