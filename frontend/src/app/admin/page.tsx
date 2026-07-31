"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Complaint, Status, User, UserRole } from "@/types";
import { getTimeAgo } from "@/lib/utils";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

import { useSocket } from "@/lib/socket";

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

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#ec4899"];

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"analytics" | "manage" | "users">("analytics");
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Manage complaint state
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignMap, setAssignMap] = useState<Record<string, string>>({});
  const [statusMap, setStatusMap] = useState<Record<string, Status>>({});

  // User Management state
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("worker");
  const [newUserDept, setNewUserDept] = useState("");
  const [newUserRollNo, setNewUserRollNo] = useState("");
  const [newUserHostel, setNewUserHostel] = useState("");
  const [creatingUser, setCreatingUser] = useState(false);

  useEffect(() => {
    // Strict RBAC Guard: Only Admins permitted!
    if (!authLoading) {
      if (!user) {
        toast.error("Please sign in to access the Admin Control Center.");
        router.push("/login");
        return;
      }
      if (user.role !== "admin") {
        toast.error(`Access Denied: Role '${user.role}' cannot access Admin Portal.`);
        if (user.role === "worker") router.push("/worker");
        else router.push("/");
        return;
      }
    }

    if (user && user.role === "admin") {
      loadAdminData();
    }
  }, [user, authLoading, router]);

  const loadAdminData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [compRes, workerRes, analyticsRes, usersRes] = await Promise.all([
        api.getComplaints(),
        api.getWorkers(),
        api.getAnalytics(),
        api.getUsers(),
      ]);
      setComplaints(compRes);
      setWorkers(workerRes);
      setAnalytics(analyticsRes);
      setAllUsers(usersRes);
    } catch (err: any) {
      toast.error("Failed to load admin data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Socket.io Real-Time Listener for Admin
  useSocket((eventData: any) => {
    if (user && user.role === "admin") {
      loadAdminData(false);
      if (eventData.message || eventData.complaint?.title) {
        toast.info(`⚡ Live Admin Notification: ${eventData.message || eventData.complaint?.title}`);
      }
    }
  });

  const handleSaveComplaint = async (c: Complaint) => {
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

  const handleEscalateComplaint = async (c: Complaint) => {
    try {
      await api.escalateComplaint(c.id, "critical", "Admin priority override to Critical");
      toast.error(`Complaint ${c.id} escalated to Critical priority!`);
      await loadAdminData();
    } catch (err: any) {
      toast.error("Escalation failed: " + err.message);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);
    try {
      await api.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        department: newUserDept,
        rollNo: newUserRollNo,
        hostel: newUserHostel,
      });

      toast.success(`New ${newUserRole.toUpperCase()} account created successfully!`);
      setShowAddUserModal(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      setNewUserDept("");
      setNewUserRollNo("");
      setNewUserHostel("");
      await loadAdminData();
    } catch (err: any) {
      toast.error("Failed to create user: " + err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to delete user '${userName}'? This action cannot be undone.`)) {
      return;
    }
    try {
      await api.deleteUser(userId);
      toast.success(`User '${userName}' deleted successfully.`);
      await loadAdminData();
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
        <div style={{ fontWeight: 600 }}>Loading Admin Control Center...</div>
      </div>
    );
  }

  const filteredUsers = allUsers.filter((u) => {
    if (userRoleFilter === "all") return true;
    return u.role === userRoleFilter;
  });

  const categoryChartData = analytics?.categoryCounts
    ? Object.keys(analytics.categoryCounts).map((cat) => ({
        name: cat.toUpperCase(),
        value: analytics.categoryCounts[cat],
      }))
    : [];

  const priorityChartData = analytics?.priorityCounts
    ? Object.keys(analytics.priorityCounts).map((p) => ({
        name: p.toUpperCase(),
        count: analytics.priorityCounts[p],
      }))
    : [];

  return (
    <div>
      {/* Header Banner */}
      <div className="hero-gradient" style={{
        padding: "32px 36px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20,
      }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 800, marginBottom: 10, border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444", display: "inline-block" }}></span>
            SYSTEM ADMINISTRATION CONTROL ROOM
          </div>
          <h1 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Admin Control Center
          </h1>
          <p style={{ margin: 0, color: "#cbd5e1", fontSize: 14 }}>
            Real-time analytics, issue management, worker allocation & user administration.
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.1)", padding: 6, borderRadius: 16, border: "1px solid rgba(255,255,255,0.18)", backdropFilter: "blur(10px)" }}>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", transition: "all 0.15s ease",
              background: activeTab === "analytics" ? "#ffffff" : "transparent",
              color: activeTab === "analytics" ? "#0f172a" : "#cbd5e1",
              boxShadow: activeTab === "analytics" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            style={{
              padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", transition: "all 0.15s ease",
              background: activeTab === "manage" ? "#ffffff" : "transparent",
              color: activeTab === "manage" ? "#0f172a" : "#cbd5e1",
              boxShadow: activeTab === "manage" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            Manage Issues ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "10px 18px", borderRadius: 12, fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer", transition: "all 0.15s ease",
              background: activeTab === "users" ? "#ffffff" : "transparent",
              color: activeTab === "users" ? "#0f172a" : "#cbd5e1",
              boxShadow: activeTab === "users" ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
            }}
          >
            User Administration ({allUsers.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 32, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
        {[
          { label: "Total Complaints", value: analytics?.stats?.total ?? 0, color: "#6366f1", bg: "linear-gradient(135deg, #eef2ff 0%, #ffffff 100%)" },
          { label: "SLA Compliance Rate", value: `${analytics?.stats?.slaComplianceRate ?? 100}%`, color: "#10b981", bg: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)" },
          { label: "Escalated Issues", value: analytics?.stats?.escalated ?? 0, color: "#ef4444", bg: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)" },
          { label: "Registered Users", value: allUsers.length, color: "#06b6d4", bg: "linear-gradient(135deg, #ecfeff 0%, #ffffff 100%)" },
        ].map((s) => (
          <div key={s.label} className="glass-panel" style={{
            padding: "24px 20px", textAlign: "center", borderRadius: 20,
            background: s.bg, border: "1px solid rgba(0,0,0,0.04)",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.02)", transition: "transform 0.2s ease"
          }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 8, fontWeight: 700, letterSpacing: "0.02em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TAB 1: ANALYTICS DASHBOARD */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Category Pie Chart */}
            <div className="glass-panel" style={{ padding: "24px", borderRadius: 24, background: "#ffffff", boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Issue Categories Distribution
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={6}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, fontWeight: 600, color: "#475569" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Bar Chart */}
            <div className="glass-panel" style={{ padding: "24px", borderRadius: 24, background: "#ffffff", boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)" }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 18, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                Priority Levels Breakdown
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={priorityChartData}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(0,0,0,0.03)' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 8, 8]} barSize={40}>
                      {priorityChartData.map((entry, index) => (
                        <Cell
                          key={`bar-${index}`}
                          fill={
                            entry.name === "CRITICAL" ? "#ef4444" : entry.name === "HIGH" ? "#f59e0b" : "#3b82f6"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Maintenance Staff Performance Leaderboard */}
          <div className="glass-panel" style={{ padding: "32px", borderRadius: 24, background: "#ffffff", boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)" }}>
            <h3 style={{ margin: "0 0 24px", fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
              Staff Performance Leaderboard
            </h3>
            <div style={{ overflowX: "auto", borderRadius: 16, border: "1px solid #f1f5f9" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", borderBottom: "2px solid #e2e8f0" }}>
                    <th style={{ padding: "14px 20px", fontWeight: 800, letterSpacing: "0.02em" }}>Technician</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, letterSpacing: "0.02em" }}>Department</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, letterSpacing: "0.02em" }}>Assigned Jobs</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, letterSpacing: "0.02em" }}>Resolved</th>
                    <th style={{ padding: "14px 20px", fontWeight: 800, letterSpacing: "0.02em" }}>Service Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.workerStats?.map((w: any, idx: number) => (
                    <tr key={w.id} style={{ borderBottom: "1px solid #f1f5f9", background: idx % 2 === 0 ? "#ffffff" : "#fdfdfd", transition: "background 0.2s ease" }}
                      onMouseOver={(e) => e.currentTarget.style.background = "#f1f5f9"}
                      onMouseOut={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#fdfdfd"}>
                      <td style={{ padding: "16px 20px", fontWeight: 800, color: "#0f172a" }}>
                        <span style={{ color: "#94a3b8", marginRight: 8 }}>#{idx + 1}</span>{w.name}
                      </td>
                      <td style={{ padding: "16px 20px", color: "#64748b", fontWeight: 500, textTransform: "capitalize" }}>{w.department}</td>
                      <td style={{ padding: "16px 20px", fontWeight: 700, color: "#475569" }}>{w.assignedCount}</td>
                      <td style={{ padding: "16px 20px", fontWeight: 800, color: "#10b981" }}>{w.resolvedCount}</td>
                      <td style={{ padding: "16px 20px", fontWeight: 800, color: "#f59e0b" }}>
                        ★ {w.avgRating} / 5.0
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE COMPLAINTS */}
      {activeTab === "manage" && (
        <div className="glass-panel" style={{ borderRadius: 24, background: "#ffffff", boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)", overflow: "hidden" }}>
          <div style={{ padding: "20px 28px", borderBottom: "1px solid #e2e8f0", background: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>
              All Campus Complaints <span style={{ color: "#64748b", fontWeight: 600, fontSize: 14 }}>({complaints.length})</span>
            </div>
          </div>

          {complaints.map((c, i) => (
            <div key={c.id} style={{ borderBottom: i < complaints.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div style={{ padding: "20px 28px", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", justifyContent: "space-between", background: expandedId === c.id ? "#f8fafc" : "#ffffff", transition: "background 0.2s ease" }}
                onMouseOver={(e) => { if (expandedId !== c.id) e.currentTarget.style.background = "#fdfdfd" }}
                onMouseOut={(e) => { if (expandedId !== c.id) e.currentTarget.style.background = "#ffffff" }}
              >
                <div style={{ flex: 1, minWidth: 280 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: priorityColor[c.priority], flexShrink: 0, boxShadow: `0 0 8px ${priorityColor[c.priority]}80` }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b", fontWeight: 500 }}>
                    #{c.id.slice(0, 8)} · <strong style={{ textTransform: "capitalize", color: "#475569" }}>{c.category}</strong> · {getTimeAgo(c.createdAt)}
                    {c.assignedTo ? (
                      <span style={{ color: "#2563eb", marginLeft: 12, fontWeight: 700 }}>👨‍🔧 {c.assignedTo.name}</span>
                    ) : (
                      <span style={{ color: "#d97706", marginLeft: 12, fontWeight: 800, background: "#fef3c7", padding: "2px 8px", borderRadius: 6 }}>Unassigned</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    background: statusColor[c.status] + "15",
                    color: statusColor[c.status],
                    border: `1px solid ${statusColor[c.status]}30`,
                    borderRadius: 100, padding: "6px 14px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
                  }}>
                    {statusLabel[c.status]}
                  </span>

                  <button onClick={() => handleEscalateComplaint(c)} title="Escalate Priority to Critical" style={{
                    padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                    border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff5f5", cursor: "pointer", transition: "all 0.2s"
                  }}>🔥 Escalate</button>

                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 800,
                    border: expandedId === c.id ? "1.5px solid #cbd5e1" : "1.5px solid #bfdbfe",
                    color: expandedId === c.id ? "#475569" : "#1e40af",
                    background: expandedId === c.id ? "#f1f5f9" : "#eff6ff", cursor: "pointer", transition: "all 0.2s"
                  }}>
                    {expandedId === c.id ? "Close Panel" : "Manage Issue"}
                  </button>
                </div>
              </div>

              {expandedId === c.id && (
                <div style={{ padding: "24px 28px", background: "#f8fafc", borderTop: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 20 }}>
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 8, letterSpacing: "0.02em", textTransform: "uppercase" }}>
                        Assign Maintenance Worker
                      </label>
                      <select
                        value={assignMap[c.id] ?? c.assignedTo?.id ?? ""}
                        onChange={(e) => setAssignMap((p) => ({ ...p, [c.id]: e.target.value }))}
                        style={{
                          width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                          borderRadius: 12, fontSize: 14, background: "#ffffff", outline: "none", cursor: "pointer",
                        }}
                      >
                        <option value="">-- Select Worker --</option>
                        {workers.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.department || "Staff"})
                          </option>
                        ))}
                      </select>
                    </div>


                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        Change Complaint Status
                      </label>
                      <select
                        value={statusMap[c.id] ?? c.status}
                        onChange={(e) => setStatusMap((p) => ({ ...p, [c.id]: e.target.value as Status }))}
                        style={{
                          width: "100%", padding: "10px", border: "1.5px solid #cbd5e1",
                          borderRadius: 8, fontSize: 13, background: "#fff", outline: "none",
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
                      onClick={() => handleSaveComplaint(c)}
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
                        padding: "10px 16px", background: "#fff", color: "#64748b",
                        border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, cursor: "pointer",
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

      {/* TAB 3: USER & STAFF MANAGEMENT DASHBOARD */}
      {activeTab === "users" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["all", "student", "worker", "admin"].map((r) => (
                <button
                  key={r}
                  onClick={() => setUserRoleFilter(r)}
                  style={{
                    padding: "6px 14px", borderRadius: 100, fontSize: 12, fontWeight: 700,
                    border: "1.5px solid", cursor: "pointer", textTransform: "capitalize",
                    borderColor: userRoleFilter === r ? "#1e40af" : "#cbd5e1",
                    background: userRoleFilter === r ? "#1e40af" : "#fff",
                    color: userRoleFilter === r ? "#fff" : "#475569",
                  }}
                >
                  {r === "all" ? "All Roles" : r}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddUserModal(true)}
              style={{
                padding: "10px 18px", background: "#10b981", color: "#fff",
                border: "none", borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: "pointer",
                boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
              }}
            >
              Add New User / Worker
            </button>
          </div>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div style={{
              background: "#fff", borderRadius: 16, padding: "24px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.15)", border: "1.5px solid #cbd5e1",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
                  Register New User / Technician
                </h3>
                <button
                  onClick={() => setShowAddUserModal(false)}
                  style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#64748b" }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateUser} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Plumber"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Campus Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. worker@campus.edu"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, background: "#fff", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="student">Student</option>
                    <option value="worker">Maintenance Worker</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                {newUserRole === "worker" && (
                  <div style={{ gridColumn: "span 2" }}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Worker Specialty / Category *</label>
                    <select
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", backgroundColor: "#ffffff", cursor: "pointer" }}
                    >
                      <option value="">Select Worker Category / Department...</option>
                      <option value="electrician">electrician</option>
                      <option value="plumber">plumber</option>
                      <option value="Technician">Technician</option>
                      <option value="Driver">Driver</option>
                      <option value="Security">Security</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                )}

                {newUserRole === "student" && (
                  <>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Roll Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 22CS045"
                        value={newUserRollNo}
                        onChange={(e) => setNewUserRollNo(e.target.value)}
                        style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Hostel / Room</label>
                      <input
                        type="text"
                        placeholder="e.g. Himalaya Block 304"
                        value={newUserHostel}
                        onChange={(e) => setNewUserHostel(e.target.value)}
                        style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                      />
                    </div>
                  </>
                )}

                <div style={{ gridColumn: "span 2", display: "flex", gap: 10, marginTop: 10 }}>
                  <button
                    type="submit"
                    disabled={creatingUser}
                    style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {creatingUser ? "Creating Account..." : "Create User"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddUserModal(false)}
                    style={{ padding: "10px 16px", background: "#fff", color: "#64748b", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* User Table List */}
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15, background: "#f8fafc" }}>
              Campus Users Directory ({filteredUsers.length})
            </div>

            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", borderBottom: "1.5px solid #e2e8f0" }}>
                    <th style={{ padding: "12px 16px" }}>User</th>
                    <th style={{ padding: "12px 16px" }}>Role</th>
                    <th style={{ padding: "12px 16px" }}>Details</th>
                    <th style={{ padding: "12px 16px" }}>Complaints Logged/Assigned</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{
                          padding: "4px 10px", borderRadius: 100, fontSize: 11, fontWeight: 800, textTransform: "uppercase",
                          background: u.role === "admin" ? "#fee2e2" : u.role === "worker" ? "#fef3c7" : "#dbeafe",
                          color: u.role === "admin" ? "#dc2626" : u.role === "worker" ? "#d97706" : "#2563eb",
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", color: "#475569" }}>
                        {u.role === "student"
                          ? `${u.rollNo || "No Roll"} · ${u.hostel || "No Hostel"}`
                          : u.role === "worker"
                          ? u.department || "General Maintenance"
                          : "Campus Administration"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 700, color: "#334155" }}>
                        {u.role === "student"
                          ? `${u._count?.submittedComplaints || 0} Submitted`
                          : u.role === "worker"
                          ? `${u._count?.assignedComplaints || 0} Assigned`
                          : "—"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            style={{
                              padding: "6px 12px", background: "#fff5f5", color: "#dc2626",
                              border: "1.5px solid #fca5a5", borderRadius: 8, fontWeight: 700,
                              fontSize: 12, cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
