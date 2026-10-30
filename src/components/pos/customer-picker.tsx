"use client"

import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { ChevronsUpDown, User, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { api, type Paginated } from "@/lib/api"
import { useAuth } from "@/lib/auth"

export interface PickedCustomer {
  id: string
  name: string
  phone?: string | null
}

export function CustomerPicker({
  value,
  onChange,
}: {
  value: PickedCustomer | null
  onChange: (c: PickedCustomer | null) => void
}) {
  const { can } = useAuth()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [debounced, setDebounced] = useState("")

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250)
    return () => clearTimeout(t)
  }, [q])

  const list = useQuery({
    queryKey: ["customers", "pos", debounced],
    queryFn: () => api.get<Paginated<PickedCustomer>>("/customers", { q: debounced, pageSize: 10 }),
    enabled: open && can("customers.read"),
  })

  if (!can("customers.read")) return null

  return (
    <div className="flex items-center gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger render={<Button variant="outline" className="h-10 min-w-0 flex-1 justify-between font-normal" />}>
          <span className="flex min-w-0 items-center gap-2">
            <User className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{value ? value.name : "Ixtiyoriy xaridor"}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-0">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Ism yoki telefon bo‘yicha qidirish" value={q} onValueChange={setQ} />
            <CommandList>
              {list.isLoading && <div className="p-3 text-center text-sm text-muted-foreground">Yuklanmoqda…</div>}
              {list.isError && <div className="p-3 text-center text-sm text-destructive">Xaridorlarni yuklab bo‘lmadi</div>}
              {list.data && list.data.items.length === 0 && <CommandEmpty>Xaridor topilmadi</CommandEmpty>}
              {list.data?.items.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.id}
                  onSelect={() => {
                    onChange(c)
                    setOpen(false)
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate">{c.name}</div>
                    {c.phone && <div className="text-xs text-muted-foreground">{c.phone}</div>}
                  </div>
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button variant="ghost" size="icon" className="size-10" aria-label="Xaridorni olib tashlash" onClick={() => onChange(null)}>
          <X />
        </Button>
      )}
    </div>
  )
}
