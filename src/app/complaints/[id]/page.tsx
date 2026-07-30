"use client";

import { use } from "react";
import Link from "next/link";
import { MOCK_COMPLAINTS, MOCK_AUDIT_LOGS } from "@/lib/mockData";
import { CATEGORIES } from "@/lib/constants";
import { formatDate, getTimeAgo } from "@/lib/utils";

const statusColor: Record<string, string> = {
  open: "#3b82f6", assigned: "#8b5cf6", in_progress: "#f59e0b",
  resolved: "#10b981", closed: "#6b7280", escalated: "#ef4444",
};
const statusLabel: Record<string, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed", escalated: "🚨 Escalated",
};
const priorityColor: Record<string, string> = {
  low: "#6b7280", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};

export default function ComplaintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = MOCK_COMPLAINTS.find((x) => x.id === id);
  const logs = MOCK_AUDIT_LOGS.filter((l) => l.complaintId === id);
  const category = CATEGORIES.find((cat) => cat.id === c?.category);

  if (!c) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>😕</div>
      <h2>Complaint not found</h2>
      <Link href="/complaints">← Go back</Link>
    </div>
  );

  const slaMs = new Date(c.slaDeadline).getTime() - Date.now();
  const slaHours = Math.floor(Math.abs(slaMs) / 3600000);
  const slaMins = Math.floor((Math.abs(slaMs) % 3600000) / 60000);
  const slaOver = slaMs < 0;
  const slaColor = slaOver ? "#ef4444" : slaMs < 3600000 ? "#f59e0b" : "#10b981";

  return (
    <div>
      <Link href="/complaints" style={{ textDecoration: "none", color: "#6b7280", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        ← Back
      </Link>

      {/* Title card */}
      <div className="card" style={{ padding: "20px 24px", marginBottom: 14, borderLeft: `5px solid ${priorityColor[c.priority]}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>
              {c.id} · {category?.icon} {category?.label}
            </div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "#111", lineHeight: 1.4 }}>{c.title}</h1>
            <div style={{ marginTop: 8, fontSize: 13, color: "#6b7280" }}>
              By <strong>{c.submittedBy.name}</strong> · {getTimeAgo(c.createdAt)}
            </div>
          </div>
          <span style={{
            background: statusColor[c.status] + "18", color: statusColor[c.status],
            border: `1.5px solid ${statusColor[c.status]}40`,
            borderRadius: 100, padding: "7px 16px", fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>
            {statusLabel[c.status]}
          </span>
        </div>
      </div>

      {/* SLA Timer */}
      <div style={{
        background: slaOver ? "#fff5f5" : "#f0fdf4",
        border: `1.5px solid ${slaColor}40`,
        borderRadius: 14, padding: "16px 20px", marginBottom: 14,
        display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ fontSize: 28, flexShrink: 0 }}>{slaOver ? "⏰" : "🟢"}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: slaColor }}>
            {slaOver ? `SLA Breached! ${slaHours}h ${slaMins}m overdue` : `${slaHours}h ${slaMins}m remaining`}
          </div>
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
            Deadline: {formatDate(c.slaDeadline)}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="card" style={{ padding: "20px", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>📝 Description</div>
        <p style={{ margin: 0, fontSize: 14, color: "#374151", lineHeight: 1.7 }}>{c.description}</p>

        {/* Details grid — 2 col desktop, 1 col mobile */}
        <div className="detail-grid">
          {c.location && (
            <div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>📍 Location</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.location}</div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>👤 Assigned To</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: c.assignedTo ? "#111" : "#f59e0b" }}>
              {c.assignedTo ? c.assignedTo.name : "⏳ Pending"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>🚦 Priority</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: priorityColor[c.priority], textTransform: "capitalize" }}>
              {c.priority}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 4 }}>📅 Submitted</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{formatDate(c.createdAt)}</div>
          </div>
        </div>
      </div>

      {/* Audit Trail */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>📜 Timeline</div>

        <div style={{ display: "flex", gap: 14, marginBottom: 14 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "#eff6ff", color: "#1e40af",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, fontSize: 11, flexShrink: 0,
          }}>{c.submittedBy.avatar}</div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{c.submittedBy.name}</div>
            <div style={{ fontSize: 13, color: "#6b7280" }}>Submitted complaint</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{getTimeAgo(c.createdAt)}</div>
          </div>
        </div>

        {logs.length === 0 && (
          <div style={{ textAlign: "center", padding: "16px", color: "#9ca3af", fontSize: 14 }}>
            No updates yet — our team will respond soon
          </div>
        )}

        {logs.map((log) => (
          <div key={log.id} style={{ display: "flex", gap: 14, paddingTop: 14, borderTop: "1px solid #f1f5f9", marginTop: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "#f8fafc", border: "1.5px solid #e2e8f0",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 11, flexShrink: 0, color: "#374151",
            }}>{log.changedBy.avatar}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{log.changedBy.name}</div>
              <div style={{ fontSize: 13, color: "#6b7280" }}>
                <span style={{ color: "#f59e0b", fontWeight: 600 }}>{log.oldStatus?.replace("_", " ")}</span>
                {" "}→{" "}
                <span style={{ color: "#10b981", fontWeight: 600 }}>{log.newStatus?.replace("_", " ")}</span>
              </div>
              {log.comment && (
                <div style={{ marginTop: 6, fontSize: 13, color: "#374151", background: "#f8fafc", borderRadius: 8, padding: "8px 12px", borderLeft: "3px solid #e2e8f0" }}>
                  "{log.comment}"
                </div>
              )}
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>{getTimeAgo(log.timestamp)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
