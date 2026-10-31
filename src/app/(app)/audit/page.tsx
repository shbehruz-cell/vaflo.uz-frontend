"use client"

import { Suspense, useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Braces } from "lucide-react"
import { DateRangeFields, FilterBar, FilterField, type FilterChip } from "@/components/app/filter-bar"
import { SearchInput } from "@/components/app/search-input"
import { PageHeader } from "@/components/app/page-header"
import { PaginationBar } from "@/components/app/pagination-bar"
import { EmptyState, ErrorState, LoadingRows, NoAccess } from "@/components/app/states"
import { NativeSelect } from "@/components/reports/native-select"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useUrlState } from "@/hooks/use-url-state"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { formatDateTime } from "@/lib/format"

interface AuditRow {
  id: string
  actorId: string | null
  actorName: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: unknown
  createdAt: string
}

const ACTION_LABELS: Record<string, string> = {
  "auth.login": "Tizimga kirdi",
  "auth.login_failed": "Kirish muvaffaqiyatsiz",
  "auth.logout": "Tizimdan chiqdi",
  "auth.password_changed": "Parolni o‘zgartirdi",
  "product.created": "Mahsulot yaratildi",
  "product.updated": "Mahsulot tahrirlandi",
  "product.price_changed": "Narx o‘zgartirildi",
  "product.import": "Mahsulotlar import qilindi",
  "category.created": "Kategoriya yaratildi",
  "category.updated": "Kategoriya tahrirlandi",
  "sale.refunded": "Sotuv qaytarildi",
  "sale.voided": "Sotuv bekor qilindi",
  "sale.discount_override": "Chegirma limiti oshirildi",
  "inventory.adjusted": "Qoldiq tuzatildi",
  "user.created": "Xodim qo‘shildi",
  "user.updated": "Xodim tahrirlandi",
  "user.password_reset": "Parol tiklandi",
  "role.created": "Rol yaratildi",
  "role.updated": "Rol o‘zgartirildi",
  "role.deleted": "Rol o‘chirildi",
  "cash.movement": "Kassa harakati",
  "shift.opened": "Smena ochildi",
  "shift.closed": "Smena yopildi",
  "customer.created": "Xaridor qo‘shildi",
  "customer.updated": "Xaridor tahrirlandi",
  "store.updated": "Do‘kon sozlamalari o‘zgardi",
  "warehouse.created": "Ombor qo‘shildi",
  "register.created": "Kassa qo‘shildi",
  "report.exported": "Hisobot eksport qilindi",
}

const ACTION_GROUPS = [
  { value: "", label: "Barcha amallar" },
  { value: "auth.", label: "Kirish va chiqish" },
  { value: "product.", label: "Mahsulotlar" },
  { value: "sale.", label: "Sotuvlar" },
  { value: "inventory.", label: "Ombor" },
  { value: "user.", label: "Xodimlar" },
  { value: "role.", label: "Rollar" },
  { value: "cash.", label: "Kassa harakatlari" },
  { value: "shift.", label: "Smenalar" },
  { value: "report.", label: "Hisobotlar" },
]

const ENTITY_TYPES = ["Product", "Category", "Sale", "User", "Role", "Shift", "Customer", "Store", "Warehouse", "Register", "Report"]

const actionLabel = (code: string) => ACTION_LABELS[code] ?? code

function Meta({ data, label = "Ko‘rish" }: { data: unknown; label?: string }) {
  const empty = data == null || (typeof data === "object" && Object.keys(data as object).length === 0)
  if (empty) return <span className="text-muted-foreground">—</span>
  return (
    <Popover>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="max-md:h-10 max-md:shrink-0 max-md:border-border max-md:bg-muted/40 max-md:px-3" />}>
        <Braces /> {label}
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]" align="end">
        <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs whitespace-pre-wrap break-all">{JSON.stringify(data, null, 2)}</pre>
      </PopoverContent>
    </Popover>
  )
}

