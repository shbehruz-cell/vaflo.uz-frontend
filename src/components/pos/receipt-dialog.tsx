"use client"

import { createPortal } from "react-dom"
import { Printer, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { formatDateTime, formatMoney, formatQty, PAYMENT_LABELS } from "@/lib/format"
import { CARD_TYPE_LABELS } from "./card-brands"
import type { Receipt } from "./types"

export function ReceiptBody({ r, className }: { r: Receipt; className?: string }) {
  const change = r.payments.reduce((s, p) => s + Number(p.change ?? 0), 0)
  return (
    <div className={className}>
      <div className="text-center">
        <div className="text-base font-semibold">{r.storeName ?? "VAFLO.UZ"}</div>
        <div className="text-xs text-muted-foreground print:text-black">
          Chek № <span className="font-mono">{r.receiptNo}</span>
        </div>
        <div className="text-xs text-muted-foreground print:text-black">{formatDateTime(r.createdAt)}</div>
        <div className="text-xs text-muted-foreground print:text-black">
          Kassir: {r.cashierName ?? "—"}
        </div>
        {r.register && <div className="text-xs text-muted-foreground print:text-black">Kassa: {r.register.name}</div>}
        {r.customerName && <div className="text-xs text-muted-foreground print:text-black">Xaridor: {r.customerName}</div>}
      </div>
      <hr className="receipt-rule my-3" />
      <ul className="space-y-1.5 text-sm">
        {r.items.map((i) => (
          <li key={i.id}>
            <div className="font-medium">{i.nameSnapshot}</div>
            <div className="flex justify-between gap-2 text-xs text-muted-foreground tabular-nums print:text-black">
              <span>
                {formatQty(i.qty)} × {formatMoney(i.unitPrice, false)}
                {Number(i.discount) > 0 && ` (−${formatMoney(i.discount, false)})`}
              </span>
              <span className="text-sm text-foreground print:text-black">{formatMoney(i.lineTotal)}</span>
            </div>
          </li>
        ))}
      </ul>
      <hr className="receipt-rule my-3" />
      <div className="space-y-1 text-sm tabular-nums">
        <div className="flex justify-between">
          <span>Oraliq summa</span>
          <span>{formatMoney(r.subtotal)}</span>
        </div>
        {Number(r.discountTotal) > 0 && (
          <div className="flex justify-between">
            <span>Chegirma</span>
            <span>−{formatMoney(r.discountTotal)}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold">
          <span>Jami</span>
          <span>{formatMoney(r.total)}</span>
        </div>
        {r.payments.map((p) => (
          <div key={p.id} className="flex justify-between text-muted-foreground print:text-black">
            <span>
              {PAYMENT_LABELS[p.method]}
              {p.cardType && ` (${CARD_TYPE_LABELS[p.cardType] ?? p.cardType})`}
            </span>
            <span>{formatMoney(p.method === "CASH" && p.tendered ? p.tendered : p.amount)}</span>
          </div>
        ))}
        {change > 0 && (
          <div className="flex justify-between font-medium">
            <span>Qaytim</span>
            <span>{formatMoney(change)}</span>
          </div>
        )}
      </div>
      <div className="mt-3 text-center text-xs text-muted-foreground print:text-black">Xaridingiz uchun rahmat!</div>
    </div>
  )
}

export function ReceiptDialog({ receipt, onNewSale }: { receipt: Receipt | null; onNewSale: () => void }) {
  return (
    <Dialog open={!!receipt} onOpenChange={(o) => !o && onNewSale()}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-sm print:hidden">
        <DialogHeader>
          <DialogTitle>Sotuv yakunlandi</DialogTitle>
          <DialogDescription>Chekni chop eting yoki yangi sotuvni boshlang.</DialogDescription>
        </DialogHeader>
        {receipt && <ReceiptBody r={receipt} className="receipt px-4 pt-4" />}
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-10" onClick={() => window.print()}>
            <Printer /> Chop etish
          </Button>
          <Button className="h-10" autoFocus onClick={onNewSale}>
            <ShoppingCart /> Yangi sotuv
          </Button>
        </div>
      </DialogContent>
      {receipt &&
        typeof document !== "undefined" &&
        createPortal(
          <>
            <style>{`@media print { body > *:not(#receipt-print-root) { display: none !important; } #receipt-print-root { display: block !important; } }`}</style>
            <div id="receipt-print-root" className="hidden bg-white p-4 text-black print:block">
              <ReceiptBody r={receipt} className="mx-auto max-w-[80mm]" />
            </div>
          </>,
          document.body,
        )}
    </Dialog>
  )
}
