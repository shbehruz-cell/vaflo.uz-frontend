export interface Summary {
  period: { preset: string; timezone: string; from: string; to: string }
  grossSales: string
  refunds: string
  netRevenue: string
  receiptCount: number
  averageReceipt: string
  grossProfit?: string
  inventoryValue?: string
  profitNote?: string
  methodology: Record<string, string | undefined>
}
export interface SalesByDay {
  timezone: string
  series: { date: string; gross: string; receipts: number; refunds: string }[]
}
export interface TopProduct {
  productId: string
  name: string
  category: string | null
  qty: string
  refundedQty: string
  revenue: string
}
export interface TopProducts {
  byQty: TopProduct[]
  byRevenue: TopProduct[]
}
export interface CashierRow {
  cashierId: string
  name: string | null
  grossSales: string
  receiptCount: number
  refundedTotal: string
  averageReceipt: string
}
export interface LowStockItem {
  id: string
  name: string
  sku: string | null
  unit: string
  qty: string
  minStock: string
  category: string | null
}
export interface LowStock {
  warehouse: { id: string; name: string }
  items: LowStockItem[]
}
