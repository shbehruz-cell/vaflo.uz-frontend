import Image from "next/image"
import { cn } from "@/lib/utils"

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image src="/logo.png" alt="" width={256} height={148} priority className="h-6 w-auto shrink-0 dark:brightness-150 dark:saturate-125" />
      {!compact && (
        <span className="text-base font-semibold tracking-tight">
          VAFLO<span className="text-primary">.UZ</span>
        </span>
      )}
    </span>
  )
}
