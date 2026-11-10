import { AlertTriangle, Check, Circle, Clock, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type ChipTone = "success" | "danger" | "warning" | "info" | "neutral"

const TONE: Record<ChipTone, string> = {
  success: "bg-emerald-500/10 text-emerald-700 ring-emerald-600/20 dark:text-emerald-300 dark:ring-emerald-400/25",
  danger: "bg-red-500/10 text-red-700 ring-red-600/20 dark:text-red-300 dark:ring-red-400/25",
  warning: "bg-amber-500/12 text-amber-800 ring-amber-600/25 dark:text-amber-300 dark:ring-amber-400/25",
  info: "bg-primary/10 text-primary ring-primary/20",
  neutral: "bg-muted text-muted-foreground ring-border",
}

const ICON: Record<ChipTone, React.ComponentType<{ className?: string }>> = {
  success: Check,
  danger: X,
  warning: AlertTriangle,
  info: Clock,
  neutral: Circle,
}

/** Holat belgisi: ✓ Faol (yashil), ✕ Nofaol (qizil) va h.k. Figma "Status" ustuni uslubi. */
export function StatusChip({
  tone,
  children,
  icon = true,
  className,
}: {
  tone: ChipTone
  children: React.ReactNode
  /** false — ikonkasiz; yoki o‘z ikonkangiz. */
  icon?: boolean | React.ReactNode
  className?: string
}) {
  const Icon = ICON[tone]
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 whitespace-nowrap rounded-md px-2 text-xs font-medium ring-1 ring-inset [&_svg]:size-3",
        TONE[tone],
        className,
      )}
    >
      {icon === true ? <Icon className={tone === "neutral" ? "fill-current" : undefined} /> : icon || null}
      {children}
    </span>
  )
}

/** Toifa yorlig‘i: rangli nuqta + matn (kategoriya, rol, to‘lov turi). Rang nomdan barqaror tanlanadi. */
const DOT_COLORS = [
  "bg-violet-500",
  "bg-sky-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-fuchsia-500",
  "bg-orange-500",
]

export function dotColor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return DOT_COLORS[h % DOT_COLORS.length]
}

export function DotLabel({ children, colorKey, className }: { children: React.ReactNode; colorKey?: string; className?: string }) {
  const key = colorKey ?? (typeof children === "string" ? children : "")
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5 text-sm", className)}>
      <span className={cn("size-2 shrink-0 rounded-full", dotColor(key))} aria-hidden />
      <span className="truncate">{children}</span>
    </span>
  )
}
