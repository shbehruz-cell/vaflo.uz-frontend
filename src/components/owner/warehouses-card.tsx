"use client"

import { useState } from "react"
import Link from "next/link"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Archive, ArrowRightLeft, Info, MoreHorizontal, Pencil, Plus, Trash2, Undo2, Warehouse as WarehouseIcon } from "lucide-react"
import { toast } from "sonner"
import { FormSheet } from "@/components/app/form-sheet"
import { StatusChip } from "@/components/app/status-chip"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { ViewTabs } from "@/components/app/view-tabs"
import { TABLE_CARD, THEAD, TROW } from "@/components/inventory/common"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, ApiError } from "@/lib/api"
import { formatMoney } from "@/lib/format"
import { isFinePointer } from "@/lib/pointer"

export interface ManagedWarehouse {
  id: string
  name: string
  code: string
  status: "ACTIVE" | "ARCHIVED"
  createdAt: string
  registers: { id: string; name: string; code: string }[]
  productsInStock: number
  stockValue: string
  movementsCount: number
}

const errMsg = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

/** "Asosiy ombor" → "ASOSIY" — kodni nomdan taklif qiladi. */
function suggestCode(name: string) {
  return name.trim().split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() ?? ""
}

/** Arxivlashga to‘siq bo‘lsa — sababi (matn), bo‘lmasa null. */
function archiveBlocker(w: ManagedWarehouse, activeCount: number): string | null {
  if (w.status !== "ACTIVE") return null
  if (activeCount <= 1) return "Yagona faol omborni arxivlab bo‘lmaydi"
  if (w.registers.length) return `Omborga kassa bog‘langan: ${w.registers.map((r) => r.name).join(", ")}`
  if (w.productsInStock > 0) return `Omborda ${w.productsInStock} ta mahsulot qoldig‘i bor — avval qoldiqni 0 ga tushiring`
  return null
}

const canDelete = (w: ManagedWarehouse) => w.movementsCount === 0 && w.productsInStock === 0 && w.registers.length === 0

function useInvalidateWarehouses() {
  const qc = useQueryClient()
  return () => {
    for (const key of ["warehouses", "warehouses-manage", "registers", "stock", "inventory", "stock-movements"]) {
      void qc.invalidateQueries({ queryKey: [key] })
    }
  }
}

/* ───────────────────────── Qo‘shish / tahrirlash ───────────────────────── */

function WarehouseFormSheet({ warehouse, onClose }: { warehouse: ManagedWarehouse | null; onClose: () => void }) {
  const invalidate = useInvalidateWarehouses()
  const editing = !!warehouse
  const [name, setName] = useState(warehouse?.name ?? "")
  const [code, setCode] = useState(warehouse?.code ?? "")
  const [codeTouched, setCodeTouched] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const codeValue = editing || codeTouched ? code : suggestCode(name)

  const save = useMutation({
    mutationFn: () => {
      const body = { name: name.trim(), code: codeValue.trim() }
      return editing ? api.patch(`/warehouses/${warehouse.id}`, body) : api.post("/warehouses", body)
    },
    onSuccess: () => {
      toast.success(editing ? "Ombor saqlandi" : "Ombor qo‘shildi")
      invalidate()
      onClose()
    },
    onError: (e) => {
      const msg = errMsg(e, "Saqlab bo‘lmadi")
      if (e instanceof ApiError && e.status === 409) setCodeError(msg)
      else setNameError(msg)
    },
  })

  const dirty = !save.isPending && (editing ? name.trim() !== warehouse.name || codeValue.trim() !== warehouse.code : !!(name.trim() || codeTouched))
  const formId = "warehouse-form"

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={editing ? "Omborni tahrirlash" : "Ombor qo‘shish"}
      description={editing ? "Nom va kod o‘zgarsa, qoldiq va harakatlar tarixi saqlanib qoladi." : "Mahsulot qoldig‘i har bir ombor bo‘yicha alohida yuritiladi."}
      dirty={dirty}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form={formId} disabled={save.isPending || !name.trim() || !codeValue.trim() || (editing && !dirty)}>
            {save.isPending && <Spinner />} {editing ? "Saqlash" : "Ombor qo‘shish"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          setNameError(null)
          setCodeError(null)
          save.mutate()
        }}
      >
        <FieldGroup>
          <Field data-invalid={!!nameError || undefined}>
            <FieldLabel htmlFor="wh-name">Nomi</FieldLabel>
            <Input
              id="wh-name"
              className="h-11 sm:h-10"
              autoFocus={isFinePointer()}
              required
              maxLength={100}
              placeholder="Masalan: Asosiy ombor"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameError(null)
              }}
              aria-invalid={!!nameError || undefined}
            />
            {nameError && <FieldError>{nameError}</FieldError>}
          </Field>
          <Field data-invalid={!!codeError || undefined}>
            <FieldLabel htmlFor="wh-code">Kod</FieldLabel>
            <Input
              id="wh-code"
              className="h-11 font-mono uppercase sm:h-10"
              required
              maxLength={30}
              value={codeValue}
              onChange={(e) => {
                setCodeTouched(true)
                setCode(e.target.value.toUpperCase())
                setCodeError(null)
              }}
              aria-invalid={!!codeError || undefined}
            />
            {codeError ? <FieldError>{codeError}</FieldError> : <FieldDescription>Do‘kon ichida takrorlanmas qisqa kod{editing ? "." : ". Nomdan avtomatik taklif qilinadi."}</FieldDescription>}
          </Field>
        </FieldGroup>
      </form>
    </FormSheet>
  )
}

