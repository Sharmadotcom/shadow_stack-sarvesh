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

  const loadAdminData = async () => {
    setLoading(true);
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
      {/* Header & Tabs */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>Admin Control Center</h1>
          <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Real-time analytics, issue management, worker allocation & user administration</p>
        </div>

        <div style={{ display: "flex", gap: 6, background: "#e2e8f0", padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setActiveTab("analytics")}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === "analytics" ? "#1e40af" : "transparent",
              color: activeTab === "analytics" ? "#fff" : "#475569",
            }}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab("manage")}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === "manage" ? "#1e40af" : "transparent",
              color: activeTab === "manage" ? "#fff" : "#475569",
            }}
          >
            Manage Issues ({complaints.length})
          </button>
          <button
            onClick={() => setActiveTab("users")}
            style={{
              padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer",
              background: activeTab === "users" ? "#1e40af" : "transparent",
              color: activeTab === "users" ? "#fff" : "#475569",
            }}
          >
            User Management ({allUsers.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        {[
          { label: "Total Complaints", value: analytics?.stats?.total ?? 0, color: "#6366f1" },
          { label: "SLA Compliance Rate", value: `${analytics?.stats?.slaComplianceRate ?? 100}%`, color: "#10b981" },
          { label: "Escalated Issues", value: analytics?.stats?.escalated ?? 0, color: "#ef4444" },
          { label: "Registered Users", value: allUsers.length, color: "#06b6d4" },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: "18px 16px", textAlign: "center", borderTop: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* TAB 1: ANALYTICS DASHBOARD */}
      {activeTab === "analytics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Category Pie Chart */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                Issue Categories Distribution
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Priority Bar Chart */}
            <div className="card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
                Priority Levels Breakdown
              </h3>
              <div style={{ width: "100%", height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={priorityChartData}>
                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[6, 6, 0, 0]}>
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
          <div className="card" style={{ padding: "20px" }}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 700, color: "#1e293b" }}>
              Maintenance Staff Performance Leaderboard
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left", color: "#64748b", borderBottom: "1.5px solid #e2e8f0" }}>
                    <th style={{ padding: "10px 14px" }}>Technician</th>
                    <th style={{ padding: "10px 14px" }}>Department</th>
                    <th style={{ padding: "10px 14px" }}>Assigned Jobs</th>
                    <th style={{ padding: "10px 14px" }}>Resolved</th>
                    <th style={{ padding: "10px 14px" }}>Service Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics?.workerStats?.map((w: any, idx: number) => (
                    <tr key={w.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>
                        #{idx + 1} {w.name}
                      </td>
                      <td style={{ padding: "12px 14px", color: "#475569" }}>{w.department}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 600 }}>{w.assignedCount}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#10b981" }}>{w.resolvedCount}</td>
                      <td style={{ padding: "12px 14px", fontWeight: 700, color: "#f59e0b" }}>
                        {w.avgRating} / 5.0
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
        <div className="card" style={{ overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid #f1f5f9", fontWeight: 700, fontSize: 15, background: "#f8fafc" }}>
            All Campus Complaints ({complaints.length})
          </div>

          {complaints.map((c, i) => (
            <div key={c.id} style={{ borderBottom: i < complaints.length - 1 ? "1px solid #f1f5f9" : "none" }}>
              <div className="admin-row" style={{ padding: "14px 20px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityColor[c.priority], flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {c.id} · {c.category} · {getTimeAgo(c.createdAt)}
                    {c.assignedTo ? (
                      <span style={{ color: "#2563eb", marginLeft: 8 }}>{c.assignedTo.name}</span>
                    ) : (
                      <span style={{ color: "#d97706", marginLeft: 8, fontWeight: 700 }}>Unassigned</span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <span style={{
                    background: statusColor[c.status] + "18",
                    color: statusColor[c.status],
                    border: `1px solid ${statusColor[c.status]}40`,
                    borderRadius: 100, padding: "4px 10px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap",
                  }}>
                    {statusLabel[c.status]}
                  </span>

                  <button onClick={() => handleEscalateComplaint(c)} title="Escalate Priority to Critical" style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: "1.5px solid #fca5a5", color: "#dc2626", background: "#fff5f5", cursor: "pointer",
                  }}>Escalate</button>

                  <button onClick={() => setExpandedId(expandedId === c.id ? null : c.id)} style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700,
                    border: "1.5px solid #bfdbfe", color: "#1e40af", background: "#eff6ff", cursor: "pointer",
                  }}>
                    {expandedId === c.id ? "Close" : "Manage"}
                  </button>
                </div>
              </div>

              {expandedId === c.id && (
                <div style={{ padding: "16px 20px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        Assign Maintenance Worker
                      </label>
                      <select
                        value={assignMap[c.id] ?? c.assignedTo?.id ?? ""}
                        onChange={(e) => setAssignMap((p) => ({ ...p, [c.id]: e.target.value }))}
                        style={{
                          width: "100%", padding: "10px", border: "1.5px solid #cbd5e1",
                          borderRadius: 8, fontSize: 13, background: "#fff", outline: "none",
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
                    <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#334155", marginBottom: 4 }}>Maintenance Department</label>
                    <input
                      type="text"
                      placeholder="e.g. Electrical Maintenance or Plumbing Department"
                      value={newUserDept}
                      onChange={(e) => setNewUserDept(e.target.value)}
                      style={{ width: "100%", padding: "10px", border: "1.5px solid #cbd5e1", borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box" }}
                    />
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
