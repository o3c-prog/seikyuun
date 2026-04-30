import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type Crumb = {
  label: string;
  href?: string;
};

export function PageHeader({
  title,
  titleSuffix,
  description,
  crumbs,
  badge,
  actions,
  className,
}: {
  title: string;
  titleSuffix?: React.ReactNode;
  description?: string;
  crumbs?: Crumb[];
  badge?: { label: string; variant?: "default" | "secondary" | "outline" };
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-border/60 bg-card", className)}>
      <div className="flex flex-col gap-4 px-8 py-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {crumbs && crumbs.length > 0 && (
            <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
              {crumbs.map((c, i) => (
                <span key={`${c.label}-${i}`} className="flex items-center gap-1">
                  {c.href ? (
                    <Link href={c.href} className="hover:text-foreground transition-colors">
                      {c.label}
                    </Link>
                  ) : (
                    <span>{c.label}</span>
                  )}
                  {i < crumbs.length - 1 && (
                    <ChevronRight className="size-3 text-muted-foreground/60" />
                  )}
                </span>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-3">
            <h1 className="truncate text-2xl font-bold tracking-tight">{title}</h1>
            {titleSuffix}
            {badge && (
              <Badge variant={badge.variant ?? "secondary"} className="text-xs">
                {badge.label}
              </Badge>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
