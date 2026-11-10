"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export interface ViewTab {
  value: string
  label: React.ReactNode
  /** Berilsa — havola (sahifalar orasida); aks holda onChange chaqiriladi. */
  href?: string
  count?: number
  icon?: React.ReactNode
}

/**
 * Jadval ustidagi ko‘rinish tablari (pastki chiziqli) + o‘ngda asboblar (qidiruv, filtr, qo‘shish).
 * Telefonda tablar gorizontal suriladi, asboblar o‘ngda qoladi.
 * `variant="pill"`: kulrang segmentli tablar (faol — oq/ko‘tarilgan); asboblar (qidiruv, InlineSelect) telefonda tablar ostiga
 * to‘liq kenglikda o‘tadi, kompyuterda o‘ngda turadi.
 */
export function ViewTabs({
  tabs,
  value,
  onChange,
  toolbar,
  className,
  variant = "underline",
}: {
  tabs: ViewTab[]
  value: string
  onChange?: (value: string) => void
  toolbar?: React.ReactNode
  className?: string
  variant?: "underline" | "pill"
}) {
  const pill = variant === "pill"
  return (
    <div className={cn(pill ? "flex flex-wrap items-center justify-between gap-x-3 gap-y-2" : "flex items-end gap-3 border-b", className)}>
      <div
        role="tablist"
        className={cn(
          "flex min-w-0 overflow-x-auto [scrollbar-width:none]",
          pill ? "max-w-full gap-0.5 rounded-xl bg-muted p-1" : "-mb-px flex-1 items-end gap-1",
        )}
      >
        {tabs.map((t) => {
          const active = t.value === value
          const cls = pill
            ? cn(
                "flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium whitespace-nowrap outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
                active ? "bg-card text-foreground shadow-xs dark:bg-secondary" : "text-muted-foreground hover:text-foreground",
              )
            : cn(
            "relative flex h-10 shrink-0 items-center gap-1.5 rounded-t-md px-2.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-4",
            "after:absolute after:inset-x-1 after:bottom-0 after:h-0.5 after:rounded-full",
            active ? "text-foreground after:bg-primary" : "text-muted-foreground hover:text-foreground after:bg-transparent",
          )
          const inner = (
            <>
              {t.icon}
              {t.label}
              {t.count != null && (
                <span className={cn("rounded-md px-1.5 text-xs tabular-nums", active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                  {t.count}
                </span>
              )}
            </>
          )
          return t.href ? (
            <Link key={t.value} href={t.href} role="tab" aria-selected={active} className={cls}>
              {inner}
            </Link>
          ) : (
            <button key={t.value} type="button" role="tab" aria-selected={active} className={cls} onClick={() => onChange?.(t.value)}>
              {inner}
            </button>
          )
        })}
      </div>
      {toolbar && (
        <div className={cn("flex items-center", pill ? "w-full flex-wrap gap-2 sm:w-auto" : "shrink-0 gap-1 pb-1.5")}>{toolbar}</div>
      )}
    </div>
  )
}
