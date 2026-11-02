"use client"

import { isFinePointer } from "@/lib/pointer"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { FormSheet } from "@/components/app/form-sheet"
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

/** Xaridor qo‘shish / tahrirlash paneli. `customer` berilsa — tahrirlash. */
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
  const initial = {
    name: customer?.name ?? "",
    phone: customer?.phone ?? "",
    address: customer?.address ?? "",
    notes: customer?.notes ?? "",
  }
  const [form, setForm] = useState(initial)
  const [formKey, setFormKey] = useState(0)
  const [prev, setPrev] = useState({ open, id: customer?.id })
  if (prev.open !== open || prev.id !== customer?.id) {
    setPrev({ open, id: customer?.id })
    if (open) {
      setForm(initial)
      setError(null)
    }
  }
  const dirty = (Object.keys(initial) as (keyof typeof initial)[]).some((k) => form[k] !== initial[k])
  const set = (k: keyof typeof initial) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const mutation = useMutation({
    mutationFn: ({ body }: { body: Record<string, string>; again: boolean }) =>
      customer ? api.patch<SaveResult>(`/customers/${customer.id}`, body) : api.post<SaveResult>("/customers", body),
    onSuccess: (res, vars) => {
      toast.success(customer ? "Xaridor yangilandi" : "Xaridor qo‘shildi")
      if (res.duplicateWarning) {
        const dup = res.duplicateWarning
        toast.warning(`Bu telefon raqam bilan xaridor bor: ${dup.name}`, {
          duration: 12000,
          action: { label: "Ochish", onClick: () => router.push(`/customers/${dup.id}`) },
        })
      }
      qc.invalidateQueries({ queryKey: ["customers"] })
      if (vars.again && !customer) {
        setForm({ name: "", phone: "", address: "", notes: "" })
        setFormKey((k) => k + 1)
      } else {
        onOpenChange(false)
      }
    },
    onError: (e: Error) => setError(e.message),
  })

  function submit(again: boolean) {
    setError(null)
    const name = form.name.trim()
    if (!name) return setError("Ism kiritilishi shart")
    mutation.mutate({
      again,
      body: { name, phone: form.phone.trim(), address: form.address.trim(), notes: form.notes.trim() },
    })
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => {
        if (o) setError(null)
        onOpenChange(o)
      }}
      title={customer ? "Xaridorni tahrirlash" : "Xaridor qo‘shish"}
      description="Xaridor ma’lumotlari chek va tarixda ko‘rinadi."
      dirty={dirty && !mutation.isPending}
      footer={
        <>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Bekor qilish
          </Button>
          {!customer && (
            <Button type="button" variant="secondary" disabled={mutation.isPending} onClick={() => submit(true)}>
              Saqlash va yana qo‘shish
            </Button>
          )}
          <Button type="submit" form="customer-form" disabled={mutation.isPending}>
            {mutation.isPending ? "Saqlanmoqda…" : "Saqlash"}
          </Button>
        </>
      }
    >
      <form
        id="customer-form"
        onSubmit={(e) => {
          e.preventDefault()
          submit(false)
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="c-name">Ism *</FieldLabel>
            <Input key={formKey} id="c-name" name="name" className="h-11 sm:h-10" value={form.name} onChange={set("name")} autoFocus={isFinePointer()} />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-phone">Telefon</FieldLabel>
            <Input id="c-phone" name="phone" className="h-11 sm:h-10" inputMode="tel" placeholder="+998 90 123 45 67" value={form.phone} onChange={set("phone")} />
            <FieldDescription>Format: +998 XX XXX XX XX</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="c-address">Manzil</FieldLabel>
            <Input id="c-address" name="address" className="h-11 sm:h-10" value={form.address} onChange={set("address")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="c-notes">Izoh</FieldLabel>
            <Textarea id="c-notes" name="notes" value={form.notes} onChange={set("notes")} />
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
      </form>
    </FormSheet>
  )
}
