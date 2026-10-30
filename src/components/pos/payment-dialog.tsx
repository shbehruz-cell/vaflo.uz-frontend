"use client"

import { useMemo, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { AlertCircle, BadgePercent, Banknote, Check, CreditCard, Hash, Info, Pencil, Shuffle, UserRound } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group"
import { Kbd } from "@/components/ui/kbd"
import { Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatMoney } from "@/lib/format"
import { cn } from "@/lib/utils"
import { CARD_TYPES, CardBrandMark, type CardType } from "./card-brands"
import type { PickedCustomer } from "./customer-picker"
import { DiscountBlock } from "./discount-block"
import { cartMath, fromTiyin, lineMath, som, toTiyin, type CartDiscount, type CartLine, type Receipt } from "./types"

type Mode = "cash" | "card" | "mixed"

const MODES: { value: Mode; label: string; hint: string; icon: typeof Banknote }[] = [
  { value: "cash", label: "Naqd", hint: "Qaytim hisoblanadi", icon: Banknote },
  { value: "card", label: "Karta", hint: "Terminal orqali", icon: CreditCard },
  { value: "mixed", label: "Aralash", hint: "Naqd + karta", icon: Shuffle },
]

const cleanNum = (v: string) => v.replace(/[^\d.]/g, "")
const roundUp = (total: number, stepSom: number) => Math.ceil(total / (stepSom * 100)) * stepSom * 100

export function PaymentDialog({ open, onOpenChange, ...rest }: PaymentProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-5 sm:max-w-lg">
        <PaymentBody {...rest} />
      </DialogContent>
    </Dialog>
  )
}

interface PaymentProps {
  /** Chegirma taqsimlangan qatorlar (backendga shu yuboriladi) */
  lines: CartLine[]
  /** Chegirmasiz asl qatorlar (chegirma bloki hisoblashi uchun) */
  baseLines: CartLine[]
  discount: CartDiscount
  onDiscount: (d: CartDiscount) => void
  customer: PickedCustomer | null
  getIdempotencyKey: () => string
  onSuccess: (r: Receipt) => void
}

