import { cn } from "@/lib/utils";

export function SectionCard({
  icon: Icon,
  title,
  description,
  action,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card shadow-soft",
        className
      )}
    >
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-3">
            {Icon && (
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
                <Icon className="size-4" />
              </span>
            )}
            <div>
              {title && <h2 className="text-base font-semibold">{title}</h2>}
              {description && (
                <p className="text-xs text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {action && <div className="flex items-center gap-2">{action}</div>}
        </header>
      )}
      <div className="p-6">{children}</div>
    </section>
  );
}
