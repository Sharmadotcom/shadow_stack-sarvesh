"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Complaint, Status } from "@/types";
import { toast } from "sonner";
import Link from "next/link";
import { SLATimer } from "@/components/complaints/SLATimer";
import { useSocket } from "@/lib/socket";

const priorityColor: Record<string, string> = {
  low: "#6b7280", medium: "#3b82f6", high: "#f59e0b", critical: "#ef4444",
};

export default function WorkerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Socket.io Real-time Trade Stack Listener
  useSocket((eventData) => {
    if (user && (user.role === "worker" || user.role === "admin")) {
      fetchWorkerTasks(false);
      if (eventData.event === "COMPLAINT_CREATED") {
        toast.info(`⚡ New Ticket in Trade Stack: ${eventData.complaint?.title || "New Issue Reported"}`);
      } else if (eventData.message) {
        toast.info(`⚡ Live Update: ${eventData.message}`);
      }
    }
  });

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
      fetchWorkerTasks(true);
    }
  }, [user, authLoading, router]);

  const fetchWorkerTasks = async (showLoading = true) => {
    if (showLoading) setLoading(true);
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
      {/* Hero Header */}
      <div className="hero-gradient" style={{
        padding: "32px 36px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20,
      }}>
        <div style={{ maxWidth: 540 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "5px 14px", fontSize: 12, fontWeight: 800, marginBottom: 12, border: "1px solid rgba(255,255,255,0.2)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#4ade80", display: "inline-block" }}></span>
            MAINTENANCE TECHNICIAN PORTAL
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>
            Welcome, {user?.name || "Technician"}!
          </h1>
          <div style={{ fontSize: 14, color: "#cbd5e1", lineHeight: 1.5 }}>
            Specialization: <strong style={{ color: "#ffffff", textTransform: "capitalize" }}>{user?.department || "General Maintenance"} Specialist</strong>
          </div>
          <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: 13 }}>
            Claim unassigned tickets from your trade stack or manage your active work orders.
          </p>
        </div>

        {/* Stats Pill Widgets */}
        <div style={{
          background: "rgba(255,255,255,0.08)", borderRadius: 20, padding: "18px 24px",
          backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)",
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, textAlign: "center", minWidth: 280,
        }}>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#38bdf8" }}>{unassignedStack.length}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Stack</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#fbbf24" }}>{myAssignedTasks.length}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Active</div>
          </div>
          <div>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#4ade80" }}>{resolvedTasks.length}</div>
            <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Done</div>
          </div>
        </div>
      </div>

      {/* Modern Tabs */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <button
          onClick={() => setActiveTab("stack")}
          style={{
            padding: "12px 22px", borderRadius: 14, fontSize: 14, fontWeight: 800,
            border: "1.5px solid", cursor: "pointer", transition: "all 0.2s ease",
            borderColor: activeTab === "stack" ? "#4f46e5" : "#e2e8f0",
            background: activeTab === "stack" ? "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)" : "#ffffff",
            color: activeTab === "stack" ? "#ffffff" : "#475569",
            boxShadow: activeTab === "stack" ? "0 4px 14px rgba(79, 70, 229, 0.3)" : "none",
          }}
        >
          Available Ticket Stack ({unassignedStack.length})
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          style={{
            padding: "12px 22px", borderRadius: 14, fontSize: 14, fontWeight: 800,
            border: "1.5px solid", cursor: "pointer", transition: "all 0.2s ease",
            borderColor: activeTab === "assigned" ? "#1e40af" : "#e2e8f0",
            background: activeTab === "assigned" ? "linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)" : "#ffffff",
            color: activeTab === "assigned" ? "#ffffff" : "#475569",
            boxShadow: activeTab === "assigned" ? "0 4px 14px rgba(30, 64, 175, 0.3)" : "none",
          }}
        >
          My Active Tasks ({myAssignedTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("resolved")}
          style={{
            padding: "12px 22px", borderRadius: 14, fontSize: 14, fontWeight: 800,
            border: "1.5px solid", cursor: "pointer", transition: "all 0.2s ease",
            borderColor: activeTab === "resolved" ? "#16a34a" : "#e2e8f0",
            background: activeTab === "resolved" ? "linear-gradient(135deg, #16a34a 0%, #15803d 100%)" : "#ffffff",
            color: activeTab === "resolved" ? "#ffffff" : "#475569",
            boxShadow: activeTab === "resolved" ? "0 4px 14px rgba(22, 163, 74, 0.3)" : "none",
          }}
        >
          Completed ({resolvedTasks.length})
        </button>
      </div>

      {/* Work Orders List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {displayed.length === 0 ? (
          <div className="glass-panel" style={{ padding: "60px 48px", textAlign: "center", color: "#94a3b8", borderRadius: 24, background: "#ffffff", border: "2px dashed #e2e8f0" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            <div style={{ fontWeight: 800, fontSize: 20, color: "#334155" }}>
              {activeTab === "stack"
                ? "Your unassigned stack is empty"
                : activeTab === "assigned"
                ? "You currently have no active assigned tasks"
                : "No completed tasks yet"}
            </div>
            <div style={{ fontSize: 14, marginTop: 8, color: "#64748b" }}>
              {activeTab === "stack"
                ? "When students raise new issues matching your specialty, they will appear here for you to claim."
                : "Accept a task from the available stack to start working."}
            </div>
          </div>
        ) : (
          displayed.map((c) => (
            <div
              key={c.id}
              className="glass-panel"
              style={{
                padding: "24px", borderRadius: 20, background: "#ffffff",
                borderLeft: `6px solid ${priorityColor[c.priority]}`,
                boxShadow: "0 10px 30px -10px rgba(0,0,0,0.08)",
                transition: "transform 0.2s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 300 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                      textTransform: "uppercase", background: priorityColor[c.priority] + "15",
                      color: priorityColor[c.priority], border: `1px solid ${priorityColor[c.priority]}30`,
                    }}>
                      {c.priority} Priority
                    </span>
                    <span style={{
                      padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                      textTransform: "uppercase", background: "#f1f5f9",
                      color: "#475569", border: "1px solid #e2e8f0",
                    }}>
                      {c.category}
                    </span>
                    {!c.assignedToId && !c.assignedTo?.id && (
                      <span style={{
                        padding: "4px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800,
                        textTransform: "uppercase", background: "#fef3c7",
                        color: "#d97706", border: "1px solid #fde68a",
                      }}>
                        Unassigned Stack
                      </span>
                    )}
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", marginLeft: "auto" }}>#{c.id.slice(0, 8)}</span>
                  </div>
                  <h3 style={{ margin: "4px 0 8px", fontSize: 20, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                    {c.title}
                  </h3>
                  <p style={{ margin: "0 0 16px", color: "#64748b", fontSize: 14, lineHeight: 1.5 }}>
                    {c.description}
                  </p>
                </div>

                <div style={{ textAlign: "right" }}>
                  <SLATimer deadline={c.slaDeadline} status={c.status} />
                </div>
              </div>

              {/* Location & Reported By info */}
              <div style={{
                background: "#f8fafc", borderRadius: 16, padding: "16px 20px",
                margin: "8px 0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16,
                border: "1px solid #f1f5f9",
              }}>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em" }}>LOCATION</div>
                  <div style={{ fontWeight: 800, color: "#1e293b", marginTop: 4, fontSize: 14 }}>{c.location || "On-Campus"}</div>
                </div>
                <div>
                  <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 800, letterSpacing: "0.05em" }}>REPORTED BY</div>
                  <div style={{ fontWeight: 800, color: "#1e293b", marginTop: 4, fontSize: 14 }}>
                    {c.submittedBy.name} <span style={{ color: "#64748b", fontWeight: 600 }}>{c.submittedBy.rollNo ? `(${c.submittedBy.rollNo})` : ""}</span>
                  </div>
                </div>
              </div>

              {/* Attachments preview if present */}
              {c.attachments && c.attachments.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    Attached Photos ({c.attachments.length})
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {c.attachments.map((imgUrl, idx) => (
                      <a key={idx} href={`http://localhost:5000${imgUrl}`} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 12, overflow: "hidden", border: "1px solid #cbd5e1" }}>
                        <img
                          src={`http://localhost:5000${imgUrl}`}
                          alt="Issue photo"
                          style={{ width: 80, height: 80, objectFit: "cover", display: "block" }}
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Controls based on Tab */}
              {activeTab === "stack" ? (
                <div style={{ background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)", borderRadius: 16, padding: "16px 20px", marginTop: 12, border: "1px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#166534" }}>Available Task in your Trade Stack</div>
                    <div style={{ fontSize: 13, color: "#15803d", marginTop: 2, fontWeight: 500 }}>Accept this ticket to assign it to yourself and start working.</div>
                  </div>
                  <button
                    onClick={() => handleAcceptTask(c.id)}
                    disabled={updatingId === c.id}
                    style={{
                      padding: "12px 24px", background: "#16a34a", color: "#fff",
                      border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)", transition: "all 0.2s ease",
                    }}
                  >
                    {updatingId === c.id ? "Accepting..." : "✓ Accept & Claim Task"}
                  </button>
                </div>
              ) : activeTab === "assigned" ? (
                <div style={{ background: "linear-gradient(135deg, #eff6ff 0%, #e0e7ff 100%)", borderRadius: 16, padding: "20px", marginTop: 12, border: "1px solid #bfdbfe" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#3730a3", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.02em" }}>
                    Worker Actions & Updates
                  </div>
                  <input
                    type="text"
                    placeholder="Add work progress note / resolution details (e.g. 'Replaced blown fuse')..."
                    value={noteMap[c.id] || ""}
                    onChange={(e) => setNoteMap({ ...noteMap, [c.id]: e.target.value })}
                    style={{
                      width: "100%", padding: "14px 16px", border: "1.5px solid #c7d2fe",
                      borderRadius: 12, fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16,
                      background: "#ffffff", transition: "border 0.2s",
                    }}
                  />
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                    {c.status !== "in_progress" && (
                      <button
                        onClick={() => handleStatusChange(c.id, "in_progress")}
                        disabled={updatingId === c.id}
                        style={{
                          padding: "10px 18px", background: "#ffffff", color: "#f59e0b",
                          border: "1.5px solid #fcd34d", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                        }}
                      >
                        Mark In Progress
                      </button>
                    )}
                    <button
                      onClick={() => handleStatusChange(c.id, "pending_approval")}
                      disabled={updatingId === c.id}
                      style={{
                        padding: "10px 18px", background: "#4f46e5", color: "#fff",
                        border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                        boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
                      }}
                    >
                      {updatingId === c.id ? "Submitting..." : "Submit for Student Approval"}
                    </button>
                    <Link href={`/complaints/${c.id}`} style={{ textDecoration: "none", marginLeft: "auto" }}>
                      <button style={{
                        padding: "10px 18px", background: "#ffffff", color: "#1e40af",
                        border: "1.5px solid #bfdbfe", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                      }}>
                        View Full Details &rarr;
                      </button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
                  <Link href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
                    <button style={{
                      padding: "10px 18px", background: "#f8fafc", color: "#475569",
                      border: "1px solid #e2e8f0", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                    }}>
                      View Ticket Record &rarr;
                    </button>
                  </Link>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
