"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Archive, ArrowUpDown, Boxes, CircleDot, ClipboardList, FileSpreadsheet, Hash, Layers, MoreHorizontal, Package, Pencil, Plus, RotateCcw, Sparkles, Tag, Wallet } from "lucide-react"
import { AiImportDialog } from "@/components/inventory/ai-import-dialog"
import { ArchiveDialog } from "@/components/inventory/archive-dialog"
import { ActiveBadge, TABLE_CARD, THEAD, TROW, useCategories, type Product } from "@/components/inventory/common"
import { ProductFormDialog } from "@/components/inventory/product-form"
import { ErrorState, EmptyState, LoadingRows } from "@/components/app/states"
import { AddButton } from "@/components/app/add-button"
import { InlineSelect } from "@/components/app/inline-select"
import { PageHeader } from "@/components/app/page-header"
import { ColumnHead } from "@/components/app/column-head"
import { FeatureHint } from "@/components/app/feature-hint"
import { StatusChip, DotLabel } from "@/components/app/status-chip"
import { ViewTabs } from "@/components/app/view-tabs"
import { SearchInput } from "@/components/app/search-input"
import { PaginationBar } from "@/components/app/pagination-bar"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatMoney, formatQty, UNIT_LABELS } from "@/lib/format"
import { useUrlState } from "@/hooks/use-url-state"

export default function ProductsPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ProductsView />
    </Suspense>
  )
}

const isLow = (p: Product) => Number(p.qty) <= Number(p.minStock)

