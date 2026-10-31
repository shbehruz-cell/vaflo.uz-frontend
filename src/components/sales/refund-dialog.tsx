"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Undo2 } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { PAYMENT_LABELS, formatMoney, formatQty } from "@/lib/format"
import type { SaleDetail } from "./types"

export function RefundDialog({ sale }: { sale: SaleDetail }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [qtys, setQtys] = useState<Record<string, string>>({})
  const [reason, setReason] = useState("")
  const [disposition, setDisposition] = useState<"RESTOCK" | "WRITE_OFF">("RESTOCK")
  const [method, setMethod] = useState("CASH")
  const [error, setError] = useState<string | null>(null)

  const rows = sale.items.map((i) => ({ ...i, left: Number(i.qty) - Number(i.refundedQty) }))
  const lines = rows
    .map((i) => ({ item: i, qty: Number(qtys[i.id] || 0) }))
    .filter((l) => l.qty > 0)
  const estimate = lines.reduce((sum, l) => sum + (Number(l.item.lineTotal) / Number(l.item.qty)) * l.qty, 0)

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/sales/${sale.id}/refunds`, {
        reason: reason.trim(),
        disposition,
        method,
        items: lines.map((l) => ({ saleItemId: l.item.id, qty: String(qtys[l.item.id]).trim() })),
      }),
    onSuccess: () => {
      toast.success("Qaytarish bajarildi")
      qc.invalidateQueries({ queryKey: ["sale", sale.id] })
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["customers"] })
      setConfirm(false)
      setOpen(false)
      setQtys({})
      setReason("")
    },
    onError: (e: Error) => {
      setConfirm(false)
      setError(e.message)
      toast.error(e.message)
    },
  })

  function validate() {
    setError(null)
    if (lines.length === 0) return setError("Kamida bitta satr uchun miqdor kiriting")
    for (const l of lines) {
      if (!Number.isFinite(l.qty) || l.qty > l.item.left + 1e-9) {
        return setError(`“${l.item.nameSnapshot}”: qaytariladigan miqdor ${formatQty(l.item.left)} dan oshmasin`)
      }
    }
    if (reason.trim().length < 3) return setError("Sabab kamida 3 belgi bo‘lsin")
    setConfirm(true)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button variant="outline" className="h-11 flex-1 md:h-8 md:flex-none" />}>
          <Undo2 /> Qaytarish
        </DialogTrigger>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Qaytarish — chek № {sale.receiptNo}</DialogTitle>
            <DialogDescription>Qaytariladigan mahsulot miqdorini kiriting. Yakuniy summani server hisoblaydi.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <div className="space-y-2">
              {rows.map((i) => (
                <div key={i.id} className="flex items-center gap-2 rounded-lg border p-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{i.nameSnapshot}</div>
                    <div className="text-xs text-muted-foreground">
                      Qaytarish mumkin: {formatQty(i.left)} / {formatQty(i.qty)}
                    </div>
                  </div>
                  <Input
                    className="h-10 w-24 text-right tabular-nums"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={i.left}
                    step="0.001"
                    placeholder="0"
                    disabled={i.left <= 0}
                    value={qtys[i.id] ?? ""}
                    onChange={(e) => setQtys((s) => ({ ...s, [i.id]: e.target.value }))}
                    aria-label={`${i.nameSnapshot} miqdori`}
                  />
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Taxminiy qaytarish summasi: <span className="font-semibold text-foreground tabular-nums">{formatMoney(estimate)}</span>
            </p>
            <Field>
              <FieldLabel htmlFor="refund-reason">Sabab *</FieldLabel>
              <Textarea id="refund-reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Masalan: nuqsonli mahsulot" />
            </Field>
            <Field>
              <FieldLabel>Mahsulot taqdiri</FieldLabel>
              <div className="flex flex-col gap-2 sm:flex-row">
                {(
                  [
                    ["RESTOCK", "Omborga qaytarish"],
                    ["WRITE_OFF", "Yaroqsiz"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="disposition" checked={disposition === v} onChange={() => setDisposition(v)} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            <Field>
              <FieldLabel>Pul qaytarish usuli</FieldLabel>
              <div className="flex gap-2">
                {Object.entries(PAYMENT_LABELS).map(([v, label]) => (
                  <label key={v} className="flex min-h-10 flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                    <input type="radio" name="method" checked={method === v} onChange={() => setMethod(v)} />
                    {label}
                  </label>
                ))}
              </div>
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Bekor
            </Button>
            <Button onClick={validate}>Davom etish</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Qaytarishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              Taxminan {formatMoney(estimate)} {PAYMENT_LABELS[method]?.toLowerCase()} orqali qaytariladi. Bu amalni bekor qilib bo‘lmaydi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Orqaga</AlertDialogCancel>
            <AlertDialogAction
              disabled={mutation.isPending}
              onClick={(e) => {
                e.preventDefault()
                mutation.mutate()
              }}
            >
              {mutation.isPending ? "Yuborilmoqda…" : "Qaytarish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
