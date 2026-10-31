"use client"

import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * Sahifaning asosiy "qo‘shish" amali.
 * Kompyuter/planshet (md+): sarlavha yonida yozuvli tugma.
 * Telefon: o‘ng pastda, tab bar ustida suzuvchi "+" tugmasi (mobil ilovalardagidek) — ro‘yxat qayerida bo‘lsangiz ham qo‘l yetadi.
 */
export function AddButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <>
      <Button className={cn("hidden h-10 gap-1.5 md:inline-flex", className)} onClick={onClick}>
        <Plus /> {label}
      </Button>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={onClick}
        className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground ring-4 ring-background outline-none transition-colors active:bg-primary/90 focus-visible:ring-ring md:hidden print:hidden"
      >
        <Plus className="size-6" />
      </button>
    </>
  )
}
