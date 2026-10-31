"use client"

import { Suspense, use, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeft, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PaginationBar } from "@/components/app/pagination-bar"
import { CustomerDialog, type Customer } from "@/components/customers/customer-dialog"
import { SaleStatusBadge } from "@/components/sales/sale-status-badge"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate, formatDateTime, formatMoney } from "@/lib/format"

interface Profile {
  customer: Customer
  stats: { salesCount: number; totalSpent: string; totalRefunded: string; lastPurchaseAt: string | null }
  recentSales: Paginated<{ id: string; receiptNo: string; createdAt: string; total: string; status: string }>
}

export default function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<LoadingRows />}>
      <CustomerContent id={id} />
    </Suspense>
  )
}

function CustomerContent({ id }: { id: string }) {
  const { can } = useAuth()
  const router = useRouter()
  const url = useUrlState()
  const page = Number(url.get("page", "1")) || 1
  const [editing, setEditing] = useState(false)

  const q = useQuery({
    queryKey: ["customers", id, page],
    queryFn: () => api.get<Profile>(`/customers/${id}`, { page, pageSize: 10 }),
  })

  if (q.isLoading) return <LoadingRows />
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  const { customer: c, stats, recentSales } = q.data

  return (
    <div className="space-y-4">
      <PageHeader
        title={c.name}
        description={`Qo‘shilgan: ${formatDate(c.createdAt)}`}
        className="flex-row items-center gap-3 sm:items-end"
        actions={
          <>
            <Button variant="ghost" className="hidden md:inline-flex" render={<Link href="/customers" />} nativeButton={false}>
              <ArrowLeft /> Orqaga
            </Button>
            {can("customers.manage") && (
              <Button variant="outline" className="h-10 md:h-8" onClick={() => setEditing(true)} aria-label="Tahrirlash">
                <Pencil /> <span className="hidden sm:inline">Tahrirlash</span>
              </Button>
            )}
          </>
        }
      />

      <Card className="rounded-2xl">
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <Info label="Telefon" value={c.phone} />
          <Info label="Manzil" value={c.address} />
          <Info label="Izoh" value={c.notes} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 divide-x divide-y rounded-2xl border bg-card lg:grid-cols-4 lg:divide-y-0">
        <Stat label="Xaridlar soni" value={String(stats.salesCount)} />
        <Stat label="Jami summa" value={formatMoney(stats.totalSpent)} />
        <Stat label="Qaytarishlar" value={formatMoney(stats.totalRefunded)} />
        <Stat label="Oxirgi xarid" value={stats.lastPurchaseAt ? formatDateTime(stats.lastPurchaseAt) : "—"} />
      </div>

      <h2 className="text-base font-semibold">Xaridlar tarixi</h2>
      {recentSales.items.length === 0 ? (
        <EmptyState title="Xaridlar yo‘q" description="Bu xaridor hali xarid qilmagan." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {recentSales.items.map((s) => (
              <Link key={s.id} href={`/sales/${s.id}`} className="block rounded-2xl border bg-card p-3 active:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium tabular-nums">№ {s.receiptNo}</span>
                  <SaleStatusBadge status={s.status} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">{formatDateTime(s.createdAt)}</span>
                  <span className="font-semibold tabular-nums">{formatMoney(s.total)}</span>
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
                <TableHead className="text-right">Jami</TableHead>
                <TableHead>Holat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSales.items.map((s) => (
                <TableRow key={s.id} className={`${TROW} cursor-pointer`} onClick={() => router.push(`/sales/${s.id}`)}>
                  <TableCell className="font-medium">
                    <Link href={`/sales/${s.id}`} onClick={(e) => e.stopPropagation()}>
                      {s.receiptNo}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateTime(s.createdAt)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(s.total)}</TableCell>
                  <TableCell>
                    <SaleStatusBadge status={s.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
          <PaginationBar page={recentSales.page} pages={recentSales.pages} total={recentSales.total} onPage={(p) => url.set({ page: p })} />
        </>
      )}
      <CustomerDialog open={editing} onOpenChange={setEditing} customer={c} key={c.id + c.name + c.phone + c.address + c.notes} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium whitespace-pre-wrap">{value || "—"}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-base font-semibold tabular-nums">{value}</div>
    </div>
  )
}
