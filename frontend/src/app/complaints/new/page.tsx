"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";
import { Priority } from "@/types";

export default function NewComplaintPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        toast.error("Please log in to report a complaint.");
        router.push("/login");
        return;
      }
      if (user.role === "worker") {
        toast.error("Worker staff cannot log new student complaints.");
        router.push("/worker");
        return;
      }
      if (user.role === "admin") {
        toast.error("Admin accounts use the Admin Portal.");
        router.push("/admin");
        return;
      }
    }
  }, [user, authLoading, router]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("electrical");
  const [priority, setPriority] = useState<Priority>("medium");
  const [location, setLocation] = useState(user?.hostel || "");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileList = Array.from(files);
      const res = await api.uploadImages(fileList);
      setAttachments((prev) => [...prev, ...res.urls]);
      toast.success(`${files.length} photo(s) uploaded successfully!`);
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Please fill in title and description.");
      return;
    }

    setSubmitting(true);
    try {
      const newComplaint = await api.createComplaint({
        title,
        description,
        category,
        priority,
        location,
        attachments,
      });

      toast.success(`Complaint ${newComplaint.id} submitted successfully!`);
      router.push(`/complaints/${newComplaint.id}`);
    } catch (err: any) {
      toast.error("Failed to submit issue: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryObj = CATEGORIES.find((c) => c.id === category);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, color: "#0f172a" }}>
        ➕ Report New Complaint / Service Issue
      </h1>
      <p style={{ margin: "0 0 24px", color: "#64748b", fontSize: 14 }}>
        Fill in details below to log your issue with automatic SLA tracking and assigned department ownership.
      </p>

      <form onSubmit={handleSubmit} className="card" style={{ padding: "28px 24px" }}>
        {/* Title */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            Issue Title *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Power Socket Sparking or Wi-Fi Disconnecting"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
              borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Category */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            Category * (SLA Target Response Time)
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
              borderRadius: 10, fontSize: 14, outline: "none", background: "#fff",
              boxSizing: "border-box", fontWeight: 600,
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.label} — (Target SLA: {c.slaHours} Hours)
              </option>
            ))}
          </select>
          {selectedCategoryObj && (
            <div style={{ fontSize: 12, color: "#2563eb", marginTop: 6, fontWeight: 600 }}>
              ⏱️ Expected SLA resolution time: <strong>Within {selectedCategoryObj.slaHours} hours</strong> of submission.
            </div>
          )}
        </div>

        {/* Priority Level */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 8 }}>
            Priority Escalation Level *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPriority(p.id as Priority)}
                style={{
                  padding: "10px 4px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                  border: "2px solid", cursor: "pointer", textAlign: "center",
                  borderColor: priority === p.id ? "#1e40af" : "#e2e8f0",
                  background: priority === p.id ? "#eff6ff" : "#fff",
                  color: priority === p.id ? "#1e40af" : "#475569",
                  transition: "all 0.15s",
                }}
              >
                {p.id === "critical" ? "🚨 " : ""}{p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            Campus Location / Room Number
          </label>
          <input
            type="text"
            placeholder="e.g. Himalaya Block - Room 304 or Library 2nd Floor"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
              borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* Description */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            Detailed Description *
          </label>
          <textarea
            required
            rows={4}
            placeholder="Describe the problem in detail (e.g. exact symptoms, when it started, urgency)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
              borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
              fontFamily: "inherit", resize: "vertical",
            }}
          />
        </div>

        {/* Image Attachment Upload */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
            📸 Photo Attachments (Upload damage / proof images)
          </label>
          <div style={{
            border: "2px dashed #cbd5e1", borderRadius: 12, padding: "20px",
            textAlign: "center", background: "#f8fafc", cursor: "pointer",
          }}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              disabled={uploading}
              style={{ display: "none" }}
              id="file-input"
            />
            <label htmlFor="file-input" style={{ cursor: "pointer" }}>
              <div style={{ fontSize: 28, marginBottom: 4 }}>📷</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#1e40af" }}>
                {uploading ? "Uploading photo(s)..." : "Click to select or upload images"}
              </div>
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>PNG, JPG, WEBP up to 5MB</div>
            </label>
          </div>

          {/* Uploaded Previews */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              {attachments.map((url, i) => (
                <div key={i} style={{ position: "relative" }}>
                  <img
                    src={`http://localhost:5000${url}`}
                    alt="Uploaded preview"
                    style={{ width: 80, height: 80, borderRadius: 10, objectFit: "cover", border: "1.5px solid #cbd5e1" }}
                  />
                  <button
                    type="button"
                    onClick={() => setAttachments(attachments.filter((_, idx) => idx !== i))}
                    style={{
                      position: "absolute", top: -6, right: -6, width: 22, height: 22,
                      borderRadius: "50%", background: "#ef4444", color: "#fff",
                      border: "none", fontSize: 12, fontWeight: 800, cursor: "pointer",
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting || uploading}
          style={{
            width: "100%", padding: "14px", background: "#1e40af", color: "#fff",
            border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15,
            cursor: "pointer", boxShadow: "0 4px 14px rgba(30,64,175,0.3)",
          }}
        >
          {submitting ? "Submitting Issue..." : "🚀 Submit Complaint"}
        </button>
      </form>
    </div>
  );
}
