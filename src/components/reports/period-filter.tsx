"use client"

import { PeriodPicker } from "@/components/app/period-picker"
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

export function PeriodFilter({ defaultPreset = "today", variant }: { defaultPreset?: Preset; variant?: "segmented" | "inline" }) {
  const { set } = useUrlState()
  const { preset, dateFrom, dateTo } = usePeriod(defaultPreset)
  const invalid = preset === "custom" && !!dateFrom && !!dateTo && dateFrom > dateTo

  return (
    <PeriodPicker
      variant={variant}
      options={PRESET_OPTIONS.filter((p) => p.value !== "custom")}
      value={preset}
      onChange={(v) => set({ preset: v === defaultPreset ? "" : v, dateFrom: "", dateTo: "", page: "" })}
      custom={{
        active: preset === "custom",
        from: dateFrom,
        to: dateTo,
        invalid,
        onFrom: (v) => set({ preset: "custom", dateFrom: v, page: "" }),
        onTo: (v) => set({ preset: "custom", dateTo: v, page: "" }),
      }}
    />
  )
}
