"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Archive, ArrowLeft, ClipboardList, Pencil, RotateCcw } from "lucide-react"
import { ArchiveDialog } from "@/components/inventory/archive-dialog"
import { ActiveBadge, MovementBadge, REFERENCE_LABELS, THEAD, TROW, WARN_BADGE, type Movement, type Product } from "@/components/inventory/common"
import { ProductFormDialog } from "@/components/inventory/product-form"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime, formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { can } = useAuth()
  const [editOpen, setEditOpen] = useState(false)
  const [archiving, setArchiving] = useState<Product | null>(null)

  const { data: p, isLoading, error, refetch } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<Product>(`/products/${id}`),
  })
  const canMoves = can("inventory.read")
  const moves = useQuery({
    queryKey: ["product-movements", id],
    queryFn: () => api.get<Paginated<Movement>>("/inventory/movements", { productId: id, pageSize: 10 }),
    enabled: canMoves,
  })

  const back = (
    <Button variant="ghost" size="sm" render={<Link href="/inventory/products" />} nativeButton={false} className="-ml-2 w-fit">
      <ArrowLeft /> Mahsulotlar
    </Button>
  )

  if (isLoading)
    return (
      <div className="space-y-4">
        {back}
        <LoadingRows rows={5} />
      </div>
    )
  if (error || !p)
    return (
      <div className="space-y-4">
        {back}
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    )

  const low = Number(p.qty) <= Number(p.minStock)
  const unit = UNIT_LABELS[p.unit] ?? p.unit
  const rows: [string, React.ReactNode][] = [
    ["SKU", p.sku ?? "—"],
    ["Kategoriya", p.category?.name ?? "—"],
    ["Birlik", unit],
    ["Sotuv narxi", formatMoney(p.salePrice)],
    ...(p.costPrice !== undefined ? ([["Tannarx", formatMoney(p.costPrice)]] as [string, React.ReactNode][]) : []),
    ["Minimal qoldiq", `${formatQty(p.minStock)} ${unit}`],
  ]

  return (
    <div className="space-y-4">
      {back}
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {p.name} <ActiveBadge active={p.isActive} />
          </span>
        }
        actions={
          <>
            {can("inventory.adjust") && (
              <Button variant="outline" className="h-10" render={<Link href={`/inventory/adjustments/new?productId=${p.id}`} />} nativeButton={false}>
                <ClipboardList /> Qoldiqni tuzatish
              </Button>
            )}
            {can("products.manage") && (
              <>
                <Button variant="outline" className="h-10" onClick={() => setEditOpen(true)}>
                  <Pencil /> Tahrirlash
                </Button>
                <Button variant="outline" className="h-10" onClick={() => setArchiving(p)}>
                  {p.isActive ? <Archive /> : <RotateCcw />} {p.isActive ? "Arxivlash" : "Tiklash"}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="rounded-2xl lg:col-span-2">
          <CardHeader>
            <CardTitle>Ma’lumot</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {rows.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="text-xs text-muted-foreground">Shtrix-kodlar</div>
              {p.barcodes.length === 0 ? (
                <div className="text-sm">—</div>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {p.barcodes.map((b) => (
                    <span key={b.id} className="rounded-md bg-muted px-2 py-1 text-xs tabular-nums">
                      {b.value}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Joriy qoldiq</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-3xl font-bold tracking-tight tabular-nums">
              {formatQty(p.qty)} <span className="text-base font-normal text-muted-foreground">{unit}</span>
            </div>
            {low && <Badge className={WARN_BADGE}>Kam qoldi</Badge>}
          </CardContent>
        </Card>
      </div>

      {canMoves && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>So‘nggi harakatlar</CardTitle>
          </CardHeader>
          <CardContent>
            {moves.isLoading ? (
              <LoadingRows rows={4} />
            ) : moves.error ? (
              <ErrorState error={moves.error} onRetry={() => moves.refetch()} />
            ) : !moves.data?.items.length ? (
              <EmptyState title="Harakatlar yo‘q" />
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader className={THEAD}>
                    <TableRow>
                      <TableHead>Sana</TableHead>
                      <TableHead>Tur</TableHead>
                      <TableHead className="text-right">Miqdor</TableHead>
                      <TableHead className="hidden text-right sm:table-cell">Qoldiq keyin</TableHead>
                      <TableHead className="hidden md:table-cell">Sabab</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {moves.data.items.map((m) => (
                      <TableRow key={m.id} className={TROW}>
                        <TableCell className="whitespace-nowrap">{formatDateTime(m.createdAt)}</TableCell>
                        <TableCell>
                          <MovementBadge type={m.type} />
                        </TableCell>
                        <TableCell className={cn("text-right tabular-nums", Number(m.qty) >= 0 ? "text-primary" : "text-destructive")}>
                          {Number(m.qty) > 0 ? "+" : ""}
                          {formatQty(m.qty)}
                        </TableCell>
                        <TableCell className="hidden text-right tabular-nums sm:table-cell">{formatQty(m.balanceAfter)}</TableCell>
                        <TableCell className="hidden text-muted-foreground md:table-cell">
                          {m.reason ?? (m.referenceType ? (REFERENCE_LABELS[m.referenceType] ?? m.referenceType) : "—")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <Button variant="link" className="mt-2 px-0" render={<Link href={`/inventory/movements?product=${p.id}`} />} nativeButton={false}>
              Barcha harakatlar
            </Button>
          </CardContent>
        </Card>
      )}

      <ProductFormDialog open={editOpen} onOpenChange={setEditOpen} product={p} />
      <ArchiveDialog product={archiving} onClose={() => setArchiving(null)} />
    </div>
  )
}
