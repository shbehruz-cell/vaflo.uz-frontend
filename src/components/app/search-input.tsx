"use client"

import { useRef } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Ro‘yxat sahifalari uchun yagona qidiruv maydoni: chapda ikonka, yozilganda o‘ngda tozalash tugmasi.
 * Telefonda klaviaturada "Qidirish" tugmasi chiqadi (enterKeyHint), iOS zoom bo‘lmasligi uchun 16px.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = "Qidirish",
  className,
  inputMode,
  "aria-label": ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  className?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  "aria-label"?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
      <input
        ref={ref}
        type="search"
        enterKeyHint="search"
        autoComplete="off"
        spellCheck={false}
        inputMode={inputMode}
        aria-label={ariaLabel ?? placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && value) {
            e.preventDefault()
            onChange("")
          }
        }}
        className="h-11 w-full min-w-0 rounded-xl border border-input bg-card pr-10 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:h-10 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Qidiruvni tozalash"
          onClick={() => {
            onChange("")
            ref.current?.focus()
          }}
          className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  )
}
