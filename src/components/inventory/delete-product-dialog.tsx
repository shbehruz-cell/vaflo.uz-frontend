"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
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
import { Spinner } from "@/components/ui/spinner"
import { api } from "@/lib/api"
import type { Product } from "./common"

/** Mahsulotni o‘chirish tasdiqlash oynasi. */
export function DeleteProductDialog({
  product,
  onClose,
  onDeleted,
}: {
  product: Product | null
  onClose: () => void
  onDeleted?: () => void
}) {
  const qc = useQueryClient()
  const m = useMutation({
    mutationFn: (p: Product) => api.delete<{ ok: boolean; mode: "hard" | "soft" }>(`/products/${p.id}`),
    onSuccess: () => {
      toast.success("Mahsulot o‘chirildi")
      for (const key of ["products", "product", "pos-products", "product-picker", "product-movements", "movements", "reports"]) {
        qc.invalidateQueries({ queryKey: [key] })
      }
      onClose()
      onDeleted?.()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <AlertDialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mahsulotni o‘chirasizmi?</AlertDialogTitle>
          <AlertDialogDescription>
            {`“${product?.name}” mahsulotlar ro‘yxatidan va kassadan olib tashlanadi. Eski cheklar va hisobotlardagi tarix saqlanadi. Bu amalni bekor qilib bo‘lmaydi.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={m.isPending} onClick={() => product && m.mutate(product)}>
            {m.isPending && <Spinner />} O‘chirish
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
