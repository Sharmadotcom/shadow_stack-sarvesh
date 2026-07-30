"use client";

import { cn } from "@/lib/utils";
import { STATUSES, PRIORITIES } from "@/lib/constants";
import { Status, Priority } from "@/types";

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

interface PriorityBadgeProps {
  priority: Priority;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUSES.find((s) => s.id === status);
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
        config.bg,
        config.color,
        config.border,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full", config.bg, "opacity-100")}>
        <span className={cn("block w-1.5 h-1.5 rounded-full", {
          "bg-sky-400": status === "open",
          "bg-violet-400": status === "assigned",
          "bg-amber-400": status === "in_progress",
          "bg-emerald-400": status === "resolved",
          "bg-gray-400": status === "closed",
          "bg-red-400 animate-pulse": status === "escalated",
        })} />
      </span>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = PRIORITIES.find((p) => p.id === priority);
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border",
        config.bg,
        config.color,
        config.border,
        className
      )}
    >
      {config.label}
    </span>
  );
}
