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

/** Arxivlash / tiklash tasdiqlash oynasi. */
export function ArchiveDialog({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient()
  const restoring = product ? !product.isActive : false
  const m = useMutation({
    mutationFn: (p: Product) => api.post<Product>(`/products/${p.id}/${p.isActive ? "archive" : "restore"}`),
    onSuccess: (_d, p) => {
      toast.success(p.isActive ? "Mahsulot arxivlandi" : "Mahsulot tiklandi")
      qc.invalidateQueries({ queryKey: ["products"] })
      qc.invalidateQueries({ queryKey: ["product"] })
      onClose()
    },
    onError: (e) => toast.error(e.message),
  })
  return (
    <AlertDialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{restoring ? "Mahsulotni tiklaysizmi?" : "Mahsulotni arxivlaysizmi?"}</AlertDialogTitle>
          <AlertDialogDescription>
            {restoring
              ? `“${product?.name}” yana sotuvda va ro‘yxatda ko‘rinadi.`
              : `“${product?.name}” sotuvda ko‘rinmaydi. Sotuv tarixi va qoldiq saqlanadi, keyinroq tiklash mumkin.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Bekor qilish</AlertDialogCancel>
          <AlertDialogAction
            variant={restoring ? "default" : "destructive"}
            disabled={m.isPending}
            onClick={() => product && m.mutate(product)}
          >
            {m.isPending && <Spinner />} {restoring ? "Tiklash" : "Arxivlash"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
