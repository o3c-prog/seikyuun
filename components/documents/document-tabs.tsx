"use client";

import { useState } from "react";
import Link from "next/link";
import { useSelectedLayoutSegment, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { useProjects } from "@/lib/projects-store";
import { cn } from "@/lib/utils";

export type DocumentType =
  | "estimate"
  | "purchase-order"
  | "delivery"
  | "invoice"
  | "receipt"
  | "cover-letter";

const TABS: { type: DocumentType; label: string }[] = [
  { type: "estimate", label: "見積書" },
  { type: "purchase-order", label: "発注書・発注請書" },
  { type: "delivery", label: "納品書・検収書" },
  { type: "invoice", label: "請求書" },
  { type: "receipt", label: "領収書" },
  { type: "cover-letter", label: "送付状" },
];

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0);
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateMonthlyDates(startIso: string, count: number): string[] {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return [];
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(formatYmd(endOfMonth(start.getFullYear(), start.getMonth() + i)));
  }
  return dates;
}

export function DocumentTabs({ projectId }: { projectId: string }) {
  const segment = useSelectedLayoutSegment();
  const active = (segment ?? "estimate") as DocumentType;
  const { projects } = useProjects();
  const project = projects.find((p) => p.id === projectId);
  const searchParams = useSearchParams();
  const currentMonth = searchParams.get("month") ?? "";

  const isRecurringMonthly =
    project?.invoiceTiming === "recurring" &&
    (project?.recurringInterval === "monthly" || !project?.recurringInterval);
  // Use invoiceDate if set, otherwise default to today's month
  const monthlyDates = isRecurringMonthly
    ? generateMonthlyDates(project?.invoiceDate || new Date().toISOString().slice(0, 10), 12)
    : [];

  return (
    <div className="border-b border-border bg-card">
      <nav className="flex gap-1 px-8">
        {TABS.map((tab) => {
          const isActive = tab.type === active;
          if (
            tab.type === "invoice" &&
            isRecurringMonthly &&
            monthlyDates.length > 0
          ) {
            return (
              <InvoiceMonthlyTab
                key={tab.type}
                projectId={projectId}
                label={tab.label}
                isActive={isActive}
                dates={monthlyDates}
                currentMonth={currentMonth}
              />
            );
          }
          return (
            <Link
              key={tab.type}
              href={`/projects/${projectId}/documents/${tab.type}`}
              className={cn(
                "relative flex h-12 items-center px-4 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function InvoiceMonthlyTab({
  projectId,
  label,
  isActive,
  dates,
  currentMonth,
}: {
  projectId: string;
  label: string;
  isActive: boolean;
  dates: string[];
  currentMonth: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className={cn(
          "relative flex h-12 items-center gap-1 px-4 text-sm font-medium transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {label}
        {currentMonth && (
          <span className="ml-1 text-xs text-muted-foreground">
            ({currentMonth})
          </span>
        )}
        <ChevronDown className="size-3.5" />
        {isActive && (
          <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-primary" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-0 max-h-80 w-44 overflow-y-auto rounded-b-lg border border-border bg-popover shadow-lg">
          <Link
            href={`/projects/${projectId}/documents/invoice`}
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
            }}
            className={cn(
              "block px-3 py-2 text-sm hover:bg-muted",
              !currentMonth ? "font-semibold text-primary" : "text-foreground"
            )}
          >
            すべての請求書
          </Link>
          <div className="border-t border-border" />
          {dates.map((d) => (
            <Link
              key={d}
              href={`/projects/${projectId}/documents/invoice?month=${d}`}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
              }}
              className={cn(
                "block px-3 py-2 text-sm hover:bg-muted",
                currentMonth === d
                  ? "font-semibold text-primary"
                  : "text-foreground"
              )}
            >
              {d}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = Object.fromEntries(
  TABS.map((t) => [t.type, t.label])
) as Record<DocumentType, string>;

export const DOCUMENT_TYPES = TABS.map((t) => t.type);
