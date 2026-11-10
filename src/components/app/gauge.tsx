import { cn } from "@/lib/utils"

export interface GaugeSegment {
  value: number
  /** Har qanday CSS rang, masalan "var(--chart-1)" */
  color: string
  label?: string
}

const CX = 100
const CY = 100
const R = 82
const SW = 16

function pt(angleDeg: number) {
  const a = (Math.PI / 180) * angleDeg
  // 180° = chap, 0° = o‘ng, yuqori yarim aylana
  return [CX + R * Math.cos(a), CY - R * Math.sin(a)] as const
}

/**
 * Yarim aylana ko‘rsatkich (gauge): oraliqli, yumaloq uchli segmentlar; markazda katta qiymat va izoh.
 * Barcha qiymatlar 0 bo‘lsa — kulrang yo‘l ko‘rsatiladi.
 */
export function Gauge({
  segments,
  center,
  sub,
  className,
}: {
  segments: GaugeSegment[]
  center: React.ReactNode
  sub?: React.ReactNode
  className?: string
}) {
  const valid = segments.filter((s) => Number.isFinite(s.value) && s.value > 0)
  const total = valid.reduce((a, s) => a + s.value, 0)
  const gap = valid.length > 1 ? 10 : 0 // darajada (yumaloq uchlar hisobiga)
  const usable = 180 - gap * (valid.length - 1)
  const arcs = valid.map((s, i) => {
    const before = valid.slice(0, i).reduce((a, x) => a + x.value, 0)
    const sweep = Math.max((s.value / total) * usable, 0.01)
    const start = 180 - (before / total) * usable - gap * i
    const end = start - sweep
    const [x1, y1] = pt(start)
    const [x2, y2] = pt(end)
    return { ...s, d: `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}` }
  })
  const [tx1, ty1] = pt(180)
  const [tx2, ty2] = pt(0)

  return (
    <div className={cn("relative mx-auto w-full max-w-64", className)}>
      <svg viewBox="0 0 200 112" className="block w-full" role="img" aria-label={segments.map((s) => `${s.label ?? ""} ${s.value}`).join(", ")}>
        {total === 0 && (
          <path d={`M ${tx1} ${ty1} A ${R} ${R} 0 0 1 ${tx2} ${ty2}`} fill="none" stroke="var(--muted)" strokeWidth={SW} strokeLinecap="round" />
        )}
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill="none" stroke={a.color} strokeWidth={SW} strokeLinecap="round" />
        ))}
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center leading-none">
        <div className="text-2xl font-semibold tabular-nums">{center}</div>
        {sub != null && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </div>
    </div>
  )
}
