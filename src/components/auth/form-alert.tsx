import { AlertCircle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"

/** Forma ustidagi xabar: xato (`role="alert"`, darhol o‘qiladi) yoki ma’lumot (`role="status"`). */
export function FormAlert({
  variant = "error",
  className,
  children,
}: {
  variant?: "error" | "notice"
  className?: string
  children: React.ReactNode
}) {
  const error = variant === "error"
  const Icon = error ? AlertCircle : CheckCircle2
  return (
    <div
      role={error ? "alert" : "status"}
      className={cn(
        "mt-5 flex gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        error
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
        className,
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
