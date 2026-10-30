import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  Receipt,
  ScanBarcode,
  Settings,
  ShieldCheck,
  Timer,
  Users,
  UserRound,
  type LucideIcon,
} from "lucide-react"
import type { PermissionCode } from "@/lib/auth"

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  /** Kamida bittasi bo‘lsa ko‘rinadi. Bo‘sh — hamma uchun. */
  permissions: PermissionCode[]
  ownerOnly?: boolean
}

export interface NavGroup {
  label: string
  items: NavItem[]
}

/** TZ 4.2 — menyu foydalanuvchi ruxsatlariga qarab quriladi (backend baribir qayta tekshiradi). */
export const NAV: NavGroup[] = [
  {
    label: "Asosiy",
    items: [
      { href: "/owner/dashboard", label: "Boshqaruv paneli", icon: LayoutDashboard, permissions: ["reports.read"] },
      { href: "/pos", label: "Kassa (POS)", icon: ScanBarcode, permissions: ["sales.create"] },
      { href: "/shifts", label: "Smenalar", icon: Timer, permissions: ["shifts.manage", "shifts.read.all"] },
    ],
  },
  {
    label: "Savdo",
    items: [
      { href: "/sales", label: "Sotuvlar tarixi", icon: Receipt, permissions: ["sales.read.all", "sales.read.own"] },
      { href: "/customers", label: "Xaridorlar", icon: UserRound, permissions: ["customers.read"] },
      { href: "/reports", label: "Hisobotlar", icon: BarChart3, permissions: ["reports.read"] },
    ],
  },
  {
    label: "Ombor",
    items: [
      { href: "/inventory/products", label: "Mahsulotlar", icon: Boxes, permissions: ["products.read"] },
      { href: "/inventory/movements", label: "Ombor harakatlari", icon: ClipboardList, permissions: ["inventory.read"] },
    ],
  },
  {
    label: "Boshqaruv",
    items: [
      { href: "/owner/users", label: "Xodimlar va rollar", icon: Users, permissions: ["users.manage", "roles.manage"] },
      { href: "/audit", label: "Audit jurnali", icon: ShieldCheck, permissions: ["audit.read"] },
      { href: "/owner/settings", label: "Sozlamalar", icon: Settings, permissions: ["registers.manage"] },
    ],
  },
]
