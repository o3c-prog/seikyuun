import {
  ORDER_STATUS_LABELS,
  PROGRESS_LABELS,
  type OrderStatus,
  type Progress,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  estimating: "bg-sky-100 text-sky-700",
  ordered: "bg-emerald-100 text-emerald-700",
  lost: "bg-rose-100 text-rose-700",
};

const PROGRESS_STYLES: Record<Progress, string> = {
  not_started: "bg-zinc-100 text-zinc-600",
  in_progress: "bg-blue-100 text-blue-700",
  delivered: "bg-amber-100 text-amber-700",
  accepted: "bg-emerald-100 text-emerald-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        ORDER_STATUS_STYLES[status]
      )}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}

export function ProgressBadge({ progress }: { progress: Progress }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
        PROGRESS_STYLES[progress]
      )}
    >
      {PROGRESS_LABELS[progress]}
    </span>
  );
}