function AuditLog() {
  const { get, set } = useUrlState()
  const action = get("action")
  const entityType = get("entityType")
  const dateFrom = get("dateFrom")
  const dateTo = get("dateTo")
  const page = Number(get("page", "1")) || 1
  const [actionInput, setActionInput] = useState(action)

  const q = useQuery({
    queryKey: ["audit", { action, entityType, dateFrom, dateTo, page }],
    queryFn: () => api.get<Paginated<AuditRow>>("/audit", { action, entityType, dateFrom, dateTo, page, pageSize: 25 }),
  })

  const groupOptions = ACTION_GROUPS.some((g) => g.value === action) ? ACTION_GROUPS : [...ACTION_GROUPS, { value: action, label: action }]
  const reset = () => {
    setActionInput("")
    set({ action: "", entityType: "", dateFrom: "", dateTo: "", page: "" })
  }

  useEffect(() => {
    const v = actionInput.trim()
    if (v === action) return
    const t = setTimeout(() => set({ action: v, page: "" }), 400)
    return () => clearTimeout(t)
  }, [actionInput, action, set])

  const chips: FilterChip[] = []
  if (entityType) chips.push({ key: "entityType", label: `Obyekt: ${entityType}`, onRemove: () => set({ entityType: "", page: "" }) })
  if (dateFrom || dateTo) {
    const d = (v: string) => (v ? `${v.slice(8, 10)}.${v.slice(5, 7)}` : "…")
    chips.push({ key: "date", label: `Sana: ${d(dateFrom)}–${d(dateTo)}`, onRemove: () => set({ dateFrom: "", dateTo: "", page: "" }) })
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Audit jurnali" description="Tizimdagi muhim amallar tarixi. Yozuvlarni o‘zgartirib bo‘lmaydi." />

      <FilterBar
        search={<SearchInput aria-label="Amal prefiksi" placeholder="Amal kodi (masalan product.)" value={actionInput} onChange={setActionInput} />}
        activeCount={chips.length}
        chips={chips}
        onReset={reset}
      >
        <FilterField label="Amal turi">
          <NativeSelect
            value={action}
            onChange={(e) => {
              setActionInput(e.target.value)
              set({ action: e.target.value, page: "" })
            }}
            options={groupOptions}
          />
        </FilterField>
        <FilterField label="Obyekt turi">
          <NativeSelect
            value={entityType}
            onChange={(e) => set({ entityType: e.target.value, page: "" })}
            options={[{ value: "", label: "Barcha obyektlar" }, ...ENTITY_TYPES.map((t) => ({ value: t, label: t }))]}
          />
        </FilterField>
        <FilterField label="Sana" group>
          <DateRangeFields from={dateFrom} to={dateTo} onFrom={(v) => set({ dateFrom: v, page: "" })} onTo={(v) => set({ dateTo: v, page: "" })} />
        </FilterField>
      </FilterBar>

      {q.isLoading ? (
        <LoadingRows />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : !q.data?.items.length ? (
        <EmptyState title="Yozuv topilmadi" description="Filtrlarni o‘zgartirib ko‘ring." />
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {q.data.items.map((r) => (
              <div key={r.id} className="rounded-2xl border bg-card p-3">
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="shrink-0 whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
                  <span className="min-w-0 truncate">{r.actorName ?? "Tizim"}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{actionLabel(r.action)}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{r.action}</div>
                  </div>
                  <Meta data={r.metadata} label="Tafsilot" />
                </div>
              </div>
            ))}
          </div>
          <div className="hidden overflow-hidden rounded-2xl border bg-card md:block">
            <Table>
              <TableHeader className="bg-muted/50 [&_th]:h-10 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground">
                <TableRow>
                  <TableHead>Vaqt</TableHead>
                  <TableHead>Xodim</TableHead>
                  <TableHead>Amal</TableHead>
                  <TableHead className="hidden md:table-cell">Obyekt</TableHead>
                  <TableHead className="text-right">Tafsilot</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {q.data.items.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell>{r.actorName ?? <span className="text-muted-foreground">Tizim</span>}</TableCell>
                    <TableCell>
                      <div className="font-medium">{actionLabel(r.action)}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.action}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.entityType ?? "—"}
                      {r.entityId && <div className="max-w-40 truncate font-mono text-xs text-muted-foreground">{r.entityId}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Meta data={r.metadata} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <PaginationBar page={q.data.page} pages={q.data.pages} total={q.data.total} onPage={(p) => set({ page: p === 1 ? "" : p })} />
        </>
      )}
    </div>
  )
}

export default function AuditPage() {
  const { can } = useAuth()
  if (!can("audit.read")) return <NoAccess />
  return (
    <Suspense>
      <AuditLog />
    </Suspense>
  )
}
