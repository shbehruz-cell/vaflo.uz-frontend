"use client";

import { isFinePointer } from "@/lib/pointer";
import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FormSheet } from "@/components/app/form-sheet";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { UNIT_LABELS } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  NATIVE_SELECT,
  useCategories,
  useWarehouses,
  type Category,
  type Product,
} from "./common";

const NEW_CAT = "__new";
const FIELD = "h-11 sm:h-10";
const SELECT = cn(NATIVE_SELECT, "max-sm:h-11");
const SECTION = "text-xs font-medium text-muted-foreground";
const clean = (s: string) => s.trim().replace(/\s+/g, "").replace(",", ".");
const isNum = (s: string, digits: number) =>
  new RegExp(`^\\d{1,12}(\\.\\d{1,${digits}})?$`).test(s);

type Errors = Partial<
  Record<
    | "name"
    | "unit"
    | "salePrice"
    | "costPrice"
    | "minStock"
    | "initialQty"
    | "barcodes"
    | "sku"
    | "form",
    string
  >
>;

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product?: Product | null;
  onSaved?: (p: Product) => void;
}) {
  // Har ochilganda forma yangidan boshlansin
  const [gen, setGen] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setGen((g) => g + 1);
  }
  return (
    <Body
      key={`${product?.id ?? "new"}-${gen}`}
      open={open}
      onOpenChange={onOpenChange}
      product={product ?? null}
      onDone={(p) => {
        onOpenChange(false);
        onSaved?.(p);
      }}
    />
  );
}

