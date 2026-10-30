"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Ban, KeyRound, Pencil, Plus, RefreshCw, Search, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { PaginationBar } from "@/components/app/pagination-bar"
import { NativeSelect } from "@/components/reports/native-select"
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUrlState } from "@/hooks/use-url-state"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"

export interface StaffUser {
  id: string
  name: string
  login: string
  status: "ACTIVE" | "BLOCKED"
  roleId: string
  createdAt: string
  role: { id: string; key: string; name: string }
}
export interface RoleRow {
  id: string
  key: string
  name: string
  isSystem: boolean
  permissions: string[]
  userCount: number
}

export function generatePassword(len = 12) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789"
  const arr = new Uint32Array(len)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join("")
}

type Dialogs =
  | { type: "create" }
  | { type: "edit"; user: StaffUser }
  | { type: "reset"; user: StaffUser }
  | { type: "status"; user: StaffUser }
  | null

function PasswordField({ value, onChange, label = "Parol" }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor="pw">{label}</FieldLabel>
      <div className="flex gap-2">
        <Input id="pw" value={value} onChange={(e) => onChange(e.target.value)} autoComplete="off" placeholder="Kamida 8 belgi" className="font-mono" />
        <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>
          <RefreshCw /> Yaratish
        </Button>
      </div>
    </Field>
  )
}