function ProductsView() {
  const { can } = useAuth()
  const { get, set } = useUrlState()
  const canManage = can("products.manage")
  const canCost = can("costs.read")
  const canAdjust = can("inventory.adjust")

  const urlQ = get("q")
  const [q, setQ] = useState(urlQ)
  useEffect(() => {
    if (q === urlQ) return
    const t = setTimeout(() => set({ q, page: 1 }), 350)
    return () => clearTimeout(t)
  }, [q, urlQ, set])

  const page = Number(get("page", "1")) || 1
  const categoryId = get("category")
  const low = get("low") === "1"
  const status = get("status", "active")
  const sort = get("sort", "name:asc")
  const [sortBy, sortDir] = sort.split(":")

  const params = {
    q: urlQ,
    categoryId,
    lowStock: low || undefined,
    isActive: status === "active" ? true : status === "archived" ? false : undefined,
    sortBy,
    sortDir,
    page,
    pageSize: 25,
  }
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["products", params],
    queryFn: () => api.get<Paginated<Product>>("/products", params),
    placeholderData: (prev) => prev,
  })
  const { data: categories } = useCategories()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [archiving, setArchiving] = useState<Product | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const actions = (p: Product) =>
    (canManage || canAdjust) && (
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" className="max-md:size-10" aria-label="Amallar" />}>
          <MoreHorizontal />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canManage && (
            <DropdownMenuItem
              onClick={() => {
                setEditing(p)
                setFormOpen(true)
              }}
            >
              <Pencil /> Tahrirlash
            </DropdownMenuItem>
          )}
          {canAdjust && (
            <DropdownMenuItem render={<Link href={`/inventory/adjustments/new?productId=${p.id}`} />}>
              <ClipboardList /> Qoldiqni tuzatish
            </DropdownMenuItem>
          )}
          {canManage && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant={p.isActive ? "destructive" : "default"} onClick={() => setArchiving(p)}>
                {p.isActive ? <Archive /> : <RotateCcw />} {p.isActive ? "Arxivlash" : "Tiklash"}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )

  const qtyCell = (p: Product) => (
    <span className="inline-flex flex-wrap items-center justify-end gap-1.5">
      {isLow(p) && <StatusChip tone="warning">Kam qoldi</StatusChip>}
      <span className="tabular-nums">
        {formatQty(p.qty)} {UNIT_LABELS[p.unit]}
      </span>
    </span>
  )

  const tab = status === "archived" ? "archived" : status === "all" ? "all" : low ? "low" : "active"
  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={<><Boxes /> Ombor</>}
        title="Mahsulotlar"
        description="Katalog, narxlar va ombor qoldig‘i"
        actions={
          canManage && (
            <>
              <FeatureHint id="products-ai-import" title="Yangi: AI bilan qo‘shish" hint="Qog‘ozdagi mahsulotlar ro‘yxatini rasmga oling — AI nom va narxlarni o‘zi o‘qib beradi.">
                <Button variant="outline" className="h-10 max-sm:w-10 max-sm:px-0" aria-label="Ro‘yxat rasmidan qo‘shish (AI)" onClick={() => setAiOpen(true)}>
                  <Sparkles /> <span className="hidden sm:inline">Ro‘yxatdan qo‘shish</span>
                </Button>
              </FeatureHint>
              <Button
                variant="outline"
                className="h-10 max-sm:w-10 max-sm:px-0"
                aria-label="Excel/CSV’dan import"
                render={<Link href="/inventory/products/import" />}
                nativeButton={false}
              >
                <FileSpreadsheet /> <span className="hidden sm:inline">Excel/CSV’dan import</span>
              </Button>
              <AddButton label="Mahsulot qo‘shish" onClick={openCreate} />
            </>
          )
        }
      />

      <ViewTabs
        variant="pill"
        tabs={[
          { value: "active", label: "Faol" },
          { value: "low", label: "Kam qolgan" },
          { value: "archived", label: "Arxiv" },
          { value: "all", label: "Barchasi" },
        ]}
        value={tab}
        onChange={(v) => set({ status: v === "active" || v === "low" ? null : v, low: v === "low" ? "1" : null, page: 1 })}
        toolbar={
          <>
            <SearchInput className="min-w-0 flex-1 sm:w-64 sm:flex-none" value={q} onChange={setQ} placeholder="Nomi, SKU yoki shtrix-kod" aria-label="Qidirish" />
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <InlineSelect
              className="w-full max-w-none sm:max-w-40"
              ariaLabel="Kategoriya"
              icon={<Tag />}
              value={categoryId}
              onChange={(v) => set({ category: v || null, page: 1 })}
              options={[{ value: "", label: "Kategoriya" }, ...(categories ?? []).map((c) => ({ value: c.id, label: c.name }))]}
            />
            <InlineSelect
              className="w-full max-w-none sm:max-w-40"
              ariaLabel="Saralash"
              icon={<ArrowUpDown />}
              value={sort}
              onChange={(v) => set({ sort: v === "name:asc" ? null : v, page: 1 })}
              options={[
                { value: "name:asc", label: "Nomi (A–Z)" },
                { value: "name:desc", label: "Nomi (Z–A)" },
                { value: "salePrice:asc", label: "Narx: arzondan" },
                { value: "salePrice:desc", label: "Narx: qimmatdan" },
                { value: "createdAt:desc", label: "Yangi qo‘shilganlar" },
              ]}
            />
            </div>
          </>
        }
      />

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Mahsulot topilmadi"
          description={urlQ || categoryId || low ? "Qidiruv yoki kategoriyani o‘zgartirib ko‘ring." : "Birinchi mahsulotni qo‘shing yoki import qiling."}
          action={canManage && !urlQ && !categoryId && !low ? <Button onClick={openCreate}><Plus /> Mahsulot qo‘shish</Button> : undefined}
        />
      ) : (
        <div className="space-y-4 pb-16 md:pb-0">
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead><ColumnHead icon={Package}>Nomi</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={Hash}>SKU</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={Tag}>Kategoriya</ColumnHead></TableHead>
                  <TableHead className="text-right"><ColumnHead icon={Wallet}>Narx</ColumnHead></TableHead>
                  {canCost && <TableHead className="hidden text-right lg:table-cell"><ColumnHead icon={Wallet}>Tannarx</ColumnHead></TableHead>}
                  <TableHead className="text-right"><ColumnHead icon={Layers}>Qoldiq</ColumnHead></TableHead>
                  <TableHead><ColumnHead icon={CircleDot}>Holat</ColumnHead></TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id} className={`${TROW} ${p.isActive ? "" : "text-muted-foreground"}`}>
                    <TableCell className="max-w-64">
                      <Link href={`/inventory/products/${p.id}`} className="font-medium hover:text-primary hover:underline">
                        {p.name}
                      </Link>
                      {p.barcodes[0] && <div className="text-xs text-muted-foreground tabular-nums">{p.barcodes[0].value}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell>{p.category ? <DotLabel>{p.category.name}</DotLabel> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(p.salePrice)}</TableCell>
                    {canCost && <TableCell className="hidden text-right tabular-nums lg:table-cell">{p.costPrice !== undefined ? formatMoney(p.costPrice) : "—"}</TableCell>}
                    <TableCell className="text-right">{qtyCell(p)}</TableCell>
                    <TableCell>
                      <ActiveBadge active={p.isActive} />
                    </TableCell>
                    <TableCell>{actions(p)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2 md:hidden">
            {data.items.map((p) => (
              <div key={p.id} className="rounded-xl border bg-card p-3">
                <div className="-mt-1 -mr-1 flex items-start justify-between gap-2">
                  <div className="min-w-0 pt-1.5">
                    <Link href={`/inventory/products/${p.id}`} className="font-medium leading-snug">
                      {p.name}
                    </Link>
                    {p.barcodes[0] && <div className="text-xs text-muted-foreground tabular-nums">{p.barcodes[0].value}</div>}
                  </div>
                  {actions(p)}
                </div>
                <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="font-medium tabular-nums">{formatMoney(p.salePrice)}</span>
                  {qtyCell(p)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <ActiveBadge active={p.isActive} />
                  {p.category && <DotLabel className="text-xs">{p.category.name}</DotLabel>}
                  {canCost && p.costPrice !== undefined && <span>Tannarx: {formatMoney(p.costPrice)}</span>}
                </div>
              </div>
            ))}
          </div>

          <PaginationBar page={data.page} pages={data.pages} total={data.total} onPage={(n) => set({ page: n })} />
        </div>
      )}

      <ProductFormDialog open={formOpen} onOpenChange={setFormOpen} product={editing} />
      {canManage && <AiImportDialog open={aiOpen} onOpenChange={setAiOpen} />}
      <ArchiveDialog product={archiving} onClose={() => setArchiving(null)} />
    </div>
  )
}
