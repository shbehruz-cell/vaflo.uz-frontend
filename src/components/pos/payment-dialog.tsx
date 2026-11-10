"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  AlertCircle,
  BadgePercent,
  Banknote,
  Check,
  CreditCard,
  Hash,
  Info,
  Pencil,
  Shuffle,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Kbd } from "@/components/ui/kbd";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CARD_TYPES, CardBrandMark, type CardType } from "./card-brands";
import type { PickedCustomer } from "./customer-picker";
import { DiscountBlock } from "./discount-block";
import {
  cartMath,
  fromTiyin,
  lineMath,
  som,
  toTiyin,
  type CartDiscount,
  type CartLine,
  type Receipt,
} from "./types";

type Mode = "cash" | "card" | "mixed";

const MODES: {
  value: Mode;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: "cash", label: "Naqd", icon: Banknote },
  { value: "card", label: "Karta", icon: CreditCard },
  { value: "mixed", label: "Aralash", icon: Shuffle },
];

const cleanNum = (v: string) => v.replace(/[^\d.]/g, "");
/** Telefon/planshetda summa maydoniga avto-fokus berilmaydi — ekran klaviaturasi oynani yopib qo‘ymasligi uchun. */
const finePointer = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const roundUp = (total: number, stepSom: number) =>
  Math.ceil(total / (stepSom * 100)) * stepSom * 100;

/** Chegirma popover holati — Escape faqat popover’ni yopishi uchun (bir vaqtda bitta to‘lov oynasi). */
const discountPopover = { open: false, closedAt: 0 }

export function PaymentDialog({
  open,
  onOpenChange,
  ...rest
}: PaymentProps & { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o, details) => {
        // Chegirma popover’i ochiq paytda bosilgan Escape faqat popover’ni yopadi, to‘lov oynasini emas.
        if (!o && details.reason === "escape-key" && (discountPopover.open || Date.now() - discountPopover.closedAt < 300)) return
        onOpenChange(o)
      }}
    >
      <DialogContent className="gap-4 sm:max-w-lg sm:gap-5">
        <PaymentBody {...rest} />
      </DialogContent>
    </Dialog>
  );
}

interface PaymentProps {
  /** Chegirma taqsimlangan qatorlar (backendga shu yuboriladi) */
  lines: CartLine[];
  /** Chegirmasiz asl qatorlar (chegirma bloki hisoblashi uchun) */
  baseLines: CartLine[];
  discount: CartDiscount;
  onDiscount: (d: CartDiscount) => void;
  customer: PickedCustomer | null;
  getIdempotencyKey: () => string;
  onSuccess: (r: Receipt) => void;
}

