"use client"

import { Suspense } from "react"
import { ShieldCheck, Users } from "lucide-react"
import { NoAccess } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
import { RolesTab } from "@/components/owner/roles-tab"
import { UsersTab } from "@/components/owner/users-tab"
import { ViewTabs } from "@/components/app/view-tabs"
import { useUrlState } from "@/hooks/use-url-state"
import { useAuth } from "@/lib/auth"

function UsersAndRoles() {
  const { get, set } = useUrlState()
  const tab = get("tab", "users")
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={
          <>
            <Users /> Xodimlar
          </>
        }
        title="Xodimlar va rollar"
        description="Xodimlarni qo‘shing va har bir rolga ruxsatlarni sozlang."
      />
      <ViewTabs
        variant="pill"
        value={tab}
        onChange={(v) => set({ tab: v === "users" ? "" : String(v), q: "", status: "", page: "" })}
        tabs={[
          { value: "users", label: "Xodimlar", icon: <Users /> },
          { value: "roles", label: "Rollar", icon: <ShieldCheck /> },
        ]}
      />
      {tab === "roles" ? <RolesTab /> : <UsersTab />}
    </div>
  )
}

export default function OwnerUsersPage() {
  const { can } = useAuth()
  if (!can("users.manage", "roles.manage")) return <NoAccess />
  return (
    <Suspense>
      <UsersAndRoles />
    </Suspense>
  )
}
