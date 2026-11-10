"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { UserRound } from "lucide-react"
import { AuthShell } from "@/components/auth/auth-shell"
import { FormAlert } from "@/components/auth/form-alert"
import { OtpInput, type OtpInputHandle } from "@/components/auth/otp-input"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
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

/** login: login+parol · code: 2 bosqichli kirish kodi · forgot/resetCode/newPassword: parolni tiklash */
type View = "login" | "code" | "forgot" | "resetCode" | "newPassword"

export default function LoginPage() {
  const { login, completeTwoFactor, status, user } = useAuth()
  const router = useRouter()
  const [view, setView] = useState<View>("login")
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [email, setEmail] = useState("")
  const [code, setCode] = useState("")
  const [challenge, setChallenge] = useState<{ id: string; masked?: string } | null>(null)
  const [resetToken, setResetToken] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)
  const loginRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<OtpInputHandle>(null)

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

  // "Kodni qayta yuborish" uchun sanagich
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function go(next: View) {
    setError(null)
    setCode("")
    setView(next)
  }

  async function guarded(job: () => Promise<void>) {
    setError(null)
    setPending(true)
    try {
      await job()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik. Qayta urinib ko‘ring.")
    } finally {
      setPending(false)
    }
  }

  function remember(loginValue: string) {
    try {
      localStorage.setItem(LAST_LOGIN_KEY, loginValue)
    } catch {
      /* xususiy rejim — eslab qolinmaydi */
    }
  }

  async function onLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const loginValue = String(fd.get("login") ?? "").trim()
    const password = String(fd.get("password") ?? "")
    if (!loginValue || !password) {
      setError(!loginValue ? "Loginni kiriting" : "Parolni kiriting")
      ;(!loginValue ? loginRef : passwordRef).current?.focus()
      return
    }
    setEmail(loginValue)
    setNotice(null)
    await guarded(async () => {
      try {
        const res = await login(loginValue, password)
        remember(loginValue)
        if (res.twoFactorRequired) {
          setChallenge({ id: res.challengeId, masked: res.email })
          setCooldown(45)
          go("code")
        } else router.replace(homePath(res.user))
      } catch (err) {
        passwordRef.current?.select()
        throw err
      }
    })
  }

  async function submitCode(value: string) {
    if (pending) return
    if (value.length !== 6 || !challenge) return setError("6 xonali kodni kiriting")
    await guarded(async () => {
      try {
        if (view === "code") {
          const me = await completeTwoFactor(challenge.id, value)
          router.replace(homePath(me))
        } else {
          const r = await api.post<{ resetToken: string }>("/auth/password/verify", { challengeId: challenge.id, code: value })
          setResetToken(r.resetToken)
          go("newPassword")
        }
      } catch (err) {
        otpRef.current?.clear()
        throw err
      }
    })
  }

  async function resend() {
    if (!challenge || cooldown > 0) return
    await guarded(async () => {
      const r = await api.post<{ retryAfter: number }>("/auth/code/resend", { challengeId: challenge.id })
      setCooldown(r.retryAfter)
      setNotice("Yangi kod yuborildi")
      setCode("")
      if (isFinePointer()) otpRef.current?.clear()
    })
  }

  async function onForgot(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim()
    if (!value.includes("@")) return setError("Email manzilni kiriting")
    setEmail(value)
    await guarded(async () => {
      const r = await api.post<{ challengeId: string; retryAfter: number }>("/auth/password/forgot", { login: value })
      setChallenge({ id: r.challengeId })
      setCooldown(r.retryAfter)
      setNotice(null)
      go("resetCode")
    })
  }

  async function onNewPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const pass = String(fd.get("newPassword") ?? "")
    if (pass.length < 8) return setError("Parol kamida 8 ta belgi bo‘lsin")
    if (pass !== String(fd.get("confirm") ?? "")) return setError("Parollar mos emas")
    if (!resetToken) return go("forgot")
    await guarded(async () => {
      await api.post("/auth/password/reset", { resetToken, newPassword: pass })
      setResetToken(null)
      setChallenge(null)
      setNotice("Parol yangilandi. Yangi parol bilan kiring.")
      go("login")
    })
  }

  const titles: Record<View, [string, string]> = {
    login: ["Tizimga kirish", "Do‘koningiz hisobiga login va parol bilan kiring."],
    code: ["Kodni kiriting", challenge?.masked ? `Tasdiqlash kodi ${challenge.masked} manziliga yuborildi.` : "Tasdiqlash kodi emailingizga yuborildi."],
    forgot: ["Parolni tiklash", "Hisobingizga ulangan email manzilni kiriting. Unga tasdiqlash kodi yuboramiz."],
    resetCode: ["Kodni kiriting", `Parolni tiklash kodi ${email} manziliga yuborildi (agar hisob mavjud bo‘lsa).`],
    newPassword: ["Yangi parol", "Hisobingiz uchun yangi parol tanlang."],
  }
  const [title, description] = titles[view]
  const codeView = view === "code" || view === "resetCode"

  const submitLabel = (idle: string, busy: string) =>
    pending ? (
      <>
        <Spinner /> {busy}
      </>
    ) : (
      idle
    )

  return (
    <AuthShell
      title={title}
      description={description}
      onBack={view === "login" ? undefined : () => go(view === "newPassword" || view === "resetCode" ? "forgot" : "login")}
      footer={
        view === "login" ? (
          <>
            Hisobingiz yo‘qmi?{" "}
            <Link href="/signup" className="font-medium text-primary underline-offset-4 hover:underline">
              Ro‘yxatdan o‘tish
            </Link>
          </>
        ) : undefined
      }
    >
      {notice && <FormAlert variant="notice">{notice}</FormAlert>}
      {error && <FormAlert>{error}</FormAlert>}

      {view === "login" && (
        <form onSubmit={onLogin} noValidate className="mt-6">
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
                />
              </div>
            </Field>

            <PasswordField
              ref={passwordRef}
              id="password"
              name="password"
              label="Parol"
              autoComplete="current-password"
              enterKeyHint="go"
              required
              invalid={!!error}
            />

            <Button type="submit" className="mt-1 h-11 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {submitLabel("Kirish", "Kirilmoqda…")}
            </Button>
            <button
              type="button"
              onClick={() => go("forgot")}
              className="-mt-2 min-h-11 text-center text-sm font-medium text-primary underline-offset-4 hover:underline pointer-fine:min-h-8"
            >
              Parolni unutdingizmi?
            </button>
          </FieldGroup>
        </form>
      )}

      {codeView && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void submitCode(code)
          }}
          noValidate
          className="mt-6"
        >
          <FieldGroup className="gap-5">
            <OtpInput
              ref={otpRef}
              value={code}
              onChange={setCode}
              onComplete={(v) => void submitCode(v)}
              disabled={pending}
              invalid={!!error}
              autoFocus={isFinePointer()}
            />
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={pending || code.length !== 6} aria-busy={pending}>
              {submitLabel("Tasdiqlash", "Tekshirilmoqda…")}
            </Button>
            <button
              type="button"
              disabled={cooldown > 0 || pending}
              onClick={resend}
              className="-mt-2 min-h-11 text-center text-sm text-muted-foreground underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:opacity-60 pointer-fine:min-h-8"
            >
              {cooldown > 0 ? `Kodni qayta yuborish: ${cooldown} s` : "Kodni qayta yuborish"}
            </button>
          </FieldGroup>
        </form>
      )}

      {view === "forgot" && (
        <form onSubmit={onForgot} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <Field>
              <FieldLabel htmlFor="email">Email manzil</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={email.includes("@") ? email : ""}
                autoComplete="email"
                autoCapitalize="none"
                spellCheck={false}
                autoFocus={isFinePointer()}
                className="h-11 rounded-xl"
              />
            </Field>
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {submitLabel("Kod yuborish", "Yuborilmoqda…")}
            </Button>
          </FieldGroup>
        </form>
      )}

      {view === "newPassword" && (
        <form onSubmit={onNewPassword} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <PasswordField id="newPassword" name="newPassword" label="Yangi parol" hint="Kamida 8 ta belgi" autoComplete="new-password" autoFocus={isFinePointer()} />
            <PasswordField id="confirm" name="confirm" label="Parolni takrorlang" autoComplete="new-password" />
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {submitLabel("Parolni saqlash", "Saqlanmoqda…")}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthShell>
  )
}
