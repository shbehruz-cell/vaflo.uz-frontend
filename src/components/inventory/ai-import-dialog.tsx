"use client"

import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, Check, ChevronRight, ImagePlus, Sparkles, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { api, ApiError } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { UNIT_LABELS, formatMoney } from "@/lib/format"
import { isFinePointer } from "@/lib/pointer"
import { cn } from "@/lib/utils"
import { NATIVE_SELECT, useCategories, type Category, type Product } from "./common"

const MAX_IMAGES = 5
const MAX_SIDE = 1600
const NEW_CAT = "__new"

interface Img {
  id: string
  blob: Blob
  url: string
}

interface Draft {
  id: string
  checked: boolean
  name: string
  unit: string
  price: string
  cost: string
  qty: string
  barcode: string
  cat: string
  newCategoryName: string | null
  confidence: "high" | "medium" | "low"
  imageIndex: number | null
  notes: string | null
  status: "idle" | "saving" | "done" | "error"
  error: string | null
}

interface ApiDraft {
  name: string
  unit: string
  salePrice: string | null
  costPrice?: string | null
  initialQty?: string | null
  barcode: string | null
  categoryId: string | null
  newCategoryName: string | null
  confidence: "high" | "medium" | "low"
  imageIndexes: number[]
  notes: string | null
}

const CONFIDENCE: Record<Draft["confidence"], string> = { high: "Ishonch yuqori", medium: "Ishonch o‘rtacha", low: "Ishonch past" }
const clean = (s: string) => s.trim().replace(/\s+/g, "").replace(",", ".")
const validPrice = (s: string) => /^\d{1,12}(\.\d{1,2})?$/.test(clean(s))
const validQty = (s: string) => /^\d{1,12}(\.\d{1,3})?$/.test(clean(s))
const numStr = (s: string | null | undefined) => (s ? String(Number(s)) : "")
const money = (s: string) => {
  const c = clean(s)
  if (!c.includes(".")) return `${c}.00`
  const [a, b] = c.split(".")
  return `${a}.${b.padEnd(2, "0")}`
}
const uid = () => Math.random().toString(36).slice(2, 10)

/** Rasmni canvas orqali ≤1600px JPEG (0.85) ga kichraytiradi. */
async function downscale(file: File): Promise<Blob> {
  let src: ImageBitmap | HTMLImageElement
  let w: number
  let h: number
  let cleanup = () => {}
  try {
    const bmp = await createImageBitmap(file)
    src = bmp
    w = bmp.width
    h = bmp.height
    cleanup = () => bmp.close()
  } catch {
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      src = img
      w = img.naturalWidth
      h = img.naturalHeight
    } finally {
      URL.revokeObjectURL(url)
    }
  }
  try {
    if (!w || !h) throw new Error("empty")
    const k = Math.min(1, MAX_SIDE / Math.max(w, h))
    const canvas = document.createElement("canvas")
    canvas.width = Math.max(1, Math.round(w * k))
    canvas.height = Math.max(1, Math.round(h * k))
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("no ctx")
    ctx.fillStyle = "#fff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85))
    if (!blob) throw new Error("toBlob")
    return blob
  } finally {
    cleanup()
  }
}

