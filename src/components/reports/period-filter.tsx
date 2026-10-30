"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Davr">
        {PRESET_OPTIONS.map((p) => (
          <Button
            key={p.value}
            size="sm"
            variant="outline"
            className={preset === p.value ? "border-primary bg-primary/10 font-semibold text-primary hover:bg-primary/15" : "text-muted-foreground"}
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
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" className="w-40" aria-label="Boshlanish sanasi" value={dateFrom} onChange={(e) => set({ preset: "custom", dateFrom: e.target.value })} />
          <span className="text-muted-foreground">—</span>
          <Input type="date" className="w-40" aria-label="Tugash sanasi" value={dateTo} onChange={(e) => set({ preset: "custom", dateTo: e.target.value })} />
          {invalid && <span className="text-xs text-destructive">Boshlanish sanasi tugashdan keyin</span>}
        </div>
      )}
    </div>
  )
}
