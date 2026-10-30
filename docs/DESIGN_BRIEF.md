# VAFLO.UZ — dizayn sayqali brifi (frontend-design skill asosida)

Read this file and `docs/AGENT_BRIEF.md` (stack + shadcn/Base UI rules). Do not read the TZ, `AGENTS.md`, or other agents' folders. Do not install packages, change fonts, edit `src/app/globals.css`, `src/components/ui/*`, `src/lib/*`, or any backend file. Keep ALL behaviour, data fetching, permissions and API calls exactly as they are — this is a visual/copy polish pass only. At the end run `npx tsc --noEmit -p .` and `npx eslint <your files>`; fix your own errors. Do NOT run `npm run build`/`dev`.

## Subject, audience, job
Cashiers and shop owners in Uzbekistan. Cashier job: sell fast without mistakes. Owner job: see money and stock at a glance. Copy is Uzbek Latin (`‘` in o‘/g‘, `’` in ma’lumot), sentence case.

## Tokens (already set globally — just use the Tailwind tokens)
| Name | Value | Token |
|---|---|---|
| Siyoh (ink) | #17151F | `text-foreground` |
| Qog‘oz (paper) | #FFFFFF | `bg-card` |
| Tuman (mist) app background | #F5F4FA | `bg-background` |
| Binafsha (brand) | #5B10E6 | `bg-primary` / `text-primary` |
| Chuqur binafsha | #3E02CC | hover/pressed via `primary/90` |
| Kahrabo (warning) | amber | `bg-amber-500/15 text-amber-700 dark:text-amber-300` |
Font: Onest (global `font-sans`). One family; hierarchy through size/weight only. Money & quantities: `tabular-nums`, right-aligned in tables.

Type scale (use these, nothing in between): page title `text-2xl font-semibold tracking-tight`; section/card title `text-base font-semibold`; body `text-sm`; secondary `text-sm text-muted-foreground`; meta `text-xs text-muted-foreground`. Hero money numbers: `text-3xl`/`text-4xl font-bold tracking-tight tabular-nums`.

## Principles
1. **Quiet surfaces.** Paper (`bg-card`) on mist (`bg-background`), 1px `border`, **no drop shadows** (remove `shadow-*` you find, except dialogs/popovers which are handled by ui components). Radius hierarchy: page-level containers `rounded-2xl`, inner controls/rows `rounded-lg`. Don't give everything the same radius.
2. **Structure = information.** Borders, dividers, badges, numbering only when they encode something. No numbered markers unless it is a real sequence.
3. **One signature, one place:** the *kassa cheki* (receipt) look — ONLY on money moments (POS cart totals block, receipt dialog, sale detail totals). Use the global classes: `.receipt` (paper background + zig-zag bottom edge) and `<hr className="receipt-rule" />` (dashed rule). Everything else stays calm.
4. **Tables:** header row `bg-muted/50 text-xs font-medium text-muted-foreground` (sentence case, NOT uppercase), rows min-h 44px, first column `font-medium`, numbers right-aligned `tabular-nums`, actions column narrow at the end. Mobile: keep existing card fallbacks.
5. **Motion:** none on page load. Only user-triggered (open/expand/confirm). Remove decorative hover translate/scale effects on cards; keep color/border hover feedback.
6. **Copy:** actions say exactly what happens ("Mahsulot qo‘shish", "Smenani yopish"). Toast wording matches the button ("Saqlash" → "Saqlandi"). Empty states invite an action ("Hali mahsulot yo‘q" + "Mahsulot qo‘shish" button). Errors say what failed and what to do; never apologise.

## Avoid (generated-design tells)
- Meta strings joined with middle dots: `A · B · C` → use separate elements with spacing, or a short sentence.
- ALL-CAPS labels / tracked-out eyebrows above headings.
- Accenting one word in a heading with a different color/italic.
- `→` appended to links/buttons.
- Identical rounded cards for everything (e.g. 7 KPI cards in a grid) — group related numbers into one surface with dividers.
- Gradient washes as decoration (the only allowed gradient is the brand logo).
- Monospace for labels (monospace is fine for real codes: SKU, receipt no., barcode).

## Quality floor
Responsive to 360px (no horizontal page scroll), visible keyboard focus (don't remove `focus-visible` styles), dark mode via tokens only (no hardcoded `bg-white`, `text-gray-*`, `#hex` in classNames — except the amber warning pattern above), tap targets ≥ 40px on POS.

## Ownership
| Agent | Files |
|---|---|
| A — Owner analytics | `src/app/(app)/owner/dashboard/`, `src/app/(app)/reports/`, `src/components/reports/` |
| B — Kassa | `src/app/(app)/pos/`, `src/app/(app)/shifts/`, `src/components/pos/`, `src/components/shifts/` |
| C — Ombor va savdo | `src/app/(app)/inventory/`, `src/app/(app)/sales/`, `src/app/(app)/customers/`, `src/components/inventory/`, `src/components/sales/`, `src/components/customers/` |
| D — Boshqaruv va qobiq | `src/app/(app)/layout.tsx`, `src/components/app/`, `src/app/login/`, `src/app/(app)/account/`, `src/app/(app)/owner/users/`, `src/app/(app)/owner/settings/`, `src/app/(app)/audit/`, `src/components/owner/` |

Report back in ≤6 lines: what you changed visually, anything you deliberately left alone, and any issue you found outside your files (don't fix it).

## Mobile pass (iOS) — rules
- **List filters:** use `FilterBar` from `src/components/app/filter-bar.tsx` (props: `search`, `children` = filter controls, `activeCount`, `onReset`, `actions`). On mobile it shows only the search + a compact "Filtr" button; filters open in a bottom sheet. Desktop keeps the inline paper toolbar. Do not render your own toolbar wrapper around it. Compute `activeCount` from the URL filter values that differ from default; `onReset` clears them via `useUrlState().set({...: null, page: 1})`.
- **Dates:** use `DateRangeFields` from the same file (labelled "Dan"/"Gacha", iOS-safe). Never a bare `<input type="date">` without a visible label.
- **Preset chips / tabs** that don't fit 360px: one horizontal scrolling row (`scroll-row gap-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap`), items `shrink-0`; never wrap tabs into two lines.
- **Tables on mobile:** if a table has more than 3 meaningful columns, show a card list below `md` (`md:hidden` cards / `hidden md:block` table). Nothing may be cut off at 360px.
- **Page header actions on mobile:** icon-only or short labels (`<span className="hidden sm:inline">…</span>`), so the header stays one line.
- Tap targets ≥ 40px. No horizontal page scroll at 360px.
