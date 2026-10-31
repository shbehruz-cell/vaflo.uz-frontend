"use client"

import { isFinePointer } from "@/lib/pointer"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"

export interface Customer {
  id: string
  name: string
  phone: string | null
  address: string | null
  notes: string | null
  createdAt: string
}

interface SaveResult {
  customer: Customer
  duplicateWarning: { id: string; name: string } | null
}

/** Xaridor qo‘shish / tahrirlash dialogi. `customer` berilsa — tahrirlash. */
export function CustomerDialog({
  open,
  onOpenChange,
  customer,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  customer?: Customer
}) {
  const router = useRouter()
  const qc = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (body: Record<string, string>) =>
      customer ? api.patch<SaveResult>(`/customers/${customer.id}`, body) : api.post<SaveResult>("/customers", body),
    onSuccess: (res) => {
      toast.success(customer ? "Xaridor yangilandi" : "Xaridor qo‘shildi")
      if (res.duplicateWarning) {
        const dup = res.duplicateWarning
        toast.warning(`Bu telefon raqam bilan xaridor bor: ${dup.name}`, {
          duration: 12000,
          action: { label: "Ochish", onClick: () => router.push(`/customers/${dup.id}`) },
        })
      }
      qc.invalidateQueries({ queryKey: ["customers"] })
      onOpenChange(false)
    },
    onError: (e: Error) => setError(e.message),
  })

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const f = new FormData(e.currentTarget)
    const name = String(f.get("name") ?? "").trim()
    if (!name) return setError("Ism kiritilishi shart")
    mutation.mutate({
      name,
      phone: String(f.get("phone") ?? "").trim(),
      address: String(f.get("address") ?? "").trim(),
      notes: String(f.get("notes") ?? "").trim(),
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setError(null)
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? "Xaridorni tahrirlash" : "Xaridor qo‘shish"}</DialogTitle>
          <DialogDescription>Xaridor ma’lumotlari chek va tarixda ko‘rinadi.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="c-name">Ism *</FieldLabel>
              <Input id="c-name" name="name" className="h-10" defaultValue={customer?.name ?? ""} autoFocus={isFinePointer()} />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-phone">Telefon</FieldLabel>
              <Input id="c-phone" name="phone" className="h-10" inputMode="tel" placeholder="+998 90 123 45 67" defaultValue={customer?.phone ?? ""} />
              <FieldDescription>Format: +998 XX XXX XX XX</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="c-address">Manzil</FieldLabel>
              <Input id="c-address" name="address" className="h-10" defaultValue={customer?.address ?? ""} />
            </Field>
            <Field>
              <FieldLabel htmlFor="c-notes">Izoh</FieldLabel>
              <Textarea id="c-notes" name="notes" defaultValue={customer?.notes ?? ""} />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Bekor
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saqlanmoqda…" : "Saqlash"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
