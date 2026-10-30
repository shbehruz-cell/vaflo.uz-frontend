"use client"

import { BadgePercent, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useAuth } from "@/lib/auth"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { cartDiscountTiyin, DISCOUNT_LIMIT_PERCENT, fromTiyin, lineMath, som, type CartDiscount, type CartLine } from "./types"

/** Butun savatga bitta chegirma (so‘m yoki %). Qatorlarga taqsimlash `applyCartDiscount` da. */
export function DiscountBlock({
  value,
  onChange,
  lines,
  bare,
}: {
  value: CartDiscount
  onChange: (d: CartDiscount) => void
  lines: CartLine[]
  /** Ramkasiz (popover ichida) */
  bare?: boolean
}) {
  const { can } = useAuth()
  const gross = lines.reduce((s, l) => s + lineMath({ ...l, discount: "" }).gross, 0)
  const amount = cartDiscountTiyin(lines, value)
  const percent = gross > 0 ? (amount / gross) * 100 : 0
  const overLimit = percent > DISCOUNT_LIMIT_PERCENT + 1e-9 && !can("discount.override")
  const active = amount > 0

  const set = (patch: Partial<CartDiscount>) => onChange({ ...value, ...patch })
  const clean = (v: string) => {
    const s = v.replace(",", ".").replace(/[^\d.]/g, "")
    return value.mode === "percent" && Number(s) > 100 ? "100" : s
  }
  // Jami summani pastga, 1 000 so‘mgacha yaxlitlash uchun kerak bo‘ladigan chegirma
  const roundOff = gross % 100_000

  return (
    <div className={cn("space-y-2", !bare && "rounded-xl border p-2.5 transition-colors", !bare && (active ? "border-primary/30 bg-primary/5" : "bg-muted/30"))}>
      <div className="flex items-center gap-2">
        {!bare && (
          <span className="flex items-center gap-1.5 text-sm font-medium">
            <BadgePercent className="size-4 text-primary" /> Chegirma
          </span>
        )}
        <ToggleGroup
          value={[value.mode]}
          onValueChange={(v) => {
            const mode = (v as string[])[0] as CartDiscount["mode"] | undefined
            if (mode) onChange({ mode, value: "" })
          }}
          variant="outline"
          size="sm"
          aria-label="Chegirma turi"
          className="ml-auto"
        >
          <ToggleGroupItem value="amount" className="px-2.5 data-pressed:bg-primary data-pressed:text-primary-foreground">
            so‘m
          </ToggleGroupItem>
          <ToggleGroupItem value="percent" className="px-2.5 data-pressed:bg-primary data-pressed:text-primary-foreground">
            %
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="flex items-center gap-2">
        <InputGroup className="h-9 flex-1 bg-background">
          <InputGroupInput
            inputMode="decimal"
            autoComplete="off"
            aria-label={value.mode === "percent" ? "Chegirma foizi" : "Chegirma summasi"}
            aria-invalid={overLimit || undefined}
            placeholder="0"
            className="text-right tabular-nums"
            value={value.value}
            onChange={(e) => set({ value: clean(e.target.value) })}
            onFocus={(e) => e.currentTarget.select()}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupText>{value.mode === "percent" ? "%" : "so‘m"}</InputGroupText>
          </InputGroupAddon>
        </InputGroup>
        {active && (
          <Button variant="ghost" size="icon" className="size-9 shrink-0" aria-label="Chegirmani olib tashlash" onClick={() => set({ value: "" })}>
            <X />
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {[5, 10].map((p) => (
          <Button key={p} type="button" variant="outline" size="xs" className="rounded-full bg-background" onClick={() => onChange({ mode: "percent", value: String(p) })}>
            {p}%
          </Button>
        ))}
        {roundOff > 0 && (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="rounded-full bg-background"
            title="Jami summani 1 000 so‘mgacha pastga yaxlitlash"
            onClick={() => onChange({ mode: "amount", value: String(som(roundOff)) })}
          >
            Yaxlitlash (−{formatMoney(fromTiyin(roundOff), false)})
          </Button>
        )}
        {active && (
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {value.mode === "percent" ? `= ${formatMoney(som(amount))}` : `≈ ${percent.toFixed(1)}%`}
          </span>
        )}
      </div>

      {overLimit && (
        <p className="text-xs text-destructive">
          {DISCOUNT_LIMIT_PERCENT}% dan ortiq chegirma uchun ruxsat yo‘q — server to‘lovni rad etadi.
        </p>
      )}
    </div>
  )
}
