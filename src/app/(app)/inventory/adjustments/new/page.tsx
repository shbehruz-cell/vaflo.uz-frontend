"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { NATIVE_SELECT, ProductPicker, useWarehouses, type Product } from "@/components/inventory/common"
import { LoadingRows, NoAccess } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
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
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatQty, UNIT_LABELS } from "@/lib/format"
import { cn } from "@/lib/utils"

export default function NewAdjustmentPage() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <AdjustmentForm />
    </Suspense>
  )
}

interface Row {
  product: Product
  counted: string
}

const num = (s: string) => Number(s.replace(",", "."))
const validCounted = (s: string) => /^\d{1,11}([.,]\d{1,3})?$/.test(s.trim())

function AdjustmentForm() {
  const { can } = useAuth()
  const router = useRouter()
  const qc = useQueryClient()
  const prefillId = useSearchParams().get("productId")
  const { data: warehouses } = useWarehouses()
  const [warehouseId, setWarehouseId] = useState("")
  const [reason, setReason] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  const [touched, setTouched] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [prefilled, setPrefilled] = useState(false)

  const wh = warehouseId || warehouses?.[0]?.id || ""

  // ?productId= bilan kelganda mahsulotni oldindan qo‘shish
  const pre = useQuery({
    queryKey: ["product", prefillId],
    queryFn: () => api.get<Product>(`/products/${prefillId}`),
    enabled: !!prefillId && !prefilled,
  })
  if (pre.data && !prefilled) {
    setPrefilled(true)
    if (pre.data.warehouseId) setWarehouseId(pre.data.warehouseId)
    setRows([{ product: pre.data, counted: "" }])
  }

  // Ombor o‘zgarsa joriy qoldiqlarni qayta yuklaymiz
  const ids = rows.map((r) => r.product.id).join(",")
  const fresh = useQuery({
    queryKey: ["adjust-qty", wh, ids],
    queryFn: async () => {
      const out: Record<string, string> = {}
      await Promise.all(
        rows.map(async (r) => {
          const res = await api.get<{ items: Product[] }>("/products", { q: r.product.sku ?? r.product.name, warehouseId: wh, pageSize: 100 })
          const f = res.items.find((i) => i.id === r.product.id)
          if (f) out[r.product.id] = f.qty
        }),
      )
      return out
    },
    enabled: !!wh && rows.length > 0,
  })
  const curQty = (p: Product) => fresh.data?.[p.id] ?? p.qty

  const submit = useMutation({
    mutationFn: () =>
      api.post<{ count: number }>("/inventory/adjustments", {
        warehouseId: wh,
        reason: reason.trim(),
        items: rows.map((r) => ({ productId: r.product.id, countedQty: r.counted.trim().replace(",", ".") })),
      }),
    onSuccess: (res) => {
      toast.success(res.count ? `Qoldiq tuzatildi (${res.count} ta o‘zgarish)` : "O‘zgarish yo‘q: sanalgan miqdor joriy qoldiqqa teng")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["product"] })
      qc.invalidateQueries({ queryKey: ["movements"] })
      router.push("/inventory/movements")
    },
    onError: (e) => {
      setConfirm(false)
      toast.error(e.message)
    },
  })

  if (!can("inventory.adjust")) return <NoAccess />

  const reasonErr = touched && reason.trim().length < 3 ? "Sababni kiriting (kamida 3 ta belgi)" : null
  const rowsErr = touched && rows.length === 0 ? "Kamida bitta mahsulot qo‘shing" : null
  const countErr = touched && rows.some((r) => !validCounted(r.counted))

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setTouched(true)
    if (!wh || reason.trim().length < 3 || rows.length === 0 || rows.some((r) => !validCounted(r.counted))) return
    setConfirm(true)
  }

  const changed = rows.filter((r) => validCounted(r.counted) && num(r.counted) !== Number(curQty(r.product))).length

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/inventory/products" />} nativeButton={false} className="-ml-2 w-fit">
        <ArrowLeft /> Mahsulotlar
      </Button>
      <PageHeader title="Qoldiqni tuzatish" description="Sanab chiqilgan haqiqiy miqdorni kiriting — farq avtomatik hisoblanadi" />

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="grid gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="adj-wh">Ombor *</FieldLabel>
            <select
              id="adj-wh"
              className={NATIVE_SELECT}
              value={wh}
              onChange={(e) => setWarehouseId(e.target.value)}
            >
              {warehouses?.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </Field>
          <Field data-invalid={!!reasonErr || undefined}>
            <FieldLabel htmlFor="adj-reason">Sabab *</FieldLabel>
            <Textarea
              id="adj-reason"
              rows={2}
              value={reason}
              maxLength={300}
              placeholder="Masalan: inventarizatsiya, buzilgan tovar"
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!reasonErr || undefined}
            />
            {reasonErr && <FieldError>{reasonErr}</FieldError>}
          </Field>
        </div>

        <div className="space-y-2">
          <ProductPicker
            warehouseId={wh}
            exclude={rows.map((r) => r.product.id)}
            onPick={(p) => setRows((r) => [...r, { product: p, counted: "" }])}
          />
          {rowsErr && <p className="text-sm text-destructive">{rowsErr}</p>}
        </div>

        {rows.length > 0 && (
          <div className="divide-y overflow-hidden rounded-2xl border bg-card">
            {rows.map((r, i) => {
              const cur = Number(curQty(r.product))
              const ok = validCounted(r.counted)
              const diff = ok ? num(r.counted) - cur : null
              const unit = UNIT_LABELS[r.product.unit]
              return (
                <div key={r.product.id} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 p-3 md:grid-cols-[1fr_8rem_8rem_8rem_auto]">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{r.product.name}</div>
                    <div className="truncate text-xs text-muted-foreground">{r.product.sku ?? "SKU yo‘q"}</div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Olib tashlash"
                    className="md:order-last"
                    onClick={() => setRows((x) => x.filter((_, j) => j !== i))}
                  >
                    <Trash2 />
                  </Button>
                  <div className="text-sm md:text-right">
                    <span className="text-xs text-muted-foreground md:hidden">Hozir: </span>
                    <span className="tabular-nums">
                      {formatQty(cur)} {unit}
                    </span>
                  </div>
                  <Input
                    inputMode="decimal"
                    className="h-10"
                    placeholder="Sanalgan"
                    aria-label={`${r.product.name}: sanalgan miqdor`}
                    value={r.counted}
                    aria-invalid={(countErr && !ok) || undefined}
                    onChange={(e) => setRows((x) => x.map((y, j) => (j === i ? { ...y, counted: e.target.value } : y)))}
                  />
                  <div
                    className={cn(
                      "text-sm font-medium tabular-nums md:text-right",
                      diff === null || diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-primary" : "text-destructive",
                    )}
                  >
                    <span className="text-xs font-normal text-muted-foreground md:hidden">Farq: </span>
                    {diff === null ? "—" : `${diff > 0 ? "+" : ""}${formatQty(diff)} ${unit}`}
                  </div>
                </div>
              )
            })}
          </div>
        )}
        {countErr && <p className="text-sm text-destructive">Barcha qatorlarda sanalgan miqdorni to‘g‘ri kiriting (0 ham mumkin).</p>}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="h-10" render={<Link href="/inventory/products" />} nativeButton={false}>
            Bekor qilish
          </Button>
          <Button type="submit" className="h-10">
            Tuzatishni saqlash
          </Button>
        </div>
      </form>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Qoldiqni tuzatishni tasdiqlaysizmi?</AlertDialogTitle>
            <AlertDialogDescription>
              {rows.length} ta mahsulot, shundan {changed} tasida qoldiq o‘zgaradi. Bu amal ombor harakatlarida va audit jurnalida saqlanadi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
            <AlertDialogAction disabled={submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending && <Spinner />} Tasdiqlash
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
