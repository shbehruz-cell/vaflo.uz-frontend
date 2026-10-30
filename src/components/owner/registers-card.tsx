"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Settings2, Users } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"

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

/** Kassalar ro‘yxati: bandlik (ochiq smenalar / sig‘im) va biriktirilgan xodimlar. */
export function RegistersCard({
  warehouseName,
  onAdd,
  canAdd,
}: {
  warehouseName: (id: string) => string
  onAdd: () => void
  canAdd: boolean
}) {
  const regs = useQuery({ queryKey: ["registers"], queryFn: () => api.get<RegisterRow[]>("/registers") })
  const [editing, setEditing] = useState<RegisterRow | null>(null)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Kassalar</CardTitle>
        <CardDescription>Bir kassada bir nechta kassir ishlashi va kimlar ishlay olishini sozlang</CardDescription>
        <CardAction>
          <Button size="sm" onClick={onAdd} disabled={!canAdd}>
            <Plus /> Kassa qo‘shish
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {regs.isLoading ? (
          <LoadingRows rows={3} />
        ) : regs.isError ? (
          <ErrorState error={regs.error} onRetry={() => void regs.refetch()} />
        ) : !regs.data?.length ? (
          <EmptyState title="Hozircha kassa yo‘q" />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead>Kassa</TableHead>
                  <TableHead className="hidden sm:table-cell">Ombor</TableHead>
                  <TableHead>Band / sig‘im</TableHead>
                  <TableHead className="hidden md:table-cell">Kimlar ishlay oladi</TableHead>
                  <TableHead className="w-0" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {regs.data.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{warehouseName(r.warehouseId)}</TableCell>
                    <TableCell>
                      <Badge variant={r.openCount >= r.maxCashiers ? "default" : "secondary"} className="tabular-nums">
                        {r.openCount} / {r.maxCashiers}
                      </Badge>
                      {r.openShifts.length > 0 && (
                        <div className="mt-1 max-w-40 truncate text-xs text-muted-foreground">
                          {r.openShifts.map((s) => s.cashierName ?? "—").join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="hidden max-w-56 md:table-cell">
                      {r.assignedUsers.length ? (
                        <span className="line-clamp-2 text-sm">{r.assignedUsers.map((u) => u.name).join(", ")}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Barcha kassirlar</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" aria-label="Sozlash" onClick={() => setEditing(r)}>
                        <Settings2 /> <span className="hidden sm:inline">Sozlash</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {editing && <RegisterDialog key={editing.id} register={editing} onClose={() => setEditing(null)} />}
    </Card>
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
              <Input id="reg-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
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
                className="w-28"
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
                    <label key={u.id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
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
