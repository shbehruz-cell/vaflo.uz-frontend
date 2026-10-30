"use client"

import { Button } from "@/components/ui/button"
import { DateRangeFields } from "@/components/app/filter-bar"
import { cn } from "@/lib/utils"
import { useUrlState } from "@/hooks/use-url-state"

export type Preset = "today" | "yesterday" | "week" | "month" | "year" | "custom"

export const PRESET_OPTIONS: { value: Preset; label: string }[] = [
  { value: "today", label: "Bugun" },
  { value: "yesterday", label: "Kecha" },
  { value: "week", label: "Hafta" },
  { value: "month", label: "Oy" },
  { value: "year", label: "Yil" },
  { value: "custom", label: "Boshqa" },
]

const VALID = new Set<string>(PRESET_OPTIONS.map((p) => p.value))

/** URL (`preset`, `dateFrom`, `dateTo`) dan davr parametrlarini o‘qiydi. */
export function usePeriod(defaultPreset: Preset = "today") {
  const { get } = useUrlState()
  const raw = get("preset")
  const preset = (VALID.has(raw) ? raw : defaultPreset) as Preset
  const dateFrom = get("dateFrom")
  const dateTo = get("dateTo")
  const ready = preset !== "custom" || (!!dateFrom && !!dateTo && dateFrom <= dateTo)
  const query: Record<string, string | undefined> =
    preset === "custom" ? { preset, dateFrom, dateTo } : { preset }
  return { preset, dateFrom, dateTo, ready, query }
}

export function PeriodFilter({ defaultPreset = "today" }: { defaultPreset?: Preset }) {
  const { set } = useUrlState()
  const { preset, dateFrom, dateTo } = usePeriod(defaultPreset)
  const invalid = preset === "custom" && !!dateFrom && !!dateTo && dateFrom > dateTo

  return (
    <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
      <div className="scroll-row -mx-4 gap-2 px-4 md:mx-0 md:flex-wrap md:px-0" role="group" aria-label="Davr">
        {PRESET_OPTIONS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant="outline"
            className={cn("shrink-0", preset === p.value ? "border-primary bg-primary/10 font-semibold text-primary hover:bg-primary/15" : "text-muted-foreground")}
            aria-pressed={preset === p.value}
            onClick={() =>
              set({ preset: p.value === defaultPreset ? "" : p.value, ...(p.value !== "custom" && { dateFrom: "", dateTo: "" }), page: "" })
            }
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="space-y-1">
          <DateRangeFields
            from={dateFrom}
            to={dateTo}
            onFrom={(v) => set({ preset: "custom", dateFrom: v })}
            onTo={(v) => set({ preset: "custom", dateTo: v })}
          />
          {invalid && <span className="text-xs text-destructive">Boshlanish sanasi tugashdan keyin</span>}
        </div>
      )}
    </div>
  )
}
