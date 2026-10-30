"use client"

import { use } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Printer } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { PageHeader } from "@/components/app/page-header"
import { ErrorState, LoadingRows } from "@/components/app/states"
import { RefundDialog } from "@/components/sales/refund-dialog"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import type { SaleDetail } from "@/components/sales/types"
import { VoidDialog } from "@/components/sales/void-dialog"
import { CARD_TYPE_LABELS, CardBrandMark, type CardType } from "@/components/pos/card-brands"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { PAYMENT_LABELS, formatDateTime, formatMoney, formatQty } from "@/lib/format"

export default function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { can } = useAuth()
  const q = useQuery({ queryKey: ["sale", id], queryFn: () => api.get<SaleDetail>(`/sales/${id}`) })

  if (q.isLoading) return <LoadingRows />
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  const s = q.data

  const hasLeft = s.items.some((i) => Number(i.qty) - Number(i.refundedQty) > 0)
  const canRefund = can("sales.refund") && s.status !== "VOIDED" && hasLeft
  const canVoid = can("sales.void") && s.status !== "VOIDED" && s.refunds.length === 0

  return (
    <div className="space-y-4">
      <style>{`@media print { [data-slot="sidebar"], [data-slot="sidebar-gap"], [data-slot="sidebar-container"], header { display: none !important; } }`}</style>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            Chek № {s.receiptNo} <SaleStatusBadge status={s.status} />
          </span>
        }
        description={formatDateTime(s.createdAt)}
        className="print:[&_button]:hidden"
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button variant="ghost" render={<Link href="/sales" />} nativeButton={false}>
              <ArrowLeft /> Orqaga
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer /> Chop etish
            </Button>
            {canRefund && <RefundDialog sale={s} />}
            {canVoid && <VoidDialog saleId={s.id} receiptNo={s.receiptNo} />}
          </div>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <Info label="Do‘kon" value={s.storeName} />
          <Info label="Kassa" value={s.register ? `${s.register.name} (${s.register.code})` : null} />
          <Info label="Kassir" value={s.cashierName} />
          <div>
            <div className="text-xs text-muted-foreground">Xaridor</div>
            {s.customerId ? (
              <Link className="font-medium text-primary hover:underline" href={`/customers/${s.customerId}`}>
                {s.customerName ?? "Xaridor"}
              </Link>
            ) : (
              <div className="font-medium">{s.customerName ?? "—"}</div>
            )}
          </div>
        </CardContent>
      </Card>

      {s.status === "VOIDED" && (
        <Card className="rounded-2xl border-destructive/40">
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium text-destructive">Sotuv bekor qilingan</div>
            <div>Sabab: {s.voidReason ?? "—"}</div>
            <div className="flex flex-wrap gap-x-3 text-muted-foreground">
              <span>{s.voidedByName ?? "—"}</span>
              <span>{s.voidedAt ? formatDateTime(s.voidedAt) : ""}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={TABLE_CARD}>
      <Table>
        <TableHeader className={THEAD}>
          <TableRow>
            <TableHead>Mahsulot</TableHead>
            <TableHead className="hidden sm:table-cell">SKU</TableHead>
            <TableHead className="text-right">Miqdor</TableHead>
            <TableHead className="text-right">Narx</TableHead>
            <TableHead className="hidden sm:table-cell text-right">Chegirma</TableHead>
            <TableHead className="text-right">Summa</TableHead>
            <TableHead className="text-right">Qaytarilgan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {s.items.map((i) => (
            <TableRow key={i.id} className={TROW}>
              <TableCell className="font-medium">{i.nameSnapshot}</TableCell>
              <TableCell className="hidden sm:table-cell text-muted-foreground">{i.skuSnapshot ?? "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{formatQty(i.qty)}</TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(i.unitPrice, false)}</TableCell>
              <TableCell className="hidden sm:table-cell text-right tabular-nums">
                {Number(i.discount) > 0 ? formatMoney(i.discount, false) : "—"}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatMoney(i.lineTotal, false)}</TableCell>
              <TableCell className="text-right tabular-nums">{Number(i.refundedQty) > 0 ? formatQty(i.refundedQty) : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>To‘lovlar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {s.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{PAYMENT_LABELS[p.method] ?? p.method}</Badge>
                  {p.cardType && (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CardBrandMark type={p.cardType as CardType} className="h-5 w-8" />
                      {CARD_TYPE_LABELS[p.cardType] ?? p.cardType}
                      {p.externalReference && <span className="font-mono">№{p.externalReference}</span>}
                    </span>
                  )}
                  {p.tendered && (
                    <span className="text-xs text-muted-foreground">
                      Qabul: {formatMoney(p.tendered)}
                      {p.change && Number(p.change) > 0 ? `, qaytim: ${formatMoney(p.change)}` : ""}
                    </span>
                  )}
                </div>
                <span className="font-medium tabular-nums">{formatMoney(p.amount)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="receipt px-5 pt-5 pb-8 text-sm tabular-nums">
          <Row label="Oraliq summa" value={formatMoney(s.subtotal)} />
          <Row label="Chegirma" value={formatMoney(s.discountTotal)} />
          <hr className="receipt-rule my-3" />
          <div className="flex items-baseline justify-between">
            <span className="text-base font-semibold">Jami</span>
            <span className="text-3xl font-bold tracking-tight">{formatMoney(s.total)}</span>
          </div>
          {Number(s.refundedTotal) > 0 && (
            <>
              <hr className="receipt-rule my-3" />
              <Row label="Qaytarilgan" value={formatMoney(s.refundedTotal)} destructive />
            </>
          )}
        </div>
      </div>

      {s.refunds.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Qaytarishlar tarixi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.refunds.map((r) => (
              <div key={r.id} className="space-y-1 rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex flex-wrap gap-x-3 text-muted-foreground">
                    <span>{formatDateTime(r.createdAt)}</span>
                    <span>{r.actorName ?? "—"}</span>
                  </span>
                  <span className="font-semibold tabular-nums">{formatMoney(r.amount)}</span>
                </div>
                <div>Sabab: {r.reason}</div>
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary">{r.disposition === "RESTOCK" ? "Omborga qaytarildi" : "Yaroqsiz"}</Badge>
                  <Badge variant="outline">{PAYMENT_LABELS[r.method] ?? r.method}</Badge>
                </div>
                <ul className="text-muted-foreground">
                  {r.items.map((ri) => (
                    <li key={ri.id}>
                      {ri.nameSnapshot ?? "Mahsulot"} × {formatQty(ri.qty)} — {formatMoney(ri.amount)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value ?? "—"}</div>
    </div>
  )
}

function Row({ label, value, destructive }: { label: string; value: string; destructive?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${destructive ? "text-destructive" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}
