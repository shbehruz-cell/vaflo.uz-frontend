import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Ixcham tanlash (native select): chapda ixtiyoriy belgi, o‘ngda chevron.
 * Telefonda iOS kattalashtirmasligi uchun matn 16px (globals.css qoidasi).
 */
export function InlineSelect({
  value,
  onChange,
  options,
  ariaLabel,
  icon,
  className,
}: {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  ariaLabel: string
  icon?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("relative inline-flex h-8 max-w-40 items-center", className)}>
      {icon && (
        <span aria-hidden className="pointer-events-none absolute left-2.5 flex text-muted-foreground [&_svg]:size-4">
          {icon}
        </span>
      )}
      <select
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-8 w-full cursor-pointer appearance-none truncate rounded-lg border bg-card pr-7 text-sm font-medium outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          icon ? "pl-8" : "pl-2.5",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden className="pointer-events-none absolute right-2 size-4 text-muted-foreground" />
    </div>
  )
}
