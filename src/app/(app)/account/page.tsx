"use client"

import { useState } from "react"
import { toast } from "sonner"
import { PageHeader } from "@/components/app/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export default function AccountPage() {
  const { user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const newPassword = String(fd.get("newPassword"))
    if (newPassword !== String(fd.get("confirm"))) return setError("Yangi parollar mos emas")
    if (newPassword.length < 8) return setError("Yangi parol kamida 8 ta belgi bo‘lsin")
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
    <>
      <PageHeader title="Hisob" description={user ? `${user.name}, ${user.role.name}` : undefined} />
      <Card className="w-full max-w-md rounded-2xl shadow-none">
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
    </>
  )
}
