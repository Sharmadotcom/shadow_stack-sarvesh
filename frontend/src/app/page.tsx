"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Complaint } from "@/types";
import { getTimeAgo } from "@/lib/utils";

const statusColor: Record<string, string> = {
  open: "#3b82f6", assigned: "#8b5cf6", in_progress: "#f59e0b",
  resolved: "#10b981", closed: "#6b7280", escalated: "#ef4444",
};
const statusLabel: Record<string, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed", escalated: "🚨 Escalated",
};

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      if (user?.role === "admin") {
        router.push("/admin");
        return;
      }
      if (user?.role === "worker") {
        router.push("/worker");
        return;
      }
      fetchData();
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (user) {
        const data = await api.getComplaints();
        setComplaints(data);
      }
    } catch (err) {
      console.error("Failed to load homepage data:", err);
    } finally {
      setLoading(false);
    }
  };

  const recent = complaints.slice(0, 5);
  const urgent = complaints.filter(
    (c) => c.status === "escalated" || c.priority === "critical"
  );

  const stats = {
    total: complaints.length,
    open: complaints.filter((c) => c.status === "open").length,
    inProgress: complaints.filter((c) => c.status === "in_progress" || c.status === "assigned").length,
    resolved: complaints.filter((c) => c.status === "resolved" || c.status === "closed").length,
    escalated: complaints.filter((c) => c.status === "escalated" || c.priority === "critical").length,
  };

  if (authLoading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted, #64748b)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎓</div>
        <div style={{ fontWeight: 600 }}>Loading Student Portal...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Welcome Banner */}
      <div className="welcome-banner" style={{
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)", color: "#fff",
        borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        boxShadow: "0 8px 24px rgba(30, 64, 175, 0.2)",
      }}>
        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 6 }}>
          👋 Hello, {user ? user.name : "Student"}!
        </div>
        <div style={{ color: "#dbeafe", fontSize: 14, marginBottom: 20 }}>
          Submit grievances, track repair progress, and rate resolution services in real-time.
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <Link href="/complaints/new" style={{ textDecoration: "none" }}>
            <button style={{
              background: "#fff", color: "#1e40af", border: "none",
              borderRadius: 10, padding: "12px 22px",
              fontWeight: 800, fontSize: 14, cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}>
              ➕ Report a New Issue
            </button>
          </Link>
          <Link href="/complaints" style={{ textDecoration: "none" }}>
            <button style={{
              background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)",
              borderRadius: 10, padding: "12px 20px",
              fontWeight: 700, fontSize: 14, cursor: "pointer",
            }}>
              📋 View My Complaints
            </button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Submitted", value: stats.total, color: "#6366f1", emoji: "📋" },
          { label: "Open & Pending", value: stats.open + stats.inProgress, color: "#3b82f6", emoji: "🔵" },
          { label: "Resolved & Closed", value: stats.resolved, color: "#10b981", emoji: "✅" },
          { label: "Urgent / Escalated", value: stats.escalated, color: "#ef4444", emoji: "🚨" },
        ].map((s) => (
          <div key={s.label} className="card" style={{
            padding: "18px 12px", textAlign: "center",
            borderTop: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>{s.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent Alert Banner if present */}
      {urgent.length > 0 && (
        <div style={{
          background: "var(--bg-card-subtle, #fff5f5)", border: "1.5px solid #fca5a5",
          borderRadius: 16, padding: "18px 20px", marginBottom: 24,
        }}>
          <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 12, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            🚨 High Priority / Escalated Issues ({urgent.length})
          </div>
          {urgent.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "var(--bg-card, #fff)", borderRadius: 12, padding: "12px 16px",
                marginBottom: 8, borderLeft: "4px solid #ef4444", boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-heading, #0f172a)" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 3 }}>
                  {c.id} {c.location ? `· 📍 ${c.location}` : ""} · Priority: <strong style={{ color: "#dc2626" }}>{c.priority.toUpperCase()}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Complaints Card */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text-heading, #0f172a)" }}>📋 Recent Complaints</div>
          <Link href="/complaints" style={{ textDecoration: "none", color: "#1e40af", fontWeight: 700, fontSize: 13 }}>
            View All →
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted, #94a3b8)" }}>Loading complaint updates...</div>
        ) : recent.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted, #94a3b8)" }}>
            No complaints submitted yet. Click <strong>Report a New Issue</strong> to get started.
          </div>
        ) : (
          recent.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div className="complaint-row" style={{
                padding: "14px 0", borderBottom: "1px solid var(--border-main, #f1f5f9)",
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-heading, #0f172a)" }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)", marginTop: 3 }}>
                    {c.id} · Category: <strong>{c.category}</strong> · {getTimeAgo(c.createdAt)}
                  </div>
                </div>
                <span style={{
                  background: statusColor[c.status] + "18",
                  color: statusColor[c.status],
                  border: `1px solid ${statusColor[c.status]}40`,
                  borderRadius: 100, padding: "4px 12px",
                  fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0,
                }}>
                  {statusLabel[c.status]}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
