"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { ErrorState } from "@/components/app/states"
import { OpenShiftCard } from "@/components/pos/open-shift-card"
import { PosScreen } from "@/components/pos/pos-screen"
import { useCurrentShift } from "@/components/pos/use-current-shift"

export default function PosPage() {
  const shift = useCurrentShift()

  if (shift.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )
  }
  if (shift.isError) return <ErrorState error={shift.error} onRetry={() => shift.refetch()} />
  if (!shift.data) return <OpenShiftCard />
  return <PosScreen shift={shift.data} />
}
