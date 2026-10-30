# VAFLO.UZ — ichki ilova (frontend)

Next.js 16 + shadcn/ui (Base UI) + TanStack Query. Landing page bilan bir xil binafsha dizayn tokenlari, tungi rejim.

## Ishga tushirish

Avval backend (`../backend`) `http://localhost:4000` da ishlab turishi kerak.

```bash
npm install
npm run dev        # http://localhost:3000
```

Brauzer `/api/v1/*` so‘rovlarini Next rewrites orqali backendga yuboradi (`BACKEND_URL`, default `http://localhost:4000`), shuning uchun refresh token httpOnly cookie sifatida same-origin ishlaydi.

## Sahifalar (TZ 4.2)

| Yo‘l | Vazifa | Ruxsat |
|---|---|---|
| `/login` | Kirish | — |
| `/owner/dashboard` | KPI, sotuv dinamikasi, top mahsulotlar, kam qolganlar | `reports.read` |
| `/pos` | Kassa: shtrix-kod (Enter), F2 qidiruv, F9 to‘lov, naqd/karta/aralash, chek | `sales.create` |
| `/shifts`, `/shifts/[id]` | Smena ochish/yopish, kassa pul harakatlari | `shifts.manage` |
| `/sales`, `/sales/[id]` | Sotuvlar tarixi (filtrlar URL’da), qaytarish, bekor qilish | `sales.read.*` |
| `/customers`, `/customers/[id]` | CRM | `customers.read` |
| `/reports` | Hisobotlar + CSV eksport | `reports.read` |
| `/inventory/products` (+ `[id]`, `import`) | Mahsulotlar, CSV import | `products.read` |
| `/inventory/adjustments/new` | Qoldiqni tuzatish | `inventory.adjust` |
| `/inventory/movements` | Ombor harakatlari | `inventory.read` |
| `/owner/users` | Xodimlar va rollar/permission matritsasi | `users.manage` |
| `/owner/settings` | Do‘kon, omborlar, kassalar, demo so‘rovlar | Owner |
| `/audit` | Audit jurnali | `audit.read` |

Menyu ruxsatlarga qarab quriladi; backend har bir so‘rovni baribir qayta tekshiradi.