export function AiImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-h-[90vh] sm:max-w-2xl">
        <Body onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function Body({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { can } = useAuth()
  const canCost = can("costs.read")
  const { data: categories } = useCategories()
  const [openId, setOpenId] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)
  const [step, setStep] = useState<"photos" | "analyzing" | "results">("photos")
  const [images, setImages] = useState<Img[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [processing, setProcessing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [submitting, setSubmitting] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const imagesRef = useRef<Img[]>([])
  const createdCats = useRef(new Map<string, string>())

  useEffect(() => {
    imagesRef.current = images
  }, [images])
  useEffect(
    () => () => {
      abortRef.current?.abort()
      imagesRef.current.forEach((i) => URL.revokeObjectURL(i.url))
    },
    [],
  )

  async function addFiles(list: FileList | File[]) {
    const files = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name))
    if (!files.length) return
    const room = MAX_IMAGES - imagesRef.current.length
    if (room <= 0) {
      setFileErrors([`Ko‘pi bilan ${MAX_IMAGES} ta rasm yuborish mumkin`])
      return
    }
    setProcessing(true)
    const errs: string[] = files.length > room ? [`Ko‘pi bilan ${MAX_IMAGES} ta rasm yuborish mumkin`] : []
    const added: Img[] = []
    for (const f of files.slice(0, room)) {
      try {
        const blob = await downscale(f)
        added.push({ id: uid(), blob, url: URL.createObjectURL(blob) })
      } catch {
        errs.push(`${f.name}: Bu rasmni o‘qib bo‘lmadi`)
      }
    }
    setImages((cur) => [...cur, ...added])
    setFileErrors(errs)
    setProcessing(false)
  }

  function removeImage(id: string) {
    setImages((cur) => {
      const x = cur.find((i) => i.id === id)
      if (x) URL.revokeObjectURL(x.url)
      return cur.filter((i) => i.id !== id)
    })
  }

  async function analyze() {
    if (!images.length) return
    const ac = new AbortController()
    abortRef.current = ac
    setError(null)
    setStep("analyzing")
    const fd = new FormData()
    images.forEach((im, i) => fd.append("images", im.blob, `photo-${i + 1}.jpg`))
    try {
      const res = await api.postForm<{ drafts: ApiDraft[] }>("/products/ai-draft", fd, ac.signal)
      if (ac.signal.aborted) return
      setDrafts(
        res.drafts.map((d) => ({
          id: uid(),
          checked: d.confidence !== "low",
          name: d.name,
          unit: d.unit in UNIT_LABELS ? d.unit : "PIECE",
          price: numStr(d.salePrice),
          cost: numStr(d.costPrice),
          qty: numStr(d.initialQty),
          barcode: d.barcode ?? "",
          cat: d.categoryId ?? (d.newCategoryName ? NEW_CAT : ""),
          newCategoryName: d.categoryId ? null : d.newCategoryName,
          confidence: d.confidence,
          imageIndex: d.imageIndexes?.[0] ?? null,
          notes: d.notes,
          status: "idle",
          error: null,
        })),
      )
      setOpenId(null)
      setTriedSubmit(false)
      setStep("results")
    } catch (e) {
      if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) return
      setError(e instanceof ApiError ? e.message : "AI xizmatiga ulanib bo‘lmadi. Internetni tekshirib, qayta urinib ko‘ring.")
      setStep("photos")
    }
  }

  function cancelAnalyze() {
    abortRef.current?.abort()
    setStep("photos")
  }

  const patch = (id: string, p: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.id === id ? { ...d, ...p } : d)))
  const isReady = (d: Draft) => d.checked && d.status !== "done" && d.name.trim() !== "" && validPrice(d.price)
  const selectable = drafts.filter((d) => d.status !== "done")
  const allChecked = selectable.length > 0 && selectable.every((d) => d.checked)
  const checkedCount = drafts.filter((d) => d.checked && d.status !== "done").length

  async function confirm() {
    const incomplete = drafts.find((d) => d.checked && d.status !== "done" && (d.name.trim() === "" || !validPrice(d.price)))
    if (incomplete) {
      setTriedSubmit(true)
      setOpenId(incomplete.id)
      setTimeout(() => document.getElementById(`ai-row-${incomplete.id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }), 50)
      return
    }
    const todo = drafts.filter(isReady)
    if (!todo.length) return
    setSubmitting(true)
    // 1) yangi kategoriyalar — nom bo‘yicha bir marta
    const catId = async (name: string): Promise<string> => {
      const key = name.trim().toLowerCase()
      const known = createdCats.current.get(key) ?? categories?.find((c) => c.name.trim().toLowerCase() === key)?.id
      if (known) return known
      const c = await api.post<Category>("/categories", { name: name.trim() })
      createdCats.current.set(key, c.id)
      return c.id
    }
    let okCount = 0
    for (const d of todo) {
      patch(d.id, { status: "saving", error: null })
      try {
        let categoryId = ""
        if (d.cat === NEW_CAT && d.newCategoryName) categoryId = await catId(d.newCategoryName)
        else if (d.cat && d.cat !== NEW_CAT) categoryId = d.cat
        const bc = d.barcode.trim()
        const cp = clean(d.cost)
        const iq = clean(d.qty)
        await api.post<Product>("/products", {
          name: d.name.trim(),
          unit: d.unit,
          salePrice: money(d.price),
          barcodes: bc ? [bc] : [],
          ...(categoryId && { categoryId }),
          ...(canCost && cp && validPrice(cp) && { costPrice: money(cp) }),
          ...(iq && validQty(iq) && { initialQty: iq }),
        })
        okCount++
        patch(d.id, { status: "done", checked: false })
      } catch (e) {
        patch(d.id, { status: "error", error: e instanceof Error ? e.message : "Saqlab bo‘lmadi" })
      }
    }
    setSubmitting(false)
    if (okCount) {
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["product"] })
      qc.invalidateQueries({ queryKey: ["categories"] })
    }
    if (okCount === todo.length) {
      toast.success(`${okCount} ta mahsulot qo‘shildi`)
      onClose()
    } else if (okCount) {
      toast.success(`${okCount} ta mahsulot qo‘shildi`)
    }
  }

  const found = drafts.length

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 leading-tight">
          <Sparkles className="size-4 text-primary" /> AI bilan qo‘shish
        </DialogTitle>
        <DialogDescription>
          {step === "results"
            ? found
              ? "Tekshirib, kerak bo‘lsa mahsulotni bosib tuzating."
              : "Rasmlardan mahsulot topilmadi."
            : "Mahsulot rasmlarini yuboring — AI nomi, narxi va shtrix-kodini o‘zi to‘ldiradi."}
        </DialogDescription>
      </DialogHeader>

      {step === "photos" && (
        <>
          {error && (
            <div role="alert" className="flex flex-col gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm sm:flex-row sm:items-center">
              <div className="flex flex-1 items-start gap-2 text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
              <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={analyze} disabled={!images.length}>
                Qayta urinish
              </Button>
            </div>
          )}

          <label
            className={cn(
              "flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-colors has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 hover:bg-muted/50",
              dragging && "border-primary bg-primary/5",
              images.length >= MAX_IMAGES && "pointer-events-none opacity-50",
            )}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              void addFiles(e.dataTransfer.files)
            }}
          >
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                if (e.target.files) void addFiles(e.target.files)
                e.target.value = ""
              }}
            />
            {processing ? <Spinner className="size-6 text-primary" /> : <ImagePlus className="size-7 text-primary" />}
            <span className="text-base font-semibold">{processing ? "Rasmlar tayyorlanmoqda…" : "Rasm tanlang yoki suratga oling"}</span>
            <span className="text-sm text-muted-foreground">
              {isFinePointer() ? "Bu yerga sudrab olib keling yoki bosing" : "Kamera yoki galereyadan"}
            </span>
          </label>

          <p className="text-xs text-muted-foreground">
            Eng yaxshi natija uchun: qadoqning old tomoni (nomi ko‘rinsin), narx yorlig‘i va shtrix-kod aniq tushsin. Har bir mahsulotni alohida rasmga olish shart emas — bir rasmda bir nechta bo‘lishi mumkin. Qog‘ozdagi narx ro‘yxatini ham suratga olsangiz bo‘ladi — ustunlar (nomi, narxi, tannarx) avtomatik ajratiladi.
          </p>

          {fileErrors.length > 0 && (
            <ul className="space-y-1 text-sm text-destructive" role="alert">
              {fileErrors.map((m, i) => (
                <li key={i}>{m}</li>
              ))}
            </ul>
          )}

          {images.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground tabular-nums">
                {images.length}/{MAX_IMAGES}
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {images.map((im, i) => (
                  <div key={im.id} className="relative aspect-square overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im.url} alt={`Rasm ${i + 1}`} className="size-full object-cover" />
                    <button
                      type="button"
                      aria-label={`Rasm ${i + 1} ni olib tashlash`}
                      className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground ring-1 ring-foreground/10 hover:bg-background max-sm:size-11"
                      onClick={() => removeImage(im.id)}
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter className="sticky bottom-0 z-10 bg-muted">
            <Button type="button" className="h-11 sm:h-10" disabled={!images.length || processing} onClick={analyze}>
              <Sparkles /> Tahlil qilish
            </Button>
          </DialogFooter>
        </>
      )}

      {step === "analyzing" && (
        <>
          <div className="flex flex-col items-center gap-2 py-4 text-center" role="status" aria-live="polite">
            <Spinner className="size-6 text-primary" />
            <span className="text-sm font-medium">AI rasmlarni o‘rganmoqda…</span>
            <span className="text-xs text-muted-foreground">Bu bir necha soniya olishi mumkin.</span>
          </div>
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3 rounded-xl border p-3">
                <Skeleton className="size-12 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter className="sticky bottom-0 z-10 bg-muted">
            <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={cancelAnalyze}>
              Bekor qilish
            </Button>
          </DialogFooter>
        </>
      )}

      {step === "results" && (
        <>
          {found === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
              <ImagePlus className="size-7 text-muted-foreground" />
              <div>
                <div className="font-semibold">Mahsulot topilmadi</div>
                <div className="text-sm text-muted-foreground">Rasmda mahsulot yoki yozuvlar aniq ko‘rinishini tekshiring.</div>
              </div>
              <Button type="button" variant="outline" className="h-11 sm:h-10" onClick={() => setStep("photos")}>
                Boshqa rasm yuborish
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold">{found} ta mahsulot topildi</h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 text-xs max-sm:h-11"
                  disabled={submitting || selectable.length === 0}
                  onClick={() => setDrafts((ds) => ds.map((d) => (d.status === "done" ? d : { ...d, checked: !allChecked })))}
                >
                  {allChecked ? "Belgini olib tashlash" : "Hammasini belgilash"}
                </Button>
              </div>
              <div className="divide-y overflow-hidden rounded-2xl border bg-card">
                {drafts.map((d) => (
                  <DraftRow
                    key={d.id}
                    d={d}
                    open={openId === d.id}
                    onToggle={() => setOpenId((cur) => (cur === d.id ? null : d.id))}
                    showErrors={triedSubmit}
                    canCost={canCost}
                    image={d.imageIndex !== null ? images[d.imageIndex] : undefined}
                    categories={categories ?? []}
                    onChange={(p) => patch(d.id, p)}
                    disabled={submitting}
                  />
                ))}
              </div>
            </div>
          )}

          {found > 0 && (
            <DialogFooter className="sticky bottom-0 z-10 bg-muted">
              <Button type="button" variant="outline" className="h-11 sm:h-10" disabled={submitting} onClick={() => setStep("photos")}>
                Orqaga
              </Button>
              <Button type="button" className="h-11 sm:h-10" disabled={checkedCount === 0 || submitting} onClick={confirm}>
                {submitting && <Spinner />} {checkedCount} ta mahsulotni qo‘shish
              </Button>
            </DialogFooter>
          )}
        </>
      )}
    </>
  )
}

const DOT: Record<Draft["confidence"], string> = { high: "bg-emerald-500", medium: "bg-amber-500", low: "bg-destructive" }
const AMBER_PILL = "rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 dark:text-amber-300"

function DraftRow({
  d,
  open,
  onToggle,
  showErrors,
  canCost,
  image,
  categories,
  onChange,
  disabled,
}: {
  d: Draft
  open: boolean
  onToggle: () => void
  showErrors: boolean
  canCost: boolean
  image?: Img
  categories: Category[]
  onChange: (p: Partial<Draft>) => void
  disabled: boolean
}) {
  const done = d.status === "done"
  const lock = done || disabled || d.status === "saving"
  const priceOk = validPrice(d.price)
  const priceMissing = !done && !priceOk
  const nameMissing = !done && d.name.trim() === ""
  const costOk = canCost && d.cost !== "" && validPrice(d.cost)
  const costBad = canCost && d.cost !== "" && !validPrice(d.cost)
  const qtyBad = d.qty !== "" && !validQty(d.qty)
  const id = `ai-${d.id}`
  const hint = !done && d.confidence === "low"

  return (
    <div id={`ai-row-${d.id}`} className={cn(done && "bg-muted/40", !d.checked && !done && "bg-muted/20")}>
      <div className="flex items-stretch">
        <div className="flex w-12 shrink-0 items-center justify-center">
          {d.status === "saving" ? (
            <Spinner className="size-5 text-primary" />
          ) : done ? (
            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" role="img" aria-label="Qo‘shildi">
              <Check className="size-4" />
            </span>
          ) : (
            <Checkbox checked={d.checked} disabled={lock} onCheckedChange={(v) => onChange({ checked: !!v })} aria-label="Qo‘shish uchun tanlash" />
          )}
        </div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
          className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 pr-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="min-w-0 flex-1">
            <span className="flex items-start gap-2">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", DOT[d.confidence])} role="img" aria-label={CONFIDENCE[d.confidence]} title={CONFIDENCE[d.confidence]} />
              <span className="line-clamp-2 text-sm font-medium break-words">{d.name.trim() || "Nomsiz mahsulot"}</span>
            </span>
            {(hint || costOk || done) && (
              <span className="mt-0.5 flex flex-wrap items-center gap-x-2 pl-4 text-xs text-muted-foreground">
                {done && <span>Qo‘shildi</span>}
                {hint && <span className="font-medium text-amber-700 dark:text-amber-300">Tekshiring</span>}
                {costOk && !done && <span className="tabular-nums md:hidden">Tannarx {formatMoney(clean(d.cost), false)}</span>}
              </span>
            )}
          </span>
          {costOk && <span className="hidden w-24 shrink-0 text-right text-xs text-muted-foreground tabular-nums md:block">{formatMoney(clean(d.cost), false)}</span>}
          <span className="shrink-0 text-right">
            {priceOk ? (
              <span className="text-sm font-bold tabular-nums">{formatMoney(clean(d.price), false)}</span>
            ) : (
              <span className={cn(AMBER_PILL, showErrors && d.checked && "ring-1 ring-amber-500")}>Narx kiriting</span>
            )}
          </span>
          <ChevronRight className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-90")} />
        </button>
      </div>

      {d.status === "error" && d.error && (
        <p role="alert" className="flex items-start gap-1.5 px-3 pb-2 pl-12 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {d.error}
        </p>
      )}

      {open && (
        <div id={`${id}-panel`} className="border-t bg-muted/30 p-3 pl-3 md:pl-12">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            <Field className="sm:col-span-2 md:col-span-3" data-invalid={nameMissing || undefined}>
              <FieldLabel htmlFor={`${id}-name`}>Nomi *</FieldLabel>
              <Input id={`${id}-name`} className="h-11 sm:h-10" value={d.name} disabled={lock} aria-invalid={nameMissing || undefined} onChange={(e) => onChange({ name: e.target.value })} />
            </Field>
            <Field data-invalid={priceMissing || undefined}>
              <FieldLabel htmlFor={`${id}-price`}>Sotuv narxi (so‘m) *</FieldLabel>
              <Input
                id={`${id}-price`}
                inputMode="decimal"
                className={cn("h-11 sm:h-10", priceMissing && d.price === "" && "border-amber-500 bg-amber-500/10 dark:border-amber-400")}
                value={d.price}
                disabled={lock}
                placeholder="0"
                autoFocus={showErrors && priceMissing && isFinePointer()}
                aria-invalid={(priceMissing && d.price !== "") || undefined}
                onChange={(e) => onChange({ price: e.target.value })}
              />
              {priceMissing && (
                <FieldError className={d.price === "" ? "text-amber-700 dark:text-amber-300" : undefined}>
                  {d.price === "" ? "Narxni kiriting" : "Narxni to‘g‘ri kiriting (masalan 12500)"}
                </FieldError>
              )}
            </Field>
            {canCost && (
              <Field data-invalid={costBad || undefined}>
                <FieldLabel htmlFor={`${id}-cost`}>Tannarx (so‘m)</FieldLabel>
                <Input id={`${id}-cost`} inputMode="decimal" className="h-11 sm:h-10" value={d.cost} disabled={lock} placeholder="0" aria-invalid={costBad || undefined} onChange={(e) => onChange({ cost: e.target.value })} />
                {costBad && <FieldError>Tannarxni to‘g‘ri kiriting</FieldError>}
              </Field>
            )}
            <Field data-invalid={qtyBad || undefined}>
              <FieldLabel htmlFor={`${id}-qty`}>Boshlang‘ich qoldiq</FieldLabel>
              <Input id={`${id}-qty`} inputMode="decimal" className="h-11 sm:h-10" value={d.qty} disabled={lock} placeholder="0" aria-invalid={qtyBad || undefined} onChange={(e) => onChange({ qty: e.target.value })} />
              {qtyBad && <FieldError>Miqdorni to‘g‘ri kiriting</FieldError>}
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-unit`}>Birlik</FieldLabel>
              <select id={`${id}-unit`} className={cn(NATIVE_SELECT, "max-sm:h-11")} value={d.unit} disabled={lock} onChange={(e) => onChange({ unit: e.target.value })}>
                {Object.entries(UNIT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-bc`}>Shtrix-kod</FieldLabel>
              <Input id={`${id}-bc`} inputMode="numeric" className="h-11 tabular-nums sm:h-10" value={d.barcode} disabled={lock} onChange={(e) => onChange({ barcode: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-cat`}>Kategoriya</FieldLabel>
              <select id={`${id}-cat`} className={cn(NATIVE_SELECT, "max-sm:h-11")} value={d.cat} disabled={lock} onChange={(e) => onChange({ cat: e.target.value })}>
                <option value="">Kategoriyasiz</option>
                {d.newCategoryName && <option value={NEW_CAT}>Yangi: {d.newCategoryName}</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {(d.notes || image) && (
            <div className="mt-3 flex items-start gap-3">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image.url} alt="Manba rasm" className="size-16 shrink-0 rounded-lg border object-cover" />
              )}
              {d.notes && <p className="text-xs text-muted-foreground">{d.notes}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