/** Karta turini tanlash plitkalari (radio guruh). */
function CardTypePicker({ value, onChange, compact }: { value: CardType | null; onChange: (v: CardType) => void; compact?: boolean }) {
  return (
    <div role="radiogroup" aria-label="Karta turi" className={cn("grid gap-2", compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3")}>
      {CARD_TYPES.map((c) => {
        const active = value === c.value
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            onClick={() => onChange(c.value)}
            className={cn(
              "relative flex flex-col items-center gap-1.5 rounded-xl border bg-card px-2 text-xs font-medium transition-all outline-none hover:border-primary/40 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
              compact ? "py-2" : "py-3",
              active && "border-primary bg-primary/5 text-primary ring-1 ring-primary hover:border-primary hover:bg-primary/5",
            )}
          >
            <CardBrandMark type={c.value} className={compact ? "h-6 w-9" : undefined} />
            {!compact && <span>{c.label}</span>}
            {active && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function MoneyInput({
  id,
  value,
  onChange,
  icon: Icon,
  autoFocus,
  large,
  invalid,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  icon?: typeof Banknote
  autoFocus?: boolean
  large?: boolean
  invalid?: boolean
}) {
  return (
    <InputGroup className={large ? "h-14" : "h-11"}>
      {Icon && (
        <InputGroupAddon>
          <Icon className="text-muted-foreground" />
        </InputGroupAddon>
      )}
      <InputGroupInput
        id={id}
        autoFocus={autoFocus}
        inputMode="decimal"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn("text-right font-semibold tabular-nums", large ? "text-2xl" : "text-base")}
        value={value}
        onChange={(e) => onChange(cleanNum(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>so‘m</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  )
}

function PaymentBody({ lines, baseLines, discount, onDiscount, customer, getIdempotencyKey, onSuccess }: PaymentProps) {
  const { can } = useAuth()
  const canDiscount = can("discount.apply")
  const math = cartMath(lines)
  const total = math.total
  const [mode, setMode] = useState<Mode>("cash")
  const [received, setReceived] = useState(() => String(som(total)))
  const [mixCash, setMixCash] = useState("")
  const [mixCard, setMixCard] = useState(() => String(som(total)))
  const [cardType, setCardType] = useState<CardType | null>(null)
  const [terminalRef, setTerminalRef] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [prevTotal, setPrevTotal] = useState(total)
  if (total !== prevTotal) {
    // Chegirma o‘zgardi — qabul qilingan va aralash summalarni yangi jamiga moslaymiz
    setPrevTotal(total)
    setReceived(String(som(total)))
    setMixCash("")
    setMixCard(String(som(total)))
  }

  const receivedT = toTiyin(received)
  const change = receivedT - total
  const mixCashT = toTiyin(mixCash)
  const mixCardT = toTiyin(mixCard)
  const mixDiff = total - mixCashT - mixCardT
  const mixOk = mixCashT >= 0 && mixCardT >= 0 && mixDiff === 0 && mixCashT + mixCardT > 0
  const refOk = /^[\w-]*$/.test(terminalRef)

  const canSubmit = total > 0 && refOk && (mode === "card" || (mode === "cash" && receivedT >= total) || (mode === "mixed" && mixOk))

  const quick = useMemo(() => {
    const set = new Set<number>([total])
    for (const s of [1000, 5000, 10000, 50000, 100000]) set.add(roundUp(total, s))
    return [...set].sort((a, b) => a - b).slice(0, 5)
  }, [total])

  const cardExtra = { ...(cardType && { cardType }), ...(terminalRef.trim() && { externalReference: terminalRef.trim() }) }

  const pay = useMutation({
    mutationFn: () => {
      const payments =
        mode === "cash"
          ? [{ method: "CASH", amount: fromTiyin(total), tendered: fromTiyin(receivedT) }]
          : mode === "card"
            ? [{ method: "CARD", amount: fromTiyin(total), ...cardExtra }]
            : [
                ...(mixCashT > 0 ? [{ method: "CASH", amount: fromTiyin(mixCashT), tendered: fromTiyin(mixCashT) }] : []),
                ...(mixCardT > 0 ? [{ method: "CARD", amount: fromTiyin(mixCardT), ...cardExtra }] : []),
              ]
      return api.post<Receipt>("/sales", {
        idempotencyKey: getIdempotencyKey(),
        customerId: customer?.id,
        items: lines.map((l) => {
          const m = lineMath(l)
          return {
            productId: l.product.id,
            qty: String(Number(l.qty)),
            ...(m.discount > 0 && { discount: fromTiyin(m.discount) }),
          }
        }),
        payments,
      })
    },
    onSuccess: (receipt) => {
      toast.success(`Sotuv yakunlandi: ${receipt.receiptNo}`)
      onSuccess(receipt)
    },
    onError: (e) => {
      let msg = e instanceof ApiError ? e.message : "To‘lovni yuborib bo‘lmadi. Internetni tekshiring."
      if (e instanceof ApiError) {
        if (e.status === 409) msg = e.message || "Qoldiq yetarli emas yoki smena ochiq emas"
        else if (e.status === 403) msg = e.message || "Bu amalga ruxsat yo‘q"
      }
      setError(msg)
      toast.error(msg)
    },
  })

  const submit = () => {
    if (!canSubmit || pay.isPending) return
    setError(null)
    pay.mutate()
  }

  const itemCount = lines.length
  const cashShare = total > 0 ? Math.min(100, Math.max(0, (mixCashT / total) * 100)) : 0
  const cardShare = total > 0 ? Math.min(100 - cashShare, Math.max(0, (mixCardT / total) * 100)) : 0

  const terminalField = (
    <Field>
      <FieldLabel htmlFor="terminal-ref" className="text-muted-foreground">
        Terminal chek raqami <span className="font-normal">(ixtiyoriy)</span>
      </FieldLabel>
      <InputGroup className="h-10">
        <InputGroupAddon>
          <Hash className="text-muted-foreground" />
        </InputGroupAddon>
        <InputGroupInput
          id="terminal-ref"
          maxLength={32}
          autoComplete="off"
          placeholder="Masalan: 004512"
          aria-invalid={!refOk || undefined}
          value={terminalRef}
          onChange={(e) => setTerminalRef(e.target.value)}
        />
      </InputGroup>
      {!refOk && <p className="text-xs text-destructive">Faqat harf, raqam va “-” belgisi</p>}
    </Field>
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-lg">To‘lov</DialogTitle>
        <DialogDescription className="flex items-center gap-4">
          <span>{itemCount} ta mahsulot</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <UserRound className="size-3.5 shrink-0" />
            <span className="truncate">{customer?.name ?? "Ixtiyoriy xaridor"}</span>
          </span>
        </DialogDescription>
      </DialogHeader>

      {/* Jami summa */}
      <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3.5">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium text-muted-foreground">To‘lanadigan summa</div>
            <div className="mt-0.5 text-3xl font-bold tracking-tight text-primary tabular-nums sm:text-4xl">{formatMoney(som(total))}</div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground">
            {math.discount > 0 && <div className="line-through tabular-nums">{formatMoney(som(math.subtotal))}</div>}
            {canDiscount ? (
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant={math.discount > 0 ? "secondary" : "outline"}
                      size="xs"
                      className="rounded-full bg-background tabular-nums"
                      aria-label="Chegirma qo‘shish yoki o‘zgartirish"
                    />
                  }
                >
                  {math.discount > 0 ? (
                    <>
                      −{formatMoney(som(math.discount))} <Pencil />
                    </>
                  ) : (
                    <>
                      <BadgePercent /> Chegirma
                    </>
                  )}
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <PopoverHeader>
                    <PopoverTitle>Chegirma</PopoverTitle>
                    <PopoverDescription>Butun chekka — so‘mda yoki foizda</PopoverDescription>
                  </PopoverHeader>
                  <DiscountBlock value={discount} onChange={onDiscount} lines={baseLines} bare />
                </PopoverContent>
              </Popover>
            ) : (
              math.discount > 0 && <div className="tabular-nums">Chegirma: −{formatMoney(som(math.discount))}</div>
            )}
          </div>
        </div>
      </div>

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        {/* To‘lov usuli */}
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => {
            const next = (v as string[])[0] as Mode | undefined
            if (next) {
              setMode(next)
              setError(null)
            }
          }}
          variant="outline"
          spacing={2}
          aria-label="To‘lov usuli"
          className="grid w-full grid-cols-3"
        >
          {MODES.map((m) => (
            <ToggleGroupItem
              key={m.value}
              value={m.value}
              className="h-auto flex-col gap-1 rounded-xl py-3 data-pressed:border-primary data-pressed:bg-primary/10 data-pressed:text-primary [&_svg:not([class*='size-'])]:size-5"
            >
              <m.icon />
              <span className="text-sm font-semibold">{m.label}</span>
              <span className="hidden text-[11px] font-normal text-muted-foreground sm:block">{m.hint}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {mode === "cash" && (
          <div className="space-y-3">
            <Field>
              <FieldLabel htmlFor="received">Qabul qilingan summa</FieldLabel>
              <MoneyInput id="received" value={received} onChange={setReceived} icon={Banknote} autoFocus large invalid={receivedT < total} />
            </Field>
            <div className="flex flex-wrap gap-2">
              {quick.map((q) => (
                <Button
                  key={q}
                  type="button"
                  variant={receivedT === q ? "default" : "outline"}
                  size="sm"
                  className="h-9 rounded-full px-3.5 tabular-nums"
                  onClick={() => setReceived(String(som(q)))}
                >
                  {q === total ? "Aniq summa" : formatMoney(som(q), false)}
                </Button>
              ))}
            </div>
            <div
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3",
                change < 0 ? "border-destructive/30 bg-destructive/5" : "bg-muted/50",
              )}
            >
              <span className="text-sm font-medium text-muted-foreground">{change < 0 ? "Yetmayapti" : "Qaytim"}</span>
              <span className={cn("text-2xl font-bold tabular-nums", change < 0 && "text-destructive")}>
                {formatMoney(som(Math.abs(change)))}
              </span>
            </div>
          </div>
        )}

        {mode === "card" && (
          <div className="space-y-4">
            <Field>
              <FieldLabel>Karta turi</FieldLabel>
              <CardTypePicker value={cardType} onChange={setCardType} />
            </Field>
            {terminalField}
            <p className="flex gap-2 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              Karta — faqat to‘lov usuli qaydi. Bank tasdig‘i tizimda amalga oshirilmaydi, to‘lovni terminalda yakunlang.
            </p>
          </div>
        )}

        {mode === "mixed" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="mix-cash">Naqd</FieldLabel>
                <MoneyInput
                  id="mix-cash"
                  icon={Banknote}
                  autoFocus
                  value={mixCash}
                  onChange={(v) => {
                    setMixCash(v)
                    setMixCard(String(som(Math.max(0, total - toTiyin(v)))))
                  }}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="mix-card">Karta</FieldLabel>
                <MoneyInput
                  id="mix-card"
                  icon={CreditCard}
                  value={mixCard}
                  onChange={(v) => {
                    setMixCard(v)
                    setMixCash(String(som(Math.max(0, total - toTiyin(v)))))
                  }}
                />
              </Field>
            </div>

            {/* Taqsimot chizig‘i */}
            <div className="space-y-1.5">
              <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="bg-primary transition-all" style={{ width: `${cashShare}%` }} />
                <div className="bg-chart-2 transition-all" style={{ width: `${cardShare}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary" /> Naqd
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-2" /> Karta
                  </span>
                </span>
                {mixOk ? (
                  <span className="flex items-center gap-1 font-medium text-primary">
                    <Check className="size-3.5" /> Summa to‘g‘ri
                  </span>
                ) : (
                  <span className="font-medium text-destructive tabular-nums">
                    {mixDiff > 0 ? "Yetmayapti" : "Ortiqcha"}: {formatMoney(som(Math.abs(mixDiff)))}
                  </span>
                )}
              </div>
            </div>

            {mixCardT > 0 && (
              <Field>
                <FieldLabel>Karta turi</FieldLabel>
                <CardTypePicker value={cardType} onChange={setCardType} compact />
              </Field>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="h-12 w-full justify-between rounded-xl px-4 text-base" disabled={!canSubmit || pay.isPending}>
          <span className="flex items-center gap-2">
            {pay.isPending ? <Spinner /> : <Check />} To‘lovni tasdiqlash
          </span>
          <Kbd className="bg-primary-foreground/15 text-primary-foreground">Enter</Kbd>
        </Button>
      </form>
    </>
  )
}
