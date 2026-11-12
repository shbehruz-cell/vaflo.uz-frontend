"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ApiError, api, refreshAccessToken, RefreshUnavailableError, setAccessToken, setUnauthorizedHandler } from "@/lib/api"

export type PermissionCode =
  | "products.read" | "products.manage" | "inventory.read" | "inventory.adjust"
  | "sales.create" | "sales.read.all" | "sales.read.own" | "sales.refund" | "sales.void"
  | "pricing.change" | "discount.apply" | "discount.override" | "costs.read"
  | "reports.read" | "reports.profit.read" | "customers.read" | "customers.manage"
  | "shifts.manage" | "shifts.read.all" | "registers.manage" | "users.manage" | "roles.manage"
  | "audit.read" | "demo_requests.read"

export interface Me {
  id: string
  name: string
  login: string
  role: { key: string; name: string }
  storeId: string
  twoFactorEnabled?: boolean
  permissions: PermissionCode[]
}

/** Login natijasi: to‘g‘ridan-to‘g‘ri kirdi yoki emailga kelgan kod kerak (2 bosqichli kirish). */
export type LoginResult =
  | { twoFactorRequired: false; user: Me }
  | { twoFactorRequired: true; challengeId: string; email: string }

interface AuthState {
  user: Me | null
  status: "loading" | "authenticated" | "anonymous"
  login: (login: string, password: string) => Promise<LoginResult>
  completeTwoFactor: (challengeId: string, code: string) => Promise<Me>
  /** Email tasdiqlangach do‘kon va Owner hisobini yaratadi hamda darhol kiritadi. */
  completeSignup: (signupToken: string, data: { name: string; storeName: string; password: string }) => Promise<Me>
  /** Profilni qayta o‘qiydi (masalan 2 bosqichli kirish yoqilgach). */
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
  /** Ro‘yxatdagi permissionlardan KAMIDA BITTASI bo‘lsa true. */
  can: (...codes: PermissionCode[]) => boolean
  isOwner: boolean
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthState["status"]>("loading")

  const reset = useCallback(() => {
    setAccessToken(null)
    setUser(null)
    setStatus("anonymous")
    qc.clear()
  }, [qc])

  useEffect(() => {
    setUnauthorizedHandler(reset)
    // Sahifa yangilanganda sessiyani refresh cookie orqali tiklash
    // Faqat server "sessiya yo‘q" desa (null) login sahifasiga yuboriladi. Aloqa vaqtincha bo‘lmasa
    // (iOS Safari so‘rovni uzgan, internet sekin) — internet qaytganda yoki sahifaga qaytilganda qayta urinadi.
    let cancelled = false
    const restore = async () => {
      try {
        const t = await refreshAccessToken()
        if (cancelled) return
        if (!t) return reset()
        const me = await api.get<Me>("/auth/me")
        if (cancelled) return
        setUser(me)
        setStatus("authenticated")
        detach()
      } catch (e) {
        if (cancelled) return
        if (e instanceof RefreshUnavailableError || (e instanceof ApiError && e.status === 0)) return // kutamiz
        reset()
      }
    }
    const onWake = () => {
      if (document.visibilityState === "visible") void restore()
    }
    const detach = () => {
      window.removeEventListener("online", onWake)
      document.removeEventListener("visibilitychange", onWake)
    }
    window.addEventListener("online", onWake)
    document.addEventListener("visibilitychange", onWake)
    void restore()
    return () => {
      cancelled = true
      detach()
    }
  }, [reset])

  const login = useCallback(async (login: string, password: string): Promise<LoginResult> => {
    const res = await api.post<{ accessToken?: string; user?: Me; twoFactorRequired?: boolean; challengeId?: string; email?: string }>("/auth/login", { login, password })
    if (res.twoFactorRequired && res.challengeId) return { twoFactorRequired: true, challengeId: res.challengeId, email: res.email ?? "" }
    setAccessToken(res.accessToken ?? null)
    setUser(res.user ?? null)
    setStatus("authenticated")
    return { twoFactorRequired: false, user: res.user as Me }
  }, [])

  const completeTwoFactor = useCallback(async (challengeId: string, code: string) => {
    const res = await api.post<{ accessToken: string; user: Me }>("/auth/2fa/verify", { challengeId, code })
    setAccessToken(res.accessToken)
    setUser(res.user)
    setStatus("authenticated")
    return res.user
  }, [])

  const completeSignup = useCallback(async (signupToken: string, data: { name: string; storeName: string; password: string }) => {
    const res = await api.post<{ accessToken: string; user: Me }>("/auth/signup/complete", { signupToken, ...data })
    setAccessToken(res.accessToken)
    setUser(res.user)
    setStatus("authenticated")
    return res.user
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await api.get<Me>("/auth/me"))
  }, [])

  const logout = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined)
    reset()
  }, [reset])

  const value = useMemo<AuthState>(() => {
    const perms = new Set(user?.permissions ?? [])
    return {
      user,
      status,
      login,
      completeTwoFactor,
      completeSignup,
      refreshUser,
      logout,
      can: (...codes) => codes.some((c) => perms.has(c)),
      isOwner: user?.role.key === "owner",
    }
  }, [user, status, login, completeTwoFactor, completeSignup, refreshUser, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth AuthProvider ichida ishlatilishi kerak")
  return ctx
}

/** Foydalanuvchi roli bo‘yicha birinchi ochiladigan sahifa. */
export function homePath(user: Me) {
  const p = new Set(user.permissions)
  if (p.has("reports.read")) return "/owner/dashboard"
  if (p.has("sales.create")) return "/pos"
  if (p.has("products.read")) return "/inventory/products"
  return "/sales"
}
