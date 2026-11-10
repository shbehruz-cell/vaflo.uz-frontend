"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"
import { AppBreadcrumb } from "@/components/app/app-breadcrumb"
import { AppSidebar } from "@/components/app/app-sidebar"
import { Logo } from "@/components/app/logo"
import { MobileTabBar } from "@/components/app/mobile-tab-bar"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

/** Mobil: pastki paneldagi bo‘limlar (ildiz sahifalar) — ularda logo, qolganlarida "orqaga" tugmasi. */
const TAB_ROOTS = ["/owner/dashboard", "/sales", "/inventory/products", "/pos", "/menu"]
const DETAIL_PARENTS: { prefix: string; label: string }[] = [
  { prefix: "/sales", label: "Sotuvlar" },
  { prefix: "/customers", label: "Xaridorlar" },
  { prefix: "/shifts", label: "Smenalar" },
]

function mobileBack(pathname: string): { href: string; label: string } | null {
  if (TAB_ROOTS.includes(pathname)) return null
  const parent = DETAIL_PARENTS.find((d) => pathname.startsWith(d.prefix + "/"))
  return parent ? { href: parent.prefix, label: parent.label } : { href: "/menu", label: "Menyu" }
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (status === "anonymous") router.replace("/login")
  }, [status, router])

  if (status !== "authenticated") {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    )
  }

  const isPos = pathname.startsWith("/pos")
  const back = mobileBack(pathname)

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset className="min-w-0">
        <header className="sticky top-0 z-30 flex print:hidden h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur sm:px-6">
          {/* Desktopda menyu — sidebar. Mobilda bo‘limlar pastki paneldan va /menu sahifasidan ochiladi */}
          {back ? (
            <Link
              href={back.href}
              className="-ml-2 flex h-10 items-center gap-0.5 rounded-md pr-2 text-sm font-medium text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
            >
              <ChevronLeft className="size-5" />
              {back.label}
            </Link>
          ) : (
            <Link href="/" aria-label="VAFLO.UZ bosh sahifa" className="flex h-10 items-center rounded-md md:hidden">
              <Logo />
            </Link>
          )}
          <AppBreadcrumb />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        {/* Jadval sahifalari 1400px gacha; kassa ekrani to‘liq kenglikda */}
        {/* Mobilda pastki tab bar uchun joy qoldiriladi */}
        <div className={cn("mx-auto flex w-full flex-1 flex-col gap-6 p-4 pb-28 sm:p-6 sm:pb-28 md:pb-6", !isPos && "max-w-[1400px]")}>{children}</div>
      </SidebarInset>
      <MobileTabBar />
    </SidebarProvider>
  )
}
