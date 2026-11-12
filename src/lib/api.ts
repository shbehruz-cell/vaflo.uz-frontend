/**
 * Backend API client. Access token xotirada saqlanadi; refresh token httpOnly cookie'da
 * (Next rewrites orqali same-origin). 401 bo‘lsa bir marta refresh qilib so‘rov qayta yuboriladi.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message)
  }
}

let accessToken: string | null = null
let refreshing: Promise<string | null> | null = null
let onUnauthorized: (() => void) | null = null

export const setAccessToken = (t: string | null) => {
  accessToken = t
}
export const setUnauthorizedHandler = (fn: () => void) => {
  onUnauthorized = fn
}

/** Refresh vaqtinchalik muvaffaqiyatsiz (tarmoq uzildi, server band) — sessiya tugagan degani EMAS. */
export class RefreshUnavailableError extends Error {}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Access tokenni refresh cookie orqali yangilaydi.
 * - `string` — yangi token; `null` — sessiya haqiqatan yo‘q (server 401/403 qaytardi) → login kerak.
 * - Tarmoq xatosi / 5xx / 429 → qayta urinadi (iOS Safari sahifa yangilanganda yoki ilovaga qaytganda
 *   so‘rovlarni uzib yuboradi); baribir bo‘lmasa `RefreshUnavailableError` — foydalanuvchi chiqarib yuborilmaydi.
 */
export async function refreshAccessToken(): Promise<string | null> {
  refreshing ??= (async () => {
    const delays = [0, 600, 1500, 3000]
    for (const d of delays) {
      if (d) await sleep(d)
      try {
        const r = await fetch("/api/v1/auth/refresh", { method: "POST", credentials: "include", cache: "no-store" })
        if (r.ok) return ((await r.json()) as { accessToken: string }).accessToken
        if (r.status === 401 || r.status === 403) return null
      } catch {
        // tarmoq xatosi — qayta urinamiz
      }
    }
    throw new RefreshUnavailableError("Server bilan aloqa yo‘q")
  })()
    .then((t) => {
      accessToken = t
      return t
    })
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

type Query = Record<string, string | number | boolean | null | undefined>

export function toQuery(params?: Query) {
  if (!params) return ""
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `?${s}` : ""
}

async function request<T>(method: string, path: string, body?: unknown, retry = true, signal?: AbortSignal): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData
  const res = await fetch(`/api/v1${path}`, {
    method,
    credentials: "include",
    signal,
    headers: {
      // FormData bo‘lsa content-type ni brauzer o‘zi (boundary bilan) qo‘yadi
      ...(body !== undefined && !isForm && { "content-type": "application/json" }),
      ...(accessToken && { authorization: `Bearer ${accessToken}` }),
    },
    body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
  })

  if (res.status === 401 && retry && !path.startsWith("/auth/")) {
    let t: string | null
    try {
      t = await refreshAccessToken()
    } catch {
      // Aloqa vaqtincha yo‘q — sessiyani o‘chirmaymiz, so‘rov xatosi sifatida qaytaramiz
      throw new ApiError(0, "Server bilan aloqa yo‘q. Internetni tekshirib, qayta urinib ko‘ring")
    }
    if (t) return request<T>(method, path, body, false, signal)
    onUnauthorized?.()
  }

  const text = await res.text()
  // Nest `null` qaytarsa body bo‘sh keladi; React Query undefined ni qabul qilmagani uchun null.
  const data = text ? safeJson(text) : null
  if (!res.ok) {
    const msg = (data as { message?: string | string[] } | undefined)?.message
    throw new ApiError(res.status, Array.isArray(msg) ? msg.join(", ") : (msg ?? "So‘rovda xatolik"), data)
  }
  return data as T
}

function safeJson(text: string) {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

/** Fayl yuklab olish (masalan CSV eksport) — token bilan. */
export async function download(path: string, filename: string) {
  const go = () =>
    fetch(`/api/v1${path}`, { credentials: "include", headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {} })
  let res = await go()
  if (res.status === 401 && (await refreshAccessToken())) res = await go()
  if (!res.ok) throw new ApiError(res.status, "Faylni yuklab bo‘lmadi")
  const url = URL.createObjectURL(await res.blob())
  const a = Object.assign(document.createElement("a"), { href: url, download: filename })
  a.click()
  URL.revokeObjectURL(url)
}

export const api = {
  get: <T>(path: string, query?: Query) => request<T>("GET", path + toQuery(query)),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {}),
  delete: <T>(path: string) => request<T>("DELETE", path),
  /** multipart/form-data yuborish (rasm yuklash). */
  postForm: <T>(path: string, formData: FormData, signal?: AbortSignal) => request<T>("POST", path, formData, true, signal),
}

/** Backend `paginated()` javobi. */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  pages: number
}
