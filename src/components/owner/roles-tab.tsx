"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Lock, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { RoleRow } from "./users-tab"

interface Perm {
  code: string
  description: string
}

const GROUPS: { title: string; codes: string[] }[] = [
  { title: "Mahsulotlar", codes: ["products.read", "products.manage"] },
  { title: "Ombor", codes: ["inventory.read", "inventory.adjust"] },
  { title: "Sotuv", codes: ["sales.create", "sales.read.all", "sales.read.own", "sales.refund", "sales.void"] },
  { title: "Chegirma va narx", codes: ["pricing.change", "discount.apply", "discount.override", "costs.read"] },
  { title: "Hisobotlar", codes: ["reports.read", "reports.profit.read"] },
  { title: "Xaridorlar", codes: ["customers.read", "customers.manage"] },
  { title: "Smenalar va kassalar", codes: ["shifts.manage", "shifts.read.all", "registers.manage"] },
  { title: "Xodimlar", codes: ["users.manage", "roles.manage"] },
  { title: "Audit", codes: ["audit.read", "demo_requests.read"] },
]

function PermissionMatrix({
  perms,
  value,
  onToggle,
  readOnly,
}: {
  perms: Perm[]
  value: Set<string>
  onToggle: (code: string, on: boolean) => void
  readOnly: boolean
}) {
  const byCode = new Map(perms.map((p) => [p.code, p]))
  const known = new Set(GROUPS.flatMap((g) => g.codes))
  const groups = [...GROUPS, { title: "Boshqa", codes: perms.map((p) => p.code).filter((c) => !known.has(c)) }].filter((g) => g.codes.some((c) => byCode.has(c)))
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groups.map((g) => (
        <div key={g.title} className="self-start overflow-hidden rounded-xl border bg-card">
          <h4 className="border-b bg-muted/50 px-3 py-2 text-sm font-semibold">{g.title}</h4>
          {g.codes
            .filter((c) => byCode.has(c))
            .map((c) => (
              <div key={c} className="flex items-start gap-2.5 border-b px-3 py-2.5 last:border-b-0">
                <Checkbox id={`perm-${c}`} className="mt-0.5" checked={value.has(c)} disabled={readOnly} onCheckedChange={(on) => onToggle(c, !!on)} />
                <Label htmlFor={`perm-${c}`} className={cn("flex-col items-start gap-0 text-sm font-normal leading-snug", readOnly && "opacity-80")}>
                  <span>{byCode.get(c)!.description}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c}</span>
                </Label>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}

export function RolesTab() {
  const { isOwner } = useAuth()
  const qc = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ id: string; codes: Set<string> } | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [newName, setNewName] = useState("")
  const [createError, setCreateError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<RoleRow | null>(null)

  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api.get<RoleRow[]>("/roles") })
  const perms = useQuery({ queryKey: ["roles", "permissions"], queryFn: () => api.get<Perm[]>("/roles/permissions") })

  const list = roles.data ?? []
  const role = list.find((r) => r.id === selectedId) ?? list[0]
  const readOnly = !isOwner || role?.key === "owner"
  const current = role ? (draft?.id === role.id ? draft.codes : new Set(role.permissions)) : new Set<string>()
  const dirty = !!role && draft?.id === role.id && (draft.codes.size !== role.permissions.length || role.permissions.some((c) => !draft.codes.has(c)))

  const save = useMutation({
    mutationFn: () => api.patch<RoleRow>(`/roles/${role!.id}`, { permissions: [...current] }),
    onSuccess: () => {
      toast.success("Rol ruxsatlari saqlandi")
      setDraft(null)
      void qc.invalidateQueries({ queryKey: ["roles"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Saqlab bo‘lmadi"),
  })
  const create = useMutation({
    mutationFn: () => api.post<RoleRow>("/roles", { name: newName.trim(), permissions: [] }),
    onSuccess: (r) => {
      toast.success("Rol yaratildi. Endi ruxsatlarni belgilang")
      setCreateOpen(false)
      setNewName("")
      setSelectedId(r.id)
      void qc.invalidateQueries({ queryKey: ["roles"] })
    },
    onError: (e) => setCreateError(e instanceof Error ? e.message : "Yaratib bo‘lmadi"),
  })
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/roles/${id}`),
    onSuccess: () => {
      toast.success("Rol o‘chirildi")
      setDeleting(null)
      setSelectedId(null)
      void qc.invalidateQueries({ queryKey: ["roles"] })
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "O‘chirib bo‘lmadi")
      setDeleting(null)
    },
  })

  if (roles.isLoading || perms.isLoading) return <LoadingRows />
  if (roles.isError) return <ErrorState error={roles.error} onRetry={() => void roles.refetch()} />
  if (perms.isError) return <ErrorState error={perms.error} onRetry={() => void perms.refetch()} />
  if (!list.length) return <EmptyState title="Rollar topilmadi" />

  const isCustom = role && !role.isSystem && role.key.startsWith("custom-")

  return (
    <div className="space-y-4">
      {!isOwner && (
        <p className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Lock className="size-4 shrink-0" /> Rollarni faqat owner o‘zgartira oladi. Siz faqat ko‘rishingiz mumkin.
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <div className="space-y-2">
          {list.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setSelectedId(r.id)}
              className={cn(
                "flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted",
                r.id === role?.id && "border-primary bg-primary/5",
              )}
            >
              <span className="min-w-0 truncate font-medium">{r.name}</span>
              <Badge variant="secondary" className="shrink-0">
                {r.userCount} xodim
              </Badge>
            </button>
          ))}
          {isOwner && (
            <Button variant="outline" className="w-full" onClick={() => { setCreateError(null); setCreateOpen(true) }}>
              <Plus /> Yangi rol
            </Button>
          )}
        </div>

        {role && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                {role.name}
                {role.key === "owner" && (
                  <Badge variant="outline">
                    <Lock /> Faqat o‘qish
                  </Badge>
                )}
              </CardTitle>
              {isOwner && isCustom && (
                <CardAction>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => setDeleting(role)}>
                    <Trash2 /> O‘chirish
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <PermissionMatrix
                perms={perms.data ?? []}
                value={current}
                readOnly={readOnly}
                onToggle={(code, on) => {
                  const next = new Set(current)
                  if (on) next.add(code)
                  else next.delete(code)
                  setDraft({ id: role.id, codes: next })
                }}
              />
              {role.key === "owner" && <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground"><Lock className="size-4 shrink-0" /> Owner roli barcha ruxsatlarga ega va o‘zgartirilmaydi.</p>}
              {!readOnly && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>
                    Bekor qilish
                  </Button>
                  <Button disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                    {save.isPending && <Spinner />} Saqlash
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yangi rol</DialogTitle>
            <DialogDescription>Avval nom bering, ruxsatlarni keyin belgilaysiz.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setCreateError(null)
              create.mutate()
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="role-name">Rol nomi</FieldLabel>
                <Input id="role-name" required minLength={2} maxLength={60} value={newName} onChange={(e) => setNewName(e.target.value)} />
              </Field>
              {createError && <FieldError>{createError}</FieldError>}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={create.isPending || newName.trim().length < 2}>
                {create.isPending && <Spinner />} Yaratish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>“{deleting?.name}” rolini o‘chirasizmi?</AlertDialogTitle>
            <AlertDialogDescription>Rolga xodimlar biriktirilgan bo‘lsa, o‘chirib bo‘lmaydi.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (deleting) remove.mutate(deleting.id)
              }}
            >
              {remove.isPending && <Spinner />} O‘chirish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
