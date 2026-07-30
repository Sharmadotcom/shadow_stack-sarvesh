"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn, getSLAStatus, getRemainingTime } from "@/lib/utils";
import { Status } from "@/types";

interface SLATimerProps {
  deadline: string;
  createdAt?: string;
  approvalRequestedAt?: string;
  status?: Status;
  compact?: boolean;
}

export function SLATimer({ deadline, createdAt, approvalRequestedAt, status, compact = false }: SLATimerProps) {
  const [, setTick] = useState(0);

  // Re-render every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (status === "pending_approval") {
    const requestedTime = approvalRequestedAt ? new Date(approvalRequestedAt).getTime() : Date.now();
    const expiresAt = requestedTime + 8 * 60 * 60 * 1000;
    const diffMs = expiresAt - Date.now();

    if (diffMs <= 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 p-2 rounded-lg border border-indigo-200">
          <Clock className="w-4 h-4 text-indigo-600 animate-pulse" />
          <span>Deemed Satisfied & Closed (8h Window Expired)</span>
        </div>
      );
    }

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diffMs % (1000 * 60)) / 1000);

    return (
      <div className="flex flex-col text-left bg-indigo-50 p-2.5 rounded-xl border border-indigo-200 min-w-[150px]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-1">
          <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
          <span>Approval Window</span>
        </div>
        <div className="text-sm font-extrabold text-indigo-900 tabular-nums">
          {hours}h {mins}m {secs}s
        </div>
        <div className="text-[10px] font-semibold text-indigo-600 mt-0.5">
          Auto-closes if no response in 8h
        </div>
      </div>
    );
  }

  const slaStatus = getSLAStatus(deadline);
  const { text, isOver } = getRemainingTime(deadline);

  const createdTime = createdAt ? new Date(createdAt).getTime() : new Date(deadline).getTime() - 24 * 60 * 60 * 1000;
  const totalMs = Math.max(1, new Date(deadline).getTime() - createdTime);
  const remainingMs = new Date(deadline).getTime() - Date.now();
  const progress = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  const config = {
    breached: {
      barColor: "bg-red-500",
      textColor: "text-red-500",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      icon: AlertTriangle,
      label: "SLA Breached",
    },
    critical: {
      barColor: "bg-red-400",
      textColor: "text-red-500",
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/30",
      icon: AlertTriangle,
      label: "Critical",
    },
    warning: {
      barColor: "bg-amber-400",
      textColor: "text-amber-500",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/30",
      icon: Clock,
      label: "Warning",
    },
    ok: {
      barColor: "bg-emerald-400",
      textColor: "text-emerald-500",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/30",
      icon: CheckCircle,
      label: "On Track",
    },
  };

  const c = config[slaStatus];
  const Icon = c.icon;

  if (status === "resolved" || status === "closed") {
    return (
      <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-bold">
        <CheckCircle className="w-4 h-4 text-emerald-600" />
        <span>Resolved on Schedule</span>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs font-bold", c.textColor)}>
        <Icon className={cn("w-3.5 h-3.5", slaStatus === "breached" && "animate-pulse")} />
        <span>{text}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-3 text-left",
        c.bgColor,
        c.borderColor
      )}
      style={{ minWidth: 160 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <div className="flex items-center gap-1.5">
          <Icon
            className={cn(
              "w-4 h-4",
              c.textColor,
              (slaStatus === "breached" || slaStatus === "critical") && "animate-pulse"
            )}
          />
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
            SLA Timer
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
            c.textColor,
            c.bgColor,
            c.borderColor
          )}
        >
          {c.label}
        </span>
      </div>

      {/* Time */}
      <p className={cn("text-lg font-extrabold tabular-nums mb-1", c.textColor)}>
        {text}
      </p>

      {/* Progress bar */}
      {!isOver && (
        <div className="space-y-1">
          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={cn("h-1.5 rounded-full", c.barColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {isOver && (
        <p className="text-[11px] text-red-600 font-bold mt-1">
          Escalated due to SLA breach
        </p>
      )}
    </div>
  );
}
