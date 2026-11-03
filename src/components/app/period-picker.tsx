"use client"

import { useState } from "react"
import { CalendarDays, Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { DateRangeFields } from "@/components/app/filter-bar"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

export interface PeriodOption {
  value: string
  label: string
}

export interface PeriodCustomRange {
  /** Hozir maxsus oraliq tanlanganmi */
  active: boolean
  from: string
  to: string
  onFrom: (v: string) => void
  onTo: (v: string) => void
  /** Boshlanish tugashdan keyin bo‘lsa */
  invalid?: boolean
}

const shortDate = (d: string) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}` : "…")

/**
 * Davr tanlash (Bugun, Kecha, Hafta…).
 * Kompyuter/planshet: ixcham segmentli tugma (≤ 5 ta variant) + yonida "Boshqa" (sana oralig‘i oynasi).
 * Telefon: bitta tugma ("Bugun ▾") — bosilsa pastdan ro‘yxat va sana oralig‘i chiqadi; ekran tepasini egallamaydi.
 */
export function PeriodPicker({
  options,
  value,
  onChange,
  custom,
  className,
}: {
  options: PeriodOption[]
  /** Tanlangan variant qiymati (maxsus oraliqda ahamiyatsiz) */
  value: string
  onChange: (value: string) => void
  custom?: PeriodCustomRange
  className?: string
}) {
  const isMobile = useIsMobile()
  const [sheetOpen, setSheetOpen] = useState(false)
  const customActive = !!custom?.active
  const rangeLabel = custom ? `${shortDate(custom.from)} – ${shortDate(custom.to)}` : ""
  const currentLabel = customActive ? rangeLabel : (options.find((o) => o.value === value)?.label ?? "Davr")

  const customFields = custom && (
    <div className="space-y-1.5">
      <DateRangeFields from={custom.from} to={custom.to} onFrom={custom.onFrom} onTo={custom.onTo} />
      {custom.invalid && <p className="text-xs text-destructive">Boshlanish sanasi tugash sanasidan keyin bo‘lmasin</p>}
    </div>
  )

  if (isMobile) {
    return (
      <>
        <Button
          variant="outline"
          className={cn("h-10 gap-2 rounded-xl bg-card px-3 font-medium", className)}
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
        >
          <CalendarDays className="text-muted-foreground" />
          {currentLabel}
          <ChevronDown className="text-muted-foreground" />
        </Button>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="gap-0 rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />
            <SheetHeader className="pb-2">
              <SheetTitle>Davr</SheetTitle>
              <SheetDescription className="sr-only">Ko‘rsatkichlar qaysi davr uchun hisoblanishini tanlang</SheetDescription>
            </SheetHeader>
            <div role="radiogroup" aria-label="Davr" className="px-2">
              {options.map((o) => {
                const active = !customActive && o.value === value
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      onChange(o.value)
                      setSheetOpen(false)
                    }}
                    className={cn(
                      "flex h-12 w-full items-center justify-between rounded-xl px-3 text-left text-base outline-none active:bg-muted focus-visible:bg-muted",
                      active && "font-semibold text-primary",
                    )}
                  >
                    {o.label}
                    {active && <Check className="size-5" />}
                  </button>
                )
              })}
            </div>
            {custom && (
              <div className="mx-4 mt-2 border-t pt-4">
                <p className={cn("mb-2 text-sm font-medium", customActive && "text-primary")}>Boshqa sana oralig‘i</p>
                {customFields}
              </div>
            )}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <div role="radiogroup" aria-label="Davr" className="inline-flex rounded-xl border bg-card p-1">
        {options.map((o) => {
          const active = !customActive && o.value === value
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={cn(
                "h-8 rounded-lg px-3 text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      {custom && (
        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(
                  "h-10 gap-2 rounded-xl bg-card px-3",
                  customActive ? "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary" : "text-muted-foreground",
                )}
              />
            }
          >
            <CalendarDays />
            {customActive ? rangeLabel : "Boshqa"}
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80">
            <p className="mb-3 text-sm font-medium">Sana oralig‘i</p>
            {customFields}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
