"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Ban,
  Monitor,
  Printer,
  Store,
  Undo2,
  User,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingRows } from "@/components/app/states";
import { RefundDialog } from "@/components/sales/refund-dialog";
import { SaleStatusBadge } from "@/components/sales/sale-status-badge";
import type { SaleDetail } from "@/components/sales/types";
import { VoidDialog } from "@/components/sales/void-dialog";
import {
  CARD_TYPE_LABELS,
  CardBrandMark,
  type CardType,
} from "@/components/pos/card-brands";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  PAYMENT_LABELS,
  dayKey,
  formatDateTime,
  formatDayLabel,
  formatMoney,
  formatQty,
  formatTime,
} from "@/lib/format";
import { cn } from "@/lib/utils";

export default function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { can } = useAuth();
  const q = useQuery({
    queryKey: ["sale", id],
    queryFn: () => api.get<SaleDetail>(`/sales/${id}`),
  });

  if (q.isLoading) return <LoadingRows />;
  if (q.isError || !q.data)
    return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const s = q.data;

  const hasLeft = s.items.some(
    (i) => Number(i.qty) - Number(i.refundedQty) > 0,
  );
  const canRefund = can("sales.refund") && s.status !== "VOIDED" && hasLeft;
  const canVoid =
    can("sales.void") && s.status !== "VOIDED" && s.refunds.length === 0;
  const voided = s.status === "VOIDED";
  const discount = Number(s.discountTotal) > 0;
  const refunded = Number(s.refundedTotal) > 0;
  const actionCount = 1 + (canRefund ? 1 : 0) + (canVoid ? 1 : 0);

  // Telefonda — ikonka + qisqa yozuv, teng ustunlar; kompyuterda — sarlavha yonida ixcham tugmalar
  const actionBtn =
    "h-14 flex-col gap-1 rounded-xl text-xs lg:h-9 lg:flex-row lg:gap-1.5 lg:rounded-lg lg:text-sm";
  const actions = (
    <>
      <Button
        variant="outline"
        className={actionBtn}
        onClick={() => window.print()}
      >
        <Printer /> Chop etish
      </Button>
      {canRefund && <RefundDialog sale={s} className={actionBtn} />}
      {canVoid && (
        <VoidDialog
          saleId={s.id}
          receiptNo={s.receiptNo}
          className={actionBtn}
        />
      )}
    </>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <style>{`@media print { [data-slot="sidebar"], [data-slot="sidebar-gap"], [data-slot="sidebar-container"], header, nav { display: none !important; } }`}</style>

      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 hidden w-fit text-muted-foreground md:inline-flex print:hidden"
        render={<Link href="/sales" />}
        nativeButton={false}
      >
        <ArrowLeft /> Sotuvlar
      </Button>

      {/* Asosiy ma’lumot: chek raqami, summa, vaqt */}
      <section
        aria-label="Chek"
        className="rounded-2xl border bg-card p-4 sm:p-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-semibold tabular-nums">
                Chek № {s.receiptNo}
              </h1>
              <SaleStatusBadge status={s.status} />
            </div>
            <div
              className={cn(
                "mt-1.5 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl",
                voided && "text-muted-foreground line-through",
              )}
            >
              {formatMoney(s.total)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatDayLabel(dayKey(s.createdAt))}, {formatTime(s.createdAt)}
            </p>
          </div>
          <div className="hidden shrink-0 flex-wrap justify-end gap-2 lg:flex print:hidden">
            {actions}
          </div>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm lg:grid-cols-4">
          <Meta icon={Monitor} label="Kassa" value={s.register?.name ?? null} />
          <Meta icon={User} label="Kassir" value={s.cashierName} />
          <Meta
            icon={UserRound}
            label="Xaridor"
            value={
              s.customerId ? (
                <Link
                  className="text-primary hover:underline"
                  href={`/customers/${s.customerId}`}
                >
                  {s.customerName ?? "Xaridor"}
                </Link>
              ) : (
                s.customerName
              )
            }
          />
          <Meta icon={Store} label="Do‘kon" value={s.storeName} />
        </dl>
      </section>

      {/* Telefon/planshet: amallar teng ustunlarda */}
      <div
        className={cn(
          "grid gap-2 lg:hidden print:hidden",
          actionCount === 3
            ? "grid-cols-3"
            : actionCount === 2
              ? "grid-cols-2"
              : "grid-cols-1",
        )}
      >
        {actions}
      </div>

      {voided && (
        <div
          role="note"
          className="flex gap-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <div className="font-medium text-destructive">
              Sotuv bekor qilingan
            </div>
            <div className="mt-0.5">
              {s.voidReason ?? "Sabab ko‘rsatilmagan"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {s.voidedByName ?? "—"}
              {s.voidedAt && (
                <span className="ml-2 tabular-nums">
                  {formatDateTime(s.voidedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {/* Mahsulotlar */}
          <section
            aria-labelledby="items-title"
            className="overflow-hidden rounded-2xl border bg-card"
          >
            <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
              <h2 id="items-title" className="text-base font-semibold">
                Mahsulotlar
              </h2>
              <span className="text-xs text-muted-foreground tabular-nums">
                {s.items.length} ta
              </span>
            </div>
            <ul className="divide-y">
              {s.items.map((i) => {
                const ref = Number(i.refundedQty) > 0;
                return (
                  <li
                    key={i.id}
                    className="flex items-start justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium break-words">
                        {i.nameSnapshot}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground tabular-nums">
                        <span>
                          {formatQty(i.qty)} × {formatMoney(i.unitPrice)}
                        </span>
                        {i.skuSnapshot && (
                          <span className="hidden sm:inline">
                            {i.skuSnapshot}
                          </span>
                        )}
                        {Number(i.discount) > 0 && (
                          <span className="text-primary">
                            Chegirma −{formatMoney(i.discount)}
                          </span>
                        )}
                        {ref && (
                          <span className="rounded-md bg-destructive/10 px-1.5 py-0.5 text-destructive">
                            Qaytarilgan: {formatQty(i.refundedQty)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 font-semibold tabular-nums">
                      {formatMoney(i.lineTotal)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {s.refunds.length > 0 && (
            <section
              aria-labelledby="refunds-title"
              className="overflow-hidden rounded-2xl border bg-card"
            >
              <h2
                id="refunds-title"
                className="border-b px-4 py-3 text-base font-semibold"
              >
                Qaytarishlar
              </h2>
              <ul className="divide-y">
                {s.refunds.map((r) => (
                  <li key={r.id} className="space-y-1.5 px-4 py-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Undo2 className="size-4 shrink-0 text-destructive" />
                        <span className="truncate">{r.reason}</span>
                      </div>
                      <span className="shrink-0 font-semibold text-destructive tabular-nums">
                        −{formatMoney(r.amount)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {formatDateTime(r.createdAt)}
                      </span>
                      {r.actorName && <span>{r.actorName}</span>}
                      <Badge variant="secondary">
                        {r.disposition === "RESTOCK"
                          ? "Omborga qaytdi"
                          : "Yaroqsiz"}
                      </Badge>
                      <Badge variant="outline">
                        {PAYMENT_LABELS[r.method] ?? r.method}
                      </Badge>
                    </div>
                    <ul className="text-xs text-muted-foreground">
                      {r.items.map((ri) => (
                        <li
                          key={ri.id}
                          className="flex justify-between gap-3 tabular-nums"
                        >
                          <span className="truncate">
                            {ri.nameSnapshot ?? "Mahsulot"} ×{" "}
                            {formatQty(ri.qty)}
                          </span>
                          <span className="shrink-0">
                            {formatMoney(ri.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Hisob-kitob: chek ko‘rinishida (pul momenti) */}
        <div className="lg:sticky lg:top-20">
          <aside
            aria-label="Hisob-kitob"
            className="receipt px-5 pt-5 pb-8 text-sm tabular-nums"
          >
            <Row label="Oraliq summa" value={formatMoney(s.subtotal)} />
            {discount && (
              <Row
                label="Chegirma"
                value={`−${formatMoney(s.discountTotal)}`}
                accent
              />
            )}
            <hr className="receipt-rule my-3" />
            <div className="flex items-baseline justify-between gap-3">
              <span className="font-semibold">Jami</span>
              <span className="text-2xl font-bold tracking-tight">
                {formatMoney(s.total)}
              </span>
            </div>
            {refunded && (
              <Row
                label="Qaytarilgan"
                value={`−${formatMoney(s.refundedTotal)}`}
                destructive
              />
            )}

            <hr className="receipt-rule my-3" />
            <div className="space-y-2.5">
              {s.payments.map((p) => (
                <div key={p.id}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      {p.cardType && (
                        <CardBrandMark
                          type={p.cardType as CardType}
                          className="h-5 w-8 shrink-0"
                        />
                      )}
                      <span className="truncate">
                        {PAYMENT_LABELS[p.method] ?? p.method}
                        {p.cardType && (
                          <span className="text-muted-foreground">
                            {" "}
                            ({CARD_TYPE_LABELS[p.cardType] ?? p.cardType})
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 font-medium">
                      {formatMoney(p.amount)}
                    </span>
                  </div>
                  {(p.tendered || p.externalReference) && (
                    <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                      {p.tendered && (
                        <span>Qabul qilindi: {formatMoney(p.tendered)}</span>
                      )}
                      {p.change && Number(p.change) > 0 && (
                        <span>Qaytim: {formatMoney(p.change)}</span>
                      )}
                      {p.externalReference && (
                        <span className="font-mono">
                          № {p.externalReference}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="truncate font-medium">{value || "—"}</dd>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  destructive,
  accent,
}: {
  label: string;
  value: string;
  destructive?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex justify-between gap-3 py-0.5",
        destructive && "mt-1 text-destructive",
        accent && "text-primary",
      )}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
