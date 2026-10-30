import { Badge } from "@/components/ui/badge"
import { WARN_BADGE } from "@/components/inventory/common"
import { SALE_STATUS_LABELS } from "@/lib/format"

export function SaleStatusBadge({ status }: { status: string }) {
  const variant = status === "VOIDED" ? "destructive" : status === "REFUNDED" ? "outline" : "secondary"
  return (
    <Badge variant={variant} className={status === "PARTIALLY_REFUNDED" ? WARN_BADGE : undefined}>
      {SALE_STATUS_LABELS[status] ?? status}
    </Badge>
  )
}
