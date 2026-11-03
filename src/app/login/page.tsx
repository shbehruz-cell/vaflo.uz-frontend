"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, ArrowBigUp, Eye, EyeOff, KeyRound, UserRound } from "lucide-react"
import { Logo } from "@/components/app/logo"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { homePath, useAuth } from "@/lib/auth"
import { isFinePointer } from "@/lib/pointer"

/** Oxirgi kiritilgan login (parol emas) — kassir har kuni qayta yozmasligi uchun. */
const LAST_LOGIN_KEY = "vaflo:last-login"

function readLastLogin() {
  try {
    return localStorage.getItem(LAST_LOGIN_KEY) ?? ""
  } catch {
    return ""
  }
}

export default function LoginPage() {
  const { login, status, user } = useAuth()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [show, setShow] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const loginRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (status === "authenticated" && user) router.replace(homePath(user))
  }, [status, user, router])

  // Saqlangan login sahifa yuklangach qo‘yiladi (serverda localStorage yo‘q).
  // Kompyuterda kursor darhol kerakli maydonda; telefonda klaviatura o‘zi ochilmasin.
  useEffect(() => {
    const saved = readLastLogin()
    if (saved && loginRef.current && !loginRef.current.value) loginRef.current.value = saved
    if (isFinePointer()) (saved ? passwordRef : loginRef).current?.focus()
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const loginValue = String(fd.get("login") ?? "").trim()
    const password = String(fd.get("password") ?? "")
    if (!loginValue || !password) {
      setError(!loginValue ? "Loginni kiriting" : "Parolni kiriting")
      ;(!loginValue ? loginRef : passwordRef).current?.focus()
      return
    }
    setError(null)
    setPending(true)
    try {
      const me = await login(loginValue, password)
      try {
        localStorage.setItem(LAST_LOGIN_KEY, loginValue)
      } catch {
        /* xususiy rejim — eslab qolinmaydi */
      }
      router.replace(homePath(me))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kirib bo‘lmadi. Qayta urinib ko‘ring.")
      passwordRef.current?.select()
    } finally {
      setPending(false)
    }
  }

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(e.getModifierState?.("CapsLock") ?? false)

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 shrink-0 items-center justify-between px-4 sm:px-6">
        <Logo />
        <ThemeToggle />
      </header>

      {/* Telefonda forma yuqoriroqda — ekran klaviaturasi uni yopmasin; kattaroq ekranda o‘rtada */}
      <main className="flex flex-1 justify-center px-4 pt-6 pb-10 sm:items-center sm:pt-0 sm:pb-24">
        <div className="w-full max-w-[400px]">
          <div className="rounded-2xl border bg-card p-6 sm:p-8">
            <h1 className="text-2xl font-semibold tracking-tight">Tizimga kirish</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">Do‘koningiz hisobiga login va parol bilan kiring.</p>

            {error && (
              <div role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={onSubmit} noValidate className="mt-6">
              <FieldGroup className="gap-5">
                <Field>
                  <FieldLabel htmlFor="login">Login</FieldLabel>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={loginRef}
                      id="login"
                      name="login"
                      placeholder="Email yoki telefon"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      required
                      className="h-11 rounded-xl pl-10"
                      onKeyDown={onKey}
                    />
                  </div>
                </Field>

                <Field data-invalid={!!error || undefined}>
                  <FieldLabel htmlFor="password">Parol</FieldLabel>
                  <div className="relative">
                    <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      ref={passwordRef}
                      id="password"
                      name="password"
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      enterKeyHint="go"
                      required
                      aria-invalid={!!error || undefined}
                      aria-describedby={capsLock ? "caps-hint" : undefined}
                      className="h-11 rounded-xl pr-11 pl-10"
                      onKeyDown={onKey}
                      onKeyUp={onKey}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-1 my-auto size-9 text-muted-foreground"
                      aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
                      aria-pressed={show}
                      onClick={() => setShow((s) => !s)}
                    >
                      {show ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
                  {capsLock && (
                    <p id="caps-hint" className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
                      <ArrowBigUp className="size-3.5" /> Caps Lock yoqilgan
                    </p>
                  )}
                </Field>

                <Button type="submit" className="mt-1 h-11 w-full rounded-xl text-base" disabled={pending}>
                  {pending ? (
                    <>
                      <Spinner /> Kirilmoqda…
                    </>
                  ) : (
                    "Kirish"
                  )}
                </Button>
              </FieldGroup>
            </form>
          </div>

          <p className="mt-5 px-2 text-center text-sm text-muted-foreground">
            Login yoki parolni unutgan bo‘lsangiz, do‘kon egasidan yangisini so‘rang.
          </p>
        </div>
      </main>
    </div>
  )
}