function Body({
  open,
  onOpenChange,
  product,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  product: Product | null;
  onDone: (p: Product) => void;
}) {
  const { can } = useAuth();
  const qc = useQueryClient();
  const editing = !!product;
  const canCost = can("costs.read");
  const canPrice = !editing || can("pricing.change");
  const { data: categories } = useCategories();
  const { data: warehouses } = useWarehouses();

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? "");
  const [unit, setUnit] = useState(product?.unit ?? "PIECE");
  const [salePrice, setSalePrice] = useState(
    product ? String(Number(product.salePrice)) : "",
  );
  const [costPrice, setCostPrice] = useState(
    product?.costPrice !== undefined ? String(Number(product.costPrice)) : "",
  );
  const [minStock, setMinStock] = useState(
    product ? String(Number(product.minStock)) : "",
  );
  const [barcodes, setBarcodes] = useState<string[]>(
    product?.barcodes.map((b) => b.value) ?? [],
  );
  const [bcInput, setBcInput] = useState("");
  const [initialQty, setInitialQty] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [newCat, setNewCat] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [base, setBase] = useState(() => ({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    categoryId: product?.categoryId ?? "",
    unit: product?.unit ?? "PIECE",
    salePrice: product ? String(Number(product.salePrice)) : "",
    costPrice:
      product?.costPrice !== undefined ? String(Number(product.costPrice)) : "",
    minStock: product ? String(Number(product.minStock)) : "",
    barcodes: (product?.barcodes.map((b) => b.value) ?? []).join("|"),
    warehouseId: "",
  }));
  const againRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const dirty =
    base.name !== name ||
    base.sku !== sku ||
    base.categoryId !== categoryId ||
    base.unit !== unit ||
    base.salePrice !== salePrice ||
    base.costPrice !== costPrice ||
    base.minStock !== minStock ||
    base.barcodes !== barcodes.join("|") ||
    base.warehouseId !== warehouseId ||
    bcInput !== "" ||
    initialQty !== "" ||
    newCat !== "";

  const addBarcode = () => {
    const v = bcInput.trim();
    if (!v) return;
    if (barcodes.includes(v))
      setErrors((e) => ({
        ...e,
        barcodes: "Bu shtrix-kod allaqachon qo‘shilgan",
      }));
    else {
      setBarcodes((b) => [...b, v]);
      setErrors((e) => ({ ...e, barcodes: undefined }));
    }
    setBcInput("");
  };

  const createCat = useMutation({
    mutationFn: () =>
      api.post<Category>("/categories", { name: newCat.trim() }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      setCategoryId(c.id);
      setNewCat("");
      toast.success("Kategoriya qo‘shildi");
    },
    onError: (e) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      product
        ? api.patch<Product>(`/products/${product.id}`, payload)
        : api.post<Product>("/products", payload),
    onSuccess: (p) => {
      toast.success(product ? "Mahsulot yangilandi" : "Mahsulot qo‘shildi");
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      if (againRef.current) {
        againRef.current = false;
        resetForNext();
      } else onDone(p);
    },
    onError: (e) => {
      againRef.current = false;
      const m = e.message;
      if (/shtrix/i.test(m)) setErrors({ barcodes: m });
      else if (/SKU/.test(m)) setErrors({ sku: m });
      else if (/birlik/i.test(m)) setErrors({ unit: m });
      else setErrors({ form: m });
    },
  });

  function resetForNext() {
    setName("");
    setSku("");
    setSalePrice("");
    setCostPrice("");
    setMinStock("");
    setBarcodes([]);
    setBcInput("");
    setInitialQty("");
    setNewCat("");
    setErrors({});
    setBase({
      name: "",
      sku: "",
      categoryId,
      unit,
      salePrice: "",
      costPrice: "",
      minStock: "",
      barcodes: "",
      warehouseId,
    });
    if (isFinePointer()) nameRef.current?.focus();
  }

  function submit(again = false) {
    againRef.current = !editing && again;
    const err: Errors = {};
    const sp = clean(salePrice);
    const cp = clean(costPrice);
    const ms = clean(minStock);
    const iq = clean(initialQty);
    if (!name.trim()) err.name = "Nomi kiritilishi shart";
    if (canPrice && !isNum(sp, 2))
      err.salePrice = "Narxni to‘g‘ri kiriting (masalan 12500)";
    if (cp && !isNum(cp, 2)) err.costPrice = "Tannarxni to‘g‘ri kiriting";
    if (ms && !isNum(ms, 3)) err.minStock = "Miqdorni to‘g‘ri kiriting";
    if (iq && !isNum(iq, 3)) err.initialQty = "Miqdorni to‘g‘ri kiriting";
    setErrors(err);
    if (Object.keys(err).length) {
      againRef.current = false;
      return;
    }

    const pending = bcInput.trim();
    const codes =
      pending && !barcodes.includes(pending)
        ? [...barcodes, pending]
        : barcodes;
    if (product) {
      save.mutate({
        name: name.trim(),
        sku: sku.trim() || null,
        categoryId: categoryId && categoryId !== NEW_CAT ? categoryId : null,
        ...(unit !== product.unit && { unit }),
        ...(canPrice && { salePrice: sp }),
        ...(canCost && cp && { costPrice: cp }),
        minStock: ms || "0",
        barcodes: codes,
      });
    } else {
      save.mutate({
        name: name.trim(),
        ...(sku.trim() && { sku: sku.trim() }),
        ...(categoryId && categoryId !== NEW_CAT && { categoryId }),
        unit,
        salePrice: sp,
        ...(canCost && cp && { costPrice: cp }),
        ...(ms && { minStock: ms }),
        barcodes: codes,
        ...(iq && { initialQty: iq, ...(warehouseId && { warehouseId }) }),
      });
    }
  }

  const priceInput = (
    <Input
      id="pf-price"
      inputMode="decimal"
      className={FIELD}
      value={salePrice}
      disabled={!canPrice}
      aria-invalid={!!errors.salePrice || undefined}
      onChange={(e) => setSalePrice(e.target.value)}
      placeholder="0"
    />
  );

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title={product ? "Mahsulotni tahrirlash" : "Mahsulot qo‘shish"}
      description="* belgisi majburiy maydonlarni bildiradi."
      size="md"
      dirty={dirty}
      footer={
        <>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
          >
            Bekor qilish
          </Button>
          {!editing && (
            <Button
              type="button"
              variant="outline"
              disabled={save.isPending}
              onClick={() => submit(true)}
            >
              Saqlash va yana qo‘shish
            </Button>
          )}
          <Button type="submit" form="product-form" disabled={save.isPending}>
            {save.isPending && <Spinner />} Saqlash
          </Button>
        </>
      }
    >
      <form
        id="product-form"
        noValidate
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          submit(false);
        }}
      >
        <section className="space-y-3">
          <h3 className={SECTION}>Asosiy</h3>
          <FieldGroup>
            <Field data-invalid={!!errors.name || undefined}>
              <FieldLabel htmlFor="pf-name">Nomi *</FieldLabel>
              <Input
                id="pf-name"
                ref={nameRef}
                className={FIELD}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={!!errors.name || undefined}
                autoFocus={isFinePointer()}
              />
              {errors.name && <FieldError>{errors.name}</FieldError>}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="pf-unit">Birlik *</FieldLabel>
                <select
                  id="pf-unit"
                  className={SELECT}
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  aria-describedby={editing && unit !== product?.unit ? "pf-unit-hint" : undefined}
                >
                  {Object.entries(UNIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                {errors.unit && <FieldError>{errors.unit}</FieldError>}
                {editing && product && unit !== product.unit && !errors.unit && (
                  <FieldDescription id="pf-unit-hint">
                    Qoldiq va sotuvlar tarixidagi miqdorlar o‘zgarmaydi — faqat birlik nomi yangilanadi.
                  </FieldDescription>
                )}
              </Field>
              <Field>
                <FieldLabel htmlFor="pf-cat">Kategoriya</FieldLabel>
                <select
                  id="pf-cat"
                  className={SELECT}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Kategoriyasiz</option>
                  {categories?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                  <option value={NEW_CAT}>+ Yangi kategoriya</option>
                </select>
              </Field>
            </div>

            {categoryId === NEW_CAT && (
              <div className="flex gap-2">
                <Input
                  className={FIELD}
                  placeholder="Kategoriya nomi"
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newCat.trim()) createCat.mutate();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className={FIELD}
                  disabled={!newCat.trim() || createCat.isPending}
                  onClick={() => createCat.mutate()}
                >
                  {createCat.isPending ? <Spinner /> : <Plus />} Qo‘shish
                </Button>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.sku || undefined}>
                <FieldLabel htmlFor="pf-sku">SKU</FieldLabel>
                <Input
                  id="pf-sku"
                  className={FIELD}
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  aria-invalid={!!errors.sku || undefined}
                />
                {errors.sku && <FieldError>{errors.sku}</FieldError>}
              </Field>
            </div>

            <Field data-invalid={!!errors.barcodes || undefined}>
              <FieldLabel htmlFor="pf-bc">Shtrix-kodlar</FieldLabel>
              {barcodes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {barcodes.map((b) => (
                    <span
                      key={b}
                      className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs tabular-nums"
                    >
                      {b}
                      <button
                        type="button"
                        aria-label={`${b} ni olib tashlash`}
                        className="rounded-sm p-0.5 hover:bg-background"
                        onClick={() =>
                          setBarcodes((x) => x.filter((v) => v !== b))
                        }
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                id="pf-bc"
                className={FIELD}
                value={bcInput}
                placeholder="Kiriting yoki skanerlang, Enter bosing"
                onChange={(e) => setBcInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addBarcode();
                  }
                }}
                aria-invalid={!!errors.barcodes || undefined}
              />
              {errors.barcodes && <FieldError>{errors.barcodes}</FieldError>}
            </Field>
          </FieldGroup>
        </section>

        <section className="space-y-3">
          <h3 className={SECTION}>Narx</h3>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.salePrice || undefined}>
                <FieldLabel htmlFor="pf-price">Sotuv narxi (so‘m) *</FieldLabel>
                {canPrice ? (
                  priceInput
                ) : (
                  <Tooltip>
                    <TooltipTrigger render={<div />}>
                      {priceInput}
                    </TooltipTrigger>
                    <TooltipContent>
                      Narxni o‘zgartirish uchun ruxsat kerak
                    </TooltipContent>
                  </Tooltip>
                )}
                {errors.salePrice && (
                  <FieldError>{errors.salePrice}</FieldError>
                )}
              </Field>
              {canCost && (
                <Field data-invalid={!!errors.costPrice || undefined}>
                  <FieldLabel htmlFor="pf-cost">Tannarx (so‘m)</FieldLabel>
                  <Input
                    id="pf-cost"
                    inputMode="decimal"
                    className={FIELD}
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    aria-invalid={!!errors.costPrice || undefined}
                    placeholder="0"
                  />
                  {errors.costPrice && (
                    <FieldError>{errors.costPrice}</FieldError>
                  )}
                </Field>
              )}
            </div>
          </FieldGroup>
        </section>

        <section className="space-y-3">
          <h3 className={SECTION}>Ombor</h3>
          <FieldGroup>
            <Field data-invalid={!!errors.minStock || undefined}>
              <FieldLabel htmlFor="pf-min">Minimal qoldiq</FieldLabel>
              <Input
                id="pf-min"
                inputMode="decimal"
                className={FIELD}
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                aria-invalid={!!errors.minStock || undefined}
                placeholder="0"
              />
              <FieldDescription>
                Qoldiq shu miqdordan kam bo‘lsa, “Kam qoldi” belgisi chiqadi.
              </FieldDescription>
              {errors.minStock && <FieldError>{errors.minStock}</FieldError>}
            </Field>

            {!editing && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!errors.initialQty || undefined}>
                  <FieldLabel htmlFor="pf-qty">Boshlang‘ich qoldiq</FieldLabel>
                  <Input
                    id="pf-qty"
                    inputMode="decimal"
                    className={FIELD}
                    value={initialQty}
                    onChange={(e) => setInitialQty(e.target.value)}
                    aria-invalid={!!errors.initialQty || undefined}
                    placeholder="0"
                  />
                  {errors.initialQty && (
                    <FieldError>{errors.initialQty}</FieldError>
                  )}
                </Field>
                <Field>
                  <FieldLabel htmlFor="pf-wh">Ombor</FieldLabel>
                  <select
                    id="pf-wh"
                    className={SELECT}
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                  >
                    <option value="">Asosiy ombor</option>
                    {warehouses?.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            )}
          </FieldGroup>
        </section>

        {errors.form && <FieldError>{errors.form}</FieldError>}
      </form>
    </FormSheet>
  );
}
