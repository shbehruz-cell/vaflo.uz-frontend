import { cn } from "@/lib/utils"

/** Oddiy filtrlar uchun stillashtirilgan native <select>. */
export function NativeSelect({
  className,
  options,
  ...props
}: Omit<React.ComponentProps<"select">, "children"> & { options: { value: string; label: string }[] }) {
  return (
    <select
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:[&>option]:bg-popover",
        className,
      )}
      {...props}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
