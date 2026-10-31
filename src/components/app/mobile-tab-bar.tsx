"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Boxes, LayoutDashboard, LayoutGrid, Receipt, ScanBarcode, type LucideIcon } from "lucide-react"
import { useAuth, type PermissionCode } from "@/lib/auth"
import { cn } from "@/lib/utils"

const TABS: { href: string; label: string; icon: LucideIcon; permissions: PermissionCode[] }[] = [
  { href: "/owner/dashboard", label: "Asosiy", icon: LayoutDashboard, permissions: ["reports.read"] },
  { href: "/sales", label: "Sotuvlar", icon: Receipt, permissions: ["sales.read.all", "sales.read.own"] },
  { href: "/inventory/products", label: "Mahsulotlar", icon: Boxes, permissions: ["products.read"] },
]

/** Pastki tab bar balandligi (safe-area’siz). Kassa savat paneli shu qadar yuqorida turadi. */
export const TAB_BAR_HEIGHT = "4rem"

/** Mobil pastki navigatsiya (telefon ilovalaridagidek): asosiy bo‘limlar, o‘rtada Kassa, oxirida "Menyu" sahifasi. */
export function MobileTabBar() {
  const pathname = usePathname()
  const { can } = useAuth()

  const tabs = TABS.filter((t) => can(...t.permissions))
  const pos = can("sales.create")
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/")
  // Pastki panelda yo‘q bo‘limlar (xaridorlar, hisobotlar, sozlamalar...) "Menyu" ostida hisoblanadi
  const menuActive = !tabs.some((t) => isActive(t.href)) && !isActive("/pos")

  const item = (href: string, label: string, Icon: LucideIcon, active: boolean) => (
    <Link
      key={href}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
      <span className="max-w-full truncate">{label}</span>
    </Link>
  )

  // Kassa o‘rtada turishi uchun: chapda ikkita bo‘lim, o‘ngda qolganlari + menyu
  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)
  const posActive = isActive("/pos")

  return (
    <nav
      aria-label="Asosiy bo‘limlar"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden"
    >
      <div className="mx-auto flex max-w-md items-stretch gap-1" style={{ height: TAB_BAR_HEIGHT }}>
        {left.map((t) => item(t.href, t.label, t.icon, isActive(t.href)))}
        {pos && (
          <Link
            href="/pos"
            aria-current={posActive ? "page" : undefined}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-end gap-1 pb-2 text-[11px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring",
              posActive ? "text-primary" : "text-foreground",
            )}
          >
            <span className="-mt-5 flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground ring-4 ring-background">
              <ScanBarcode className="size-5" />
            </span>
            Kassa
          </Link>
        )}
        {right.map((t) => item(t.href, t.label, t.icon, isActive(t.href)))}
        {item("/menu", "Menyu", LayoutGrid, menuActive)}
      </div>
    </nav>
  )
}
