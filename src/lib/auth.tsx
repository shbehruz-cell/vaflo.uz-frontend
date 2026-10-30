"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { api, refreshAccessToken, setAccessToken, setUnauthorizedHandler } from "@/lib/api"

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
  permissions: PermissionCode[]
}

interface AuthState {
  user: Me | null
  status: "loading" | "authenticated" | "anonymous"
  login: (login: string, password: string) => Promise<Me>
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
    refreshAccessToken()
      .then(async (t) => {
        if (!t) return reset()
        setUser(await api.get<Me>("/auth/me"))
        setStatus("authenticated")
      })
      .catch(reset)
  }, [reset])

  const login = useCallback(async (login: string, password: string) => {
    const res = await api.post<{ accessToken: string; user: Me }>("/auth/login", { login, password })
    setAccessToken(res.accessToken)
    setUser(res.user)
    setStatus("authenticated")
    return res.user
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
      logout,
      can: (...codes) => codes.some((c) => perms.has(c)),
      isOwner: user?.role.key === "owner",
    }
  }, [user, status, login, logout])

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
