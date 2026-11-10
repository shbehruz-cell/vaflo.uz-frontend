"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { formatMoney } from "@/lib/format"
import type { SalesByDay } from "./types"

const config = {
  gross: { label: "Yalpi sotuv", color: "var(--chart-1)" },
  refunds: { label: "Qaytarishlar", color: "var(--chart-2)" },
} satisfies ChartConfig

const receiptsConfig = { receipts: { label: "Cheklar", color: "var(--chart-1)" } } satisfies ChartConfig

const short = (v: number) => (v >= 1e6 ? `${+(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}k` : String(v))

export function SalesChart({ data, className, metric = "revenue" }: { data: SalesByDay["series"]; className?: string; metric?: "revenue" | "receipts" }) {
  const rows = data.map((d) => ({ date: d.date, gross: Number(d.gross), refunds: Number(d.refunds), receipts: d.receipts }))
  if (metric === "receipts") {
    return (
      <ChartContainer config={receiptsConfig} className={className ?? "aspect-auto h-64 w-full"}>
        <BarChart data={rows} margin={{ left: 0, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => v.slice(5).replace("-", ".")} minTickGap={16} />
          <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <ChartTooltip content={<ChartTooltipContent formatter={(value) => `Cheklar: ${value}`} />} />
          <Bar dataKey="receipts" fill="var(--color-receipts)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ChartContainer>
    )
  }
  return (
    <ChartContainer config={config} className={className ?? "aspect-auto h-64 w-full"}>
      <BarChart data={rows} margin={{ left: 0, right: 8 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v: string) => v.slice(5).replace("-", ".")} minTickGap={16} />
        <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={short} />
        <ChartTooltip
          content={<ChartTooltipContent formatter={(value, name) => `${config[name as keyof typeof config]?.label ?? name}: ${formatMoney(Number(value))}`} />}
        />
        <Bar dataKey="gross" fill="var(--color-gross)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="refunds" fill="var(--color-refunds)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
