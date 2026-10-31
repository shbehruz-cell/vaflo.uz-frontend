"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Monitor, Settings2, Users } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface RegisterRow {
  id: string
  name: string
  code: string
  warehouseId: string
  maxCashiers: number
  assignedUsers: { id: string; name: string; status: string }[]
  openShifts: { id: string; cashierId: string; cashierName: string | null; openedAt: string }[]
  openCount: number
  canOpen: boolean
  blockedReason: string | null
}

interface Staff {
  id: string
  name: string
  role: { key: string; name: string }
}

/** Kassa sig‘imi: har bir kassir o‘rni bitta katak (to‘lgani — band). */
function CapacitySlots({ used, max }: { used: number; max: number }) {
  const shown = Math.min(max, 8)
  return (
    <div className="flex items-center gap-2" aria-label={`${used} ta kassir smenada, sig‘im ${max}`}>
      <div className="flex gap-1" aria-hidden="true">
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={cn("h-2.5 w-4 rounded-sm", i < used ? "bg-primary" : "bg-muted ring-1 ring-border ring-inset")} />
        ))}
        {max > shown && <span className="text-xs text-muted-foreground">+{max - shown}</span>}
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">
        {used}/{max}
      </span>
    </div>
  )
}

/** Kassalar ro‘yxati (sozlamalar sahifasi bo‘limi ichida): bandlik, smenadagilar, biriktirilgan xodimlar. */
export function RegistersList({ warehouseName }: { warehouseName: (id: string) => string }) {
  const regs = useQuery({ queryKey: ["registers"], queryFn: () => api.get<RegisterRow[]>("/registers") })
  const [editing, setEditing] = useState<RegisterRow | null>(null)

  if (regs.isLoading) return <LoadingRows rows={2} />
  if (regs.isError) return <ErrorState error={regs.error} onRetry={() => void regs.refetch()} />
  if (!regs.data?.length) return <EmptyState title="Hali kassa yo‘q" description="Kassa qo‘shing — kassirlar shu kassada smena ochib savdo qiladi." />

  return (
    <>
      <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
        {regs.data.map((r) => (
          <li key={r.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Monitor className="size-5" />
              </span>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium">{r.name}</span>
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {r.code}
                  </Badge>
                </div>
                <div className="truncate text-xs text-muted-foreground">Ombor: {warehouseName(r.warehouseId)}</div>
              </div>
            </div>

            <div className="grid gap-1.5 sm:w-56">
              <CapacitySlots used={r.openCount} max={r.maxCashiers} />
              <div className="truncate text-xs text-muted-foreground">
                {r.openShifts.length ? `Smenada: ${r.openShifts.map((s) => s.cashierName ?? "—").join(", ")}` : "Hozir hech kim smenada emas"}
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:w-48">
              <Users className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {r.assignedUsers.length ? (
                <span className="truncate text-xs" title={r.assignedUsers.map((u) => u.name).join(", ")}>
                  {r.assignedUsers.slice(0, 2).map((u) => u.name).join(", ")}
                  {r.assignedUsers.length > 2 && ` va yana ${r.assignedUsers.length - 2}`}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">Barcha kassirlar</span>
              )}
            </div>

            <Button variant="outline" size="sm" className="h-10 w-full sm:w-auto sm:self-center md:h-9" onClick={() => setEditing(r)}>
              <Settings2 /> Sozlash
            </Button>
          </li>
        ))}
      </ul>
      {editing && <RegisterDialog key={editing.id} register={editing} onClose={() => setEditing(null)} />}
    </>
  )
}

function RegisterDialog({ register, onClose }: { register: RegisterRow; onClose: () => void }) {
  const qc = useQueryClient()
  const staff = useQuery({ queryKey: ["registers", "staff"], queryFn: () => api.get<Staff[]>("/registers/staff") })
  const [name, setName] = useState(register.name)
  const [max, setMax] = useState(String(register.maxCashiers))
  const [selected, setSelected] = useState<Set<string>>(() => new Set(register.assignedUsers.map((u) => u.id)))
  const [error, setError] = useState<string | null>(null)

  const maxNum = Number(max)
  const maxInvalid = !Number.isInteger(maxNum) || maxNum < 1 || maxNum > 20

  const save = useMutation({
    mutationFn: () => api.patch(`/registers/${register.id}`, { name: name.trim(), maxCashiers: maxNum, userIds: [...selected] }),
    onSuccess: () => {
      toast.success("Kassa sozlamalari saqlandi")
      void qc.invalidateQueries({ queryKey: ["registers"] })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Saqlab bo‘lmadi"),
  })

  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kassani sozlash</DialogTitle>
          <DialogDescription>
            Kod: {register.code}. Hozir smenada: {register.openCount} ta kassir.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setError(null)
            save.mutate()
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="reg-name">Nomi</FieldLabel>
              <Input id="reg-name" className="h-10" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>

            <Field data-invalid={maxInvalid || undefined}>
              <FieldLabel htmlFor="reg-max">Bir vaqtda nechta kassir ishlay oladi</FieldLabel>
              <Input
                id="reg-max"
                type="number"
                inputMode="numeric"
                min={1}
                max={20}
                value={max}
                onChange={(e) => setMax(e.target.value)}
                aria-invalid={maxInvalid || undefined}
                className="h-10 w-28"
              />
              <FieldDescription>1 dan 20 gacha. Har bir kassir o‘z smenasini alohida ochadi va yopadi.</FieldDescription>
            </Field>

            <Field>
              <FieldLabel className="flex items-center gap-2">
                <Users className="size-4" /> Biriktirilgan xodimlar
              </FieldLabel>
              <FieldDescription>
                Hech kim tanlanmasa, kassada istalgan kassir ishlay oladi. Tanlansa, faqat shu xodimlar.
              </FieldDescription>
              {staff.isLoading ? (
                <LoadingRows rows={3} />
              ) : staff.isError ? (
                <ErrorState error={staff.error} onRetry={() => void staff.refetch()} />
              ) : (
                <div className="max-h-56 divide-y overflow-y-auto rounded-lg border bg-card">
                  {staff.data?.map((u) => (
                    <label key={u.id} className="flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                      <Checkbox checked={selected.has(u.id)} onCheckedChange={(v) => toggle(u.id, v === true)} />
                      <span className="min-w-0 flex-1 truncate text-sm">{u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.role.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground">
                {selected.size ? `${selected.size} ta xodim tanlandi` : "Barcha kassirlar ishlay oladi"}
              </div>
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={save.isPending || !name.trim() || maxInvalid}>
              {save.isPending && <Spinner />} Saqlash
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
