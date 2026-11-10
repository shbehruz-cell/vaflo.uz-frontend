"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { NAV } from "@/lib/nav"
import { useAuth } from "@/lib/auth"

/** Qo‘shimcha sahifalar (menyuda yo‘q) — eng uzun mos prefiks olinadi. */
const EXTRA: { href: string; label: string; group?: string }[] = [
  { href: "/account", label: "Hisobim" },
  { href: "/inventory/products/import", label: "CSV import", group: "Ombor" },
  { href: "/inventory/adjustments/new", label: "Qoldiqni tuzatish", group: "Ombor" },
]

/**
 * Desktop sarlavhasidagi yo‘l: Bo‘lim / Sahifa / Tafsilot.
 * Ma’lumot NAV dan olinadi, shuning uchun menyuga yangi sahifa qo‘shilsa avtomatik ishlaydi.
 */
export function AppBreadcrumb() {
  const pathname = usePathname()
  const { can, isOwner } = useAuth()

  const items = NAV.flatMap((g) => g.items.map((i) => ({ href: i.href, label: i.label, group: g.label as string | undefined })))
  const all = [...items, ...EXTRA]
  const match = all
    .filter((i) => pathname === i.href || pathname.startsWith(i.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]

  if (!match) return null
  const isDetail = pathname !== match.href
  const extraParent = EXTRA.includes(match as (typeof EXTRA)[number])
    ? items.find((i) => match.href.startsWith(i.href + "/"))
    : undefined

  const crumbs: { label: string; href?: string }[] = []
  if (match.group) {
    const first = NAV.find((g) => g.label === match.group)?.items.find((i) => (i.ownerOnly ? isOwner : i.permissions.length === 0 || can(...i.permissions)))
    crumbs.push({ label: match.group, href: first?.href })
  }
  if (extraParent) crumbs.push({ label: extraParent.label, href: extraParent.href })
  crumbs.push({ label: match.label, href: isDetail ? match.href : undefined })
  if (isDetail) crumbs.push({ label: "Tafsilot" })

  return (
    <nav aria-label="Joriy sahifa" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
      {crumbs.map((c, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={i} className="flex min-w-0 items-center gap-1">
            {i > 0 && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/60" aria-hidden />}
            {c.href && !last ? (
              <Link href={c.href} className="truncate rounded-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring">
                {c.label}
              </Link>
            ) : (
              <span className={last ? "truncate font-medium text-foreground" : "truncate text-muted-foreground"} aria-current={last ? "page" : undefined}>
                {c.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
