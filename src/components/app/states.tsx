"use client"

import { AlertTriangle, Inbox, Lock, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiError } from "@/lib/api"

/** TZ 6.4 UI holatlari: loading, bo‘sh, xato + qayta urinish, ruxsat yo‘q. */

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  )
}

export function EmptyState({
  title = "Hozircha ma’lumot yo‘q",
  description,
  action,
}: {
  title?: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <Empty className="rounded-2xl border bg-card py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Inbox />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  if (error instanceof ApiError && error.status === 403) return <NoAccess />
  return (
    <Empty className="rounded-2xl border border-destructive/30 bg-card py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon" className="bg-destructive/10 text-destructive">
          <AlertTriangle />
        </EmptyMedia>
        <EmptyTitle>Ma’lumotni yuklab bo‘lmadi</EmptyTitle>
        <EmptyDescription>{error instanceof Error ? error.message : "Server xatosi"}</EmptyDescription>
      </EmptyHeader>
      {onRetry && (
        <EmptyContent>
          <Button variant="outline" onClick={onRetry}>
            <RotateCw /> Qayta urinish
          </Button>
        </EmptyContent>
      )}
    </Empty>
  )
}

export function NoAccess() {
  return (
    <Empty className="rounded-2xl border bg-card py-10">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Lock />
        </EmptyMedia>
        <EmptyTitle>Ruxsat yo‘q</EmptyTitle>
        <EmptyDescription>Bu bo‘limni ko‘rish uchun sizda ruxsat yo‘q. Kerak bo‘lsa, do‘kon egasiga murojaat qiling.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