/* ───────────────────────── Tasdiqlash oynalari ───────────────────────── */

type Confirm = { kind: "archive" | "restore" | "delete"; warehouse: ManagedWarehouse }

function ConfirmDialog({ confirm, onClose }: { confirm: Confirm; onClose: () => void }) {
  const invalidate = useInvalidateWarehouses()
  const [error, setError] = useState<string | null>(null)
  const { kind, warehouse: w } = confirm

  const run = useMutation({
    mutationFn: () => {
      if (kind === "delete") return api.delete(`/warehouses/${w.id}`)
      return api.post(`/warehouses/${w.id}/${kind}`)
    },
    onSuccess: () => {
      toast.success(kind === "archive" ? "Ombor arxivlandi" : kind === "restore" ? "Ombor qaytarildi" : "Ombor o‘chirildi")
      invalidate()
      onClose()
    },
    onError: (e) => {
      const msg = errMsg(e, "Amalni bajarib bo‘lmadi")
      setError(msg)
      toast.error(msg)
    },
  })

  const copy = {
    archive: {
      title: `“${w.name}” omborini arxivlaysizmi?`,
      text: "Arxivlangan ombor POS va ombor tanlovlarida ko‘rinmaydi. Tarixi saqlanadi va uni istalgan vaqt qaytarish mumkin.",
      action: "Arxivlash",
    },
    restore: {
      title: `“${w.name}” omborini qaytarasizmi?`,
      text: "Ombor yana faol bo‘ladi va tanlovlarda ko‘rinadi.",
      action: "Qaytarish",
    },
    delete: {
      title: `“${w.name}” omborini o‘chirasizmi?`,
      text: "Ombor butunlay o‘chiriladi. Bu amalni ortga qaytarib bo‘lmaydi.",
      action: "O‘chirish",
    },
  }[kind]

  return (
    <AlertDialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.text}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={run.isPending}>Bekor qilish</AlertDialogCancel>
          <Button
            variant={kind === "delete" ? "destructive" : "default"}
            disabled={run.isPending}
            onClick={() => {
              setError(null)
              run.mutate()
            }}
          >
            {run.isPending && <Spinner />} {copy.action}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/* ───────────────────────── Qator amallari ───────────────────────── */

function RowActions({
  w,
  blocker,
  onEdit,
  onConfirm,
}: {
  w: ManagedWarehouse
  blocker: string | null
  onEdit: () => void
  onConfirm: (c: Confirm) => void
}) {
  const archived = w.status === "ARCHIVED"
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" className="size-11 md:size-9" aria-label={`${w.name} amallari`} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuItem className="min-h-11 md:min-h-8" render={<Link href={`/inventory/movements?warehouse=${w.id}`} />}>
          <ArrowRightLeft /> Qoldiq va harakatlar
        </DropdownMenuItem>
        <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={onEdit}>
          <Pencil /> Tahrirlash
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {archived ? (
          <DropdownMenuItem className="min-h-11 md:min-h-8" onClick={() => onConfirm({ kind: "restore", warehouse: w })}>
            <Undo2 /> Qaytarish
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className="min-h-11 md:min-h-8" disabled={!!blocker} onClick={() => onConfirm({ kind: "archive", warehouse: w })}>
            <Archive /> Arxivlash
          </DropdownMenuItem>
        )}
        {canDelete(w) && (
          <DropdownMenuItem className="min-h-11 md:min-h-8" variant="destructive" onClick={() => onConfirm({ kind: "delete", warehouse: w })}>
            <Trash2 /> O‘chirish
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function RegisterChips({ w }: { w: ManagedWarehouse }) {
  if (!w.registers.length) return <span className="text-xs text-muted-foreground">Kassa bog‘lanmagan</span>
  return (
    <div className="flex flex-wrap gap-1">
      {w.registers.map((r) => (
        <Badge key={r.id} variant="outline" className="font-normal">
          {r.name}
        </Badge>
      ))}
    </div>
  )
}

function Blocker({ text }: { text: string }) {
  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
      <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
      <span>Arxivlash mumkin emas: {text}</span>
    </p>
  )
}

function NameCell({ w }: { w: ManagedWarehouse }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <WarehouseIcon className="size-[18px]" />
      </span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="truncate font-medium">{w.name}</span>
        <Badge variant="outline" className="font-mono text-[11px]">
          {w.code}
        </Badge>
      </div>
    </div>
  )
}

function StatusCell({ w }: { w: ManagedWarehouse }) {
  return w.status === "ACTIVE" ? <StatusChip tone="success">Faol</StatusChip> : <StatusChip tone="neutral">Arxivlangan</StatusChip>
}

/* ───────────────────────── Ro‘yxat ───────────────────────── */

type Filter = "active" | "archived" | "all"

export function WarehousesCard() {
  const q = useQuery({ queryKey: ["warehouses-manage"], queryFn: () => api.get<ManagedWarehouse[]>("/warehouses/manage") })
  const [filterState, setFilter] = useState<Filter>("active")
  const [form, setForm] = useState<{ warehouse: ManagedWarehouse | null } | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const all = q.data ?? []
  const activeCount = all.filter((w) => w.status === "ACTIVE").length
  const archivedCount = all.length - activeCount
  const filter: Filter = archivedCount === 0 ? "active" : filterState
  const rows = all.filter((w) => (filter === "all" ? true : filter === "active" ? w.status === "ACTIVE" : w.status === "ARCHIVED"))

  return (
    <section id="omborlar" className="scroll-mt-20 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Omborlar</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">Mahsulot qoldig‘i har bir ombor bo‘yicha yuritiladi; kassa o‘z omboridan sotadi.</p>
        </div>
        <Button size="sm" variant="outline" className="h-10 shrink-0 md:h-9" onClick={() => setForm({ warehouse: null })}>
          <Plus /> <span className="hidden sm:inline">Ombor qo‘shish</span>
          <span className="sm:hidden">Qo‘shish</span>
        </Button>
      </div>

      {archivedCount > 0 && (
        <ViewTabs
          variant="pill"
          value={filter}
          onChange={(v) => setFilter(v as Filter)}
          tabs={[
            { value: "active", label: "Faol", count: activeCount },
            { value: "archived", label: "Arxiv", count: archivedCount },
            { value: "all", label: "Hammasi", count: all.length },
          ]}
        />
      )}

      {q.isLoading ? (
        <LoadingRows rows={2} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !rows.length ? (
        <EmptyState
          title={filter === "archived" ? "Arxivlangan ombor yo‘q" : "Hali ombor yo‘q"}
          description={filter === "archived" ? "Arxivlangan omborlar shu yerda ko‘rinadi." : "Birinchi omborni qo‘shing — mahsulot qoldig‘i shu yerda yuritiladi."}
        />
      ) : (
        <>
          {/* Mobil: kartochkalar */}
          <ul className={`${TABLE_CARD} divide-y md:hidden`}>
            {rows.map((w) => {
              const blocker = archiveBlocker(w, activeCount)
              return (
                <li key={w.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1.5">
                      <NameCell w={w} />
                      <StatusCell w={w} />
                    </div>
                    <RowActions w={w} blocker={blocker} onEdit={() => setForm({ warehouse: w })} onConfirm={setConfirm} />
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Qoldiqda</dt>
                      <dd className="tabular-nums">{w.productsInStock} ta mahsulot</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Qiymati</dt>
                      <dd className="tabular-nums">{formatMoney(w.stockValue)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Harakatlar</dt>
                      <dd className="tabular-nums">{w.movementsCount}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Kassalar</dt>
                      <dd>
                        <RegisterChips w={w} />
                      </dd>
                    </div>
                  </dl>
                  {blocker && <Blocker text={blocker} />}
                </li>
              )
            })}
          </ul>

          {/* Kompyuter: jadval */}
          <div className={`${TABLE_CARD} hidden md:block`}>
            <Table>
              <TableHeader className={THEAD}>
                <TableRow>
                  <TableHead>Ombor</TableHead>
                  <TableHead>Holat</TableHead>
                  <TableHead className="text-right">Qoldiqda</TableHead>
                  <TableHead className="text-right">Qiymati</TableHead>
                  <TableHead>Kassalar</TableHead>
                  <TableHead className="text-right">Harakatlar</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((w) => {
                  const blocker = archiveBlocker(w, activeCount)
                  return (
                    <TableRow key={w.id} className={`${TROW} align-top`}>
                      <TableCell className="max-w-72 py-3 whitespace-normal">
                        <NameCell w={w} />
                        {blocker && (
                          <div className="pl-12">
                            <Blocker text={blocker} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        <StatusCell w={w} />
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{w.productsInStock} ta</TableCell>
                      <TableCell className="py-3 text-right tabular-nums">{formatMoney(w.stockValue)}</TableCell>
                      <TableCell className="max-w-56 py-3 whitespace-normal">
                        <RegisterChips w={w} />
                      </TableCell>
                      <TableCell className="py-3 text-right tabular-nums">
                        <Link href={`/inventory/movements?warehouse=${w.id}`} className="text-primary underline-offset-4 hover:underline" title="Qoldiq va harakatlar">
                          {w.movementsCount}
                        </Link>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <RowActions w={w} blocker={blocker} onEdit={() => setForm({ warehouse: w })} onConfirm={setConfirm} />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {form && <WarehouseFormSheet key={form.warehouse?.id ?? "new"} warehouse={form.warehouse} onClose={() => setForm(null)} />}
      {confirm && <ConfirmDialog key={confirm.kind + confirm.warehouse.id} confirm={confirm} onClose={() => setConfirm(null)} />}
    </section>
  )
}
