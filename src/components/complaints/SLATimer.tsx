"use client";

import { useState, useEffect } from "react";
import { Clock, AlertTriangle, CheckCircle } from "lucide-react";
import { cn, getSLAStatus, getRemainingTime } from "@/lib/utils";

interface SLATimerProps {
  deadline: string;
  createdAt: string;
  compact?: boolean;
}

export function SLATimer({ deadline, createdAt, compact = false }: SLATimerProps) {
  const [, setTick] = useState(0);

  // Re-render every second
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const slaStatus = getSLAStatus(deadline);
  const { text, isOver } = getRemainingTime(deadline);

  const totalMs = new Date(deadline).getTime() - new Date(createdAt).getTime();
  const remainingMs = new Date(deadline).getTime() - Date.now();
  const progress = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

  const config = {
    breached: {
      barColor: "bg-red-500",
      textColor: "text-red-400",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/30",
      icon: AlertTriangle,
      label: "SLA Breached",
    },
    critical: {
      barColor: "bg-red-400",
      textColor: "text-red-400",
      bgColor: "bg-red-400/10",
      borderColor: "border-red-400/30",
      icon: AlertTriangle,
      label: "Critical",
    },
    warning: {
      barColor: "bg-amber-400",
      textColor: "text-amber-400",
      bgColor: "bg-amber-400/10",
      borderColor: "border-amber-400/30",
      icon: Clock,
      label: "Warning",
    },
    ok: {
      barColor: "bg-emerald-400",
      textColor: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
      borderColor: "border-emerald-400/30",
      icon: CheckCircle,
      label: "On Track",
    },
  };

  const c = config[slaStatus];
  const Icon = c.icon;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5 text-xs", c.textColor)}>
        <Icon className={cn("w-3 h-3", slaStatus === "breached" && "animate-pulse")} />
        <span className="font-medium">{text}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        c.bgColor,
        c.borderColor,
        slaStatus === "critical" && "critical-pulse"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "w-4 h-4",
              c.textColor,
              (slaStatus === "breached" || slaStatus === "critical") &&
                "animate-pulse"
            )}
          />
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            SLA Timer
          </span>
        </div>
        <span
          className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full border",
            c.textColor,
            c.bgColor,
            c.borderColor
          )}
        >
          {c.label}
        </span>
      </div>

      {/* Time */}
      <p className={cn("text-2xl font-bold tabular-nums mb-3", c.textColor)}>
        {text}
      </p>

      {/* Progress bar */}
      {!isOver && (
        <div className="space-y-1">
          <div className="w-full bg-muted/50 rounded-full h-2 overflow-hidden">
            <div
              className={cn("sla-bar h-2", c.barColor)}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground">
            {Math.round(progress)}% time remaining
          </p>
        </div>
      )}

      {isOver && (
        <p className="text-xs text-red-400 font-medium">
          ⚠️ This complaint has been automatically escalated
        </p>
      )}
    </div>
  );
}
