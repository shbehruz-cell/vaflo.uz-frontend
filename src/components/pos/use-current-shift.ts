"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import type { Register, ShiftDetail } from "./types"

export const CURRENT_SHIFT_KEY = ["shifts", "current"] as const

export function useCurrentShift() {
  return useQuery({
    queryKey: CURRENT_SHIFT_KEY,
    queryFn: () => api.get<ShiftDetail | null>("/shifts/current"),
  })
}

export function useRegisters() {
  return useQuery({
    queryKey: ["registers"],
    queryFn: () => api.get<Register[]>("/registers"),
    staleTime: 15_000, // bandlik (ochiq smenalar) tez o‘zgaradi
  })
}
