"use client";

import { useState } from "react";
import Link from "next/link";
import { MOCK_COMPLAINTS } from "@/lib/mockData";

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

export default function ComplaintsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = MOCK_COMPLAINTS.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || c.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>My Complaints</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: 14, marginTop: 4 }}>
            {filtered.length} complaint{filtered.length !== 1 ? "s" : ""} found
          </p>
        </div>
        <Link href="/complaints/new" style={{ textDecoration: "none" }}>
          <button style={{
            background: "#1e40af", color: "#fff", border: "none",
            borderRadius: 10, padding: "12px 20px", fontWeight: 600,
            fontSize: 14, cursor: "pointer",
          }}>
            ➕ Report Issue
          </button>
        </Link>
      </div>

      {/* Search */}
      <div style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
        <input
          type="text"
          placeholder="🔍  Search by title or ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0",
            borderRadius: 10, fontSize: 14, outline: "none",
            boxSizing: "border-box",
          }}
        />

        {/* Status filters */}
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {["all", "open", "assigned", "in_progress", "resolved", "escalated"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: "6px 14px", borderRadius: 100, fontSize: 12,
                fontWeight: 600, cursor: "pointer", border: "1.5px solid",
                borderColor: filterStatus === s ? "#1e40af" : "#e2e8f0",
                background: filterStatus === s ? "#1e40af" : "#fff",
                color: filterStatus === s ? "#fff" : "#374151",
                transition: "all 0.15s",
              }}
            >
              {s === "all" ? "All" : statusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 ? (
          <div style={{
            background: "#fff", borderRadius: 14, padding: "48px 24px",
            textAlign: "center", color: "#9ca3af",
          }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontWeight: 600, fontSize: 16 }}>No complaints found</div>
            <div style={{ fontSize: 14, marginTop: 4 }}>Try a different search</div>
          </div>
        ) : (
          filtered.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: 14, padding: "18px 20px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)", cursor: "pointer",
                borderLeft: `4px solid ${priorityColor[c.priority]}`,
                transition: "box-shadow 0.15s",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1, paddingRight: 16 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#111", marginBottom: 6 }}>
                      {c.title}
                    </div>
                    <div style={{ fontSize: 13, color: "#9ca3af" }}>
                      {c.id} · {c.category} {c.location ? `· 📍 ${c.location}` : ""}
                    </div>
                    {c.assignedTo && (
                      <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
                        👤 Assigned to: <strong>{c.assignedTo.name}</strong>
                      </div>
                    )}
                  </div>
                  <span style={{
                    background: statusColor[c.status] + "18",
                    color: statusColor[c.status],
                    border: `1px solid ${statusColor[c.status]}40`,
                    borderRadius: 100, padding: "5px 14px",
                    fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                  }}>
                    {statusLabel[c.status]}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
