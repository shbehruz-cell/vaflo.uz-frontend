/** Pulni `12 500 so‘m` ko‘rinishida chiqaradi. Backend pulni string ("12500.00") qaytaradi. */
export function formatMoney(value: string | number | null | undefined, withCurrency = true) {
  const n = Number(value ?? 0)
  const s = new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(n)
    .replace(/ /g, " ")
  return withCurrency ? `${s} so‘m` : s
}

/** Miqdor (Decimal string) — ortiqcha nollarsiz. */
export function formatQty(value: string | number | null | undefined) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 3 }).format(Number(value ?? 0)).replace(/ /g, " ")
}

const dtf = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
})
const df = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: "numeric" })

export const formatDateTime = (iso: string | Date) => dtf.format(new Date(iso))
export const formatDate = (iso: string | Date) => df.format(new Date(iso))

export const UNIT_LABELS: Record<string, string> = { PIECE: "dona", KG: "kg", LITER: "litr", BOX: "quti", METER: "metr" }
export const PAYMENT_LABELS: Record<string, string> = { CASH: "Naqd", CARD: "Karta" }
export const SALE_STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Yakunlangan",
  PARTIALLY_REFUNDED: "Qisman qaytarilgan",
  REFUNDED: "Qaytarilgan",
  VOIDED: "Bekor qilingan",
}

const tashkentDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tashkent" })
const tashkentTime = new Intl.DateTimeFormat("ru-RU", { timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit" })
const MONTHS_UZ = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"]
const WEEKDAYS_UZ = ["yakshanba", "dushanba", "seshanba", "chorshanba", "payshanba", "juma", "shanba"]

/** Toshkent bo‘yicha kun kaliti: `YYYY-MM-DD`. */
export const dayKey = (iso: string | Date) => tashkentDay.format(new Date(iso))
/** Toshkent bo‘yicha vaqt: `14:35`. */
export const formatTime = (iso: string | Date) => tashkentTime.format(new Date(iso))

/** Kun sarlavhasi: "Bugun", "Kecha" yoki "29-oktabr, payshanba" (boshqa yil bo‘lsa yil bilan). */
export function formatDayLabel(key: string) {
  const today = dayKey(new Date())
  const yesterday = dayKey(new Date(Date.now() - 86400000))
  if (key === today) return "Bugun"
  if (key === yesterday) return "Kecha"
  const [y, m, d] = key.split("-").map(Number)
  const wd = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()
  const year = String(y) === today.slice(0, 4) ? "" : ` ${y}`
  return `${d}-${MONTHS_UZ[m - 1]}${year}, ${WEEKDAYS_UZ[wd]}`
}
