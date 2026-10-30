"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, ApiError } from "@/lib/api"

export function CashMovementDialog({ shiftId }: { shiftId: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<"CASH_IN" | "CASH_OUT">("CASH_IN")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () => api.post(`/shifts/${shiftId}/cash-movements`, { type, amount, reason: reason.trim() }),
    onSuccess: () => {
      toast.success(type === "CASH_IN" ? "Kassaga pul kiritildi" : "Kassadan pul chiqarildi")
      qc.invalidateQueries({ queryKey: ["shifts"] })
      setOpen(false)
      setAmount("")
      setReason("")
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Amalni bajarib bo‘lmadi"
      setError(msg)
      toast.error(msg)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setError(null)
      }}
    >
      <DialogTrigger render={<Button variant="outline" />}>Kassaga pul kiritish/chiqarish</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Kassa harakati</DialogTitle>
          <DialogDescription>Kassaga pul kiritish yoki chiqarish. Sabab majburiy.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (!(Number(amount) > 0)) return setError("Summa 0 dan katta bo‘lishi kerak")
            if (reason.trim().length < 3) return setError("Sabab kamida 3 belgi bo‘lishi kerak")
            save.mutate()
          }}
        >
          <FieldGroup>
            <Tabs value={type} onValueChange={(v) => setType(v as "CASH_IN" | "CASH_OUT")}>
              <TabsList className="grid h-10 w-full grid-cols-2">
                <TabsTrigger value="CASH_IN">Pul kiritish</TabsTrigger>
                <TabsTrigger value="CASH_OUT">Pul chiqarish</TabsTrigger>
              </TabsList>
            </Tabs>
            <Field>
              <FieldLabel htmlFor="cm-amount">Summa (so‘m)</FieldLabel>
              <Input
                id="cm-amount"
                inputMode="decimal"
                className="h-10"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="cm-reason">Sabab</FieldLabel>
              <Input
                id="cm-reason"
                className="h-10"
                maxLength={300}
                placeholder="Masalan: mayda pul qo‘shildi"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Button type="submit" className="h-10" disabled={save.isPending}>
              {save.isPending && <Spinner />} Saqlash
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
