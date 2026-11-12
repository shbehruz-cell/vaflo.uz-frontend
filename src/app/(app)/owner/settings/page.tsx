"use client"

import { isFinePointer } from "@/lib/pointer"
import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Clock, Inbox, Monitor, Phone, Plus, Store as StoreIcon } from "lucide-react"
import { toast } from "sonner"
import { FormSheet } from "@/components/app/form-sheet"
import { PageHeader } from "@/components/app/page-header"
import { Panel, RingProgress } from "@/components/app/panel"
import { ViewTabs } from "@/components/app/view-tabs"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { WarehousesCard } from "@/components/owner/warehouses-card"
import { RegistersList, type RegisterRow } from "@/components/owner/registers-card"
import { NativeSelect } from "@/components/reports/native-select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

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

/** "+998900000000" → "+998 90 000 00 00" */
function formatPhone(p: string) {
  const m = p.replace(/\D/g, "").match(/^998(\d{2})(\d{3})(\d{2})(\d{2})$/)
  return m ? `+998 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : p
}

/** "Asia/Tashkent" → "Tashkent (UTC+5)" */
function tzLabel(tz: string) {
  try {
    const off = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value
    const city = tz.split("/").pop()?.replace(/_/g, " ") ?? tz
    return `${city} (${(off ?? "GMT").replace("GMT", "UTC")})`
  } catch {
    return tz
  }
}

/** Do‘kon vaqt zonasidagi joriy vaqt (har 30 soniyada yangilanadi). */
function useStoreClock(tz: string | undefined) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])
  if (!tz) return null
  try {
    return new Intl.DateTimeFormat("ru-RU", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(now)
  } catch {
    return null
  }
}

/* ───────────────────────── Bo‘lim karkasi ───────────────────────── */

function Section({
  id,
  title,
  description,
  action,
  children,
}: {
  id: string
  title: string
  description: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-20 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  )
}


/* ───────────────────────── Do‘kon ma’lumotlari ───────────────────────── */

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

  const dirty = name.trim() !== store.name || timezone !== store.timezone
  const nameInvalid = name.trim().length < 2

  const save = useMutation({
    mutationFn: () => api.patch("/stores/current", { name: name.trim(), timezone }),
    onSuccess: () => {
      toast.success("Do‘kon ma’lumotlari saqlandi")
      void qc.invalidateQueries({ queryKey: ["store"] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Saqlab bo‘lmadi"),
  })

  return (
    <form
      className="overflow-hidden rounded-2xl border bg-card"
      onSubmit={(e) => {
        e.preventDefault()
        if (!nameInvalid) save.mutate()
      }}
    >
      <FieldGroup className="grid gap-5 p-4 sm:p-5 md:grid-cols-2">
        <Field data-invalid={nameInvalid || undefined}>
          <FieldLabel htmlFor="store-name">Do‘kon nomi</FieldLabel>
          <Input id="store-name" className="h-10" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} aria-invalid={nameInvalid || undefined} />
          <FieldDescription>Chekda va hisobotlarda shu nom chiqadi.</FieldDescription>
          {nameInvalid && <FieldError>Nom kamida 2 ta belgidan iborat bo‘lsin</FieldError>}
        </Field>
        <Field>
          <FieldLabel htmlFor="store-tz">Vaqt zonasi</FieldLabel>
          <NativeSelect id="store-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} options={zones.map((z) => ({ value: z, label: tzLabel(z) }))} />
          <FieldDescription>Kunlik hisobotlar va smenalar shu vaqt bo‘yicha hisoblanadi.</FieldDescription>
        </Field>
      </FieldGroup>
      {/* Saqlash paneli faqat o‘zgarish bo‘lganda */}
      <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3 sm:px-5", !dirty && "hidden")}>
        <span className="w-full text-sm text-muted-foreground sm:mr-auto sm:w-auto">Saqlanmagan o‘zgarishlar bor</span>
        <Button
          type="button"
          variant="ghost"
          className="h-10 max-sm:flex-1"
          onClick={() => {
            setName(store.name)
            setTimezone(store.timezone)
          }}
        >
          Bekor qilish
        </Button>
        <Button type="submit" className="h-10 max-sm:flex-1" disabled={save.isPending || nameInvalid}>
          {save.isPending && <Spinner />} Saqlash
        </Button>
      </div>
    </form>
  )
}

/* ───────────────────────── Ombor / kassa qo‘shish ───────────────────────── */

/** "Kassa 2" → "K2", "Asosiy ombor" → "ASOSIY" — kodni nomdan taklif qiladi. */
function suggestCode(name: string, isWh: boolean) {
  const n = name.trim()
  const num = n.match(/\d+/)?.[0]
  if (!isWh && num) return `K${num}`
  return n.split(/\s+/)[0]?.replace(/[^A-Za-z0-9]/g, "").slice(0, 10).toUpperCase() ?? ""
}

function AddDialog({ kind, onClose, warehouses }: { kind: "warehouse" | "register"; onClose: () => void; warehouses: Warehouse[] }) {
  const qc = useQueryClient()
  const isWh = kind === "warehouse"
  const [name, setName] = useState("")
  const [code, setCode] = useState("")
  const [codeTouched, setCodeTouched] = useState(false)
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "")
  const [error, setError] = useState<string | null>(null)
  const codeValue = codeTouched ? code : suggestCode(name, isWh)

  const create = useMutation({
    mutationFn: () => api.post(isWh ? "/warehouses" : "/registers", { name: name.trim(), code: codeValue.trim(), ...(!isWh && { warehouseId }) }),
    onSuccess: () => {
      toast.success(isWh ? "Ombor qo‘shildi" : "Kassa qo‘shildi")
      void qc.invalidateQueries({ queryKey: [isWh ? "warehouses" : "registers"] })
      onClose()
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Qo‘shib bo‘lmadi"),
  })

  const dirty = !create.isPending && !!(name.trim() || codeTouched)
  const formId = "add-" + kind + "-form"

  return (
    <FormSheet
      open
      onOpenChange={(o) => !o && onClose()}
      title={isWh ? "Ombor qo‘shish" : "Kassa qo‘shish"}
      description={isWh ? "Mahsulot qoldig‘i har bir ombor bo‘yicha alohida yuritiladi." : "Kassa tanlangan ombordan sotadi. Kassir soni va xodimlarni keyin sozlash mumkin."}
      dirty={dirty}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button type="submit" form={formId} disabled={create.isPending || !name.trim() || !codeValue.trim() || (!isWh && !warehouseId)}>
            {create.isPending && <Spinner />} {isWh ? "Ombor qo‘shish" : "Kassa qo‘shish"}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault()
          setError(null)
          create.mutate()
        }}
      >
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="add-name">Nomi</FieldLabel>
            <Input id="add-name" className="h-11 sm:h-10" autoFocus={isFinePointer()} required maxLength={100} placeholder={isWh ? "Masalan: Asosiy ombor" : "Masalan: Kassa 2"} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel htmlFor="add-code">Kod</FieldLabel>
            <Input
              id="add-code"
              className="h-11 font-mono uppercase sm:h-10"
              required
              maxLength={30}
              value={codeValue}
              onChange={(e) => {
                setCodeTouched(true)
                setCode(e.target.value.toUpperCase())
              }}
            />
            <FieldDescription>Do‘kon ichida takrorlanmas qisqa kod. Nomdan avtomatik taklif qilinadi.</FieldDescription>
          </Field>
          {!isWh && (
            <Field>
              <FieldLabel htmlFor="add-wh">Ombor</FieldLabel>
              <NativeSelect id="add-wh" className="h-11 sm:h-10" required value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} options={warehouses.map((w) => ({ value: w.id, label: w.name }))} />
            </Field>
          )}
          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
      </form>
    </FormSheet>
  )
}

/* ───────────────────────── Demo so‘rovlar ───────────────────────── */

function DemoRequests({ q }: { q: ReturnType<typeof useDemoRequests> }) {
  if (q.isLoading) return <LoadingRows rows={3} />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => void q.refetch()} />
  if (!q.data?.items.length) return <EmptyState title="Hali so‘rov yo‘q" description="Landing sahifadagi “Demo so‘rash” formasi orqali kelgan so‘rovlar shu yerda ko‘rinadi." />
  return (
    <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
      {q.data.items.map((r) => (
        <li key={r.id} className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium">{r.name}</span>
              <span className="text-sm text-muted-foreground">{r.storeName}</span>
              {r.storeType && <Badge variant="secondary">{r.storeType}</Badge>}
            </div>
            {r.message && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.message}</p>}
            <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</div>
          </div>
          <Button variant="outline" size="sm" className="h-10 w-fit tabular-nums md:h-9" render={<a href={`tel:${r.phone}`} />} nativeButton={false}>
            <Phone /> {formatPhone(r.phone)}
          </Button>
        </li>
      ))}
    </ul>
  )
}

function useDemoRequests(enabled: boolean) {
  return useQuery({
    queryKey: ["demo-requests"],
    queryFn: () => api.get<Paginated<DemoRequest>>("/demo-requests", { page: 1, pageSize: 10 }),
    enabled,
  })
}


/* ───────────────────────── Foydalanish (haqiqiy sonlar) ───────────────────────── */

function UsageRow({ count, label, loading }: { count?: number; label: string; loading?: boolean }) {
  return (
    <li className="flex min-h-12 items-center gap-3 py-2">
      <RingProgress value={count && count > 0 ? 1 : 0} max={1} size={24} />
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {loading ? <Skeleton className="h-5 w-10" /> : <span className="tabular-nums">{count ?? "—"}</span>}
    </li>
  )
}

function UsagePanel({
  store,
  warehouses,
  registers,
  staffTotal,
  showStaff,
}: {
  store?: Store
  warehouses?: Warehouse[]
  registers?: RegisterRow[]
  staffTotal?: number
  showStaff: boolean
}) {
  const clock = useStoreClock(store?.timezone)
  const onShift = registers?.reduce((n, r) => n + r.openCount, 0)
  return (
    <Panel className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:gap-10">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-xl font-semibold text-primary-foreground">
            {store ? store.name.trim().charAt(0).toUpperCase() : <StoreIcon className="size-6" />}
          </span>
          <div className="min-w-0">
            {store ? <div className="truncate text-lg font-semibold tracking-tight">{store.name}</div> : <Skeleton className="h-6 w-40" />}
            <p className="mt-0.5 text-sm text-muted-foreground">Do‘kon bo‘yicha joriy ko‘rsatkichlar</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {store ? tzLabel(store.timezone) : "—"}
          </span>
          {clock && <span className="tabular-nums">Do‘konda hozir {clock}</span>}
        </div>
      </div>
      <ul className="divide-y divide-border/60 text-sm">
        <UsageRow label="Omborlar" count={warehouses?.length} loading={!warehouses} />
        <UsageRow label="Kassalar" count={registers?.length} loading={!registers} />
        {showStaff && <UsageRow label="Xodimlar" count={staffTotal} loading={staffTotal == null} />}
        <UsageRow label="Hozir smenada (kassir)" count={onShift} loading={!registers} />
      </ul>
    </Panel>
  )
}

/* ───────────────────────── Sahifa ───────────────────────── */

export default function OwnerSettingsPage() {
  const { isOwner, can } = useAuth()
  const [dlg, setDlg] = useState<"register" | null>(null)
  const [tabState, setTab] = useState<string>("")
  const manageRegisters = can("registers.manage")
  const seeDemo = can("demo_requests.read")
  const seeStaff = can("users.manage")

  const store = useQuery({ queryKey: ["store"], queryFn: () => api.get<Store>("/stores/current"), enabled: isOwner })
  const whs = useQuery({ queryKey: ["warehouses"], queryFn: () => api.get<Warehouse[]>("/warehouses"), enabled: isOwner || manageRegisters })
  const regs = useQuery({ queryKey: ["registers"], queryFn: () => api.get<RegisterRow[]>("/registers"), enabled: isOwner || manageRegisters })
  const staff = useQuery({ queryKey: ["users", "count"], queryFn: () => api.get<Paginated<unknown>>("/users", { page: 1, pageSize: 1 }), enabled: seeStaff })
  const demo = useDemoRequests(seeDemo)

  if (!isOwner && !manageRegisters) return <NoAccess />
  const whName = (id: string) => whs.data?.find((w) => w.id === id)?.name ?? "—"

  const tabs = [
    isOwner && { value: "store", label: "Do‘kon", icon: <StoreIcon /> },
    (isOwner || manageRegisters) && { value: "places", label: (<><span className="hidden sm:inline">Omborlar va kassalar</span><span className="sm:hidden">Joylar</span></>), icon: <Monitor /> },
    seeDemo && { value: "demo", label: "So‘rovlar", icon: <Inbox />, count: demo.data?.total || undefined },
  ].filter(Boolean) as { value: string; label: React.ReactNode; icon: React.ReactNode; count?: number }[]
  const tab = tabs.some((t) => t.value === tabState) ? tabState : (tabs[0]?.value ?? "")

  return (
    <div className="space-y-4">
      <PageHeader title="Do‘kon sozlamalari" description="Do‘kon ma’lumotlari, kassalar va omborlar bir joyda." />

      <ViewTabs variant="pill" tabs={tabs} value={tab} onChange={setTab} />

      {tab === "store" && isOwner && (
        <div className="space-y-4">
          <UsagePanel store={store.data} warehouses={whs.data} registers={regs.data} staffTotal={staff.data?.total} showStaff={seeStaff} />
          <Section id="dokon" title="Do‘kon ma’lumotlari" description="Nom va vaqt zonasi butun tizimda ishlatiladi.">
            {store.isLoading ? (
              <LoadingRows rows={2} />
            ) : store.isError ? (
              <ErrorState error={store.error} onRetry={() => void store.refetch()} />
            ) : (
              store.data && <StoreForm key={store.data.name + store.data.timezone} store={store.data} />
            )}
          </Section>
        </div>
      )}

      {tab === "places" && (
        <div className="space-y-8">
          {manageRegisters && (
            <Section
              id="kassalar"
              title="Kassalar"
              description="Har bir kassada bir vaqtda nechta kassir ishlashi va kimlar ishlay olishini belgilang."
              action={
                <Button size="sm" className="h-10 md:h-9" onClick={() => setDlg("register")} disabled={!whs.data?.length}>
                  <Plus /> <span className="hidden sm:inline">Kassa qo‘shish</span>
                  <span className="sm:hidden">Qo‘shish</span>
                </Button>
              }
            >
              <RegistersList warehouseName={whName} />
            </Section>
          )}

          {isOwner && <WarehousesCard />}
        </div>
      )}

      {tab === "demo" && seeDemo && (
        <Section id="demo" title="Demo so‘rovlar" description="Landing sahifadan kelgan oxirgi 10 ta so‘rov. Raqam ustiga bosib qo‘ng‘iroq qiling.">
          <DemoRequests q={demo} />
        </Section>
      )}

      {dlg && <AddDialog key={dlg} kind={dlg} onClose={() => setDlg(null)} warehouses={whs.data ?? []} />}
    </div>
  )
}
