"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { CATEGORIES, PRIORITIES } from "@/lib/constants";

export default function NewComplaintPage() {
  const router = useRouter();
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("medium");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) { toast.error("Please select a category"); return; }
    if (!title.trim()) { toast.error("Please enter a title"); return; }
    if (!description.trim()) { toast.error("Please describe the issue"); return; }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("✅ Complaint submitted! We'll get back to you soon.");
    setIsSubmitting(false);
    router.push("/complaints");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "12px 16px", border: "1.5px solid #e2e8f0",
    borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
    fontFamily: "Inter, sans-serif",
  };

  return (
    <div>
      <Link href="/complaints" style={{ textDecoration: "none", color: "#6b7280", fontSize: 14, display: "flex", alignItems: "center", gap: 6, marginBottom: 20 }}>
        ← Back
      </Link>
      <h1 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700 }}>Report an Issue</h1>
      <p style={{ margin: "0 0 20px", color: "#6b7280", fontSize: 14 }}>
        Fill in the details — our team will respond within the SLA time.
      </p>

      <form onSubmit={handleSubmit}>
        {/* Step 1: Category */}
        <div className="card" style={{ padding: "20px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>1. What type of issue?</div>
          <div style={{ color: "#9ca3af", fontSize: 13, marginBottom: 14 }}>Select the category that best fits</div>
          <div className="cat-grid">
            {CATEGORIES.map((cat) => (
              <button key={cat.id} type="button" onClick={() => setCategory(cat.id)} style={{
                padding: "14px 8px", borderRadius: 12, cursor: "pointer",
                border: `2px solid ${category === cat.id ? "#1e40af" : "#e2e8f0"}`,
                background: category === cat.id ? "#eff6ff" : "#fff",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                transition: "all 0.15s",
              }}>
                <span style={{ fontSize: 24 }}>{cat.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: category === cat.id ? "#1e40af" : "#374151" }}>{cat.label}</span>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>SLA: {cat.slaHours}h</span>
              </button>
            ))}
          </div>
          {selectedCat && (
            <div style={{ marginTop: 12, padding: "10px 14px", background: "#eff6ff", borderRadius: 10, fontSize: 13, color: "#1e40af", fontWeight: 500 }}>
              ⏱️ Expected response: within <strong>{selectedCat.slaHours} hours</strong>
            </div>
          )}
        </div>

        {/* Step 2: Priority */}
        <div className="card" style={{ padding: "20px", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>2. How urgent is it?</div>
          <div className="priority-row">
            {PRIORITIES.map((p) => {
              const emoji = p.id === "critical" ? "🔴" : p.id === "high" ? "🟠" : p.id === "medium" ? "🔵" : "⚪";
              return (
                <button key={p.id} type="button" onClick={() => setPriority(p.id)} style={{
                  flex: 1, padding: "11px 6px", borderRadius: 10, cursor: "pointer",
                  border: `2px solid ${priority === p.id ? "#1e40af" : "#e2e8f0"}`,
                  background: priority === p.id ? "#eff6ff" : "#fff",
                  fontWeight: 600, fontSize: 12,
                  color: priority === p.id ? "#1e40af" : "#374151",
                  minWidth: 0,
                }}>
                  {emoji}<br />{p.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Details */}
        <div className="card" style={{ padding: "20px", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16 }}>3. Describe the issue</div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Short Title *</label>
            <input type="text" required placeholder="e.g. WiFi not working in Lab 3" value={title}
              onChange={(e) => setTitle(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Full Description *</label>
            <textarea required rows={4} placeholder="Describe the problem clearly. When did it start?" value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ ...inputStyle, resize: "none" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>📍 Location (optional)</label>
            <input type="text" placeholder="e.g. Block A, Room 101" value={location}
              onChange={(e) => setLocation(e.target.value)} style={inputStyle} />
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={isSubmitting} style={{
          width: "100%", padding: "16px",
          background: isSubmitting ? "#9ca3af" : "#1e40af",
          color: "#fff", border: "none", borderRadius: 12,
          fontSize: 16, fontWeight: 700, cursor: isSubmitting ? "not-allowed" : "pointer",
          fontFamily: "Inter, sans-serif",
        }}>
          {isSubmitting ? "⏳ Submitting..." : "✅ Submit Complaint"}
        </button>
      </form>
    </div>
  );
}
