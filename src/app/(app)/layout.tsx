"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app/app-sidebar"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { Spinner } from "@/components/ui/spinner"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex print:hidden h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          {/* Desktopda tugma sidebar ichida; mobilda sidebar yon panel bo‘lgani uchun shu yerda */}
          <SidebarTrigger className="-ml-1 size-9 md:hidden" aria-label="Menyuni ochish" />
          <Separator orientation="vertical" className="h-5 md:hidden" />
          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>
        {/* Jadval sahifalari 1400px gacha; kassa ekrani to‘liq kenglikda */}
        <div className={cn("mx-auto flex w-full flex-1 flex-col gap-6 p-4 sm:p-6", !pathname.startsWith("/pos") && "max-w-[1400px]")}>{children}</div>
      </SidebarInset>
    </SidebarProvider>
  )
}
