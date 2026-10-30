export type Unit = "PIECE" | "KG" | "LITER" | "BOX" | "METER"

export interface PosProduct {
  id: string
  name: string
  sku?: string | null
  unit: Unit
  salePrice: string
  isActive: boolean
  qty?: string | null
  barcodes?: { id: string; value: string }[]
}

export interface Register {
  id: string
  name: string
  code: string
  warehouseId: string
  /** Bir vaqtda nechta kassir smena ocha oladi */
  maxCashiers: number
  openCount: number
  openShifts: { id: string; cashierId: string; cashierName: string | null; openedAt: string }[]
  /** Joriy foydalanuvchi shu kassada smena ocha oladimi (biriktirish va sig‘im bo‘yicha) */
  canOpen: boolean
  blockedReason: string | null
}

export interface CashMovement {
  id: string
  type: "CASH_IN" | "CASH_OUT"
  amount: string
  reason: string
  actorId: string
  createdAt: string
}

export interface ShiftSummary {
  cashSalesTotal: string
  cardSalesTotal: string
  cashRefundsTotal: string
  cardRefundsTotal: string
  cashIn: string
  cashOut: string
  saleCount: number
  voidedCount: number
  expectedCash: string
}

export interface ShiftDetail {
  id: string
  registerId: string
  cashierId: string
  cashierName: string | null
  status: "OPEN" | "CLOSED"
  openingCash: string
  expectedCash: string | null
  countedCash: string | null
  difference: string | null
  openedAt: string
  closedAt: string | null
  register: { name: string; code: string } | null
  summary: ShiftSummary
  cashMovements: CashMovement[]
}

export interface ShiftRow {
  id: string
  registerId: string
  cashierId: string
  cashierName: string | null
  status: "OPEN" | "CLOSED"
  openingCash: string
  expectedCash: string | null
  countedCash: string | null
  difference: string | null
  openedAt: string
  closedAt: string | null
}

export interface CartLine {
  product: PosProduct
  /** Foydalanuvchi kiritgan matn (tahrirlash vaqtida bo‘sh bo‘lishi mumkin). */
  qty: string
  /** Satr chegirmasi, so‘m (matn). */
  discount: string
}

export interface Receipt {
  id: string
  receiptNo: string
  createdAt: string
  storeName: string | null
  cashierName: string | null
  customerName: string | null
  register: { name: string; code: string } | null
  subtotal: string
  discountTotal: string
  total: string
  items: { id: string; nameSnapshot: string; qty: string; unitPrice: string; discount: string; lineTotal: string }[]
  payments: {
    id: string
    method: "CASH" | "CARD"
    amount: string
    tendered: string | null
    change: string | null
    cardType?: string | null
    externalReference?: string | null
  }[]
}

export const isIntegerUnit = (u: Unit) => u === "PIECE" || u === "BOX"

/** Matnni birlikka mos tozalaydi: butun sonlar yoki 3 xonagacha kasr. */
export function sanitizeQty(raw: string, unit: Unit) {
  let s = raw.replace(",", ".")
  if (isIntegerUnit(unit)) return s.replace(/\D/g, "")
  s = s.replace(/[^\d.]/g, "")
  const i = s.indexOf(".")
  if (i >= 0) s = s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, "").slice(0, 3)
  return s
}

/** Pul hisobi tiyinlarda (butun son) — faqat ko‘rsatish uchun. */
export const toTiyin = (v: string | number | null | undefined) => Math.round(Number(v || 0) * 100)
export const fromTiyin = (t: number) => (t / 100).toFixed(2)

export function lineMath(l: CartLine) {
  const qtyMilli = Math.round(Number(l.qty || 0) * 1000)
  const gross = Math.round((qtyMilli * toTiyin(l.product.salePrice)) / 1000)
  const discount = Math.min(toTiyin(l.discount), gross)
  return { gross, discount, total: gross - discount, qtyOk: qtyMilli > 0 }
}

export function cartMath(lines: CartLine[]) {
  let subtotal = 0
  let discount = 0
  let total = 0
  let valid = lines.length > 0
  for (const l of lines) {
    const m = lineMath(l)
    subtotal += m.gross
    discount += m.discount
    total += m.total
    if (!m.qtyOk) valid = false
  }
  return { subtotal, discount, total, valid }
}

/** Butun savatga bitta chegirma: so‘mda yoki foizda. */
export interface CartDiscount {
  mode: "amount" | "percent"
  value: string
}
export const NO_DISCOUNT: CartDiscount = { mode: "amount", value: "" }

/** Backenddagi limit (DISCOUNT_LIMIT_PERCENT): undan ortig‘i uchun `discount.override` kerak. */
export const DISCOUNT_LIMIT_PERCENT = 10

/** Umumiy chegirma summasi (tiyin), savat summasidan oshmaydi. */
export function cartDiscountTiyin(lines: CartLine[], d: CartDiscount) {
  const gross = lines.reduce((s, l) => s + lineMath({ ...l, discount: "" }).gross, 0)
  const raw = d.mode === "percent" ? Math.round((gross * Math.min(Number(d.value || 0), 100)) / 100) : toTiyin(d.value)
  return Math.max(0, Math.min(raw, gross))
}

/**
 * Umumiy chegirmani qatorlarga summasiga mutanosib taqsimlaydi (backend satr chegirmasini qabul qiladi).
 * Yaxlitlash qoldig‘i eng katta qatorlarga tiyinma-tiyin beriladi, shuning uchun yig‘indi aynan chegirmaga teng.
 */
export function applyCartDiscount(lines: CartLine[], d: CartDiscount): CartLine[] {
  const base = lines.map((l) => ({ ...l, discount: "" }))
  const total = cartDiscountTiyin(base, d)
  const grosses = base.map((l) => lineMath(l).gross)
  const sum = grosses.reduce((a, b) => a + b, 0)
  if (total <= 0 || sum <= 0) return base

  const share = grosses.map((g) => Math.floor((g * total) / sum))
  let rest = total - share.reduce((a, b) => a + b, 0)
  const order = grosses.map((g, i) => [g, i] as const).sort((a, b) => b[0] - a[0])
  for (let k = 0; rest > 0; k = (k + 1) % order.length) {
    const i = order[k][1]
    if (share[i] < grosses[i]) {
      share[i]++
      rest--
    }
  }
  return base.map((l, i) => ({ ...l, discount: share[i] ? fromTiyin(share[i]) : "" }))
}

/** UI uchun: tiyin -> so‘m formatlash uchun son. */
export const som = (tiyin: number) => tiyin / 100
