"use client"

import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Laptop, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { PageHeader } from "@/components/app/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { api } from "@/lib/api"
import { passwordHint } from "@/lib/password"
import { useAuth } from "@/lib/auth"

interface SessionItem {
  id: string
  current: boolean
  deviceName: string | null
  platform: string | null
  userAgent: string | null
  ip: string | null
  firstSeenAt: string
  lastActiveAt: string
}
interface SessionsResponse {
  canTerminateOthers: boolean
  terminateAvailableAt: string | null
  items: SessionItem[]
}

const dt = (iso: string) =>
  new Date(iso).toLocaleString("uz-UZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })

/** Qurilma nomi yo‘q bo‘lsa (veb sessiyalari) User-Agent'dan taxminiy nom yasaymiz. */
function deviceLabel(s: SessionItem) {
  if (s.deviceName) return { name: s.deviceName, system: s.platform ?? "", mobile: /iOS|Android|iPhone/i.test(`${s.platform} ${s.deviceName}`) }
  const ua = s.userAgent ?? ""
  const os = /iPhone|iPad/.test(ua) ? "iOS" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : ""
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ""
  return { name: [browser, os].filter(Boolean).join(" · ") || "Noma’lum qurilma", system: os, mobile: /iOS|Android/.test(os) }
}

function PasswordCard() {
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const newPassword = String(fd.get("newPassword"))
    if (newPassword !== String(fd.get("confirm"))) return setError("Yangi parollar mos emas")
    const pw = passwordHint(newPassword)
    if (pw) return setError(pw)
    setError(null)
    setPending(true)
    try {
      await api.post("/auth/change-password", { currentPassword: String(fd.get("currentPassword")), newPassword })
      form.reset()
      toast.success("Parol o‘zgartirildi. Boshqa qurilmalardagi sessiyalar yopildi.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik")
    } finally {
      setPending(false)
    }
  }

  return (
    <Card className="w-full rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Parolni o‘zgartirish</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="currentPassword">Joriy parol</FieldLabel>
              <Input id="currentPassword" className="h-10" name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="newPassword">Yangi parol</FieldLabel>
              <Input id="newPassword" className="h-10" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
            </Field>
            <Field data-invalid={!!error || undefined}>
              <FieldLabel htmlFor="confirm">Yangi parolni takrorlang</FieldLabel>
              <Input id="confirm" className="h-10" name="confirm" type="password" autoComplete="new-password" required />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <Button type="submit" disabled={pending} className="h-11 w-full sm:h-8 sm:w-fit">
              {pending && <Spinner />} Saqlash
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

/** 2 bosqichli kirish: yoqish/o‘chirish parol bilan tasdiqlanadi. Parol kiritilmasa holat o‘zgarmaydi. */
function TwoFactorCard() {
  const { user, refreshUser } = useAuth()
  const [target, setTarget] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const enabled = !!user?.twoFactorEnabled
  const hasEmail = !!user?.login.includes("@")

  const m = useMutation({
    mutationFn: (password: string) => api.post("/auth/two-factor", { enabled: target, password }),
    onSuccess: async () => {
      await refreshUser()
      toast.success(target ? "2 bosqichli kirish yoqildi" : "2 bosqichli kirish o‘chirildi")
      setTarget(null)
    },
    onError: (err) => setError(err instanceof Error ? err.message : "Xatolik"),
  })

  return (
    <Card className="w-full rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">2 bosqichli kirish</CardTitle>
        <CardDescription>Har safar kirganda emailga 6 xonali kod yuboriladi.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm">
            <div className="font-medium">{enabled ? "Yoqilgan" : "O‘chirilgan"}</div>
            {!hasEmail && <div className="text-muted-foreground">Buning uchun login email bo‘lishi kerak.</div>}
          </div>
          {/* Boshqariladigan Switch: faqat parol tasdiqlangach holat o‘zgaradi */}
          <Switch
            checked={enabled}
            disabled={!hasEmail}
            aria-label="2 bosqichli kirish"
            onCheckedChange={(v) => {
              setError(null)
              setTarget(v)
            }}
          />
        </div>
      </CardContent>

      <Dialog open={target !== null} onOpenChange={(o) => !o && !m.isPending && setTarget(null)}>
        <DialogContent className="sm:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              const password = String(new FormData(e.currentTarget).get("password") ?? "")
              if (password) m.mutate(password)
            }}
          >
            <DialogHeader>
              <DialogTitle>{target ? "2 bosqichli kirishni yoqish" : "2 bosqichli kirishni o‘chirish"}</DialogTitle>
              <DialogDescription>Tasdiqlash uchun parolingizni kiriting.</DialogDescription>
            </DialogHeader>
            <Field data-invalid={!!error || undefined} className="my-4">
              <FieldLabel htmlFor="tf-password">Parol</FieldLabel>
              <Input id="tf-password" name="password" type="password" autoComplete="current-password" autoFocus className="h-10" />
              {error && <FieldError>{error}</FieldError>}
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={m.isPending} onClick={() => setTarget(null)}>
                Bekor qilish
              </Button>
              <Button type="submit" disabled={m.isPending}>
                {m.isPending && <Spinner />} Tasdiqlash
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

/** Faol sessiyalar: qurilma, tizim, IP, kirgan va oxirgi faollik vaqti; boshqa qurilmani chiqarib yuborish. */
function SessionsCard() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ["auth", "sessions"], queryFn: () => api.get<SessionsResponse>("/auth/sessions") })
  const refresh = () => qc.invalidateQueries({ queryKey: ["auth", "sessions"] })
  const revoke = useMutation({
    mutationFn: (id: string) => api.delete(`/auth/sessions/${id}`),
    onSuccess: () => {
      toast.success("Qurilmadan chiqarildi")
      return refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Xatolik"),
  })
  const revokeOthers = useMutation({
    mutationFn: () => api.post("/auth/sessions/revoke-others"),
    onSuccess: () => {
      toast.success("Boshqa barcha qurilmalardan chiqarildi")
      return refresh()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Xatolik"),
  })

  const data = q.data
  const others = data?.items.filter((s) => !s.current) ?? []

  return (
    <Card className="w-full rounded-2xl shadow-none">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Faol sessiyalar</CardTitle>
        <CardDescription>
          {!data
            ? "Hisobingizga kirilgan qurilmalar."
            : data.canTerminateOthers
              ? "Boshqa qurilmalarni chiqarib yuborishingiz mumkin."
              : `Boshqa qurilmalarni chiqarib yuborish bu yerga kirganingizdan 24 soat keyin mumkin bo‘ladi${data.terminateAvailableAt ? ` (${dt(data.terminateAvailableAt)})` : ""}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {q.isPending && <Spinner />}
        {q.isError && <p className="text-sm text-destructive">Sessiyalarni yuklab bo‘lmadi.</p>}
        {data?.items.map((s) => {
          const d = deviceLabel(s)
          const Icon = d.mobile ? Smartphone : Laptop
          return (
            <div key={s.id} className="flex items-start gap-3 rounded-xl border p-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 text-sm">
                <div className="flex flex-wrap items-center gap-2 font-medium">
                  {d.name}
                  {s.current && <Badge variant="secondary">Joriy qurilma</Badge>}
                </div>
                <div className="mt-1 grid gap-0.5 text-muted-foreground">
                  {d.system && <span>Tizim: {d.system}</span>}
                  <span>IP manzil: {s.ip ?? "—"}</span>
                  <span>Kirgan: {dt(s.firstSeenAt)}</span>
                  <span>Oxirgi faollik: {s.current ? "hozir" : dt(s.lastActiveAt)}</span>
                </div>
              </div>
              {!s.current && data.canTerminateOthers && (
                <Button variant="outline" size="sm" disabled={revoke.isPending} onClick={() => revoke.mutate(s.id)}>
                  Chiqarish
                </Button>
              )}
            </div>
          )
        })}
        {others.length > 0 && data?.canTerminateOthers && (
          <Button variant="destructive" size="sm" disabled={revokeOthers.isPending} onClick={() => revokeOthers.mutate()}>
            {revokeOthers.isPending && <Spinner />} Boshqa barcha qurilmalardan chiqarish
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

export default function AccountPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader title="Hisob" description={user ? `${user.name}, ${user.role.name}` : undefined} />
      <div className="grid w-full max-w-md gap-4 pb-6">
        <PasswordCard />
        <TwoFactorCard />
        <SessionsCard />
      </div>
    </>
  )
}
