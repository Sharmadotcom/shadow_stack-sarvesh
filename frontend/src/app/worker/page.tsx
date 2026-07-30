"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Complaint, Status } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { SLATimer } from "@/components/complaints/SLATimer";

const priorityColor: Record<string, string> = {
  low: "#6b7280", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};

export default function WorkerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"stack" | "assigned" | "resolved">("stack");
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    // Strict RBAC Guard for Worker Portal
    if (!authLoading) {
      if (!user) {
        toast.error("Please sign in as a Worker to access the Worker Portal.");
        router.push("/login");
        return;
      }
      if (user.role !== "worker" && user.role !== "admin") {
        toast.error(`Access Denied: Role '${user.role}' cannot access Worker Portal.`);
        if (user.role === "student") router.push("/");
        return;
      }
    }

    if (user && (user.role === "worker" || user.role === "admin")) {
      fetchWorkerTasks();
    }
  }, [user, authLoading, router]);

  const fetchWorkerTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (err: any) {
      toast.error("Failed to load worker tasks: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTask = async (complaintId: string) => {
    setUpdatingId(complaintId);
    try {
      await api.acceptTask(complaintId);
      toast.success(`Task ${complaintId} accepted & added to your assigned work orders!`);
      await fetchWorkerTasks();
      setActiveTab("assigned");
    } catch (err: any) {
      toast.error("Failed to accept task: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = async (complaintId: string, newStatus: Status) => {
    setUpdatingId(complaintId);
    try {
      const note = noteMap[complaintId] || "";
      await api.updateStatus(complaintId, newStatus, note);
      toast.success(`Task ${complaintId} status updated to ${newStatus.toUpperCase()}`);
      await fetchWorkerTasks();
    } catch (err: any) {
      toast.error("Status update failed: " + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // 1. Unassigned Ticket Stack matching worker's trade
  const unassignedStack = complaints.filter(
    (c) => !(c.assignedToId || c.assignedTo?.id) && c.status !== "resolved" && c.status !== "closed"
  );

  // 2. Tasks explicitly assigned to this worker
  const myAssignedTasks = complaints.filter(
    (c) => ((c.assignedToId === user?.id) || (c.assignedTo?.id === user?.id)) && (c.status === "open" || c.status === "assigned" || c.status === "in_progress" || c.status === "escalated")
  );

  // 3. Completed Tasks by this worker
  const resolvedTasks = complaints.filter(
    (c) => ((c.assignedToId === user?.id) || (c.assignedTo?.id === user?.id)) && (c.status === "resolved" || c.status === "closed")
  );

  const displayed =
    activeTab === "stack"
      ? unassignedStack
      : activeTab === "assigned"
      ? myAssignedTasks
      : resolvedTasks;

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
        <div style={{ fontWeight: 600 }}>Loading maintenance ticket stack & work orders...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff", borderRadius: 16, padding: "28px 32px", marginBottom: 24,
        boxShadow: "0 4px 20px rgba(15, 23, 42, 0.15)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 4, display: "flex", alignItems: "center", gap: 10 }}>
              Worker Maintenance Portal
            </div>
            <div style={{ color: "#94a3b8", fontSize: 14 }}>
              Logged in as <strong style={{ color: "#f8fafc" }}>{user?.name}</strong> ({user?.department || "Field Staff"})
            </div>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#3b82f6" }}>{unassignedStack.length}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>Available Stack</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#f59e0b" }}>{myAssignedTasks.length}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>My Active Tasks</div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "#10b981" }}>{resolvedTasks.length}</div>
              <div style={{ fontSize: 11, color: "#cbd5e1" }}>Completed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("stack")}
          style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            border: "1.5px solid", cursor: "pointer",
            borderColor: activeTab === "stack" ? "#2563eb" : "#e2e8f0",
            background: activeTab === "stack" ? "#2563eb" : "#fff",
            color: activeTab === "stack" ? "#fff" : "#475569",
          }}
        >
          Available Ticket Stack ({unassignedStack.length})
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            border: "1.5px solid", cursor: "pointer",
            borderColor: activeTab === "assigned" ? "#1e40af" : "#e2e8f0",
            background: activeTab === "assigned" ? "#1e40af" : "#fff",
            color: activeTab === "assigned" ? "#fff" : "#475569",
          }}
        >
          My Active Tasks ({myAssignedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          style={{
            padding: "10px 20px", borderRadius: 10, fontSize: 14, fontWeight: 700,
            border: "1.5px solid", cursor: "pointer",
            borderColor: activeTab === "resolved" ? "#10b981" : "#e2e8f0",
            background: activeTab === "resolved" ? "#10b981" : "#fff",
            color: activeTab === "resolved" ? "#fff" : "#475569",
          }}
        >
          Completed ({resolvedTasks.length})
        </button>
      </div>

      {/* Work Orders List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {displayed.length === 0 ? (
          <div className="card" style={{ padding: "48px", textAlign: "center", color: "#94a3b8" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#334155" }}>
              {activeTab === "stack"
                ? "No unassigned tickets in your category stack!"
                : activeTab === "assigned"
                ? "You currently have no active assigned tasks."
                : "No completed tasks yet."}
            </div>
            <div style={{ fontSize: 13, marginTop: 4 }}>
              {activeTab === "stack"
                ? "When students raise new issues matching your specialty, they will appear in this stack for you to accept."
                : "Accept a task from the available stack to start working."}
            </div>
          </div>
        ) : (
          displayed.map((c) => (
            <div
              key={c.id}
              className="card"
              style={{
                padding: "20px", borderRadius: 16, background: "#fff",
                borderLeft: `6px solid ${priorityColor[c.priority]}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                      textTransform: "uppercase", background: priorityColor[c.priority] + "20",
                      color: priorityColor[c.priority],
                    }}>
                      {c.priority} Priority
                    </span>
                    <span style={{
                      padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                      textTransform: "uppercase", background: "#eff6ff",
                      color: "#1d4ed8", border: "1px solid #bfdbfe",
                    }}>
                      {c.category}
                    </span>
                    {!c.assignedToId && !c.assignedTo?.id && (
                      <span style={{
                        padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800,
                        textTransform: "uppercase", background: "#fef3c7",
                        color: "#d97706", border: "1px solid #fcd34d",
                      }}>
                        Unassigned Stack
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b" }}>{c.id}</span>
                  </div>
                  <h3 style={{ margin: "4px 0", fontSize: 17, fontWeight: 800, color: "#0f172a" }}>
                    {c.title}
                  </h3>
                  <p style={{ margin: "4px 0 10px", color: "#475569", fontSize: 14 }}>
                    {c.description}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <SLATimer deadline={c.slaDeadline} status={c.status} />
                </div>
              </div>

              {/* Location & Reported By info */}
              <div style={{
                background: "#f8fafc", borderRadius: 10, padding: "12px 14px",
                margin: "12px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12,
                fontSize: 13, border: "1px solid #f1f5f9",
              }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>LOCATION</div>
                  <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>{c.location || "On-Campus"}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>REPORTED BY</div>
                  <div style={{ fontWeight: 700, color: "#1e293b", marginTop: 2 }}>
                    {c.submittedBy.name} {c.submittedBy.rollNo ? `(${c.submittedBy.rollNo})` : ""}
                  </div>
                </div>
              </div>

              {/* Attachments preview if present */}
              {c.attachments && c.attachments.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 6 }}>
                    Attached Photos ({c.attachments.length}):
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {c.attachments.map((imgUrl, idx) => (
                      <a key={idx} href={`http://localhost:5000${imgUrl}`} target="_blank" rel="noreferrer">
                        <img
                          src={`http://localhost:5000${imgUrl}`}
                          alt="Issue photo"
                          style={{ width: 64, height: 64, borderRadius: 8, objectFit: "cover", border: "1px solid #cbd5e1" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Controls based on Tab */}
              {activeTab === "stack" ? (
                <div style={{ background: "#f0fdf4", borderRadius: 12, padding: "14px", marginTop: 12, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#15803d" }}>Available Task in your Trade Stack</div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>Accept this ticket to assign it to yourself and start working.</div>
                  </div>
                  <button
                    onClick={() => handleAcceptTask(c.id)}
                    disabled={updatingId === c.id}
                    style={{
                      padding: "10px 20px", background: "#16a34a", color: "#fff",
                      border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(22, 163, 74, 0.3)",
                    }}
                  >
                    {updatingId === c.id ? "Accepting..." : "✓ Accept & Claim Task"}
                  </button>
                </div>
              ) : activeTab === "assigned" ? (
                <div style={{ background: "#eff6ff", borderRadius: 12, padding: "14px", marginTop: 12, border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", marginBottom: 8 }}>
                    Worker Actions & Updates
                  </div>
                  <input
                    type="text"
                    placeholder="Add work progress note / resolution details (e.g. 'Replaced blown fuse')..."
                    value={noteMap[c.id] || ""}
                    onChange={(e) => setNoteMap({ ...noteMap, [c.id]: e.target.value })}
                    style={{
                      width: "100%", padding: "10px 12px", border: "1.5px solid #cbd5e1",
                      borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10,
                    }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    {c.status !== "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(c.id, "in_progress")}
                        disabled={updatingId === c.id}
                        style={{
                          padding: "8px 16px", background: "#f59e0b", color: "#fff",
                          border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(c.id, "pending_approval")}
                      disabled={updatingId === c.id}
                      style={{
                        padding: "8px 16px", background: "#4f46e5", color: "#fff",
                        border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}
                    >
                      {updatingId === c.id ? "Submitting..." : "Submit for Student Approval"}
                    </button>
                    <Link href={`/complaints/${c.id}`} style={{ textDecoration: "none", marginLeft: "auto" }}>
                      <button style={{
                        padding: "8px 14px", background: "#fff", color: "#1e40af",
                        border: "1px solid #bfdbfe", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                      }}>
                        View Full Details →
                      </button>
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
