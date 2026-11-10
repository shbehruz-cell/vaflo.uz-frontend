import { cn } from "@/lib/utils"

/**
 * Har bir sahifa tepasidagi sarlavha + amallar qatori.
 * Barcha ekranlarda bitta qator: chapda sarlavha (va qisqa izoh), o‘ngda ixcham amallar.
 * `eyebrow` — sarlavha ustidagi kichik yorliq (bo‘lim nomi, ixtiyoriy ikonka bilan), desktopda ko‘rinadi.
 */
export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  eyebrow?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1.5 hidden items-center gap-1.5 text-xs font-medium text-muted-foreground md:flex [&_svg]:size-3.5">
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
