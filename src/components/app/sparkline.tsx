import { cn } from "@/lib/utils"

/**
 * Kichik chiziqli grafik (sparkline). Ma’lumot 2 tadan kam bo‘lsa tekis chiziq chiziladi.
 * Rangi `text-*` sinfi bilan boshqariladi (birlamchi: primary).
 */
export function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const clean = data.map((n) => (Number.isFinite(n) ? n : 0))
  const W = 100
  const H = 32
  const pad = 2
  let points: string
  if (clean.length < 2) {
    points = `0,${H - pad} ${W},${H - pad}`
  } else {
    const min = Math.min(...clean)
    const max = Math.max(...clean)
    const range = max - min || 1
    points = clean
      .map((v, i) => {
        const x = (i / (clean.length - 1)) * W
        const y = max === min ? H / 2 : H - pad - ((v - min) / range) * (H - pad * 2)
        return `${x.toFixed(2)},${y.toFixed(2)}`
      })
      .join(" ")
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className={cn("h-8 w-full overflow-visible", className)}>
      <polyline
        points={points}
        fill="none"
        className="stroke-primary"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
