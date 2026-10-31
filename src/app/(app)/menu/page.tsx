"use client"

import Link from "next/link"
import { ChevronRight, KeyRound, LogOut, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Switch } from "@/components/ui/switch"
import { NAV } from "@/lib/nav"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

const row =
  "flex min-h-14 w-full items-center gap-3 px-4 text-left text-sm font-medium outline-none transition-colors active:bg-muted focus-visible:bg-muted"

function IconTile({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "muted" | "destructive" }) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-xl [&_svg]:size-[18px]",
        tone === "primary" && "bg-primary/10 text-primary",
        tone === "muted" && "bg-muted text-foreground",
        tone === "destructive" && "bg-destructive/10 text-destructive",
      )}
    >
      {children}
    </span>
  )
}

/** Mobil "Menyu" sahifasi: barcha bo‘limlar ro‘yxati, profil va sozlamalar (pastki tab bar’dagi "Menyu"). */
export default function MenuPage() {
  const { user, can, isOwner, logout } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()

  const groups = NAV.map((g) => ({
    ...g,
    items: g.items.filter((i) => (i.ownerOnly ? isOwner : i.permissions.length === 0 || can(...i.permissions))),
  })).filter((g) => g.items.length > 0)

  const initials = user?.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() ?? "?"

  return (
    <div className="mx-auto w-full max-w-xl space-y-5">
      <h1 className="text-2xl font-semibold tracking-tight">Menyu</h1>

      {/* Profil */}
      <section aria-label="Profil" className="flex items-center gap-3 rounded-2xl border bg-card p-4">
        <Avatar className="size-12 rounded-2xl">
          <AvatarFallback className="rounded-2xl bg-primary text-base font-semibold text-primary-foreground">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold">{user?.name}</div>
          <div className="truncate text-sm text-muted-foreground">{user?.login}</div>
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{user?.role.name}</span>
      </section>

      {/* Bo‘limlar */}
      {groups.map((g) => (
        <section key={g.label} aria-labelledby={`menu-${g.label}`}>
          <h2 id={`menu-${g.label}`} className="mb-2 px-1 text-sm font-medium text-muted-foreground">
            {g.label}
          </h2>
          <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
            {g.items.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className={row}>
                  <IconTile>
                    <item.icon />
                  </IconTile>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Sozlamalar va hisob */}
      <section aria-labelledby="menu-account">
        <h2 id="menu-account" className="mb-2 px-1 text-sm font-medium text-muted-foreground">
          Hisob
        </h2>
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card">
          <li>
            <label className={cn(row, "cursor-pointer")}>
              <IconTile tone="muted">
                <Moon />
              </IconTile>
              <span className="flex-1">Tungi rejim</span>
              <Switch checked={resolvedTheme === "dark"} onCheckedChange={(v) => setTheme(v ? "dark" : "light")} />
            </label>
          </li>
          <li>
            <Link href="/account" className={row}>
              <IconTile tone="muted">
                <KeyRound />
              </IconTile>
              <span className="flex-1">Parolni o‘zgartirish</span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
          <li>
            <button type="button" className={cn(row, "text-destructive")} onClick={() => void logout()}>
              <IconTile tone="destructive">
                <LogOut />
              </IconTile>
              Chiqish
            </button>
          </li>
        </ul>
      </section>
    </div>
  )
}
