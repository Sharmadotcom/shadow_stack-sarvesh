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
      fetchDetail();
      if (eventData.message) {
        toast.info(`⚡ Live Update: ${eventData.message}`);
      }
    }
  });

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    setLoading(true);
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
      <div className="card" style={{ padding: "28px 24px", marginTop: 16, borderLeft: `6px solid ${priorityColor[complaint.priority]}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#64748b" }}>{complaint.id}</span>
              <span style={{
                background: priorityColor[complaint.priority] + "20",
                color: priorityColor[complaint.priority],
                borderRadius: 6, padding: "2px 8px", fontSize: 11, fontWeight: 800, textTransform: "uppercase",
              }}>
                {complaint.priority} Priority
              </span>
            </div>
            <h1 style={{ margin: "4px 0 8px", fontSize: 22, fontWeight: 800, color: "#0f172a" }}>
              {complaint.title}
            </h1>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Category: <strong>{complaint.category}</strong> {complaint.location ? `· ${complaint.location}` : ""}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <span style={{
              background: statusColor[complaint.status] + "20",
              color: statusColor[complaint.status],
              border: `1.5px solid ${statusColor[complaint.status]}50`,
              borderRadius: 100, padding: "6px 16px", fontSize: 13, fontWeight: 800, display: "inline-block",
            }}>
              {statusLabel[complaint.status]}
            </span>
            <div style={{ marginTop: 10 }}>
              <SLATimer deadline={complaint.slaDeadline} status={complaint.status} />
            </div>
          </div>
        </div>

        {/* Student Close Grievance Action Button */}
        {isStudentOwner && !isClosed && (
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px dashed #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: "#475569" }}>
              Is your issue fixed? You can mark this grievance as closed:
            </div>
            <button
              onClick={handleCloseGrievance}
              disabled={closing}
              style={{
                padding: "9px 18px", background: "#10b981", color: "#ffffff",
                border: "none", borderRadius: 10, fontWeight: 800, fontSize: 13,
                cursor: "pointer", boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
              }}
            >
              {closing ? "Closing..." : "Close Grievance"}
            </button>
          </div>
        )}

        <div style={{ borderTop: "1px solid #f1f5f9", margin: "18px 0 16px" }} />

        {/* Description */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 6 }}>
            Issue Description
          </div>
          <p style={{ margin: 0, color: "#334155", fontSize: 15, lineHeight: 1.6 }}>
            {complaint.description}
          </p>
        </div>

        {/* Uploaded Attachments */}
        {complaint.attachments && complaint.attachments.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", marginBottom: 8 }}>
              Uploaded Photos ({complaint.attachments.length})
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {complaint.attachments.map((imgUrl, i) => (
                <a key={i} href={`http://localhost:5000${imgUrl}`} target="_blank" rel="noreferrer">
                  <img
                    src={`http://localhost:5000${imgUrl}`}
                    alt={`Attachment ${i + 1}`}
                    style={{ width: 100, height: 100, borderRadius: 10, objectFit: "cover", border: "1.5px solid #cbd5e1" }}
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Assigned Technician Banner */}
        <div style={{
          background: "#f8fafc", borderRadius: 12, padding: "14px 18px", marginTop: 20,
          border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
              Assigned Maintenance Technician
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>
              {complaint.assignedTo ? complaint.assignedTo.name : "Unassigned (Pending Allocation)"}
            </div>
            {complaint.assignedTo?.department && (
              <div style={{ fontSize: 12, color: "#2563eb" }}>{complaint.assignedTo.department}</div>
            )}
          </div>
        </div>
      </div>

      {/* STUDENT APPROVAL CARD (When Worker Completed Work & Status is Pending Approval) */}
      {isStudentOwner && complaint.status === "pending_approval" && (
        <div className="card" style={{ padding: "24px", marginTop: 20, background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", border: "1.5px solid #c7d2fe" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#3730a3", marginBottom: 4 }}>
                Worker Completed Repair — Approval Required
              </div>
              <div style={{ fontSize: 13, color: "#4338ca" }}>
                The technician completed the repair and requested your approval. Are you satisfied with the work done?
              </div>
            </div>
            <SLATimer deadline={complaint.slaDeadline} status={complaint.status} approvalRequestedAt={complaint.approvalRequestedAt} />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <button
              type="button"
              onClick={handleApprove}
              disabled={submittingApproval}
              style={{
                padding: "12px 24px", background: "#16a34a", color: "#ffffff",
                border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(22, 163, 74, 0.3)",
              }}
            >
              {submittingApproval ? "Processing..." : "✓ Satisfied (Close Ticket)"}
            </button>
            <button
              type="button"
              onClick={() => setShowRejectionForm(!showRejectionForm)}
              disabled={submittingApproval}
              style={{
                padding: "12px 24px", background: "#dc2626", color: "#ffffff",
                border: "none", borderRadius: 10, fontWeight: 800, fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
              }}
            >
              ✕ Unsatisfied (Request Re-work)
            </button>
          </div>

          {showRejectionForm && (
            <form onSubmit={handleReject} style={{ marginTop: 18, background: "#ffffff", padding: "16px", borderRadius: 12, border: "1px solid #fca5a5" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#991b1b", marginBottom: 6 }}>
                Please state why you are unsatisfied with the work done: *
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain what is still broken or incomplete (e.g. 'Water pipe still leaks under high pressure')..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px", border: "1.5px solid #f87171",
                  borderRadius: 8, fontSize: 13, outline: "none", boxSizing: "border-box", marginBottom: 10,
                  fontFamily: "inherit",
                }}
              />
              <button
                type="submit"
                disabled={submittingApproval}
                style={{
                  padding: "10px 18px", background: "#dc2626", color: "#ffffff",
                  border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer",
                }}
              >
                {submittingApproval ? "Submitting..." : "Submit Reason & Return Ticket to Stack"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* SERVICE RATING CARD (Available when Resolved or Closed) */}
      {(complaint.status === "resolved" || complaint.status === "closed") && (
        <div className="card" style={{ padding: "24px", marginTop: 20, background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", border: "1.5px solid #fde68a" }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#92400e", marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            Service Resolution Rating
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
