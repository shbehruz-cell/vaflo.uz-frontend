"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { useQuery } from "@tanstack/react-query"
import { Check, ChevronRight, ListChecks, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"

const HIDE_KEY = "vaflo:onboarding-hidden"

const listeners = new Set<() => void>()
function subscribeHidden(cb: () => void) {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}
function readHidden() {
  try {
    return localStorage.getItem(HIDE_KEY) === "1"
  } catch {
    return false
  }
}

interface Step {
  key: string
  label: string
  href: string
  done: boolean
}

/** "Ishni boshlash" ro‘yxati: haqiqiy ma’lumotlardan hisoblanadi; hammasi bajarilsa yoki yashirilsa ko‘rinmaydi. */
export function OnboardingChecklist() {
  const { isOwner, can } = useAuth()
  const hidden = useSyncExternalStore(subscribeHidden, readHidden, () => true) // serverda yashirin — hydration xavfsiz

  const enabled = isOwner && !hidden
  const total = (path: string) => () => api.get<Paginated<unknown>>(path, { page: 1, pageSize: 1 }).then((r) => r.total)

  const store = useQuery({ queryKey: ["onboarding", "store"], queryFn: () => api.get<{ id: string }>("/stores/current"), enabled })
  const products = useQuery({ queryKey: ["onboarding", "products"], queryFn: total("/products"), enabled: enabled && can("products.read") })
  const registers = useQuery({ queryKey: ["onboarding", "registers"], queryFn: () => api.get<unknown[]>("/registers"), enabled })
  const users = useQuery({ queryKey: ["onboarding", "users"], queryFn: total("/users"), enabled: enabled && can("users.manage") })
  const shifts = useQuery({ queryKey: ["onboarding", "shifts"], queryFn: total("/shifts"), enabled: enabled && can("shifts.read.all") })
  const sales = useQuery({ queryKey: ["onboarding", "sales"], queryFn: total("/sales"), enabled: enabled && can("sales.read.all") })

  if (!enabled) return null

  const all = [store, products, registers, users, shifts, sales]
  const loading = all.some((q) => q.isLoading)
  const steps: Step[] = [
    { key: "store", label: "Do‘kon sozlamalari", href: "/owner/settings", done: !!store.data },
    { key: "products", label: "Mahsulot qo‘shish", href: "/inventory/products", done: (products.data ?? 0) > 0 },
    { key: "register", label: "Kassa qo‘shish", href: "/owner/settings", done: (registers.data?.length ?? 0) > 0 },
    { key: "staff", label: "Xodim qo‘shish", href: "/owner/users", done: (users.data ?? 0) > 1 },
    { key: "shift", label: "Smena ochish", href: "/shifts", done: (shifts.data ?? 0) > 0 },
    { key: "sale", label: "Birinchi sotuv", href: "/pos", done: (sales.data ?? 0) > 0 },
  ]
  const doneCount = steps.filter((s) => s.done).length
  if (!loading && (all.some((q) => q.isError) || doneCount === steps.length)) return null

  const hide = () => {
    try {
      localStorage.setItem(HIDE_KEY, "1")
    } catch {
      /* e’tiborsiz */
    }
    listeners.forEach((l) => l())
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="size-4 text-primary" /> Ishni boshlash
        </CardTitle>
        <Button variant="ghost" size="sm" className="-mr-2 h-7 text-xs text-muted-foreground" onClick={hide}>
          <X /> Yashirish
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <>
            <div>
              <div className="text-xs tabular-nums text-muted-foreground">
                {doneCount} / {steps.length} bajarildi
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={steps.length}
                aria-valuenow={doneCount}
              >
                <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
              </div>
            </div>
            <ul className="divide-y">
              {steps.map((s) => (
                <li key={s.key}>
                  <Link href={s.href} className="group flex min-h-11 items-center gap-3 rounded-md text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-full border",
                        s.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                      )}
                    >
                      {s.done && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", s.done && "text-muted-foreground line-through")}>{s.label}</span>
                    <ChevronRight className="size-4 text-muted-foreground opacity-60 transition-opacity md:opacity-0 md:group-hover:opacity-100" />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}
