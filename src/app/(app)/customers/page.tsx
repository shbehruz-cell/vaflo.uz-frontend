"use client"

import { Suspense, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { Plus, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import { FilterBar } from "@/components/app/filter-bar"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PaginationBar } from "@/components/app/pagination-bar"
import { CustomerDialog, type Customer } from "@/components/customers/customer-dialog"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useUrlState } from "@/hooks/use-url-state"
import { formatDate, formatMoney } from "@/lib/format"

type Row = Customer & { salesCount?: number; totalSpent?: string }

export default function CustomersPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <CustomersContent />
    </Suspense>
  )
}

function CustomersContent() {
  const { can } = useAuth()
  const router = useRouter()
  const url = useUrlState()
  const page = Number(url.get("page", "1")) || 1
  const [text, setText] = useState(url.get("q"))
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      if (text.trim() !== url.get("q")) url.set({ q: text.trim(), page: 1 })
    }, 400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  const params = { q: url.get("q") || undefined, page, pageSize: 25 }
  const q = useQuery({
    queryKey: ["customers", params],
    queryFn: () => api.get<Paginated<Row>>("/customers", params),
  })
  const showStats = q.data?.items.some((c) => c.salesCount !== undefined) ?? false

  return (
    <div className="space-y-4">
      <PageHeader
        title="Xaridorlar"
        description="Doimiy xaridorlar bazasi"
        actions={
          can("customers.manage") && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> <span className="hidden sm:inline">Xaridor qo‘shish</span><span className="sm:hidden">Qo‘shish</span>
            </Button>
          )
        }
      />
      <FilterBar
        search={
        <div className="relative lg:max-w-sm">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-10 pl-8" placeholder="Ism yoki telefon" aria-label="Qidirish" value={text} onChange={(e) => setText(e.target.value)} />
        </div>
        }
      />

      {q.isLoading ? (
        <LoadingRows />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.items.length === 0 ? (
        <EmptyState
          title="Xaridorlar topilmadi"
          description={url.get("q") ? "Qidiruvni o‘zgartirib ko‘ring." : "Birinchi xaridorni qo‘shing."}
          action={
            can("customers.manage") && !url.get("q") ? (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Xaridor qo‘shish
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {q.data.items.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`} className="block">
                <div className="rounded-xl border bg-card p-3">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-sm text-muted-foreground">{c.phone ?? "Telefon yo‘q"}</div>
                </div>
              </Link>
            ))}
          </div>
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  {showStats && <TableHead className="text-right">Xaridlar</TableHead>}
                  {showStats && <TableHead className="text-right">Jami</TableHead>}
                  <TableHead>Yaratilgan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((c) => (
                  <TableRow key={c.id} className={`${TROW} cursor-pointer`} onClick={() => router.push(`/customers/${c.id}`)}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                    {showStats && <TableCell className="text-right tabular-nums">{c.salesCount ?? "—"}</TableCell>}
                    {showStats && <TableCell className="text-right tabular-nums">{c.totalSpent !== undefined ? formatMoney(c.totalSpent) : "—"}</TableCell>}
                    <TableCell className="text-muted-foreground">{formatDate(c.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={q.data.page} pages={q.data.pages} total={q.data.total} onPage={(p) => url.set({ page: p })} />
        </>
      )}
      <CustomerDialog open={creating} onOpenChange={setCreating} />
    </div>
  )
}
