"use client"

import { SlidersHorizontal } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

/**
 * Ro‘yxat sahifalari uchun filtr paneli.
 * Desktop: qidiruv + filtrlar bitta qatorda (paper surface).
 * Mobil: faqat qidiruv va ixcham "Filtr" tugmasi; filtrlar pastdan chiqadigan panelda —
 * shunda ekranning tepasini filtrlar egallamaydi, ro‘yxat darhol ko‘rinadi.
 */
export function FilterBar({
  search,
  children,
  activeCount = 0,
  onReset,
  actions,
  className,
}: {
  /** Doim ko‘rinadigan qidiruv maydoni (ixtiyoriy) */
  search?: React.ReactNode
  /** Filtr boshqaruvlari (select, sana, toggle...) */
  children?: React.ReactNode
  /** Nechta filtr tanlangan — mobil tugmada ko‘rsatiladi */
  activeCount?: number
  /** Barcha filtrlarni tozalash */
  onReset?: () => void
  /** O‘ng tomondagi qo‘shimcha amallar (masalan, CSV) — mobilda tugma yonida */
  actions?: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 [&>select]:w-auto [&>select]:min-w-44", className)}>
        {search && <div className="min-w-56 flex-1">{search}</div>}
        {children}
        {onReset && activeCount > 0 && (
          <Button variant="ghost" onClick={onReset}>
            Tozalash
          </Button>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>
    )
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {search && <div className="min-w-0 flex-1">{search}</div>}
      {children && (
        <Sheet>
          <SheetTrigger
            render={<Button variant="outline" className="h-10 shrink-0 gap-1.5 px-3" aria-label="Filtrlarni ochish" />}
          >
            <SlidersHorizontal />
            {!search && "Filtr"}
            {activeCount > 0 && (
              <Badge className="h-5 min-w-5 rounded-full px-1.5 tabular-nums">{activeCount}</Badge>
            )}
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85svh] rounded-t-2xl">
            <SheetHeader>
              <SheetTitle>Filtrlar</SheetTitle>
              <SheetDescription>Ro‘yxat tanlangan filtrlar bo‘yicha darhol yangilanadi.</SheetDescription>
            </SheetHeader>
            <div className="grid gap-3 overflow-y-auto px-4 [&>*]:w-full">{children}</div>
            <SheetFooter className="flex-row gap-2">
              {onReset && (
                <Button variant="outline" className="h-11 flex-1" onClick={onReset} disabled={activeCount === 0}>
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
