"use client"

import { isFinePointer } from "@/lib/pointer"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api, ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { toTiyin, type ShiftDetail } from "@/components/pos/types"
import { DifferenceText } from "./shift-summary"

export function CloseShiftDialog({ shift }: { shift: ShiftDetail }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [counted, setCounted] = useState("")
  const [error, setError] = useState<string | null>(null)

  const expected = shift.summary.expectedCash
  const entered = counted !== ""
  const diff = (toTiyin(counted) - toTiyin(expected)) / 100

  const close = useMutation({
    mutationFn: () => api.post<ShiftDetail>(`/shifts/${shift.id}/close`, { countedCash: counted }),
    onSuccess: () => {
      toast.success("Smena yopildi")
      qc.invalidateQueries({ queryKey: ["shifts"] })
      setOpen(false)
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Smenani yopib bo‘lmadi"
      setError(msg)
      toast.error(msg)
    },
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) {
          setError(null)
          setCounted("")
        }
      }}
    >
      <DialogTrigger render={<Button variant="destructive" className="h-11 w-full md:h-8 md:w-auto" />}>Smenani yopish</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Smenani yopish</DialogTitle>
          <DialogDescription>Kassadagi naqd pulni sanab, summani kiriting. Yopilgandan keyin sotuv qilib bo‘lmaydi.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            if (!entered) return setError("Sanalgan naqd summani kiriting")
            close.mutate()
          }}
        >
          <FieldGroup>
            <div className="flex items-baseline justify-between rounded-lg bg-muted/50 p-3">
              <span className="text-sm text-muted-foreground">Kutilayotgan naqd</span>
              <span className="text-xl font-semibold tabular-nums">{formatMoney(expected)}</span>
            </div>
            <Field>
              <FieldLabel htmlFor="counted">Sanalgan naqd (so‘m)</FieldLabel>
              <Input
                id="counted"
                autoFocus={isFinePointer()}
                inputMode="decimal"
                className="h-12 text-right text-xl tabular-nums"
                value={counted}
                onChange={(e) => setCounted(e.target.value.replace(/[^\d.]/g, ""))}
              />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            {entered && (
              <div className="space-y-1.5 rounded-lg border p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sanalgan naqd</span>
                  <span className="font-medium tabular-nums">{formatMoney(counted)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kutilgan naqd</span>
                  <span className="font-medium tabular-nums">{formatMoney(expected)}</span>
                </div>
                <div className="flex items-baseline justify-between border-t pt-1.5">
                  <span className="font-medium">Farq</span>
                  <DifferenceText value={diff} className="text-lg font-semibold" />
                </div>
              </div>
            )}
            <Button type="submit" variant="destructive" className="h-10" disabled={close.isPending || !entered}>
              {close.isPending && <Spinner />} Tasdiqlab yopish
            </Button>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  )
}
