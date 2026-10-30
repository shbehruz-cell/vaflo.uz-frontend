"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Server-side pagination boshqaruvi (backend `Paginated<T>` bilan). */
export function PaginationBar({
  page,
  pages,
  total,
  onPage,
}: {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}) {
  if (total === 0) return null
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span className="text-sm tabular-nums">Jami: {total}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" aria-label="Oldingi sahifa" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft />
        </Button>
        <span className="tabular-nums">
          {page} / {Math.max(pages, 1)}
        </span>
        <Button variant="outline" size="icon" aria-label="Keyingi sahifa" disabled={page >= pages} onClick={() => onPage(page + 1)}>
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}
