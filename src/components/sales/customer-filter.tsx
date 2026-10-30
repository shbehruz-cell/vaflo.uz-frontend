"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { api, type Paginated } from "@/lib/api"

interface Cust {
  id: string
  name: string
  phone: string | null
}

/** Xaridor bo‘yicha filtr: nom/telefon bilan qidirib tanlanadi, URL ga customerId yoziladi. */
export function CustomerFilter({
  customerId,
  onChange,
}: {
  customerId: string
  onChange: (id: string) => void
}) {
  const [text, setText] = useState("")
  const [debounced, setDebounced] = useState("")
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text.trim()), 300)
    return () => clearTimeout(t)
  }, [text])

  const results = useQuery({
    queryKey: ["customers", "filter", debounced],
    queryFn: () => api.get<Paginated<Cust>>("/customers", { q: debounced, pageSize: 8 }),
    enabled: open && debounced.length > 0,
  })

  const selected = useQuery({
    queryKey: ["customers", "one", customerId],
    queryFn: () => api.get<{ customer: Cust }>(`/customers/${customerId}`, { pageSize: 1 }),
    enabled: !!customerId,
  })

  if (customerId) {
    return (
      <div className="flex h-10 items-center justify-between gap-2 rounded-lg border bg-muted/40 px-2.5 text-sm">
        <span className="truncate">{selected.data?.customer.name ?? "Xaridor"}</span>
        <button type="button" aria-label="Xaridor filtrini tozalash" onClick={() => onChange("")}>
          <X className="size-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <Input
        className="h-10"
        placeholder="Xaridor (ism/telefon)"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && debounced && (
        <div className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border bg-popover p-1 shadow-md">
          {results.isLoading && <div className="px-2 py-1.5 text-sm text-muted-foreground">Qidirilmoqda…</div>}
          {results.data?.items.length === 0 && <div className="px-2 py-1.5 text-sm text-muted-foreground">Topilmadi</div>}
          {results.data?.items.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full flex-col rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault()
                onChange(c.id)
                setText("")
                setOpen(false)
              }}
            >
              <span>{c.name}</span>
              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
