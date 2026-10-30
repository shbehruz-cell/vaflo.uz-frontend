"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Spinner } from "@/components/ui/spinner"
import { homePath, useAuth } from "@/lib/auth"

export default function Home() {
  const { status, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === "anonymous") router.replace("/login")
    if (status === "authenticated" && user) router.replace(homePath(user))
  }, [status, user, router])

  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner className="size-6 text-primary" />
    </div>
  )
}
