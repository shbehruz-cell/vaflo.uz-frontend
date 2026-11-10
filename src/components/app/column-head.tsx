import { cn } from "@/lib/utils"

/** Jadval ustuni sarlavhasi: kichik ikonka + nom (Figma uslubi). `<TableHead>` ichiga qo‘yiladi. */
export function ColumnHead({
  icon: Icon,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {Icon && <Icon className="size-3.5 shrink-0 opacity-70" />}
      {children}
    </span>
  )
}