export function UsersTab() {
  const { user: me, isOwner } = useAuth()
  const qc = useQueryClient()
  const { get, set } = useUrlState()
  const q = get("q")
  const status = get("status")
  const page = Number(get("page", "1")) || 1
  const [search, setSearch] = useState(q)
  const [dialog, setDialog] = useState<Dialogs>(null)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", login: "", password: "", roleId: "", status: "ACTIVE" as StaffUser["status"] })

  const users = useQuery({
    queryKey: ["users", { q, status, page }],
    queryFn: () => api.get<Paginated<StaffUser>>("/users", { search: q, status, page, pageSize: 25 }),
  })
  const roles = useQuery({ queryKey: ["roles"], queryFn: () => api.get<RoleRow[]>("/roles") })
  const assignable = (roles.data ?? []).filter((r) => isOwner || r.key !== "owner")

  const close = () => {
    setDialog(null)
    setError(null)
  }
  const done = (msg: string) => {
    toast.success(msg)
    void qc.invalidateQueries({ queryKey: ["users"] })
    void qc.invalidateQueries({ queryKey: ["roles"] })
    close()
  }
  const fail = (e: unknown) => {
    const msg = e instanceof Error ? e.message : "Xatolik yuz berdi"
    setError(msg)
    toast.error(msg)
  }

  const create = useMutation({
    mutationFn: () => api.post("/users", { name: form.name.trim(), login: form.login.trim(), password: form.password, roleId: form.roleId }),
    onSuccess: () => done("Xodim qo‘shildi"),
    onError: fail,
  })
  const update = useMutation({
    mutationFn: ({ id, body, msg }: { id: string; body: Record<string, string>; msg: string }) =>
      api.patch(`/users/${id}`, body).then(() => msg),
    onSuccess: done,
    onError: fail,
  })
  const reset = useMutation({
    mutationFn: (id: string) => api.post(`/users/${id}/reset-password`, { newPassword: form.password }),
    onSuccess: () => done("Parol tiklandi"),
    onError: fail,
  })

  const locked = (u: StaffUser) => u.id === me?.id || (u.role.key === "owner" && !isOwner)

  function open(d: Dialogs) {
    setError(null)
    if (d?.type === "create") setForm({ name: "", login: "", password: generatePassword(), roleId: "", status: "ACTIVE" })
    if (d?.type === "edit") setForm({ name: d.user.name, login: d.user.login, password: "", roleId: d.user.roleId, status: d.user.status })
    if (d?.type === "reset") setForm((f) => ({ ...f, password: generatePassword() }))
    setDialog(d)
  }

  const target = dialog && dialog.type !== "create" ? dialog.user : null

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <form
          className="relative flex-1 sm:max-w-xs"
          onSubmit={(e) => {
            e.preventDefault()
            set({ q: search, page: "" })
          }}
        >
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} onBlur={() => search !== q && set({ q: search, page: "" })} placeholder="Ism yoki login" className="pl-8" aria-label="Qidirish" />
        </form>
        <NativeSelect
          className="sm:w-44"
          aria-label="Holat"
          value={status}
          onChange={(e) => set({ status: e.target.value, page: "" })}
          options={[
            { value: "", label: "Barcha holatlar" },
            { value: "ACTIVE", label: "Faol" },
            { value: "BLOCKED", label: "Bloklangan" },
          ]}
        />
        <Button className="sm:ml-auto" onClick={() => open({ type: "create" })}>
          <Plus /> Xodim qo‘shish
        </Button>
      </div>

      {users.isLoading ? (
        <LoadingRows />
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : !users.data?.items.length ? (
        <EmptyState title="Xodim topilmadi" description="Qidiruv yoki filtrni o‘zgartirib ko‘ring." />
      ) : (
        <>
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead className="hidden sm:table-cell">Login</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="hidden lg:table-cell">Yaratilgan</TableHead>
                  <TableHead className="text-right">Amallar</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.name} {u.id === me?.id && <span className="text-xs text-muted-foreground">(siz)</span>}
                      <div className="text-xs font-normal text-muted-foreground sm:hidden">{u.login}</div>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground sm:table-cell">{u.login}</TableCell>
                    <TableCell>
                      <Badge variant={u.role.key === "owner" ? "default" : "secondary"}>{u.role.name}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.status === "ACTIVE" ? "outline" : "destructive"}>{u.status === "ACTIVE" ? "Faol" : "Bloklangan"}</Badge>
                    </TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDateTime(u.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" aria-label="Tahrirlash" title="Tahrirlash" disabled={u.role.key === "owner" && !isOwner} onClick={() => open({ type: "edit", user: u })}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Parolni tiklash" title="Parolni tiklash" disabled={u.role.key === "owner" && !isOwner} onClick={() => open({ type: "reset", user: u })}>
                          <KeyRound />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label={u.status === "ACTIVE" ? "Bloklash" : "Blokdan chiqarish"} title={u.status === "ACTIVE" ? "Bloklash" : "Blokdan chiqarish"} disabled={locked(u)} onClick={() => open({ type: "status", user: u })}>
                          {u.status === "ACTIVE" ? <Ban /> : <ShieldCheck />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={users.data.page} pages={users.data.pages} total={users.data.total} onPage={(p) => set({ page: p === 1 ? "" : p })} />
        </>
      )}

      {/* Qo‘shish */}
      <Dialog open={dialog?.type === "create"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xodim qo‘shish</DialogTitle>
            <DialogDescription>Parolni xodimga o‘zingiz yetkazing — keyin u buni o‘zgartirishi mumkin.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              create.mutate()
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="u-name">Ism</FieldLabel>
                <Input id="u-name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="u-login">Login (email yoki telefon)</FieldLabel>
                <Input id="u-login" required minLength={3} value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} autoComplete="off" />
              </Field>
              <PasswordField value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              <Field>
                <FieldLabel htmlFor="u-role">Rol</FieldLabel>
                <NativeSelect id="u-role" required value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} options={[{ value: "", label: "Rolni tanlang" }, ...assignable.map((r) => ({ value: r.id, label: r.name }))]} />
              </Field>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={create.isPending || form.password.length < 8 || !form.roleId}>
                {create.isPending && <Spinner />} Qo‘shish
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tahrirlash */}
      <Dialog open={dialog?.type === "edit"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xodimni tahrirlash</DialogTitle>
            <DialogDescription>{target?.login}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!target) return
              setError(null)
              update.mutate({ id: target.id, body: { name: form.name.trim(), roleId: form.roleId, status: form.status }, msg: "Xodim yangilandi" })
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="e-name">Ism</FieldLabel>
                <Input id="e-name" required minLength={2} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-role">Rol</FieldLabel>
                <NativeSelect
                  id="e-role"
                  disabled={!!target && locked(target)}
                  value={form.roleId}
                  onChange={(e) => setForm({ ...form, roleId: e.target.value })}
                  options={assignable.map((r) => ({ value: r.id, label: r.name }))}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="e-status">Holat</FieldLabel>
                <NativeSelect
                  id="e-status"
                  disabled={!!target && locked(target)}
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as StaffUser["status"] })}
                  options={[
                    { value: "ACTIVE", label: "Faol" },
                    { value: "BLOCKED", label: "Bloklangan" },
                  ]}
                />
              </Field>
              {target && locked(target) && <p className="text-xs text-muted-foreground">O‘zingizning rolingiz va holatingizni o‘zgartirib bo‘lmaydi.</p>}
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending && <Spinner />} Saqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Parolni tiklash */}
      <Dialog open={dialog?.type === "reset"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Parolni tiklash</DialogTitle>
            <DialogDescription>{target?.name} uchun yangi parol. Xodimning barcha sessiyalari tugatilishi mumkin.</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!target) return
              setError(null)
              reset.mutate(target.id)
            }}
          >
            <FieldGroup>
              <PasswordField label="Yangi parol" value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={reset.isPending || form.password.length < 8}>
                {reset.isPending && <Spinner />} Tiklash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bloklash / blokdan chiqarish */}
      <AlertDialog open={dialog?.type === "status"} onOpenChange={(o) => !o && close()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{target?.status === "ACTIVE" ? "Xodimni bloklaysizmi?" : "Blokdan chiqarasizmi?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {target?.status === "ACTIVE"
                ? `${target?.name} tizimga kira olmaydi. Keyinroq blokdan chiqarish mumkin.`
                : `${target?.name} yana tizimga kira oladi.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction
              variant={target?.status === "ACTIVE" ? "destructive" : "default"}
              disabled={update.isPending}
              onClick={(e) => {
                e.preventDefault()
                if (!target) return
                const next = target.status === "ACTIVE" ? "BLOCKED" : "ACTIVE"
                update.mutate({ id: target.id, body: { status: next }, msg: next === "BLOCKED" ? "Xodim bloklandi" : "Xodim blokdan chiqarildi" })
              }}
            >
              {update.isPending && <Spinner />} {target?.status === "ACTIVE" ? "Bloklash" : "Blokdan chiqarish"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
