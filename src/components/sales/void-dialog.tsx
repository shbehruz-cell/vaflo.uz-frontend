"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Ban } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"

export function VoidDialog({ saleId, receiptNo }: { saleId: string; receiptNo: string }) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () => api.post(`/sales/${saleId}/void`, { reason: reason.trim() }),
    onSuccess: () => {
      toast.success("Sotuv bekor qilindi")
      qc.invalidateQueries({ queryKey: ["sale", saleId] })
      qc.invalidateQueries({ queryKey: ["sales"] })
      qc.invalidateQueries({ queryKey: ["customers"] })
      setOpen(false)
      setReason("")
    },
    onError: (e: Error) => {
      setError(e.message)
      toast.error(e.message)
    },
  })

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (o) setError(null)
      }}
    >
      <AlertDialogTrigger render={<Button variant="destructive" className="h-11 flex-1 md:h-8 md:flex-none" />}>
        <Ban /> Bekor qilish
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Chek № {receiptNo} bekor qilinsinmi?</AlertDialogTitle>
          <AlertDialogDescription>Mahsulotlar omborga qaytadi, to‘lovlar bekor qilinadi. Bu amalni qaytarib bo‘lmaydi.</AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="void-reason">Sabab *</FieldLabel>
          <Textarea id="void-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          {error && <FieldError>{error}</FieldError>}
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Orqaga</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending || reason.trim().length < 3}
            onClick={(e) => {
              e.preventDefault()
              setError(null)
              mutation.mutate()
            }}
          >
            {mutation.isPending ? "Yuborilmoqda…" : "Bekor qilish"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
