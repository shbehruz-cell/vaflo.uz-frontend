# VAFLO.UZ ichki ilova (frontend) — agent brief

Read ONLY this file, the shared frontend files below, and the backend controller/DTO files for YOUR endpoints (`../backend/src/<module>/*.controller.ts`, `*.dto.ts` or `dto/*.ts`, and the service file only to see the response shape). Do not read the TZ PDF, `AGENTS.md`, `.agents/`, or other agents' folders. Do not run `npm install`, `npm run dev`, or `npm run build`. At the end run `npx tsc --noEmit -p .` and `npx eslint <your files>` and fix issues in YOUR files only.

## Product & copy
VAFLO.UZ — POS + ombor + CRM for Uzbek retail shops. ALL UI text in **Uzbek Latin** with `‘` apostrophe (`do‘kon`, `qoldiq`, `o‘chirish`) and `’` in `ma’lumot`. Money from backend is a string like `"12500.00"` → show with `formatMoney()`; quantities with `formatQty()`; dates with `formatDateTime()`. Send money/qty to backend as strings (`"12500"`), never do float math for totals you submit — the server recomputes everything; client-side totals are display-only (`Number()` is OK for display).

## Design
Same look as the landing page: calm professional retail SaaS, violet `primary` (logo color), white/very light surfaces, soft borders, `rounded-xl`, no heavy gradients or animation. Dark mode works automatically through tokens — never hardcode colors like `bg-white`/`text-gray-500`; use `bg-background`, `bg-card`, `bg-muted`, `text-muted-foreground`, `text-primary`, `text-destructive`, `border`. Status colors: use `Badge` variants (`default`, `secondary`, `outline`, `destructive`); for "kam qoldi"/warning use `bg-amber-500/15 text-amber-700 dark:text-amber-300`. Numbers right-aligned with `tabular-nums`.
Responsive (TZ 6.2–6.3): desktop tables; on mobile hide minor columns (`hidden md:table-cell`) or render cards; forms single column on mobile; tap targets ≥ 40px. Must work at 360px width without horizontal page scroll (tables may scroll inside `Table`'s own container).

## shadcn/ui (Base UI flavour — NOT Radix)
Components in `src/components/ui/`: alert-dialog, avatar, badge, breadcrumb, button, calendar, card, chart (recharts), checkbox, command, dialog, dropdown-menu, empty, field, input-group, input, kbd, label, pagination, popover, scroll-area, select, separator, sheet, sidebar, skeleton, sonner, spinner, switch, table, tabs, textarea, toggle-group, toggle, tooltip. **Read a component file before using it.** Key differences from Radix:
- No `asChild`. Use the `render` prop: `<Button render={<Link href="/x" />} nativeButton={false}>…</Button>`, `<DialogTrigger render={<Button />}>Ochish</DialogTrigger>`.
- `Select`: Base UI API (`<Select value onValueChange items>` + `SelectTrigger/SelectValue/SelectContent/SelectItem`) — check `select.tsx`. A styled native `<select>` is acceptable for simple filters.
- Forms: use `Field`, `FieldLabel`, `FieldError`, `FieldGroup`, `FieldDescription` from `field.tsx` (see `src/app/login/page.tsx` as reference). Plain controlled state or FormData is fine; no react-hook-form installed.
- Toasts: `import { toast } from "sonner"`.

## Shared frontend code (already written — use, don't modify)
- `src/lib/api.ts` — `api.get<T>(path, query?)`, `api.post/patch/delete`, `download(path, filename)`, `ApiError { status, message }`, `Paginated<T> { items,total,page,pageSize,pages }`. Paths are relative to `/api/v1` (e.g. `api.get("/products", { q })`). Auth/refresh handled automatically.
- `src/lib/auth.tsx` — `useAuth()` → `{ user, can(...codes), isOwner, logout }`, `PermissionCode`. Hide buttons the user can't use (`can("products.manage")`), but always handle 403 too.
- `src/lib/format.ts` — `formatMoney`, `formatQty`, `formatDateTime`, `formatDate`, `UNIT_LABELS`, `PAYMENT_LABELS`, `SALE_STATUS_LABELS`.
- `src/components/app/page-header.tsx` — `<PageHeader title description actions />` at the top of every page.
- `src/components/app/states.tsx` — `LoadingRows`, `EmptyState`, `ErrorState({ error, onRetry })` (shows "Ruxsat yo‘q" for 403), `NoAccess`.
- `src/components/app/pagination-bar.tsx` — `<PaginationBar page pages total onPage />`.
- `src/hooks/use-url-state.ts` — `useUrlState()` → `{ get, set, all }`: keep list filters & page in the URL (TZ 9.1). Pages using it must wrap the content in `<Suspense>` (useSearchParams requirement).
- Data fetching: `@tanstack/react-query` (`useQuery`, `useMutation`, `useQueryClient().invalidateQueries`). Query keys like `["products", params]`. `@tanstack/react-table` is installed if you want it, but plain shadcn `Table` is fine.
- Layout: `src/app/(app)/layout.tsx` provides sidebar + header + auth guard. Your pages go in `src/app/(app)/<route>/page.tsx` and are `"use client"`. Do not add another header/sidebar. Do not export `metadata` from client pages.
- Required UI states for every data view: loading skeleton, empty state, error + retry, 403, success toast, and `AlertDialog` confirmation for dangerous actions (void, refund, archive, block).

## Ownership (write ONLY these paths)
| Agent | Routes / folders |
|---|---|
| A | `src/app/(app)/pos/`, `src/app/(app)/shifts/`, `src/components/pos/`, `src/components/shifts/` |
| B | `src/app/(app)/inventory/`, `src/components/inventory/` |
| C | `src/app/(app)/sales/`, `src/app/(app)/customers/`, `src/components/sales/`, `src/components/customers/` |
| D | `src/app/(app)/owner/`, `src/app/(app)/reports/`, `src/app/(app)/audit/`, `src/components/owner/`, `src/components/reports/` |
| Lead | everything else |

Backend runs at `/api/v1` with global prefix; all list endpoints return `Paginated<T>`. Error messages from the backend are already Uzbek — show `err.message` in toasts/forms.
