"use client"

import { useState } from "react"
import { ArrowBigUp, Eye, EyeOff, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

/**
 * Parol maydoni: ko‘rsatish/yashirish tugmasi (`aria-pressed`), Caps Lock ogohlantirishi,
 * ixtiyoriy yo‘riqnoma (`hint`) va maydon ostidagi xato (`error`).
 */
export function PasswordField({
  id,
  label,
  error,
  hint,
  invalid,
  ref,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type" | "id"> & {
  id: string
  label: string
  /** Maydon ostida ko‘rinadigan xato (maydon `aria-invalid` bo‘ladi). */
  error?: string | null
  hint?: string
  /** Matnsiz qizil holat (xato boshqa joyda ko‘rsatilgan bo‘lsa). */
  invalid?: boolean
}) {
  const [show, setShow] = useState(false)
  const [caps, setCaps] = useState(false)
  const bad = !!error || !!invalid
  const describedBy = [error ? `${id}-error` : hint ? `${id}-hint` : null, caps ? `${id}-caps` : null].filter(Boolean).join(" ") || undefined
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => setCaps(e.getModifierState?.("CapsLock") ?? false)

  return (
    <Field data-invalid={bad || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          {...props}
          ref={ref}
          id={id}
          type={show ? "text" : "password"}
          aria-invalid={bad || undefined}
          aria-describedby={describedBy}
          className="h-11 rounded-xl pr-12 pl-10"
          onKeyDown={(e) => {
            onKey(e)
            props.onKeyDown?.(e)
          }}
          onKeyUp={(e) => {
            onKey(e)
            props.onKeyUp?.(e)
          }}
          onBlur={(e) => {
            setCaps(false)
            props.onBlur?.(e)
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute inset-y-0 right-0.5 my-auto size-10 text-muted-foreground pointer-coarse:size-11"
          aria-label={show ? "Parolni yashirish" : "Parolni ko‘rsatish"}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff /> : <Eye />}
        </Button>
      </div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
      {caps && (
        <p id={`${id}-caps`} className="flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <ArrowBigUp className="size-3.5" /> Caps Lock yoqilgan
        </p>
      )}
    </Field>
  )
}
