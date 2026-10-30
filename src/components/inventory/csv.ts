/** Kichik CSV parser: qo‘shtirnoq, `;` yoki `,` ajratgich avto-aniqlash, UTF-8 BOM. */
export function parseCsv(input: string): string[][] {
  const text = input.replace(/^﻿/, "")
  const firstLine = text.split(/\r?\n/, 1)[0] ?? ""
  const count = (ch: string) => firstLine.split(ch).length - 1
  const delim = count(";") > count(",") ? ";" : count("\t") > Math.max(count(";"), count(",")) ? "\t" : ","

  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i++
        } else quoted = false
      } else cell += c
    } else if (c === '"') quoted = true
    else if (c === delim) {
      row.push(cell)
      cell = ""
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ""
    } else cell += c
  }
  if (cell !== "" || row.length) {
    row.push(cell)
    rows.push(row)
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""))
}

export type ImportField = "name" | "sku" | "barcode" | "category" | "unit" | "salePrice" | "costPrice" | "qty"

export const IMPORT_FIELDS: { key: ImportField; label: string; required?: boolean; hints: string[] }[] = [
  { key: "name", label: "Nomi", required: true, hints: ["name", "nomi", "nom", "mahsulot", "tovar", "название", "наименование", "товар", "product"] },
  { key: "sku", label: "SKU", hints: ["sku", "artikul", "артикул"] },
  { key: "barcode", label: "Shtrix-kod", hints: ["barcode", "shtrix", "штрихкод", "штрих", "ean"] },
  { key: "category", label: "Kategoriya", hints: ["category", "kategoriya", "категория", "guruh", "группа"] },
  { key: "unit", label: "Birlik", hints: ["unit", "birlik", "o'lchov", "olchov", "единица"] },
  { key: "salePrice", label: "Sotuv narxi", required: true, hints: ["saleprice", "price", "narx", "sotuv", "цена", "розница"] },
  { key: "costPrice", label: "Tannarx", hints: ["costprice", "cost", "tannarx", "себестоимость", "закуп"] },
  { key: "qty", label: "Qoldiq", hints: ["qty", "quantity", "qoldiq", "miqdor", "количество", "остаток", "soni"] },
]

export function guessMapping(headers: string[]): Record<ImportField, string> {
  const norm = (s: string) => s.toLowerCase().replace(/[‘’'`\s_-]/g, "")
  const used = new Set<string>()
  const out = {} as Record<ImportField, string>
  // “tannarx/cost” “price” dan oldin aniqlanishi uchun maxsus tartib
  const order: ImportField[] = ["costPrice", "salePrice", "barcode", "name", "sku", "category", "unit", "qty"]
  for (const key of order) {
    const hints = IMPORT_FIELDS.find((f) => f.key === key)!.hints.map(norm)
    const h = headers.find((x) => !used.has(x) && hints.some((t) => norm(x).includes(t)))
    out[key] = h ?? ""
    if (h) used.add(h)
  }
  return out
}
