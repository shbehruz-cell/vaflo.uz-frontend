import { ArrowLeft } from "lucide-react";
import { AUTH_PHOTO_SRC, AuthPhoto } from "@/components/auth/auth-visual";
import { Logo } from "@/components/app/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

/**
 * Kirish / ro‘yxatdan o‘tish sahifalari uchun umumiy qobiq: yuqorida mavzu tugmasi, logo, kartochka.
 * Telefonda kartochka yuqoriroqda turadi — ekran klaviaturasi formani yopib qo‘ymasin.
 * Kompyuterda (lg+) `AUTH_PHOTO_SRC` berilgan bo‘lsa chapda fotosurat paneli chiqadi (`auth-visual.tsx`).
 */
export function AuthShell({
  title,
  description,
  meta,
  steps,
  onBack,
  backLabel = "Orqaga",
  footer,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /** Sarlavha ustidagi kichik matn, masalan "1/3" (steps berilmasa). */
  meta?: string;
  /** Bosqich chizig‘i (ro‘yxatdan o‘tish). */
  steps?: { current: number; total: number };
  onBack?: () => void;
  backLabel?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const metaText = steps ? `${steps.current}/${steps.total}` : meta;
  return (
    <div
      className={cn(
        "min-h-svh bg-background",
        AUTH_PHOTO_SRC &&
          "lg:grid lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]",
      )}
    >
      <AuthPhoto />
      <div className="flex min-h-svh flex-col">
        <header className="flex h-16 shrink-0 items-center justify-end px-4 sm:px-6">
          <ThemeToggle />
        </header>

        <main className="flex flex-1 justify-center px-4 pt-4 pb-10 sm:items-center sm:pt-0 sm:pb-24">
          <div className="w-full max-w-[400px]">
            <div className="mb-6 flex justify-center">
              <Logo className="gap-2.5 [&_img]:h-8 [&>span]:text-xl" />
            </div>
            <div className="rounded-2xl border bg-card p-5 sm:p-8">
              {(onBack || metaText) && (
                <div className="-mt-1 mb-3 flex min-h-11 items-center justify-between pointer-fine:min-h-8">
                  {onBack ? (
                    <button
                      type="button"
                      onClick={onBack}
                      className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none pointer-fine:min-h-8"
                    >
                      <ArrowLeft className="size-4" /> {backLabel}
                    </button>
                  ) : (
                    <span />
                  )}
                  {metaText && (
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {metaText}
                    </span>
                  )}
                </div>
              )}
              {steps && (
                <div
                  role="progressbar"
                  aria-label="Bosqich"
                  aria-valuemin={1}
                  aria-valuemax={steps.total}
                  aria-valuenow={steps.current}
                  className="mb-5 flex gap-1"
                >
                  {Array.from({ length: steps.total }, (_, i) => (
                    <span
                      key={i}
                      className={cn(
                        "h-1 flex-1 rounded-full",
                        i < steps.current
                          ? "bg-primary"
                          : "bg-muted dark:bg-muted-foreground/20",
                      )}
                    />
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-1.5 text-sm text-muted-foreground">
                  {description}
                </p>
              )}
              {children}
            </div>
            {footer && (
              <div className="mt-5 px-2 text-center text-sm text-muted-foreground">
                {footer}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
