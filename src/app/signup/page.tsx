"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, Store, UserRound } from "lucide-react"
import { toast } from "sonner"
import { AuthShell } from "@/components/auth/auth-shell"
import { FormAlert } from "@/components/auth/form-alert"
import { OtpInput, type OtpInputHandle } from "@/components/auth/otp-input"
import { PasswordField } from "@/components/auth/password-field"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { ApiError, api } from "@/lib/api"
import { homePath, useAuth } from "@/lib/auth"
import { isFinePointer } from "@/lib/pointer"

type Step = "email" | "code" | "details"

const STEP_NO: Record<Step, number> = { email: 1, code: 2, details: 3 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

type Errors = Partial<Record<"email" | "name" | "storeName" | "password" | "confirm", string>>

function busy(pending: boolean, idle: string, label: string) {
  return pending ? (
    <>
      <Spinner /> {label}
    </>
  ) : (
    idle
  )
}

export default function SignupPage() {
  const { completeSignup, status, user } = useAuth()
  const router = useRouter()
  const [step, setStep] = useState<Step>("email")
  const [email, setEmail] = useState("")
  const [challengeId, setChallengeId] = useState<string | null>(null)
  // Token faqat komponent xotirasida: sahifa yangilansa yo‘qoladi (saqlanmaydi)
  const [signupToken, setSignupToken] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [cooldown, setCooldown] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<{ message: string; status?: number } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [errors, setErrors] = useState<Errors>({})
  const [done, setDone] = useState(false)

  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const storeRef = useRef<HTMLInputElement>(null)
  const passRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLInputElement>(null)
  const otpRef = useRef<OtpInputHandle>(null)

  // Allaqachon kirgan foydalanuvchi bu sahifada kerak emas (yangi hisob yaratilgach ham shu yo‘naltiradi)
  useEffect(() => {
    if (status === "authenticated" && user && !done) router.replace(homePath(user))
  }, [status, user, done, router])

  // Birinchi bosqichda kompyuterda kursor email maydonida; telefonda klaviatura o‘zi ochilmasin
  useEffect(() => {
    if (isFinePointer()) emailRef.current?.focus()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function go(next: Step) {
    setError(null)
    setErrors({})
    setNotice(null)
    setStep(next)
    if (isFinePointer()) {
      const target = { email: emailRef, code: otpRef, details: nameRef }[next]
      setTimeout(() => target.current?.focus(), 60)
    }
  }

  async function guarded(job: () => Promise<void>) {
    setError(null)
    setPending(true)
    try {
      await job()
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Xatolik. Qayta urinib ko‘ring.",
        status: err instanceof ApiError ? err.status : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!EMAIL_RE.test(value)) {
      setErrors({ email: value ? "Email manzilni to‘g‘ri kiriting" : "Email manzilni kiriting" })
      return emailRef.current?.focus()
    }
    setErrors({})
    await guarded(async () => {
      const r = await api.post<{ challengeId: string; retryAfter: number }>("/auth/signup/start", { email: value })
      setEmail(value)
      setChallengeId(r.challengeId)
      setCooldown(r.retryAfter)
      setCode("")
      go("code")
    })
  }

  async function submitCode(value: string) {
    if (pending || !challengeId) return
    if (value.length !== 6) return setError({ message: "6 xonali kodni kiriting" })
    await guarded(async () => {
      try {
        const r = await api.post<{ signupToken: string }>("/auth/signup/verify", { challengeId, code: value })
        setSignupToken(r.signupToken)
        go("details")
      } catch (err) {
        otpRef.current?.clear()
        throw err
      }
    })
  }

  async function resend() {
    if (!challengeId || cooldown > 0) return
    await guarded(async () => {
      const r = await api.post<{ retryAfter: number }>("/auth/code/resend", { challengeId })
      setCooldown(r.retryAfter)
      setNotice("Yangi kod yuborildi")
      setCode("")
      if (isFinePointer()) otpRef.current?.clear()
    })
  }

  async function onDetails(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const name = String(fd.get("name") ?? "").trim()
    const storeName = String(fd.get("storeName") ?? "").trim()
    const password = String(fd.get("password") ?? "")
    const confirm = String(fd.get("confirm") ?? "")

    const next: Errors = {}
    if (name.length < 2) next.name = "Ismingizni kiriting (kamida 2 ta belgi)"
    if (storeName.length < 2) next.storeName = "Do‘kon nomini kiriting (kamida 2 ta belgi)"
    if (password.length < 8) next.password = "Parol kamida 8 ta belgi bo‘lsin"
    else if (password.toLowerCase() === email) next.password = "Parol email manzilingiz bilan bir xil bo‘lmasin"
    if (!next.password && password !== confirm) next.confirm = "Parollar mos emas"
    setErrors(next)
    const firstBad = (["name", "storeName", "password", "confirm"] as const).find((k) => next[k])
    if (firstBad) return { name: nameRef, storeName: storeRef, password: passRef, confirm: confirmRef }[firstBad].current?.focus()
    if (!signupToken) {
      setError({ message: "Tasdiqlash muddati tugadi. Emailni qaytadan tasdiqlang." })
      return
    }

    await guarded(async () => {
      const me = await completeSignup(signupToken, { name, storeName, password })
      setSignupToken(null)
      setDone(true)
      toast.success("Do‘koningiz tayyor")
      router.replace(homePath(me))
    })
  }

  const titles: Record<Step, [string, React.ReactNode]> = {
    email: ["Ro‘yxatdan o‘tish", "Do‘koningiz hisobini yarating. Avval emailingizni tasdiqlaymiz."],
    code: [
      "Kodni kiriting",
      <>
        Kod <span className="font-semibold break-all text-foreground">{email}</span> manziliga yuborildi.
      </>,
    ],
    details: ["Do‘koningizni sozlang", "Oxirgi qadam: ism, do‘kon nomi va parol."],
  }
  const [title, description] = titles[step]

  return (
    <AuthShell
      title={title}
      description={description}
      steps={{ current: STEP_NO[step], total: 3 }}
      onBack={step === "email" ? undefined : () => go("email")}
      footer={
        <>
          Hisobingiz bormi?{" "}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Kirish
          </Link>
        </>
      }
    >
      {notice && <FormAlert variant="notice">{notice}</FormAlert>}
      {error && (
        <FormAlert>
          {error.message}
          {error.status === 409 && (
            <>
              {" "}
              <Link href="/login" className="font-medium underline underline-offset-4">
                Kirish
              </Link>
            </>
          )}
        </FormAlert>
      )}

      {step === "email" && (
        <form onSubmit={onEmail} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.email || undefined}>
              <FieldLabel htmlFor="email">Email manzil</FieldLabel>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={emailRef}
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="siz@pochta.uz"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  enterKeyHint="go"
                  aria-invalid={!!errors.email || undefined}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-destructive">
                  {errors.email}
                </p>
              )}
            </Field>
            <Button type="submit" className="h-11 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {busy(pending, "Kod yuborish", "Yuborilmoqda…")}
            </Button>
          </FieldGroup>
        </form>
      )}

      {step === "code" && (
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
              {busy(pending, "Tasdiqlash", "Tekshirilmoqda…")}
            </Button>
            <div className="-mt-2 flex flex-wrap items-center justify-between gap-x-4 text-sm text-muted-foreground">
              <button
                type="button"
                disabled={cooldown > 0 || pending}
                onClick={resend}
                className="min-h-11 underline-offset-4 enabled:hover:text-foreground enabled:hover:underline disabled:opacity-60 pointer-fine:min-h-8"
              >
                {cooldown > 0 ? `Qayta yuborish: ${cooldown} s` : "Qayta yuborish"}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => go("email")}
                className="min-h-11 font-medium text-primary underline-offset-4 hover:underline pointer-fine:min-h-8"
              >
                Emailni o‘zgartirish
              </button>
            </div>
          </FieldGroup>
        </form>
      )}

      {step === "details" && (
        <form onSubmit={onDetails} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="name">Ismingiz</FieldLabel>
              <div className="relative">
                <UserRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={nameRef}
                  id="name"
                  name="name"
                  autoComplete="name"
                  maxLength={80}
                  aria-invalid={!!errors.name || undefined}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
              {errors.name && (
                <p id="name-error" className="text-xs text-destructive">
                  {errors.name}
                </p>
              )}
            </Field>
            <Field data-invalid={!!errors.storeName || undefined}>
              <FieldLabel htmlFor="storeName">Do‘kon nomi</FieldLabel>
              <div className="relative">
                <Store className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={storeRef}
                  id="storeName"
                  name="storeName"
                  autoComplete="organization"
                  maxLength={80}
                  aria-invalid={!!errors.storeName || undefined}
                  aria-describedby={errors.storeName ? "storeName-error" : undefined}
                  className="h-11 rounded-xl pl-10"
                />
              </div>
              {errors.storeName && (
                <p id="storeName-error" className="text-xs text-destructive">
                  {errors.storeName}
                </p>
              )}
            </Field>
            <PasswordField ref={passRef} id="password" name="password" label="Parol" hint="Kamida 8 ta belgi" autoComplete="new-password" error={errors.password} />
            <PasswordField ref={confirmRef} id="confirm" name="confirm" label="Parolni takrorlang" autoComplete="new-password" enterKeyHint="go" error={errors.confirm} />
            <Button type="submit" className="mt-1 h-11 w-full rounded-xl text-base" disabled={pending} aria-busy={pending}>
              {busy(pending, "Do‘konni yaratish", "Yaratilmoqda…")}
            </Button>
          </FieldGroup>
        </form>
      )}
    </AuthShell>
  )
}
