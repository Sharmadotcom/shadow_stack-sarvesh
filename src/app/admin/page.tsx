"use client";

import { useState } from "react";
import { toast } from "sonner";
import { MOCK_COMPLAINTS } from "@/lib/mockData";
import { STATUSES } from "@/lib/constants";
import { Complaint, Status } from "@/types";
import { getTimeAgo } from "@/lib/utils";

const STAFF = [
  { id: "s1", name: "IT Department" },
  { id: "s2", name: "Maintenance Team A" },
  { id: "s3", name: "Maintenance Team B" },
  { id: "s4", name: "Transport Office" },
  { id: "s5", name: "Canteen Manager" },
  { id: "s6", name: "Security Office" },
];

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

const selectStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", border: "1.5px solid #e2e8f0",
  borderRadius: 10, fontSize: 13, outline: "none", background: "#fff",
  boxSizing: "border-box", fontFamily: "Inter, sans-serif",
};

export default function AdminPage() {
  const [complaints, setComplaints] = useState(MOCK_COMPLAINTS);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    unassigned: complaints.filter((c) => !c.assignedTo).length,
    escalated: complaints.filter((c) => c.status === "escalated").length,
  };

  const handleSave = (c: Complaint) => {
    setComplaints((prev) => prev.map((x) =>
      x.id !== c.id ? x : {
        ...x,
        status: statusMap[c.id] ?? x.status,
        assignedTo: assignMap[c.id]
          ? { id: assignMap[c.id], name: STAFF.find((s) => s.id === assignMap[c.id])?.name ?? "", email: "", role: "staff" as const, avatar: "ST" }
          : x.assignedTo,
      }
    ));
    toast.success(`${c.id} updated successfully`);
    setExpandedId(null);
  };

  const handleEscalate = (c: Complaint) => {
    setComplaints((prev) => prev.map((x) => x.id === c.id ? { ...x, status: "escalated" } : x));
    toast.error(`${c.id} escalated to Department Head!`);
  };

  return (
    <div>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>⚙️ Admin Panel</h1>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>Assign complaints to staff and update their status</p>

      {/* Stats — 2 col mobile, 4 col desktop */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Total", value: stats.total, color: "#6366f1" },
          { label: "Open", value: stats.open, color: "#3b82f6" },
          { label: "Unassigned", value: stats.unassigned, color: "#f59e0b" },
          { label: "Escalated", value: stats.escalated, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "16px", textAlign: "center", borderTop: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Complaints list */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15 }}>
          All Complaints
        </div>

        {complaints.map((c, i) => (
          <div key={c.id} style={{ borderBottom: i < complaints.length - 1 ? "1px solid #f1f5f9" : "none" }}>
            {/* Row */}
            <div className="admin-row">
              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor[c.priority], flexShrink: 0 }} />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                </div>
                <div style={{ fontSize: 12, color: "#9ca3af" }}>
                  {c.id} · {getTimeAgo(c.createdAt)}
                  {!c.assignedTo && <span style={{ color: "#f59e0b", marginLeft: 8 }}>⚠ Unassigned</span>}
                </div>
              </div>

              {/* Status + Actions */}
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{
                  background: statusColor[c.status] + "18",
                  color: statusColor[c.status],
                  border: `1px solid ${statusColor[c.status]}40`,
                  borderRadius: 100, padding: "4px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
                }}>
                  {statusLabel[c.status]}
                </span>
                <div className="admin-row-actions" style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleEscalate(c)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff5f5", cursor: "pointer",
                  }}>🚨</button>
                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600,
                    border: "1.5px solid #bfdbfe", color: "#1e40af", background: "#eff6ff", cursor: "pointer",
                  }}>
                    {expandedId === c.id ? "✕" : "✏️ Manage"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expanded panel */}
            {expandedId === c.id && (
              <div style={{ padding: "14px 20px 18px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                <div className="admin-manage-grid">
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>👤 Assign to</label>
                    <select value={assignMap[c.id] ?? ""} onChange={(e) => setAssignMap((p) => ({ ...p, [c.id]: e.target.value }))} style={selectStyle}>
                      <option value="">Select staff...</option>
                      {STAFF.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 6 }}>🔄 Status</label>
                    <select value={statusMap[c.id] ?? c.status} onChange={(e) => setStatusMap((p) => ({ ...p, [c.id]: e.target.value as Status }))} style={selectStyle}>
                      {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <button onClick={() => handleSave(c)} style={{
                      padding: "10px 20px", background: "#1e40af", color: "#fff",
                      border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      fontFamily: "Inter, sans-serif",
                    }}>✅ Save</button>
                    <button onClick={() => setExpandedId(null)} style={{
                      padding: "10px 14px", background: "#fff", color: "#6b7280",
                      border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 13, cursor: "pointer",
                    }}>Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
