"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Archive, ClipboardList, FileSpreadsheet, MoreHorizontal, Pencil, Plus, RotateCcw, Sparkles } from "lucide-react"
import { AiImportDialog } from "@/components/inventory/ai-import-dialog"
import { ArchiveDialog } from "@/components/inventory/archive-dialog"
import { ActiveBadge, NATIVE_SELECT, TABLE_CARD, THEAD, TROW, WARN_BADGE, useCategories, type Product } from "@/components/inventory/common"
import { ProductFormDialog } from "@/components/inventory/product-form"
import { ErrorState, EmptyState, LoadingRows } from "@/components/app/states"
import { AddButton } from "@/components/app/add-button"
import { FilterBar, FilterField, type FilterChip } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { SearchInput } from "@/components/app/search-input"
import { PaginationBar } from "@/components/app/pagination-bar"
import { Badge } from "@/components/ui/badge"
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
      {isLow(p) && <Badge className={WARN_BADGE}>Kam qoldi</Badge>}
      <span className="tabular-nums">
        {formatQty(p.qty)} {UNIT_LABELS[p.unit]}
      </span>
    </span>
  )

  const statusLabels: Record<string, string> = { archived: "Arxiv", all: "Barchasi" }
  const sortLabels: Record<string, string> = {
    "name:desc": "Nomi (Z–A)",
    "salePrice:asc": "Narx: arzondan",
    "salePrice:desc": "Narx: qimmatdan",
    "createdAt:desc": "Yangi qo‘shilganlar",
  }
  const chips: FilterChip[] = []
  if (categoryId) {
    chips.push({
      key: "category",
      label: `Kategoriya: ${categories?.find((c) => c.id === categoryId)?.name ?? "…"}`,
      onRemove: () => set({ category: null, page: 1 }),
    })
  }
  if (status !== "active") chips.push({ key: "status", label: `Holat: ${statusLabels[status] ?? status}`, onRemove: () => set({ status: null, page: 1 }) })
  if (low) chips.push({ key: "low", label: "Faqat kam qolganlar", onRemove: () => set({ low: null, page: 1 }) })
  if (sort !== "name:asc") chips.push({ key: "sort", label: `Saralash: ${sortLabels[sort] ?? sort}`, onRemove: () => set({ sort: null, page: 1 }) })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Mahsulotlar"
        description="Katalog, narxlar va ombor qoldig‘i"
        actions={
          canManage && (
            <>
              <Button variant="outline" className="h-10 max-sm:w-10 max-sm:px-0" aria-label="AI bilan qo‘shish" onClick={() => setAiOpen(true)}>
                <Sparkles /> <span className="hidden sm:inline">AI bilan qo‘shish</span>
              </Button>
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

      <FilterBar
        search={<SearchInput value={q} onChange={setQ} placeholder="Nomi, SKU yoki shtrix-kod" aria-label="Qidirish" />}
        activeCount={chips.length}
        chips={chips}
        onReset={() => set({ category: null, low: null, status: null, sort: null, page: 1 })}
      >
        <FilterField label="Kategoriya">
          <select className={NATIVE_SELECT} value={categoryId} onChange={(e) => set({ category: e.target.value, page: 1 })}>
            <option value="">Barcha kategoriyalar</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="Holat">
          <select className={NATIVE_SELECT} value={status} onChange={(e) => set({ status: e.target.value === "active" ? null : e.target.value, page: 1 })}>
            <option value="active">Faol</option>
            <option value="archived">Arxiv</option>
            <option value="all">Barchasi</option>
          </select>
        </FilterField>
        <FilterField label="Qoldiq">
          <select className={NATIVE_SELECT} value={low ? "1" : ""} onChange={(e) => set({ low: e.target.value || null, page: 1 })}>
            <option value="">Barchasi</option>
            <option value="1">Faqat kam qolganlar</option>
          </select>
        </FilterField>
        <FilterField label="Saralash">
          <select className={NATIVE_SELECT} value={sort} onChange={(e) => set({ sort: e.target.value === "name:asc" ? null : e.target.value, page: 1 })}>
            <option value="name:asc">Nomi (A–Z)</option>
            <option value="name:desc">Nomi (Z–A)</option>
            <option value="salePrice:asc">Narx: arzondan</option>
            <option value="salePrice:desc">Narx: qimmatdan</option>
            <option value="createdAt:desc">Yangi qo‘shilganlar</option>
          </select>
        </FilterField>
      </FilterBar>

      {isLoading ? (
        <LoadingRows />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="Mahsulot topilmadi"
          description={urlQ || categoryId || low ? "Filtrlarni o‘zgartirib ko‘ring." : "Birinchi mahsulotni qo‘shing yoki import qiling."}
          action={canManage && !urlQ && !categoryId && !low ? <Button onClick={openCreate}><Plus /> Mahsulot qo‘shish</Button> : undefined}
        />
      ) : (
        <div className="space-y-4 pb-16 md:pb-0">
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Nomi</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Kategoriya</TableHead>
                  <TableHead className="text-right">Narx</TableHead>
                  {canCost && <TableHead className="hidden text-right lg:table-cell">Tannarx</TableHead>}
                  <TableHead className="text-right">Qoldiq</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((p) => (
                  <TableRow key={p.id} className={TROW}>
                    <TableCell className="max-w-64">
                      <Link href={`/inventory/products/${p.id}`} className="font-medium hover:text-primary hover:underline">
                        {p.name}
                      </Link>
                      {p.barcodes[0] && <div className="text-xs text-muted-foreground tabular-nums">{p.barcodes[0].value}</div>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.sku ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{p.category?.name ?? "—"}</TableCell>
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
                  {p.category && <span>{p.category.name}</span>}
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
