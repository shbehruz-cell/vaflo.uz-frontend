"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CheckCircle2, Lock, Monitor } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { EmptyState, ErrorState, LoadingRows } from "@/components/app/states"
import { api, ApiError } from "@/lib/api"
import { cn } from "@/lib/utils"
import { CURRENT_SHIFT_KEY, useRegisters } from "./use-current-shift"
import type { ShiftDetail } from "./types"

export function OpenShiftCard() {
  const qc = useQueryClient()
  const registers = useRegisters()
  const [registerId, setRegisterId] = useState("")
  const [opening, setOpening] = useState("0")
  const [error, setError] = useState<string | null>(null)

  const list = registers.data ?? []
  const selected = registerId || list.find((r) => r.canOpen)?.id || ""

  const open = useMutation({
    mutationFn: () => api.post<ShiftDetail>("/shifts/open", { registerId: selected, openingCash: opening || "0" }),
    onSuccess: (shift) => {
      qc.setQueryData(CURRENT_SHIFT_KEY, shift)
      qc.invalidateQueries({ queryKey: ["shifts"] })
      qc.invalidateQueries({ queryKey: ["registers"] })
      toast.success("Smena ochildi")
    },
    onError: (e) => {
      const msg = e instanceof ApiError ? e.message : "Smenani ochib bo‘lmadi"
      setError(msg)
      toast.error(msg)
      // Bandlik boshqa kassir tomonidan o‘zgargan bo‘lishi mumkin
      qc.invalidateQueries({ queryKey: ["registers"] })
    },
  })

  if (registers.isError) return <ErrorState error={registers.error} onRetry={() => registers.refetch()} />

  return (
    <div className="flex flex-1 items-center justify-center py-10">
      <Card className="w-full max-w-md rounded-2xl shadow-none">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Smena ochilmagan</CardTitle>
          <CardDescription>Sotuvni boshlash uchun kassani tanlang va kassadagi boshlang‘ich naqd pulni kiriting.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              if (!selected) return setError("Ochish mumkin bo‘lgan kassa yo‘q")
              open.mutate()
            }}
          >
            <FieldGroup>
              <Field>
                <FieldLabel id="register-label">Kassa</FieldLabel>
                {registers.isLoading ? (
                  <LoadingRows rows={2} />
                ) : !list.length ? (
                  <EmptyState title="Kassa yo‘q" description="Sozlamalarda kassa qo‘shing." />
                ) : (
                  <div role="radiogroup" aria-labelledby="register-label" className="space-y-2">
                    {list.map((r) => {
                      const active = r.id === selected
                      return (
                        <button
                          key={r.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          disabled={!r.canOpen}
                          onClick={() => setRegisterId(r.id)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                            active ? "border-primary bg-primary/5" : "hover:bg-muted/60",
                            !r.canOpen && "cursor-not-allowed opacity-60 hover:bg-transparent",
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-9 shrink-0 items-center justify-center rounded-md",
                              r.canOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                            )}
                          >
                            {r.canOpen ? <Monitor className="size-4" /> : <Lock className="size-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium">
                              {r.name} <span className="font-mono text-xs text-muted-foreground">{r.code}</span>
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {r.blockedReason ??
                                (r.openShifts.length
                                  ? `Smenada: ${r.openShifts.map((s) => s.cashierName ?? "—").join(", ")}`
                                  : "Bo‘sh")}
                            </span>
                          </span>
                          <Badge variant="secondary" className="shrink-0 tabular-nums">
                            {r.openCount}/{r.maxCashiers}
                          </Badge>
                          {active && <CheckCircle2 className="size-4 shrink-0 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="opening">Boshlang‘ich naqd (so‘m)</FieldLabel>
                <Input
                  id="opening"
                  inputMode="decimal"
                  className="h-10"
                  value={opening}
                  onChange={(e) => setOpening(e.target.value.replace(/[^\d.]/g, ""))}
                />
                {error && <FieldError>{error}</FieldError>}
              </Field>
              <Button type="submit" size="lg" className="h-10" disabled={open.isPending || !selected}>
                {open.isPending && <Spinner />} Smenani ochish
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
