"use client"

import { useRef, useState } from "react"
import { XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { isFinePointer } from "@/lib/pointer"
import { cn } from "@/lib/utils"

/**
 * Qo‘shish / tahrirlash formalari uchun panel.
 * Kompyuter/planshet: o‘ngdan chiqadi (orqadagi ro‘yxat ko‘rinib turadi — kontekst yo‘qolmaydi).
 * Telefon: pastdan chiqadigan, deyarli to‘liq ekranli oyna; tugmalar pastda, bosh barmoq yetadigan joyda.
 *
 * Qisqa tasdiqlash va to‘lov kabi diqqat talab qiladigan amallar uchun markazdagi `Dialog` ishlatiladi.
 *
 * Ishlatish: forma `<form id="x">` bo‘lsa, footer’dagi tugma `type="submit" form="x"`.
 * `dirty` — forma o‘zgargan bo‘lsa, tasodifan yopishda "Saqlanmagan o‘zgarishlar" so‘raladi.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  size = "md",
  dirty = false,
  footer,
  children,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** md ≈ 480px (oddiy forma), lg ≈ 820px (ro‘yxat + rasm kabi keng ish) */
  size?: "md" | "lg"
  dirty?: boolean
  footer?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  const isMobile = useIsMobile()
  const popupRef = useRef<HTMLDivElement>(null)
  const [confirmClose, setConfirmClose] = useState(false)

  const requestClose = () => {
    if (dirty) setConfirmClose(true)
    else onOpenChange(false)
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (next) onOpenChange(true)
          else requestClose()
        }}
      >
        <SheetContent
          ref={popupRef}
          side={isMobile ? "bottom" : "right"}
          showCloseButton={false}
          // Telefonda fokus maydonga emas, panelning o‘ziga — klaviatura o‘zi ochilmasin
          initialFocus={() => (isFinePointer() ? true : popupRef.current)}
          className={cn(
            "gap-0 overflow-hidden p-0 outline-none",
            // ui/sheet o‘lchamlari data-[side=…] variantida — ustidan yozish uchun shu variant kerak
            isMobile
              ? "rounded-t-2xl data-[side=bottom]:h-[calc(var(--vv-height,100svh)*0.94)]"
              : cn("data-[side=right]:w-full", size === "lg" ? "data-[side=right]:sm:max-w-[820px]" : "data-[side=right]:sm:max-w-[480px]"),
            className,
          )}
        >
          {isMobile && <div aria-hidden className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-muted-foreground/30" />}

          <div className="flex shrink-0 items-start gap-3 border-b px-5 py-4">
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
              {description && <SheetDescription className="mt-0.5">{description}</SheetDescription>}
            </div>
            <Button variant="ghost" size="icon" className="-mt-1 -mr-2 size-10 shrink-0" aria-label="Yopish" onClick={requestClose}>
              <XIcon />
            </Button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

          {footer && (
            <div
              data-slot="form-sheet-footer"
              className="flex shrink-0 flex-col-reverse gap-2 border-t bg-(--dialog-footer) px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end [&_button]:h-11 sm:[&_button]:h-10"
            >
              {footer}
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>O‘zgarishlar saqlanmaydi</AlertDialogTitle>
            <AlertDialogDescription>Formaga kiritilgan ma’lumotlar o‘chib ketadi. Baribir yopilsinmi?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Davom etish</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirmClose(false)
                onOpenChange(false)
              }}
            >
              Yopish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
