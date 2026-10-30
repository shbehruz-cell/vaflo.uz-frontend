"use client"

import { Suspense } from "react"
import { NoAccess } from "@/components/app/states"
import { PageHeader } from "@/components/app/page-header"
import { RolesTab } from "@/components/owner/roles-tab"
import { UsersTab } from "@/components/owner/users-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useUrlState } from "@/hooks/use-url-state"
import { useAuth } from "@/lib/auth"

function UsersAndRoles() {
  const { get, set } = useUrlState()
  const tab = get("tab", "users")
  return (
    <div className="space-y-5">
      <PageHeader title="Xodimlar va rollar" description="Xodimlarni qo‘shing va har bir rolga ruxsatlarni sozlang." />
      <Tabs value={tab} onValueChange={(v) => set({ tab: v === "users" ? "" : String(v), q: "", status: "", page: "" })}>
        <TabsList>
          <TabsTrigger value="users">Xodimlar</TabsTrigger>
          <TabsTrigger value="roles">Rollar</TabsTrigger>
        </TabsList>
        <TabsContent value="users">
          <UsersTab />
        </TabsContent>
        <TabsContent value="roles">
          <RolesTab />
        </TabsContent>
      </Tabs>
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
