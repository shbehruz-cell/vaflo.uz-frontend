"use client"

import { useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/app/page-header"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { RegistersCard } from "@/components/owner/registers-card"
import { NativeSelect } from "@/components/reports/native-select"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"

interface Store {
  id: string
  name: string
  timezone: string
}
interface Warehouse {
  id: string
  name: string
  code: string
}
interface DemoRequest {
  id: string
  name: string
  phone: string
  storeName: string
  storeType: string | null
  message: string | null
  createdAt: string
}

const FALLBACK_TZ = ["Asia/Tashkent", "Asia/Samarkand", "Asia/Almaty", "Europe/Moscow", "Europe/Istanbul", "UTC"]

function StoreForm({ store }: { store: Store }) {
  const qc = useQueryClient()
  const [name, setName] = useState(store.name)
  const [timezone, setTimezone] = useState(store.timezone || "Asia/Tashkent")
  const zones = useMemo(() => {
    let list = FALLBACK_TZ
    try {
      const sv = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf
      if (sv) list = sv("timeZone")
    } catch {
      /* fallback */
    }
    return Array.from(new Set([store.timezone, "Asia/Tashkent", ...list])).filter(Boolean)
  }, [store.timezone])

  const save = useMutation({
    mutationFn: () => api.patch("/stores/current", { name: name.trim(), timezone }),
    onSuccess: () => {
      toast.success("Sozlamalar saqlandi")
      void qc.invalidateQueries({ queryKey: ["store"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Saqlab bo‘lmadi"),
  })

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        save.mutate()
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="store-name">Do‘kon nomi</FieldLabel>
          <Input id="store-name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field>
          <FieldLabel htmlFor="store-tz">Vaqt zonasi</FieldLabel>
          <NativeSelect id="store-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={zones.map((z) => ({ value: z, label: z }))} />
        </Field>
      </FieldGroup>
      <Button type="submit" disabled={save.isPending || (name.trim() === store.name && timezone === store.timezone)}>
        {save.isPending && <Spinner />} Saqlash
      </Button>
    </form>
  )
}

function AddDialog({ kind, open, onClose, warehouses }: { kind: "warehouse" | "register"; open: boolean; onClose: () => void; warehouses: Warehouse[] }) {
  const qc = useQueryClient()
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "")
  const [error, setError] = useState<string | null>(null)
  const isWh = kind === "warehouse"

  const create = useMutation({
    mutationFn: () =>
      api.post(isWh ? "/warehouses" : "/registers", {
        name: name.trim(),
        code: code.trim(),
        ...(!isWh && { warehouseId }),
      }),
    onSuccess: () => {
      toast.success(isWh ? "Ombor qo‘shildi" : "Kassa qo‘shildi")
      void qc.invalidateQueries({
        queryKey: [isWh ? "warehouses" : "registers"],
      })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Xatolik yuz berdi"),
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isWh ? "Ombor qo‘shish" : "Kassa qo‘shish"}</DialogTitle>
          <DialogDescription>Kod do‘kon ichida takrorlanmas bo‘lishi kerak.</DialogDescription>
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
              <FieldLabel htmlFor="add-name">Nomi</FieldLabel>
              <Input id="add-name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor="add-code">Kod</FieldLabel>
              <Input id="add-code" required maxLength={30} value={code} onChange={(e) => setCode(e.target.value)} />
            </Field>
            {!isWh && (
              <Field>
                <FieldLabel htmlFor="add-wh">Ombor (kassa shu ombordan sotadi)</FieldLabel>
                <NativeSelect
                  id="add-wh"
                  required
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value)}
                  options={warehouses.map((w) => ({
                    value: w.id,
                    label: w.name,
                  }))}
                />
              </Field>
            )}
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Bekor qilish
            </Button>
            <Button type="submit" disabled={create.isPending || !name.trim() || !code.trim() || (!isWh && !warehouseId)}>
              {create.isPending && <Spinner />} Qo‘shish
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function SimpleTable({ rows, extra }: { rows: Warehouse[]; extra?: (r: Warehouse) => string }) {
  if (!rows.length) return <EmptyState title="Hali ombor yo‘q" description="Birinchi omborni qo‘shing, mahsulotlar shu yerda saqlanadi." />
  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <Table>
        <TableHeader className="bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
          <TableRow>
            <TableHead>Nomi</TableHead>
            <TableHead>Kod</TableHead>
            {extra && <TableHead className="hidden sm:table-cell">Ombor</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
              {extra && <TableCell className="hidden text-muted-foreground sm:table-cell">{extra(r)}</TableCell>}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function DemoRequests() {
  const q = useQuery({
    queryKey: ["demo-requests"],
    queryFn: () =>
      api.get<Paginated<DemoRequest>>("/demo-requests", {
        page: 1,
        pageSize: 10,
      }),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">Demo so‘rovlar</CardTitle>
        <CardDescription>Landing sahifadan kelgan oxirgi so‘rovlar</CardDescription>
      </CardHeader>
      <CardContent>
        {q.isLoading ? (
          <LoadingRows rows={3} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => void q.refetch()} />
        ) : !q.data?.items.length ? (
          <EmptyState title="Hali so‘rov yo‘q" description="Landing sahifadagi forma orqali kelgan so‘rovlar shu yerda ko‘rinadi." />
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-card">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead>Ism</TableHead>
                  <TableHead>Telefon</TableHead>
                  <TableHead className="hidden sm:table-cell">Do‘kon</TableHead>
                  <TableHead className="hidden md:table-cell">Xabar</TableHead>
                  <TableHead className="text-right">Sana</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="tabular-nums">{r.phone}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <div>{r.storeName}</div>
                      {r.storeType && <div className="text-xs text-muted-foreground">{r.storeType}</div>}
                    </TableCell>
                    <TableCell className="hidden max-w-56 truncate text-muted-foreground md:table-cell">{r.message ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function OwnerSettingsPage() {
  const { isOwner, can } = useAuth()
  const [dlg, setDlg] = useState<"warehouse" | "register" | null>(null)
  const manageRegisters = can("registers.manage")
  const store = useQuery({
    queryKey: ["store"],
    queryFn: () => api.get<Store>("/stores/current"),
    enabled: isOwner,
  })
  const whs = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => api.get<Warehouse[]>("/warehouses"),
    enabled: isOwner || manageRegisters,
  })

  if (!isOwner && !manageRegisters) return <NoAccess />
  const whName = (id: string) => whs.data?.find((w) => w.id === id)?.name ?? "—"

  return (
    <div className="space-y-6">
      <PageHeader title="Do‘kon sozlamalari" description="Do‘kon ma’lumotlari, omborlar va kassalar" />

      {manageRegisters && <RegistersCard warehouseName={whName} onAdd={() => setDlg("register")} canAdd={!!whs.data?.length} />}

      {isOwner && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Do‘kon</CardTitle>
            </CardHeader>
            <CardContent className="max-w-md">
              {store.isLoading ? (
                <LoadingRows rows={2} />
              ) : store.isError ? (
                <ErrorState error={store.error} onRetry={() => void store.refetch()} />
              ) : (
                store.data && <StoreForm key={store.data.name + store.data.timezone} store={store.data} />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Omborlar</CardTitle>
              <CardAction>
                <Button size="sm" onClick={() => setDlg("warehouse")}>
                  <Plus /> Ombor qo‘shish
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {whs.isLoading ? (
                <LoadingRows rows={3} />
              ) : whs.isError ? (
                <ErrorState error={whs.error} onRetry={() => void whs.refetch()} />
              ) : (
                <SimpleTable rows={whs.data ?? []} />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {can("demo_requests.read") && <DemoRequests />}

      {dlg && <AddDialog key={dlg} kind={dlg} open onClose={() => setDlg(null)} warehouses={whs.data ?? []} />}
    </div>
  )
}
