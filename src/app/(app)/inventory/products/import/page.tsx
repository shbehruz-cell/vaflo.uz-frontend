"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react"
import { toast } from "sonner"
import { guessMapping, IMPORT_FIELDS, parseCsv, type ImportField } from "@/components/inventory/csv"
import { NATIVE_SELECT, THEAD, TROW } from "@/components/inventory/common"
import { NoAccess } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatMoney, UNIT_LABELS } from "@/lib/format"

interface ReportRow {
  index: number
  ok: boolean
  errors: string[]
  normalized: { name: string; sku: string | null; barcodes: string[]; category: string | null; unit: string; salePrice: string; qty: string | null } | null
}
interface Report {
  summary: { total: number; valid: number; invalid: number }
  rows: ReportRow[]
}

const MAX_ROWS = 5000
const SHOW_LIMIT = 300

export default function ImportPage() {
  const { can } = useAuth()
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<Record<string, string>[]>([])
  const [mapping, setMapping] = useState<Record<ImportField, string>>({} as Record<ImportField, string>)
  const [report, setReport] = useState<Report | null>(null)
  const [onlyErrors, setOnlyErrors] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [done, setDone] = useState<{ products: number; categoriesCreated: number } | null>(null)

  const step = done ? 4 : report ? 3 : rows.length ? 2 : 1

  const body = useMemo(
    () => ({
      rows,
      mapping: Object.fromEntries(Object.entries(mapping).filter(([, v]) => v)) as Record<string, string>,
    }),
    [rows, mapping],
  )

  const preview = useMutation({
    mutationFn: () => api.post<Report>("/products/import/preview", body),
    onSuccess: (r) => {
      setReport(r)
      setOnlyErrors(false)
    },
    onError: (e) => toast.error(e.message),
  })
  const commit = useMutation({
    mutationFn: () => api.post<{ products: number; categoriesCreated: number }>("/products/import/commit", body),
    onSuccess: (r) => {
      toast.success(`${r.products} ta mahsulot import qilindi`)
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["categories"] })
      setDone(r)
    },
    onError: (e) => toast.error(e.message),
  })

  if (!can("products.manage")) return <NoAccess />

  async function onFile(file: File | undefined) {
    setFileError(null)
    if (!file) return
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setFileError("Faqat .csv fayl qabul qilinadi. Excel’da “Boshqacha saqlash → CSV (UTF-8)” ni tanlang.")
      return
    }
    const parsed = parseCsv(await file.text())
    if (parsed.length < 2) {
      setFileError("Faylda sarlavha va kamida bitta ma’lumot qatori bo‘lishi kerak.")
      return
    }
    if (parsed.length - 1 > MAX_ROWS) {
      setFileError(`Bir faylda ko‘pi bilan ${MAX_ROWS} qator bo‘lishi mumkin.`)
      return
    }
    // takroriy sarlavhalarni farqlash
    const seen = new Map<string, number>()
    const hs = parsed[0].map((h, i) => {
      const base = h.trim() || `Ustun ${i + 1}`
      const n = (seen.get(base) ?? 0) + 1
      seen.set(base, n)
      return n > 1 ? `${base} (${n})` : base
    })
    const data = parsed.slice(1).map((r) => Object.fromEntries(hs.map((h, i) => [h, (r[i] ?? "").trim()])))
    setFileName(file.name)
    setHeaders(hs)
    setRows(data)
    setMapping(guessMapping(hs))
    setReport(null)
    setDone(null)
  }

  function reset() {
    setFileName("")
    setHeaders([])
    setRows([])
    setReport(null)
    setDone(null)
    setFileError(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  const missing = IMPORT_FIELDS.filter((f) => f.required && !mapping[f.key])
  const shown = report ? (onlyErrors ? report.rows.filter((r) => !r.ok) : report.rows) : []

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" render={<Link href="/inventory/products" />} nativeButton={false} className="-ml-2 w-fit">
        <ArrowLeft /> Mahsulotlar
      </Button>
      <PageHeader title="Excel/CSV’dan import" description={`Qadam ${step} / 4`} />

      {step === 4 && done ? (
        <Card className="rounded-2xl">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <CheckCircle2 className="size-10 text-primary" />
            <div className="text-base font-semibold">Import yakunlandi</div>
            <p className="text-sm text-muted-foreground">
              {done.products} ta mahsulot qo‘shildi{done.categoriesCreated ? `, ${done.categoriesCreated} ta yangi kategoriya yaratildi` : ""}.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reset}>
                Yana import qilish
              </Button>
              <Button render={<Link href="/inventory/products" />} nativeButton={false}>
                Mahsulotlarga qaytish
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>1. Fayl yuklash</CardTitle>
              <CardDescription>
                Excel fayllarni avval CSV sifatida saqlang: Excel’da <b>Fayl → Boshqacha saqlash → CSV UTF-8</b>. Ajratgich (<code>,</code> yoki <code>;</code>) avtomatik aniqlanadi. Ko‘pi bilan {MAX_ROWS} qator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <input ref={fileRef} type="file" accept=".csv,text/csv,.txt" className="sr-only" id="csv-file" onChange={(e) => onFile(e.target.files?.[0])} />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
                  <Upload /> {fileName ? "Boshqa fayl tanlash" : "CSV fayl tanlash"}
                </Button>
                {fileName && (
                  <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                    <FileSpreadsheet className="size-4" /> {fileName}
                    <span className="ml-2 tabular-nums">{rows.length} qator</span>
                  </span>
                )}
              </div>
              {fileError && <p className="text-sm text-destructive">{fileError}</p>}
            </CardContent>
          </Card>

          {rows.length > 0 && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>2. Ustunlarni moslash</CardTitle>
                <CardDescription>Fayldagi qaysi ustun qaysi maydonga to‘g‘ri kelishini tanlang. * majburiy.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {IMPORT_FIELDS.map((f) => (
                    <Field key={f.key} data-invalid={(f.required && !mapping[f.key]) || undefined}>
                      <FieldLabel htmlFor={`map-${f.key}`}>
                        {f.label}
                        {f.required ? " *" : ""}
                      </FieldLabel>
                      <select
                        id={`map-${f.key}`}
                        className={NATIVE_SELECT}
                        value={mapping[f.key] ?? ""}
                        onChange={(e) => {
                          setMapping((m) => ({ ...m, [f.key]: e.target.value }))
                          setReport(null)
                        }}
                      >
                        <option value="">— tanlanmagan —</option>
                        {headers.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ))}
                </div>
                {missing.length > 0 && <FieldError>Majburiy maydonlarni moslang: {missing.map((m) => m.label).join(", ")}</FieldError>}
                <Button className="h-10" disabled={missing.length > 0 || preview.isPending} onClick={() => preview.mutate()}>
                  {preview.isPending && <Spinner />} Tekshirish
                </Button>
              </CardContent>
            </Card>
          )}

          {report && (
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>3. Tekshiruv natijasi</CardTitle>
                <CardDescription>Xatolar bo‘lsa, faylni tuzatib qayta yuklang — xato bilan import qilib bo‘lmaydi.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Jami: {report.summary.total}</Badge>
                  <Badge variant="secondary">To‘g‘ri: {report.summary.valid}</Badge>
                  <Badge variant={report.summary.invalid ? "destructive" : "outline"}>Xato: {report.summary.invalid}</Badge>
                  {report.summary.invalid > 0 && (
                    <Button variant={onlyErrors ? "default" : "outline"} size="sm" aria-pressed={onlyErrors} onClick={() => setOnlyErrors((v) => !v)}>
                      Faqat xatolar
                    </Button>
                  )}
                </div>

                {shown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ko‘rsatiladigan qator yo‘q.</p>
                ) : (
                  <div className="overflow-hidden rounded-lg border">
                    <Table>
                      <TableHeader className={THEAD}>
                        <TableRow>
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Nomi</TableHead>
                          <TableHead className="hidden sm:table-cell">Kategoriya</TableHead>
                          <TableHead className="text-right">Narx</TableHead>
                          <TableHead className="hidden text-right sm:table-cell">Qoldiq</TableHead>
                          <TableHead>Holat</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {shown.slice(0, SHOW_LIMIT).map((r) => (
                          <TableRow key={r.index} className={`${TROW} ${r.ok ? "" : "bg-destructive/5"}`}>
                            <TableCell className="tabular-nums text-muted-foreground">{r.index + 1}</TableCell>
                            <TableCell className="max-w-48 truncate">{r.normalized?.name ?? String(rows[r.index]?.[mapping.name] ?? "—")}</TableCell>
                            <TableCell className="hidden text-muted-foreground sm:table-cell">{r.normalized?.category ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{r.normalized ? formatMoney(r.normalized.salePrice) : "—"}</TableCell>
                            <TableCell className="hidden text-right tabular-nums sm:table-cell">
                              {r.normalized?.qty ?? "—"} {r.normalized?.qty ? (UNIT_LABELS[r.normalized.unit] ?? "") : ""}
                            </TableCell>
                            <TableCell>
                              {r.ok ? (
                                <Badge variant="secondary">OK</Badge>
                              ) : (
                                <div className="flex flex-wrap gap-1">
                                  {r.errors.map((e, i) => (
                                    <Badge key={i} variant="destructive" className="h-auto whitespace-normal">
                                      {e}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {shown.length > SHOW_LIMIT && <p className="text-xs text-muted-foreground">Dastlabki {SHOW_LIMIT} ta qator ko‘rsatildi.</p>}

                <div className="flex flex-wrap items-center gap-2">
                  <Button className="h-10" disabled={report.summary.invalid > 0 || report.summary.valid === 0 || commit.isPending} onClick={() => commit.mutate()}>
                    {commit.isPending && <Spinner />} Import qilish ({report.summary.valid})
                  </Button>
                  <Button variant="outline" className="h-10" onClick={reset}>
                    Bekor qilish
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