/** Karta turini tanlash plitkalari (radio guruh). */
function CardTypePicker({
  value,
  onChange,
  compact,
}: {
  value: CardType | null;
  onChange: (v: CardType) => void;
  compact?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Karta turi"
      className={cn(
        "grid gap-2",
        compact ? "grid-cols-3 sm:grid-cols-6" : "grid-cols-3",
      )}
    >
      {CARD_TYPES.map((c) => {
        const active = value === c.value;
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={c.label}
            onClick={() => onChange(c.value)}
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-2 text-xs leading-4 font-medium transition-colors outline-none hover:border-primary/40 hover:bg-muted/50 active:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
              compact ? "py-2" : "py-2 sm:py-3",
              active &&
                "border-primary bg-primary/5 text-primary ring-1 ring-primary hover:border-primary hover:bg-primary/5",
            )}
          >
            <CardBrandMark
              type={c.value}
              className={compact ? "h-6 w-9" : undefined}
            />
            {!compact && <span className="hidden sm:inline">{c.label}</span>}
            {active && (
              <span className="absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
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
  id: string;
  value: string;
  onChange: (v: string) => void;
  icon?: typeof Banknote;
  autoFocus?: boolean;
  large?: boolean;
  invalid?: boolean;
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
        enterKeyHint="done"
        autoComplete="off"
        aria-invalid={invalid || undefined}
        className={cn(
          "h-full text-right font-semibold tabular-nums",
          large ? "text-2xl md:text-2xl" : "text-base md:text-base",
        )}
        value={value}
        onChange={(e) => onChange(cleanNum(e.target.value))}
        onFocus={(e) => e.currentTarget.select()}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>so‘m</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

function PaymentBody({
  lines,
  baseLines,
  discount,
  onDiscount,
  customer,
  getIdempotencyKey,
  onSuccess,
}: PaymentProps) {
  const { can } = useAuth();
  const canDiscount = can("discount.apply");
  const math = cartMath(lines);
  const total = math.total;
  const [mode, setMode] = useState<Mode>("cash");
  const [received, setReceived] = useState(() => String(som(total)));
  const [mixCash, setMixCash] = useState("");
  const [mixCard, setMixCard] = useState(() => String(som(total)));
  const [cardType, setCardType] = useState<CardType | null>(null);
  const [terminalRef, setTerminalRef] = useState("");
  const [showRef, setShowRef] = useState(false);
  const [autoFocusMoney] = useState(finePointer);
  const [error, setError] = useState<string | null>(null);
  const [prevTotal, setPrevTotal] = useState(total);
  if (total !== prevTotal) {
    // Chegirma o‘zgardi — qabul qilingan va aralash summalarni yangi jamiga moslaymiz
    setPrevTotal(total);
    setReceived(String(som(total)));
    setMixCash("");
    setMixCard(String(som(total)));
  }

  const receivedT = toTiyin(received);
  const change = receivedT - total;
  const mixCashT = toTiyin(mixCash);
  const mixCardT = toTiyin(mixCard);
  const mixDiff = total - mixCashT - mixCardT;
  const mixOk =
    mixCashT >= 0 && mixCardT >= 0 && mixDiff === 0 && mixCashT + mixCardT > 0;
  const refOk = /^[\w-]*$/.test(terminalRef);

  const canSubmit =
    total > 0 &&
    refOk &&
    (mode === "card" ||
      (mode === "cash" && receivedT >= total) ||
      (mode === "mixed" && mixOk));

  const quick = useMemo(() => {
    const set = new Set<number>([total]);
    for (const s of [1000, 5000, 10000, 20000, 50000, 100000, 200000])
      set.add(roundUp(total, s));
    return [...set].sort((a, b) => a - b).slice(0, 6);
  }, [total]);

  const cardExtra = {
    ...(cardType && { cardType }),
    ...(terminalRef.trim() && { externalReference: terminalRef.trim() }),
  };

  const submittingRef = useRef(false);
  const doneRef = useRef(false);
  const pay = useMutation({
    mutationFn: () => {
      const payments =
        mode === "cash"
          ? [
              {
                method: "CASH",
                amount: fromTiyin(total),
                tendered: fromTiyin(receivedT),
              },
            ]
          : mode === "card"
            ? [{ method: "CARD", amount: fromTiyin(total), ...cardExtra }]
            : [
                ...(mixCashT > 0
                  ? [
                      {
                        method: "CASH",
                        amount: fromTiyin(mixCashT),
                        tendered: fromTiyin(mixCashT),
                      },
                    ]
                  : []),
                ...(mixCardT > 0
                  ? [
                      {
                        method: "CARD",
                        amount: fromTiyin(mixCardT),
                        ...cardExtra,
                      },
                    ]
                  : []),
              ];
      return api.post<Receipt>("/sales", {
        idempotencyKey: getIdempotencyKey(),
        customerId: customer?.id,
        items: lines.map((l) => {
          const m = lineMath(l);
          return {
            productId: l.product.id,
            qty: String(Number(l.qty)),
            ...(m.discount > 0 && { discount: fromTiyin(m.discount) }),
          };
        }),
        payments,
      });
    },
    onSuccess: (receipt) => {
      if (doneRef.current) return;
      doneRef.current = true;
      toast.success(`Sotuv yakunlandi: ${receipt.receiptNo}`);
      onSuccess(receipt);
    },
    onError: (e) => {
      // fetch tarmoq xatosi TypeError beradi; boshqa kutilmagan xatoni yashirmaymiz — sababi ko‘rinsin
      const network =
        e instanceof TypeError && /fetch|network|load failed/i.test(e.message);
      let msg =
        e instanceof ApiError
          ? e.message
          : network
            ? "Server bilan aloqa yo‘q. Internetni tekshirib, qayta urinib ko‘ring."
            : `To‘lovni yuborib bo‘lmadi: ${e instanceof Error ? e.message : String(e)}`;
      if (!(e instanceof ApiError)) console.error("[payment]", e);
      if (e instanceof ApiError) {
        if (e.status === 409)
          msg = e.message || "Qoldiq yetarli emas yoki smena ochiq emas";
        else if (e.status === 403) msg = e.message || "Bu amalga ruxsat yo‘q";
      }
      setError(msg);
      toast.error(msg);
    },
    onSettled: () => {
      submittingRef.current = false;
    },
  });

  const submit = () => {
    if (!canSubmit || pay.isPending || submittingRef.current || doneRef.current)
      return;
    submittingRef.current = true;
    setError(null);
    pay.mutate();
  };

  const itemCount = lines.length;
  const cashShare =
    total > 0 ? Math.min(100, Math.max(0, (mixCashT / total) * 100)) : 0;
  const cardShare =
    total > 0
      ? Math.min(100 - cashShare, Math.max(0, (mixCardT / total) * 100))
      : 0;

  const terminalField =
    !showRef && !terminalRef ? (
      <button
        type="button"
        onClick={() => setShowRef(true)}
        className="flex h-11 items-center gap-2 rounded-lg px-1 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 pointer-fine:h-10"
      >
        <Hash className="size-4" /> Terminal chek raqamini kiritish
      </button>
    ) : (
      <Field>
        <FieldLabel htmlFor="terminal-ref" className="text-muted-foreground">
          Terminal chek raqami <span className="font-normal">(ixtiyoriy)</span>
        </FieldLabel>
        <InputGroup className="h-11 pointer-fine:h-10">
          <InputGroupAddon>
            <Hash className="text-muted-foreground" />
          </InputGroupAddon>
          <InputGroupInput
            id="terminal-ref"
            className="h-full text-base md:text-sm"
            enterKeyHint="done"
            maxLength={32}
            autoComplete="off"
            placeholder="Masalan: 004512"
            autoFocus={showRef}
            aria-invalid={!refOk || undefined}
            value={terminalRef}
            onChange={(e) => setTerminalRef(e.target.value)}
          />
        </InputGroup>
        {!refOk && (
          <p className="text-xs text-destructive">
            Faqat harf, raqam va “-” belgisi
          </p>
        )}
      </Field>
    );

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-base leading-6 font-semibold">
          To‘lov
        </DialogTitle>
        <DialogDescription className="flex items-center gap-3 text-sm leading-5">
          <span>{itemCount} ta mahsulot</span>
          <span className="flex min-w-0 items-center gap-1.5">
            <UserRound className="size-4 shrink-0" />
            <span className="truncate">
              {customer?.name ?? "Ixtiyoriy xaridor"}
            </span>
          </span>
        </DialogDescription>
      </DialogHeader>

      {/* Jami summa */}
      <div className="rounded-xl border bg-muted/40 px-4 py-3">
        <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <div className="min-w-0">
            <div className="text-xs leading-4 font-medium text-muted-foreground">
              To‘lanadigan summa
            </div>
            <div className="mt-1 text-3xl leading-9 font-bold tracking-[-0.02em] whitespace-nowrap text-foreground tabular-nums sm:text-4xl sm:leading-10">
              {formatMoney(som(total))}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1 text-xs leading-4 text-muted-foreground">
            {math.discount > 0 && (
              <div className="line-through tabular-nums">
                {formatMoney(som(math.subtotal))}
              </div>
            )}
            {canDiscount ? (
              <Popover
                onOpenChange={(o) => {
                  discountPopover.open = o
                  if (!o) discountPopover.closedAt = Date.now()
                }}
              >
                <PopoverTrigger
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5 rounded-lg bg-background px-3 text-sm tabular-nums pointer-fine:h-8"
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
                    <PopoverDescription>
                      Butun chekka — so‘mda yoki foizda
                    </PopoverDescription>
                  </PopoverHeader>
                  <DiscountBlock
                    value={discount}
                    onChange={onDiscount}
                    lines={baseLines}
                    bare
                  />
                </PopoverContent>
              </Popover>
            ) : (
              math.discount > 0 && (
                <div className="tabular-nums">
                  Chegirma: −{formatMoney(som(math.discount))}
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <form
        className="space-y-4 sm:space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        onKeyDown={(e) => {
          // Telefon/planshet: klaviaturadagi "Go/Enter" sotuvni yakunlamaydi — faqat klaviaturani yopadi.
          // Sotuv faqat "Tasdiqlash" tugmasini aniq bosish bilan. Kompyuterda Enter ishlayveradi.
          const t = e.target as HTMLElement;
          if (e.key === "Enter" && !autoFocusMoney && t.tagName === "INPUT") {
            e.preventDefault();
            t.blur();
          }
        }}
      >
        {/* To‘lov usuli */}
        <ToggleGroup
          value={[mode]}
          onValueChange={(v) => {
            const next = (v as string[])[0] as Mode | undefined;
            if (next) {
              setMode(next);
              setError(null);
            }
          }}
          spacing={1}
          aria-label="To‘lov usuli"
          className="grid w-full grid-cols-3 rounded-xl bg-muted p-1"
        >
          {MODES.map((m) => (
            <ToggleGroupItem
              key={m.value}
              value={m.value}
              className="h-11 gap-2 rounded-lg text-muted-foreground hover:bg-card/60 active:bg-card/60 aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-xs aria-pressed:hover:bg-card dark:aria-pressed:bg-secondary dark:aria-pressed:hover:bg-secondary pointer-fine:h-9 [&_svg:not([class*='size-'])]:size-4"
            >
              <m.icon />
              <span className="text-sm leading-5 font-semibold">{m.label}</span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>

        {mode === "cash" && (
          <div className="space-y-3">
            <Field>
              <FieldLabel htmlFor="received">Qabul qilingan summa</FieldLabel>
              <MoneyInput
                id="received"
                value={received}
                onChange={setReceived}
                icon={Banknote}
                autoFocus={autoFocusMoney}
                large
                invalid={receivedT < total}
              />
            </Field>
            {/* Tez summalar: xaridor bergan pulni bitta bosish bilan tanlash */}
            <div
              className="grid grid-cols-3 gap-2"
              role="group"
              aria-label="Tez summa tanlash"
            >
              {quick.map((q) => {
                const active = receivedT === q;
                return (
                  <button
                    key={q}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setReceived(String(som(q)))}
                    className={cn(
                      "h-12 rounded-xl border text-sm font-semibold tabular-nums outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 pointer-fine:h-10",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "bg-card hover:bg-muted active:bg-muted",
                    )}
                  >
                    {q === total ? "Aniq summa" : formatMoney(som(q), false)}
                  </button>
                );
              })}
            </div>
            <div
              aria-live="polite"
              aria-atomic="true"
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3",
                change < 0
                  ? "border-destructive/30 bg-destructive/5"
                  : "bg-muted/50",
              )}
            >
              <span className="text-sm font-medium text-muted-foreground">
                {change < 0 ? "Yetmayapti" : "Qaytim"}
              </span>
              <span
                className={cn(
                  "text-2xl leading-8 font-bold tabular-nums",
                  change < 0 && "text-destructive",
                )}
              >
                {formatMoney(som(Math.abs(change)))}
              </span>
            </div>
          </div>
        )}

        {mode === "card" && (
          <div className="space-y-3">
            <Field>
              <FieldLabel>
                Karta turi{" "}
                <span className="font-normal text-muted-foreground">
                  (ixtiyoriy)
                </span>
              </FieldLabel>
              <CardTypePicker value={cardType} onChange={setCardType} />
            </Field>
            {terminalField}
            <p className="flex gap-2 text-xs leading-4 text-muted-foreground">
              <Info className="size-4 shrink-0" />
              To‘lovni terminalda yakunlang, so‘ng shu yerda tasdiqlang.
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
                  autoFocus={autoFocusMoney}
                  value={mixCash}
                  onChange={(v) => {
                    setMixCash(v);
                    setMixCard(String(som(Math.max(0, total - toTiyin(v)))));
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
                    setMixCard(v);
                    setMixCash(String(som(Math.max(0, total - toTiyin(v)))));
                  }}
                />
              </Field>
            </div>

            {/* Taqsimot chizig‘i */}
            <div className="space-y-1.5">
              <div
                className="flex h-2 overflow-hidden rounded-full bg-muted"
                aria-hidden="true"
              >
                <div
                  className="bg-primary transition-all"
                  style={{ width: `${cashShare}%` }}
                />
                <div
                  className="bg-chart-2 transition-all"
                  style={{ width: `${cardShare}%` }}
                />
              </div>
              <div
                aria-live="polite"
                aria-atomic="true"
                className="flex items-center justify-between text-xs leading-4"
              >
                <span className="flex items-center gap-3 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-primary" /> Naqd
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="size-2 rounded-full bg-chart-2" /> Karta
                  </span>
                </span>
                {mixOk ? (
                  <span className="flex items-center gap-1 font-medium text-foreground">
                    <Check className="size-4" /> Summa to‘g‘ri
                  </span>
                ) : (
                  <span className="font-medium text-destructive tabular-nums">
                    {mixDiff > 0 ? "Yetmayapti" : "Ortiqcha"}:{" "}
                    {formatMoney(som(Math.abs(mixDiff)))}
                  </span>
                )}
              </div>
            </div>

            {mixCardT > 0 && (
              <Field>
                <FieldLabel>Karta turi</FieldLabel>
                <CardTypePicker
                  value={cardType}
                  onChange={setCardType}
                  compact
                />
              </Field>
            )}
          </div>
        )}

        {/* Tasdiqlash tugmasi oyna pastida doim ko‘rinadi */}
        <div className="sticky bottom-0 -mx-4 -mb-[max(1rem,env(safe-area-inset-bottom))] space-y-3 border-t bg-popover px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mb-4 sm:pb-4">
          {error && (
            <p
              role="alert"
              className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm leading-5 text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="h-14 w-full justify-between rounded-xl px-5 text-base pointer-fine:h-12"
            disabled={!canSubmit || pay.isPending}
            aria-busy={pay.isPending || undefined}
          >
            <span className="flex shrink-0 items-center gap-2">
              {pay.isPending ? <Spinner /> : <Check />}
              {pay.isPending ? "Yuborilmoqda…" : "Tasdiqlash"}
              <Kbd className="hidden bg-primary-foreground/15 text-primary-foreground pointer-fine:inline-flex">
                Enter
              </Kbd>
            </span>
            <span className="min-w-0 truncate text-base leading-6 font-bold tabular-nums sm:text-lg pointer-fine:text-base">
              {(mode === "cash" && change < 0) ||
              (mode === "mixed" && mixDiff > 0) ? (
                <>
                  <span className="sm:hidden">−</span>
                  <span className="hidden sm:inline">Yetmayapti </span>
                  {formatMoney(
                    som(mode === "cash" ? -change : mixDiff),
                    false,
                  )}
                </>
              ) : mode === "cash" && change > 0 ? (
                `Qaytim ${formatMoney(som(change), false)}`
              ) : (
                formatMoney(som(total))
              )}
            </span>
          </Button>
        </div>
      </form>
    </>
  );
}
