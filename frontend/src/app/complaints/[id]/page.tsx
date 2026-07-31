"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Complaint } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { SLATimer } from "@/components/complaints/SLATimer";
import { getTimeAgo } from "@/lib/utils";
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

export default function ComplaintDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user } = useAuth();

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  // Rating state
  const [rating, setRating] = useState<number>(5);
  const [feedback, setFeedback] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingApproval, setSubmittingApproval] = useState(false);

  // Realtime Socket Listener
  useSocket((eventData) => {
    if (eventData.complaint?.id === id) {
      fetchDetail(false);
      if (eventData.message) {
        toast.info(`⚡ Live Update: ${eventData.message}`);
      }
    }
  });

  useEffect(() => {
    fetchDetail(true);
  }, [id]);

  const fetchDetail = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.getComplaintById(id);
      setComplaint(data);
      if (data.ratings && data.ratings.length > 0) {
        setRating(data.ratings[0].rating);
        setFeedback(data.ratings[0].feedback || "");
      }
    } catch (err: any) {
      toast.error("Failed to load complaint detail: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setSubmittingApproval(true);
    try {
      await api.approveResolution(id, rating, feedback);
      toast.success("Resolution Approved! Ticket has been closed successfully.");
      await fetchDetail();
    } catch (err: any) {
      toast.error("Failed to approve resolution: " + err.message);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error("Please enter a reason for dissatisfaction.");
      return;
    }
    setSubmittingApproval(true);
    try {
      await api.rejectResolution(id, rejectionReason);
      toast.success("Dissatisfaction recorded! Ticket has been re-generated & returned to the trade stack.");
      setShowRejectionForm(false);
      await fetchDetail();
    } catch (err: any) {
      toast.error("Failed to reject resolution: " + err.message);
    } finally {
      setSubmittingApproval(false);
    }
  };

  const handleCloseGrievance = async () => {
    if (!confirm("Are you sure you want to close this grievance?")) return;

    setClosing(true);
    try {
      await api.updateStatus(id, "closed", "Grievance marked as closed and resolved by student");
      toast.success("Grievance closed successfully! Please leave a service rating below.");
      await fetchDetail();
    } catch (err: any) {
      toast.error("Failed to close grievance: " + err.message);
    } finally {
      setClosing(false);
    }
  };

  const [escalating, setEscalating] = useState(false);

  const handleAdminEscalate = async () => {
    if (user?.role !== "admin") {
      toast.error("Only Administrators are permitted to escalate tickets.");
      return;
    }
    setEscalating(true);
    try {
      await api.escalateComplaint(id, "critical", "Admin priority override to Critical");
      toast.success("Ticket escalated to Critical priority!");
      await fetchDetail();
    } catch (err: any) {
      toast.error("Escalation failed: " + err.message);
    } finally {
      setEscalating(false);
    }
  };

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await api.rateComplaint(id, rating, feedback);
      toast.success("Thank you for your rating! Feedback submitted.");
      await fetchDetail();
    } catch (err: any) {
      toast.error("Failed to submit rating: " + err.message);
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
        <div style={{ fontWeight: 600 }}>Loading complaint details...</div>
      </div>
    );
  }

  if (!complaint) {
    return (
      <div className="card" style={{ padding: "48px 24px", textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: "#334155" }}>Complaint not found</div>
        <Link href="/complaints" style={{ textDecoration: "none", color: "#1e40af", fontWeight: 700, marginTop: 12, display: "inline-block" }}>
          ← Back to Complaints
        </Link>
      </div>
    );
  }

  const isStudentOwner = user && (user.role === "student" || user.id === complaint.submittedBy.id);
  const isClosed = complaint.status === "closed";

  return (
    <div style={{ maxWidth: 740, margin: "0 auto" }}>
      {/* Back Link */}
      <Link href="/complaints" style={{ textDecoration: "none", color: "#1e40af", fontWeight: 700, fontSize: 13 }}>
        ← Back to Complaints List
      </Link>

      {/* Main Detail Header Card */}
      <div className="glass-panel" style={{ padding: "32px", marginTop: 24, borderRadius: 24, background: "#ffffff", borderLeft: `8px solid ${priorityColor[complaint.priority]}`, boxShadow: "0 12px 40px -12px rgba(0,0,0,0.08)", transition: "transform 0.2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 300 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#94a3b8", letterSpacing: "0.02em" }}>#{complaint.id.slice(0, 8)}</span>
              <span style={{
                background: priorityColor[complaint.priority] + "15",
                color: priorityColor[complaint.priority],
                borderRadius: 8, padding: "4px 10px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", border: `1px solid ${priorityColor[complaint.priority]}30`
              }}>
                {complaint.priority} Priority
              </span>
            </div>
            <h1 style={{ margin: "4px 0 12px", fontSize: 26, fontWeight: 900, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.3 }}>
              {complaint.title}
            </h1>
            <div style={{ fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ background: "#f1f5f9", padding: "4px 12px", borderRadius: 8, fontWeight: 700, color: "#475569" }}>
                {complaint.category}
              </span>
              {complaint.location && (
                <>
                  <span style={{ color: "#cbd5e1" }}>•</span>
                  <span style={{ fontWeight: 600 }}>{complaint.location}</span>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{
              background: statusColor[complaint.status] + "15",
              color: statusColor[complaint.status],
              border: `1.5px solid ${statusColor[complaint.status]}30`,
              borderRadius: 100, padding: "8px 20px", fontSize: 13, fontWeight: 800, display: "inline-block",
              boxShadow: `0 4px 12px ${statusColor[complaint.status]}15`
            }}>
              {statusLabel[complaint.status]}
            </span>
            <div style={{ marginTop: 16 }}>
              <SLATimer deadline={complaint.slaDeadline} status={complaint.status} />
            </div>
          </div>
        </div>

        {/* Student Close Grievance Action Button */}
        {isStudentOwner && !isClosed && (
          <div style={{ marginTop: 24, padding: "20px 24px", background: "#f0fdf4", borderRadius: 16, border: "1px solid #bbf7d0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div style={{ fontSize: 14, color: "#166534", fontWeight: 600 }}>
              Is your issue fully resolved? You can mark this grievance as closed:
            </div>
            <button
              onClick={handleCloseGrievance}
              disabled={closing}
              style={{
                padding: "12px 24px", background: "#16a34a", color: "#ffffff",
                border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14,
                cursor: "pointer", boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)", transition: "all 0.2s"
              }}
            >
              {closing ? "Closing..." : "✓ Close Grievance"}
            </button>
          </div>
        )}

        {/* Admin Priority Escalation (Admin Only) */}
        {user?.role === "admin" && !isClosed && (
          <div style={{ marginTop: 24, padding: "20px 24px", background: "#fef2f2", borderRadius: 16, border: "1px solid #fecaca", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#991b1b" }}>Admin Priority Escalation</div>
              <div style={{ fontSize: 13, color: "#b91c1c", marginTop: 2 }}>Only Administrators can manually escalate this ticket's priority level to Critical.</div>
            </div>
            <button
              onClick={handleAdminEscalate}
              disabled={escalating || complaint.priority === "critical"}
              style={{
                padding: "12px 24px", background: complaint.priority === "critical" ? "#94a3b8" : "#dc2626", color: "#ffffff",
                border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14,
                cursor: complaint.priority === "critical" ? "not-allowed" : "pointer",
                boxShadow: complaint.priority === "critical" ? "none" : "0 4px 14px rgba(220, 38, 38, 0.3)", transition: "all 0.2s"
              }}
            >
              {escalating ? "Escalating..." : complaint.priority === "critical" ? "Already Critical Priority" : "🔥 Escalate Ticket"}
            </button>
          </div>
        )}

        <div style={{ borderTop: "2px dashed #f1f5f9", margin: "28px 0" }} />

        {/* Description */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em" }}>
            Issue Description
          </div>
          <p style={{ margin: 0, color: "#334155", fontSize: 16, lineHeight: 1.7, background: "#f8fafc", padding: "20px", borderRadius: 16, border: "1px solid #f1f5f9" }}>
            {complaint.description}
          </p>
        </div>

        {/* Uploaded Attachments */}
        {complaint.attachments && complaint.attachments.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", marginBottom: 12, letterSpacing: "0.05em" }}>
              Uploaded Photos ({complaint.attachments.length})
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {complaint.attachments.map((imgUrl, i) => (
                <a key={i} href={`http://localhost:5000${imgUrl}`} target="_blank" rel="noreferrer" style={{ display: "block", borderRadius: 16, overflow: "hidden", border: "1px solid #cbd5e1", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
                  <img
                    src={`http://localhost:5000${imgUrl}`}
                    alt={`Attachment ${i + 1}`}
                    style={{ width: 120, height: 120, objectFit: "cover", display: "block", transition: "transform 0.2s" }}
                    onMouseOver={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseOut={(e) => e.currentTarget.style.transform = "scale(1)"}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Technician Banner */}
        <div style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)", borderRadius: 16, padding: "20px 24px", marginTop: 32,
          border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Assigned Maintenance Technician
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", marginTop: 6, display: "flex", alignItems: "center", gap: 10 }}>
              {complaint.assignedTo ? (
                <>
                  <span style={{ fontSize: 20 }}>👨‍🔧</span>
                  {complaint.assignedTo.name}
                </>
              ) : (
                <span style={{ color: "#d97706", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#d97706" }} />
                  Unassigned (Pending Allocation)
                </span>
              )}
            </div>
            {complaint.assignedTo?.department && (
              <div style={{ fontSize: 13, color: "#475569", marginTop: 4, fontWeight: 500, marginLeft: 34 }}>{complaint.assignedTo.department}</div>
            )}
          </div>
        </div>
      </div>

      {/* STUDENT APPROVAL CARD (When Worker Completed Work & Status is Pending Approval) */}
      {isStudentOwner && complaint.status === "pending_approval" && (() => {
        let proofImage: string | null = null;
        if (complaint.auditLogs) {
          for (const log of complaint.auditLogs) {
            if (log.comment && log.comment.includes("[PROOF_IMAGE:")) {
              const match = log.comment.match(/\[PROOF_IMAGE:(.*?)\]/);
              if (match && match[1]) {
                proofImage = match[1];
                break;
              }
            }
          }
        }

        return (
          <div className="glass-panel" style={{ padding: "32px", marginTop: 24, borderRadius: 24, background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", border: "1.5px solid #c7d2fe", boxShadow: "0 12px 30px -10px rgba(79, 70, 229, 0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#3730a3", marginBottom: 8, letterSpacing: "-0.01em" }}>
                  Worker Completed Repair — Approval Required
                </div>
                <div style={{ fontSize: 14, color: "#4338ca", lineHeight: 1.5 }}>
                  The technician completed the repair and requested your approval. Please review the work. Are you satisfied with the resolution?
                </div>
              </div>
              <SLATimer deadline={complaint.slaDeadline} status={complaint.status} approvalRequestedAt={complaint.approvalRequestedAt} />
            </div>

            {/* Display Technician Resolution Proof Photo if provided */}
            {proofImage && (
              <div style={{ marginTop: 16, marginBottom: 20, background: "#ffffff", padding: "18px", borderRadius: 16, border: "1.5px solid #c7d2fe", boxShadow: "0 4px 14px rgba(79, 70, 229, 0.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#3730a3", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                  <span>📷</span> Technician's Completion / Repair Proof Photo:
                </div>
                <a href={`http://localhost:5000${proofImage}`} target="_blank" rel="noreferrer" style={{ display: "inline-block", borderRadius: 12, overflow: "hidden" }}>
                  <img
                    src={`http://localhost:5000${proofImage}`}
                    alt="Technician Completion Proof"
                    style={{ maxWidth: "100%", maxHeight: 260, borderRadius: 12, objectFit: "cover", border: "1px solid #cbd5e1", display: "block" }}
                  />
                </a>
              </div>
            )}

          <div style={{ display: "flex", gap: 16, marginTop: 24, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submittingApproval}
              style={{
                padding: "14px 28px", background: "#16a34a", color: "#ffffff",
                border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(22, 163, 74, 0.3)", flex: 1, minWidth: 200, transition: "all 0.2s"
              }}
            >
              {submittingApproval ? "Processing..." : "✓ Yes, I am Satisfied (Close Ticket)"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectionForm(!showRejectionForm)}
              disabled={submittingApproval}
              style={{
                padding: "14px 28px", background: "#ffffff", color: "#dc2626",
                border: "2px solid #fecaca", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.05)", flex: 1, minWidth: 200, transition: "all 0.2s"
              }}
            >
              ✕ No, Unsatisfied (Request Re-work)
            </button>
          </div>

          {showRejectionForm && (
            <form onSubmit={handleReject} style={{ marginTop: 24, background: "#ffffff", padding: "24px", borderRadius: 16, border: "2px solid #fca5a5", boxShadow: "0 10px 25px -5px rgba(220, 38, 38, 0.1)" }}>
              <label style={{ display: "block", fontSize: 14, fontWeight: 800, color: "#991b1b", marginBottom: 12 }}>
                Please state why you are unsatisfied with the work done: <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <textarea
                required
                rows={4}
                placeholder="Explain what is still broken or incomplete (e.g. 'Water pipe still leaks under high pressure')..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%", padding: "16px", border: "1.5px solid #f87171",
                  borderRadius: 12, fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 16,
                  fontFamily: "inherit", background: "#fef2f2", transition: "border 0.2s"
                }}
              />
              <button
                type="submit"
                disabled={submittingApproval}
                style={{
                  padding: "14px 24px", background: "#dc2626", color: "#ffffff",
                  border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.3)", width: "100%", transition: "all 0.2s"
                }}
              >
                {submittingApproval ? "Submitting..." : "Submit Reason & Return Ticket to Worker Stack"}
              </button>
            </form>
          )}
          </div>
        );
      })()}

      {/* SERVICE RATING CARD (Available when Resolved or Closed) */}
      {(complaint.status === "resolved" || complaint.status === "closed") && (
        <div className="glass-panel" style={{ padding: "32px", marginTop: 24, borderRadius: 24, background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1.5px solid #fde68a", boxShadow: "0 12px 30px -10px rgba(245, 158, 11, 0.2)" }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: "#92400e", marginBottom: 8, display: "flex", alignItems: "center", gap: 10, letterSpacing: "-0.01em" }}>
            <span style={{ fontSize: 24 }}>⭐</span> Service Resolution Rating
          </div>
          <div style={{ fontSize: 13, color: "#b45309", marginBottom: 14 }}>
            Rate your satisfaction with the maintenance team's repair service:
          </div>

          <form onSubmit={handleRatingSubmit}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  style={{
                    fontSize: 24, background: "none", border: "none", cursor: "pointer", color: star <= rating ? "#d97706" : "#cbd5e1",
                    transform: star <= rating ? "scale(1.15)" : "scale(1)", transition: "transform 0.1s",
                  }}
                >
                  ★
                </button>
              ))}
              <span style={{ alignSelf: "center", fontWeight: 800, fontSize: 14, color: "#92400e", marginLeft: 8 }}>
                {rating} / 5 Stars
              </span>
            </div>

            <textarea
              rows={2}
              placeholder="Leave feedback on repair quality, speed, or technician behavior..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              style={{
                width: "100%", padding: "10px 12px", border: "1.5px solid #fcd34d",
                borderRadius: 10, fontSize: 13, outline: "none", boxSizing: "border-box",
                background: "#ffffff", marginBottom: 12, fontFamily: "inherit",
              }}
            />

            <button
              type="submit"
              disabled={submittingRating}
              style={{
                padding: "10px 20px", background: "#d97706", color: "#ffffff",
                border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer",
              }}
            >
              {submittingRating ? "Submitting..." : "Submit Rating & Feedback"}
            </button>
          </form>
        </div>
      )}

      {/* Audit Log Timeline */}
      <div className="card" style={{ padding: "24px", marginTop: 20 }}>
        <h3 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 800, color: "#0f172a" }}>
          Resolution Audit Log & History
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {complaint.auditLogs && complaint.auditLogs.length > 0 ? (
            complaint.auditLogs.map((log) => (
              <div key={log.id} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#1e293b", flexShrink: 0,
                }}>
                  {log.changedBy?.avatar || "U"}
                </div>
                <div style={{ flex: 1, background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                      {log.changedBy?.name || "System"}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8" }}>{getTimeAgo(log.timestamp)}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "#475569" }}>{log.comment}</div>
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: "#94a3b8", fontSize: 13 }}>No audit logs recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
