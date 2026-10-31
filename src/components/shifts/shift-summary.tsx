"use client"

import { Badge } from "@/components/ui/badge"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ShiftDetail } from "@/components/pos/types"

export function ShiftStatusBadge({ status }: { status: "OPEN" | "CLOSED" }) {
  return status === "OPEN" ? <Badge>Ochiq</Badge> : <Badge variant="secondary">Yopilgan</Badge>
}

export function DifferenceText({ value, className }: { value: string | number | null; className?: string }) {
  if (value === null || value === undefined) return <span className={className}>—</span>
  const n = Number(value)
  return (
    <span
      className={cn(
        "tabular-nums",
        n < 0 && "text-destructive",
        n > 0 && "text-amber-700 dark:text-amber-300",
        n === 0 && "text-muted-foreground",
        className,
      )}
    >
      {n > 0 ? "+" : ""}
      {formatMoney(n)}
    </span>
  )
}

function Stat({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="min-w-0 bg-card p-3">
      <div className="text-xs leading-tight text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 tabular-nums", strong ? "text-xl font-semibold" : "text-base font-medium")}>{value}</div>
    </div>
  )
}

export function ShiftStats({ shift }: { shift: ShiftDetail }) {
  const s = shift.summary
  const closed = shift.status === "CLOSED"
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3 xl:grid-cols-4">
      <Stat label="Boshlang‘ich naqd" value={formatMoney(shift.openingCash)} />
      <Stat label="Naqd sotuvlar" value={formatMoney(s.cashSalesTotal)} />
      <Stat label="Karta sotuvlar" value={formatMoney(s.cardSalesTotal)} />
      <Stat label="Qaytarishlar" value={<span className="flex flex-col text-sm md:block md:text-base"><span>{`${formatMoney(s.cashRefundsTotal, false)} / ${formatMoney(s.cardRefundsTotal)}`}</span><span className="text-[11px] font-normal text-muted-foreground md:hidden">naqd / karta</span></span>} />
      <Stat label="Kassaga kiritilgan" value={formatMoney(s.cashIn)} />
      <Stat label="Kassadan chiqarilgan" value={formatMoney(s.cashOut)} />
      <Stat label="Sotuvlar soni" value={s.saleCount + (s.voidedCount ? ` (+${s.voidedCount} bekor)` : "")} />
      <Stat label="Kutilayotgan naqd" value={formatMoney(closed ? (shift.expectedCash ?? s.expectedCash) : s.expectedCash)} strong />
      {closed && (
        <>
          <Stat label="Sanalgan naqd" value={formatMoney(shift.countedCash)} />
          <Stat label="Farq" value={<DifferenceText value={shift.difference} />} strong />
        </>
      )}
    </div>
  )
}
