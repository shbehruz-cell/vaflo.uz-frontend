"use client"

import { useImperativeHandle, useRef } from "react"
import { cn } from "@/lib/utils"

const LENGTH = 6

export interface OtpInputHandle {
  focus: () => void
  /** Kodni tozalab, birinchi katakka qaytadi. */
  clear: () => void
}

/**
 * 6 xonali tasdiqlash kodi: har raqam alohida katakda. Qo‘yish (paste) va SMS/email avto-to‘ldirish
 * (`one-time-code`) butun kodni birdan joylaydi. 6-raqam kiritilishi bilan `onComplete` chaqiriladi.
 * `value` — faqat raqamlardan iborat satr (0–6 belgi).
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
  autoFocus,
  describedBy,
  ref,
}: {
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  invalid?: boolean
  /** Faqat sichqonchali qurilmada true bering (telefonda klaviatura o‘zi ochilmasin). */
  autoFocus?: boolean
  describedBy?: string
  ref?: React.Ref<OtpInputHandle>
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([])

  const focusAt = (i: number) => {
    const el = boxes.current[Math.max(0, Math.min(LENGTH - 1, i))]
    el?.focus()
    el?.select()
  }

  useImperativeHandle(ref, () => ({
    focus: () => focusAt(Math.min(value.length, LENGTH - 1)),
    clear: () => {
      onChange("")
      // Tekshiruv paytida katakchalar o‘chiq bo‘ladi — qayta yoqilgach fokus beramiz
      setTimeout(() => focusAt(0), 60)
    },
  }))

  function put(index: number, raw: string) {
    const digits = raw.replace(/\D/g, "")
    if (!digits) return
    const at = Math.min(index, value.length)
    const next = (value.slice(0, at) + digits + value.slice(at + digits.length)).slice(0, LENGTH)
    onChange(next)
    focusAt(at + digits.length)
    if (next.length === LENGTH) onComplete?.(next)
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (i < value.length) {
        onChange(value.slice(0, i) + value.slice(i + 1))
        if (!value[i]) focusAt(i - 1)
      } else if (i > 0) {
        onChange(value.slice(0, i - 1))
        focusAt(i - 1)
      }
    } else if (e.key === "Delete") {
      e.preventDefault()
      if (i < value.length) onChange(value.slice(0, i) + value.slice(i + 1))
    } else if (e.key === "ArrowLeft") {
      e.preventDefault()
      focusAt(i - 1)
    } else if (e.key === "ArrowRight") {
      e.preventDefault()
      focusAt(i + 1)
    }
  }

  return (
    <div role="group" aria-label="6 xonali kod" className="flex justify-between gap-1.5 sm:gap-2">
      {Array.from({ length: LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            boxes.current[i] = el
          }}
          value={value[i] ?? ""}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          aria-label={`Kod, ${i + 1}-raqam`}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => put(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={(e) => {
            e.preventDefault()
            put(i, e.clipboardData.getData("text"))
          }}
          className={cn(
            "h-13 min-w-0 flex-1 rounded-xl border border-input bg-transparent text-center font-mono text-xl font-semibold tabular-nums transition-colors outline-none sm:max-w-11",
            "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary",
            "aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
          )}
        />
      ))}
    </div>
  )
}
