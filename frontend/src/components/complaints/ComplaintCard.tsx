"use client";

import Link from "next/link";
import { MapPin, Clock, User, Paperclip, FileText } from "lucide-react";
import { Complaint } from "@/types";
import { StatusBadge, PriorityBadge } from "./StatusBadge";
import { SLATimer } from "./SLATimer";
import { CATEGORIES } from "@/lib/constants";
import { getTimeAgo, cn } from "@/lib/utils";

interface ComplaintCardProps {
  complaint: Complaint;
}

export function ComplaintCard({ complaint }: ComplaintCardProps) {
  const category = CATEGORIES.find((c) => c.id === complaint.category);
  const isCritical = complaint.priority === "critical" || complaint.status === "escalated";

  return (
    <Link href={`/complaints/${complaint.id}`}>
      <div className={cn("complaint-card", isCritical && "border-red-500/30")}>
        {/* Top row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Category icon */}
            <div
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0",
                category?.bg ?? "bg-gray-400/10"
              )}
            >
              <FileText className="w-4 h-4 text-slate-600" />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight truncate">
                {complaint.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {complaint.id} · {category?.label}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <StatusBadge status={complaint.status} />
            <PriorityBadge priority={complaint.priority} />
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
          {complaint.description}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
          {complaint.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{complaint.location}</span>
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {getTimeAgo(complaint.createdAt)}
          </span>
          {complaint.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {complaint.assignedTo.name}
            </span>
          )}
          {complaint.attachments && complaint.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="w-3 h-3" />
              {complaint.attachments.length}
            </span>
          )}
        </div>

        {/* SLA Timer (compact) */}
        <SLATimer
          deadline={complaint.slaDeadline}
          createdAt={complaint.createdAt}
          compact
        />
      </div>
    </Link>
  );
}
