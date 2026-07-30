"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Complaint, Status, User } from "@/types";
import { getTimeAgo } from "@/lib/utils";
import { FileText, ShieldCheck, AlertTriangle, UserCheck, Check, Edit, X } from "lucide-react";

const statusColor: Record<string, string> = {
  open: "#3b82f6", assigned: "#8b5cf6", in_progress: "#f59e0b",
  resolved: "#10b981", closed: "#6b7280", escalated: "#ef4444",
};
const statusLabel: Record<string, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed", escalated: "Escalated",
};
const priorityColor: Record<string, string> = {
  low: "#6b7280", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"manage" | "analytics">("analytics");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error("Please log in to access the Admin Portal.");
        router.push("/login");
        return;
      }
      if (user.role !== "admin") {
        toast.error(`Access denied. ${user.role.toUpperCase()} role cannot access Admin Portal.`);
        if (user.role === "worker") {
          router.push("/worker");
        } else {
          router.push("/");
        }
        return;
      }
      loadAdminData();
    }
  }, [user, authLoading, router]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [compRes, workerRes, analyticsRes] = await Promise.all([
        api.getComplaints(),
        api.getWorkers(),
        api.getAnalytics(),
      ]);
      setComplaints(compRes);
      setWorkers(workerRes);
      setAnalytics(analyticsRes);
    } catch (err: any) {
      toast.error("Failed to load admin data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (c: Complaint) => {
    try {
      const newWorkerId = assignMap[c.id];
      const newStatus = statusMap[c.id];

      if (newWorkerId && newWorkerId !== c.assignedTo?.id) {
        await api.assignWorker(c.id, newWorkerId);
      }
      if (newStatus && newStatus !== c.status) {
        await api.updateStatus(c.id, newStatus);
      }

      toast.success(`${c.id} updated successfully!`);
      setExpandedId(null);
      await loadAdminData();
    } catch (err: any) {
      toast.error("Update failed: " + err.message);
    }
  };

  const handleEscalate = async (c: Complaint) => {
    try {
      await api.escalateComplaint(c.id, "critical", "Admin priority override to Critical");
      toast.error(`Complaint ${c.id} escalated to Critical priority!`);
      await loadAdminData();
    } catch (err: any) {
      toast.error("Escalation failed: " + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted, #64748b)" }}>
        <div style={{ fontWeight: 600 }}>Loading Admin Operations Panel...</div>
      </div>
    );
  }

  const categoryBreakdown = analytics?.categoryCounts
    ? Object.keys(analytics.categoryCounts).map((cat) => ({
        name: cat.toUpperCase(),
        count: analytics.categoryCounts[cat],
      }))
    : [];

  const priorityBreakdown = analytics?.priorityCounts
    ? Object.keys(analytics.priorityCounts).map((p) => ({
        name: p.toUpperCase(),
        count: analytics.priorityCounts[p],
      }))
    : [];

  return (
    <div>
      {/* Title & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "var(--text-heading, #0f172a)" }}>Admin Command Center</h1>
          <p style={{ margin: 0, color: "var(--text-muted, #64748b)", fontSize: 14 }}>Real-time stats, SLA tracking, worker allocation & complaint escalations</p>
        </div>

        <div style={{ display: "flex", gap: 8, background: "var(--bg-card-subtle, #e2e8f0)", padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === "analytics" ? "#1e40af" : "transparent",
              color: activeTab === "analytics" ? "#fff" : "var(--text-muted, #475569)",
            }}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === "manage" ? "#1e40af" : "transparent",
              color: activeTab === "manage" ? "#fff" : "var(--text-muted, #475569)",
            }}
          >
            Manage Complaints ({complaints.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
        {[
          { label: "Total Complaints", value: analytics?.stats?.total ?? 0, color: "#6366f1", icon: FileText },
          { label: "SLA Compliance Rate", value: `${analytics?.stats?.slaComplianceRate ?? 100}%`, color: "#10b981", icon: ShieldCheck },
          { label: "Escalated Issues", value: analytics?.stats?.escalated ?? 0, color: "#ef4444", icon: AlertTriangle },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="card" style={{ padding: "20px 16px", textAlign: "center", borderTop: `4px solid ${s.color}` }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
                <Icon className="w-6 h-6" style={{ color: s.color }} />
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted, #64748b)", marginTop: 2, fontWeight: 600 }}>{s.label}</div>
            </div>
          );
        })}
      </div>

      {/* Analytics / Overview View */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Categorization & Priority Data Metrics */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Category Breakdown Metric Table */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-heading, #1e293b)" }}>
                Issue Category Breakdown
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {categoryBreakdown.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No category metrics recorded.</div>
                ) : (
                  categoryBreakdown.map((cat) => (
                    <div key={cat.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-card-subtle)", borderRadius: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{cat.name}</span>
                      <span style={{ background: "#1e40af", color: "#fff", padding: "2px 10px", borderRadius: 100, fontSize: 12, fontWeight: 800 }}>
                        {cat.count} issue{cat.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Priority Level Metric Table */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-heading, #1e293b)" }}>
                Priority Distribution
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {priorityBreakdown.length === 0 ? (
                  <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No priority metrics recorded.</div>
                ) : (
                  priorityBreakdown.map((p) => (
                    <div key={p.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "var(--bg-card-subtle)", borderRadius: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</span>
                      <span style={{
                        background: p.name === "CRITICAL" ? "#ef4444" : p.name === "HIGH" ? "#f59e0b" : "#3b82f6",
                        color: "#fff", padding: "2px 10px", borderRadius: 100, fontSize: 12, fontWeight: 800
                      }}>
                        {p.count} complaint{p.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Worker Leaderboard */}
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "var(--text-heading, #1e293b)" }}>
              Maintenance Staff Overview
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--bg-card-subtle, #f8fafc)", textAlign: "left", color: "var(--text-muted, #64748b)", borderBottom: "1.5px solid var(--border-main, #e2e8f0)" }}>
                    <th style={{ padding: "10px 14px" }}>Technician</th>
                    <th style={{ padding: "10px 14px" }}>Department</th>
                    <th style={{ padding: "10px 14px" }}>Assigned Jobs</th>
                    <th style={{ padding: "10px 14px" }}>Resolved Jobs</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.workerStats?.map((w: any, idx: number) => (
                    <tr key={w.id} style={{ borderBottom: "1px solid var(--border-main, #f1f5f9)" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--text-heading, #0f172a)" }}>
                        {idx + 1}. {w.name}
                      </td>
                      <td style={{ padding: "12px 14px", color: "var(--text-muted, #475569)" }}>{w.department}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{w.assignedCount}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#10b981" }}>{w.resolvedCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Complaints Management View */}
      {activeTab === "manage" && (
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-main, #f1f5f9)", fontWeight: 700, fontSize: 15, background: "var(--bg-card-subtle, #f8fafc)" }}>
            All Campus Complaints ({complaints.length})
          </div>

          {complaints.map((c, i) => (
            <div key={c.id} style={{ borderBottom: i < complaints.length - 1 ? "1px solid var(--border-main, #f1f5f9)" : "none" }}>
              <div className="admin-row" style={{ padding: "14px 20px" }}>
                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-heading, #0f172a)", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor[c.priority], flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted, #64748b)" }}>
                    {c.id} · {c.category} · {getTimeAgo(c.createdAt)}
                    {c.assignedTo ? (
                      <span style={{ color: "#2563eb", marginLeft: 8 }}>Technician: {c.assignedTo.name}</span>
                    ) : (
                      <span style={{ color: "#d97706", marginLeft: 8, fontWeight: 700 }}>Unassigned</span>
                    )}
                  </div>
                </div>

                {/* Status + Actions */}
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    background: statusColor[c.status] + "18",
                    color: statusColor[c.status],
                    border: `1px solid ${statusColor[c.status]}40`,
                    borderRadius: 100, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    {statusLabel[c.status]}
                  </span>

                  <button onClick={() => handleEscalate(c)} title="Escalate Priority to Critical" style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: "1.5px solid #fca5a5", color: "#dc2626", background: "var(--bg-card, #fff5f5)", cursor: "pointer",
                  }}>Escalate</button>

                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: "1.5px solid #bfdbfe", color: "#1e40af", background: "var(--bg-card, #eff6ff)", cursor: "pointer",
                  }}>
                    {expandedId === c.id ? "Close" : "Manage"}
                  </button>
                </div>
              </div>

              {/* Expanded panel */}
              {expandedId === c.id && (
                <div style={{ padding: "16px 20px 20px", background: "var(--bg-card-subtle, #f8fafc)", borderTop: "1px solid var(--border-main, #e2e8f0)" }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-heading, #334155)", marginBottom: 6 }}>
                        Assign Maintenance Worker
                      </label>
                      <select
                        value={assignMap[c.id] ?? c.assignedTo?.id ?? ""}
                        onChange={(e) => setAssignMap((p) => ({ ...p, [c.id]: e.target.value }))}
                        style={{
                          width: "100%", padding: "10px", border: "1.5px solid var(--input-border, #cbd5e1)",
                          borderRadius: 8, fontSize: 13, outline: "none",
                        }}
                      >
                        <option value="">Select worker...</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.department || "Staff"})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--text-heading, #334155)", marginBottom: 6 }}>
                        Change Complaint Status
                      </label>
                      <select
                        value={statusMap[c.id] ?? c.status}
                        onChange={(e) => setStatusMap((p) => ({ ...p, [c.id]: e.target.value as Status }))}
                        style={{
                          width: "100%", padding: "10px", border: "1.5px solid var(--input-border, #cbd5e1)",
                          borderRadius: 8, fontSize: 13, outline: "none",
                        }}
                      >
                        <option value="open">Open</option>
                        <option value="assigned">Assigned</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                        <option value="escalated">Escalated</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleSave(c)}
                      style={{
                        padding: "10px 20px", background: "#1e40af", color: "#fff",
                        border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => setExpandedId(null)}
                      style={{
                        padding: "10px 16px", background: "var(--bg-card, #fff)", color: "var(--text-muted, #64748b)",
                        border: "1.5px solid var(--input-border, #cbd5e1)", borderRadius: 8, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
