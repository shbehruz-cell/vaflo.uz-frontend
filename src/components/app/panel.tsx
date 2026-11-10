import Link from "next/link"
import { ChevronRight, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"
import { Sparkline } from "@/components/app/sparkline"

/** Panel: yumaloq chegarali, `bg-card` kartochka (dashboard/hisobot bo‘laklari uchun). */
export function Panel({ className, children }: { className?: string; children: React.ReactNode }) {
  return <section className={cn("rounded-xl border bg-card p-4 sm:p-5", className)}>{children}</section>
}

/** Panel sarlavhasi: chapda belgi + nom + (ixtiyoriy) katta qiymat, o‘ngda amallar (select, tugma). */
export function PanelHeader({
  icon,
  title,
  value,
  actions,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  value?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2", className)}>
      <div className="flex min-w-0 items-baseline gap-2">
        <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
          {icon}
          <span className="truncate">{title}</span>
        </h2>
        {value != null && <span className="text-lg font-semibold tabular-nums sm:text-xl">{value}</span>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

/** Panel burchagidagi 32px kvadrat chegarali tugma (havola yoki onClick). `children` — belgi (birlamchi: ›). */
export function PanelIconButton({
  label,
  href,
  onClick,
  children,
}: {
  label: string
  href?: string
  onClick?: () => void
  children?: React.ReactNode
}) {
  const cls =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border bg-card text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4"
  const icon = children ?? <ChevronRight />
  return href ? (
    <Link href={href} aria-label={label} title={label} className={cls}>
      {icon}
    </Link>
  ) : (
    <button type="button" aria-label={label} title={label} onClick={onClick} className={cls}>
      {icon}
    </button>
  )
}

export interface MetricRow {
  key: string
  icon?: React.ReactNode
  /** Rangli nuqta (CSS rang) */
  dotColor?: string
  label: React.ReactNode
  count: string
  /** 0–100; hech bir qatorda berilmasa foiz ustuni ko‘rsatilmaydi */
  pct?: number
  href?: string
}

/** Jadvalsimon ro‘yxat: "nom …… son │ foiz%". `columns` — [nom, son, foiz] ustun sarlavhalari; `empty` — bo‘sh holat matni. */
export function MetricList({
  columns,
  rows,
  empty = "Ma’lumot yo‘q",
  className,
}: {
  columns?: [string, string, string?]
  rows: MetricRow[]
  empty?: React.ReactNode
  className?: string
}) {
  const showPct = rows.some((r) => r.pct != null)
  return (
    <div className={cn("text-sm", className)}>
      {columns && rows.length > 0 && (
        <div className="flex items-center gap-3 pb-2 text-xs text-muted-foreground">
          <span className="min-w-0 flex-1">{columns[0]}</span>
          <span className="text-right">{columns[1]}</span>
          {showPct && <span className="w-14 text-right">{columns[2]}</span>}
        </div>
      )}
      {rows.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {rows.map((r) => {
            const inner = (
              <>
                {r.dotColor ? <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: r.dotColor }} /> : null}
                {r.icon && <span className="flex shrink-0 text-muted-foreground [&_svg]:size-4">{r.icon}</span>}
                <span className="min-w-0 flex-1 truncate font-medium">{r.label}</span>
                <span className="shrink-0 text-right tabular-nums">{r.count}</span>
                {showPct && (
                  <span className="w-14 shrink-0 border-l pl-3 text-right tabular-nums">
                    {r.pct != null && Number.isFinite(r.pct) ? `${r.pct.toFixed(1)}%` : ""}
                  </span>
                )}
              </>
            )
            const row = "flex min-h-10 items-center gap-3 py-1.5"
            return (
              <li key={r.key}>
                {r.href ? (
                  <Link
                    href={r.href}
                    className={cn(row, "-mx-2 rounded-md px-2 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring")}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className={row}>{inner}</div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

/**
 * Ko‘rsatkich kartochkasi: yorliq, katta qiymat, ixtiyoriy sparkline va o‘zgarish (delta, masalan "+12%").
 * `href` berilsa — butun kartochka havola.
 */
export function StatTile({
  label,
  value,
  href,
  spark,
  delta,
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  href?: string
  spark?: number[]
  delta?: { value: string; positive?: boolean } | string
  className?: string
}) {
  const d = typeof delta === "string" ? { value: delta, positive: !delta.trim().startsWith("-") } : delta
  const body = (
    <>
      <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
        <span className="truncate">{label}</span>
        {href && <ChevronRight aria-hidden className="size-4 shrink-0" />}
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
        {d && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-xs font-medium tabular-nums",
              d.positive === false ? "text-destructive" : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {d.positive === false ? <TrendingDown className="size-3.5" /> : <TrendingUp className="size-3.5" />}
            {d.value}
          </span>
        )}
      </div>
      {spark && <Sparkline data={spark} className="mt-3" />}
    </>
  )
  const cls = cn("block rounded-xl border bg-card p-4", className)
  return href ? (
    <Link href={href} className={cn(cls, "outline-none transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Kichik doiraviy progress (birlamchi 20px): `value` / `max` nisbati to‘ldiriladi. */
export function RingProgress({ value, max = 100, size = 20, className }: { value: number; max?: number; size?: number; className?: string }) {
  const ratio = max > 0 && Number.isFinite(value) ? Math.min(Math.max(value / max, 0), 1) : 0
  const sw = Math.max(2, size / 8)
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className={cn("shrink-0 -rotate-90", className)}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={sw} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={sw}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - ratio)}
      />
    </svg>
  )
}
