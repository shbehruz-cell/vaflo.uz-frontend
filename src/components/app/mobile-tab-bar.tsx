"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, LayoutDashboard, Menu, Receipt, ScanBarcode, type LucideIcon } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { useAuth, type PermissionCode } from "@/lib/auth"
import { cn } from "@/lib/utils"

const TABS: { href: string; label: string; icon: LucideIcon; permissions: PermissionCode[] }[] = [
  { href: "/owner/dashboard", label: "Asosiy", icon: LayoutDashboard, permissions: ["reports.read"] },
  { href: "/sales", label: "Sotuvlar", icon: Receipt, permissions: ["sales.read.all", "sales.read.own"] },
  { href: "/inventory/products", label: "Mahsulotlar", icon: Boxes, permissions: ["products.read"] },
]

/** Mobil pastki navigatsiya (telefon ilovalaridagidek): asosiy bo‘limlar, o‘rtada Kassa, oxirida to‘liq menyu. */
export function MobileTabBar() {
  const pathname = usePathname()
  const { can } = useAuth()
  const { setOpenMobile } = useSidebar()

  const tabs = TABS.filter((t) => can(...t.permissions))
  const pos = can("sales.create")
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")

  const tab = (t: (typeof TABS)[number]) => {
    const active = isActive(t.href)
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "text-primary" : "text-muted-foreground",
        )}
      >
        <t.icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
        {t.label}
      </Link>
    )
  }

  // Kassa o‘rtada turishi uchun: chap tomonda ikkita bo‘lim, o‘ngda qolganlari + menyu
  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)

  return (
    <nav
      aria-label="Asosiy bo‘limlar"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-md items-end gap-1">
        {left.map(tab)}
        {pos && (
          <Link
            href="/pos"
            className="flex min-h-14 flex-1 flex-col items-center justify-end gap-1 pb-1.5 text-[11px] font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="-mt-5 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground ring-4 ring-background">
              <ScanBarcode className="size-5" />
            </span>
            Kassa
          </Link>
        )}
        {right.map(tab)}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu className="size-5" strokeWidth={1.75} />
          Menyu
        </button>
      </div>
    </nav>
  )
}
