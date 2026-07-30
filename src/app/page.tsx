"use client";

import Link from "next/link";
import { MOCK_COMPLAINTS, MOCK_STATS } from "@/lib/mockData";

const statusColor: Record<string, string> = {
  open: "#3b82f6", assigned: "#8b5cf6", in_progress: "#f59e0b",
  resolved: "#10b981", closed: "#6b7280", escalated: "#ef4444",
};
const statusLabel: Record<string, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed", escalated: "🚨 Escalated",
};

export default function HomePage() {
  const recent = MOCK_COMPLAINTS.slice(0, 5);
  const urgent = MOCK_COMPLAINTS.filter(
    (c) => c.status === "escalated" || c.priority === "critical"
  );

  return (
    <div>
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{
        background: "#1e40af", color: "#fff",
        borderRadius: 16, padding: "28px 32px", marginBottom: 20,
      }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          👋 Hello, Arjun!
        </div>
        <div style={{ color: "#bfdbfe", fontSize: 14, marginBottom: 20 }}>
          Track and manage your campus complaints easily.
        </div>
        <Link href="/complaints/new" style={{ textDecoration: "none" }}>
          <button style={{
            background: "#fff", color: "#1e40af", border: "none",
            borderRadius: 10, padding: "12px 22px",
            fontWeight: 700, fontSize: 14, cursor: "pointer",
          }}>
            ➕ Report a New Issue
          </button>
        </Link>
      </div>

      {/* Stats — 4 col desktop, 2 col mobile */}
      <div className="stats-grid" style={{ marginBottom: 20 }}>
        {[
          { label: "Total", value: MOCK_STATS.total, color: "#6366f1", emoji: "📋" },
          { label: "Open", value: MOCK_STATS.open, color: "#3b82f6", emoji: "🔵" },
          { label: "Resolved", value: MOCK_STATS.resolved, color: "#10b981", emoji: "✅" },
          { label: "Escalated", value: MOCK_STATS.escalated, color: "#ef4444", emoji: "🚨" },
        ].map((s) => (
          <div key={s.label} className="card" style={{
            padding: "18px 12px", textAlign: "center",
            borderTop: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent */}
      {urgent.length > 0 && (
        <div style={{
          background: "#fff5f5", border: "1.5px solid #fca5a5",
          borderRadius: 14, padding: "16px 20px", marginBottom: 20,
        }}>
          <div style={{ fontWeight: 700, color: "#dc2626", marginBottom: 12, fontSize: 14 }}>
            🚨 Needs Immediate Attention ({urgent.length})
          </div>
          {urgent.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#fff", borderRadius: 10, padding: "12px 16px",
                marginBottom: 8, borderLeft: "4px solid #ef4444",
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#6b7280", marginTop: 3 }}>
                  {c.id} {c.location ? `· 📍 ${c.location}` : ""}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent complaints */}
      <div className="card" style={{ padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📋 Recent Complaints</div>
        {recent.map((c) => (
          <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
            <div className="complaint-row" style={{
              padding: "14px 0", borderBottom: "1px solid #f1f5f9",
            }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "#111" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 3 }}>
                  {c.id} · {c.category}
                </div>
              </div>
              <span style={{
                background: statusColor[c.status] + "18",
                color: statusColor[c.status],
                border: `1px solid ${statusColor[c.status]}40`,
                borderRadius: 100, padding: "4px 12px",
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
              }}>
                {statusLabel[c.status]}
              </span>
            </div>
          </Link>
        ))}
        <Link href="/complaints" style={{ textDecoration: "none" }}>
          <div style={{ textAlign: "center", marginTop: 16, color: "#1e40af", fontWeight: 600, fontSize: 14 }}>
            View all complaints →
          </div>
        </Link>
      </div>
    </div>
  );
}
