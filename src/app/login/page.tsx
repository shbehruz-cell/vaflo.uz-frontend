"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { homePath, useAuth } from "@/lib/auth"

export default function LoginPage() {
  const { login, status, user } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(homePath(user))
  }, [status, user, router])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setError(null)
    setPending(true)
    try {
      const me = await login(String(fd.get("login")), String(fd.get("password")))
      router.replace(homePath(me))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirishda xatolik")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <ThemeToggle className="absolute top-4 right-4" />
      <Logo className="mb-8" />
      <Card className="w-full max-w-sm rounded-2xl shadow-none ring-0 border">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">Tizimga kirish</CardTitle>
          <CardDescription>Login (email yoki telefon) va parolni kiriting.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} noValidate>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="login">Login</FieldLabel>
                <Input id="login" name="login" autoComplete="username" required autoFocus className="h-10" />
              </Field>
              <Field data-invalid={!!error || undefined}>
                <FieldLabel htmlFor="password">Parol</FieldLabel>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={show ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    aria-invalid={!!error || undefined}
                    className="h-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 -translate-y-1/2"
                    aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                    onClick={() => setShow((s) => !s)}
                  >
                    {show ? <EyeOff /> : <Eye />}
                  </Button>
                </div>
                {error && <FieldError>{error}</FieldError>}
              </Field>
              <Button type="submit" className="h-10 w-full" disabled={pending}>
                {pending && <Spinner />} Kirish
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
