"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronsUpDown, KeyRound, LogOut } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Logo } from "@/components/app/logo"
import { NAV } from "@/lib/nav"
import { useAuth } from "@/lib/auth"

export function AppSidebar() {
  const pathname = usePathname()
  const { user, can, isOwner, logout } = useAuth()
  const { setOpenMobile } = useSidebar()

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.ownerOnly ? isOwner : i.permissions.length === 0 || can(...i.permissions))),
  })).filter((g) => g.items.length > 0)

  const initials = user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() ?? "?"

  return (
    <Sidebar collapsible="icon" className="print:hidden">
      <SidebarHeader>
        {/* Yig‘ilgan holatda logo belgisi va tugma ustma-ust turadi */}
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <Link
            href="/"
            aria-label="VAFLO.UZ bosh sahifa"
            className="flex h-10 min-w-0 items-center rounded-md px-2 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
          >
            <Logo className="group-data-[collapsible=icon]:hidden" />
            <Logo compact className="hidden group-data-[collapsible=icon]:inline-flex [&_img]:h-5" />
          </Link>
          <SidebarTrigger
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Menyuni yig‘ish/yoyish"
            title="Menyuni yig‘ish/yoyish (Ctrl+B)"
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((g) => (
          <SidebarGroup key={g.label}>
            <SidebarGroupLabel className="normal-case tracking-normal text-sidebar-foreground/60">{g.label}</SidebarGroupLabel>
            <SidebarMenu>
              {g.items.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger render={<SidebarMenuButton size="lg" className="data-popup-open:bg-sidebar-accent" />}>
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-primary/10 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <span className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user?.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{user?.role.name}</span>
                </span>
                <ChevronsUpDown className="ml-auto size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="min-w-56">
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="text-sm font-medium">{user?.name}</div>
                    <div className="text-xs text-muted-foreground">{user?.login}</div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/account" />}>
                  <KeyRound /> Parolni o‘zgartirish
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => void logout()}>
                  <LogOut /> Chiqish
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
