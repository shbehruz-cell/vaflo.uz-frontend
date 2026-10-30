export interface SaleListRow {
  id: string
  receiptNo: string
  createdAt: string
  cashierName: string | null
  customerName: string | null
  total: string
  refundedTotal: string
  status: string
  itemCount: number
  payments: { method: string; amount: string }[]
}

export interface SaleItemRow {
  id: string
  nameSnapshot: string
  skuSnapshot: string | null
  qty: string
  refundedQty: string
  unitPrice: string
  discount: string
  lineTotal: string
}

export interface RefundRow {
  id: string
  reason: string
  disposition: "RESTOCK" | "WRITE_OFF"
  method: string
  amount: string
  createdAt: string
  actorName: string | null
  items: { id: string; saleItemId: string; qty: string; amount: string; nameSnapshot: string | null }[]
}

export interface SaleDetail {
  id: string
  receiptNo: string
  status: string
  createdAt: string
  storeName: string | null
  register: { name: string; code: string } | null
  cashierName: string | null
  customerId: string | null
  customerName: string | null
  subtotal: string
  discountTotal: string
  total: string
  refundedTotal: string
  voidReason: string | null
  voidedAt: string | null
  voidedByName: string | null
  items: SaleItemRow[]
  payments: {
    id: string
    method: string
    amount: string
    tendered: string | null
    change: string | null
    cardType?: string | null
    externalReference?: string | null
  }[]
  refunds: RefundRow[]
}
