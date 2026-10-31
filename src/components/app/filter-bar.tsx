"use client"

import { SlidersHorizontal, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface FilterChip {
  key: string
  label: string
  onRemove: () => void
}

/**
 * Ro‘yxat sahifalari uchun yagona qidiruv + filtr qatori (barcha ekranlarda bir xil, ixcham):
 * qidiruv maydoni, "Filtr" tugmasi (tanlanganlar soni bilan), qo‘shimcha amallar.
 * Filtrlar panelda: telefonda pastdan, kompyuterda o‘ngdan chiqadi.
 * Tanlangan filtrlar qator ostida chip ko‘rinishida — bittasini bosib olib tashlash mumkin.
 */
export function FilterBar({
  search,
  children,
  activeCount = 0,
  onReset,
  actions,
  chips,
  className,
}: {
  /** Doim ko‘rinadigan qidiruv maydoni (ixtiyoriy) — odatda <SearchInput /> */
  search?: React.ReactNode
  /** Filtr boshqaruvlari (select, sana, toggle...) — panel ichida ko‘rsatiladi */
  children?: React.ReactNode
  /** Nechta filtr tanlangan — tugmada ko‘rsatiladi */
  activeCount?: number
  /** Barcha filtrlarni tozalash */
  onReset?: () => void
  /** O‘ng tomondagi qo‘shimcha amallar (masalan, CSV yuklab olish) */
  actions?: React.ReactNode
  /** Tanlangan filtrlar (olib tashlanadigan chiplar) */
  chips?: FilterChip[]
  /** Eski API bilan moslik uchun — endi doim ixcham */
  collapsed?: boolean
  className?: string
}) {
  const isMobile = useIsMobile()
  const active = activeCount > 0

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        {search && <div className="min-w-0 flex-1">{search}</div>}
        {children && (
          <Sheet>
            <SheetTrigger
              render={
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 shrink-0 gap-1.5 rounded-xl px-3 md:h-10",
                    active && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
                  )}
                  aria-label={active ? `Filtrlar (${activeCount} ta tanlangan)` : "Filtrlarni ochish"}
                />
              }
            >
              <SlidersHorizontal />
              <span className={cn(search && "hidden sm:inline")}>Filtr</span>
              {active && <Badge className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">{activeCount}</Badge>}
            </SheetTrigger>
            <SheetContent
              side={isMobile ? "bottom" : "right"}
              className={isMobile ? "max-h-[85svh] gap-0 rounded-t-2xl" : "w-full gap-0 sm:max-w-sm"}
            >
              {isMobile && <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />}
              <SheetHeader>
                <SheetTitle>Filtrlar</SheetTitle>
                <SheetDescription>Ro‘yxat tanlangan filtrlar bo‘yicha darhol yangilanadi.</SheetDescription>
              </SheetHeader>
              <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-4 [&>*]:w-full [&_.md\:flex]:grid">{children}</div>
              <SheetFooter className="flex-row gap-2 border-t pb-[max(1rem,env(safe-area-inset-bottom))]">
                {onReset && (
                  <Button variant="outline" className="h-11 flex-1" onClick={onReset} disabled={!active}>
                    Tozalash
                  </Button>
                )}
                <SheetClose render={<Button className="h-11 flex-1" />}>Ko‘rsatish</SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        )}
        {actions}
      </div>

      {chips && chips.length > 0 && (
        <div className="scroll-row -mx-4 items-center gap-1.5 px-4 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Tanlangan filtrlar">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={c.onRemove}
              aria-label={`${c.label} filtrini olib tashlash`}
              className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/5 pr-2 pl-3 text-xs font-medium text-primary outline-none hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              {c.label}
              <X className="size-3.5" />
            </button>
          ))}
          {onReset && chips.length > 1 && (
            <button
              type="button"
              onClick={onReset}
              className="h-8 shrink-0 rounded-full px-2 text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              Hammasini tozalash
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/** Sana oralig‘i: iOS'da ham yorliq bilan ko‘rinadigan ikki maydon. */
export function DateRangeFields({
  from,
  to,
  onFrom,
  onTo,
}: {
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
}) {
  const field = "h-10 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30"
  return (
    <div className="grid grid-cols-2 gap-2 md:flex md:w-auto">
      <label className="grid gap-1 text-xs text-muted-foreground md:flex md:items-center md:gap-2">
        Dan
        <input type="date" className={field} value={from} max={to || undefined} onChange={(e) => onFrom(e.target.value)} />
      </label>
      <label className="grid gap-1 text-xs text-muted-foreground md:flex md:items-center md:gap-2">
        Gacha
        <input type="date" className={field} value={to} min={from || undefined} onChange={(e) => onTo(e.target.value)} />
      </label>
    </div>
  )
}

/**
 * Filtr panelidagi bitta maydon: ustida yorliq, ostida boshqaruv (select, input...).
 * `group` — ichida o‘z yorlig‘i yoki tugmalari bor murakkab boshqaruv uchun (sana oralig‘i, xaridor tanlash):
 * ichma-ich <label> bo‘lmasligi uchun guruh sifatida chiziladi.
 */
export function FilterField({ label, group, children }: { label: string; group?: boolean; children: React.ReactNode }) {
  if (group) {
    return (
      <div role="group" aria-label={label} className="grid gap-1.5 text-sm font-medium">
        <span>{label}</span>
        {children}
      </div>
    )
  }
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}
