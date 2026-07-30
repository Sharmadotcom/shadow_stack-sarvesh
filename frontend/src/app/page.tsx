"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Complaint, UserRole } from "@/types";
import { getTimeAgo } from "@/lib/utils";

const statusColor: Record<string, string> = {
  open: "#3b82f6", assigned: "#8b5cf6", in_progress: "#f59e0b",
  resolved: "#10b981", closed: "#6b7280", escalated: "#ef4444",
};
const statusLabel: Record<string, string> = {
  open: "Open", assigned: "Assigned", in_progress: "In Progress",
  resolved: "Resolved", closed: "Closed", escalated: "Escalated",
};

export default function HomePage() {
  const router = useRouter();
  const { user, login, register, googleLogin, logout, loading: authLoading } = useAuth();

  // Portal Gateway Auth state (for unauthenticated landing)
  const [activePortal, setActivePortal] = useState<UserRole>("student");
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [department, setDepartment] = useState("");
  const [hostel, setHostel] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Student Dashboard state (for logged-in student)
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  // Redirect worker / admin users immediately to their portals
  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        router.push("/admin");
      } else if (user.role === "worker") {
        router.push("/worker");
      } else {
        fetchStudentData();
      }
    }
  }, [user, router]);

  const fetchStudentData = async () => {
    setDashboardLoading(true);
    try {
      const data = await api.getComplaints();
      setComplaints(data);
    } catch (err) {
      console.error("Failed to load student data:", err);
    } finally {
      setDashboardLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activePortal === "admin") {
      toast.error("Security Policy: Password login is disabled for Admin. Please use Authorized Google OAuth sign-in.");
      return;
    }

    setFormLoading(true);

    try {
      if (isRegister) {
        await register({
          name,
          email,
          password,
          role: activePortal,
          rollNo,
          department,
          hostel,
        });
        toast.success(`Account registered successfully as ${activePortal.toUpperCase()}!`);
      } else {
        const loggedUser = await login(email, password);

        // Role Validation
        if (loggedUser.role !== activePortal) {
          logout();
          toast.error(
            `Role Mismatch: Your account is registered as '${loggedUser.role.toUpperCase()}'. Please select the ${loggedUser.role.toUpperCase()} Portal card to sign in.`
          );
          setFormLoading(false);
          return;
        }

        toast.success(`Welcome back, ${loggedUser.name}!`);

        if ((loggedUser.role as string) === "admin") router.push("/admin");
        else if ((loggedUser.role as string) === "worker") router.push("/worker");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check credentials.");
    } finally {
      setFormLoading(false);
    }
  };

  const activePortalRef = useRef(activePortal);
  useEffect(() => {
    activePortalRef.current = activePortal;
  }, [activePortal]);

  // Render Google Sign-In button once (real OAuth popup, works across all tabs and institutional/incognito accounts)
  useEffect(() => {
    if (user || typeof window === "undefined") return;
    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "446874210660-cad4dcopa3jo4kj5cptsa96o2u5tbcid.apps.googleusercontent.com";

    const renderGoogleButton = () => {
      const g = (window as any).google;
      if (!g?.accounts?.id || !googleButtonRef.current) return;

      g.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response: any) => {
          setGoogleLoading(true);
          const currentRole = activePortalRef.current;
          try {
            const loggedUser = await googleLogin(response.credential, currentRole);
            if (loggedUser.role !== currentRole) {
              logout();
              toast.error(`Role Mismatch: Your account is registered as '${loggedUser.role.toUpperCase()}'. Please select the ${loggedUser.role.toUpperCase()} Portal card.`);
              return;
            }
            toast.success("Successfully authenticated with Google!");
            if ((loggedUser.role as string) === "admin") router.push("/admin");
            else if ((loggedUser.role as string) === "worker") router.push("/worker");
            else router.push("/");
          } catch (err: any) {
            toast.error(err.message || "Google OAuth authentication failed.");
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      googleButtonRef.current.innerHTML = "";
      g.accounts.id.renderButton(googleButtonRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text: "signin_with",
        width: 400,
      });
    };

    if ((window as any).google?.accounts?.id) {
      renderGoogleButton();
    } else {
      const interval = setInterval(() => {
        if ((window as any).google?.accounts?.id) {
          clearInterval(interval);
          renderGoogleButton();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (authLoading) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0", color: "#64748b" }}>
        <div style={{ fontWeight: 600 }}>Loading CampusGrieve Portal...</div>
      </div>
    );
  }

  // 1. IF NOT LOGGED IN: Render Portal Gateway (Sign In / Register) as First Page!
  if (!user) {
    const portalConfig = {
      student: {
        title: "Student Grievance Portal",
        subtitle: "Report campus maintenance issues, track resolution SLA, and rate service",
        badgeColor: "#2563eb",
        badgeBg: "#eff6ff",
        icon: "",
        placeholderEmail: "student@campus.edu",
      },
      worker: {
        title: "Maintenance Worker Portal",
        subtitle: "View assigned work orders, update job status, and log resolution notes",
        badgeColor: "#d97706",
        badgeBg: "#fffbeb",
        icon: "",
        placeholderEmail: "worker@campus.edu",
      },
      admin: {
        title: "Admin Control Center",
        subtitle: "Campus analytics dashboard, worker assignment, and user administration",
        badgeColor: "#dc2626",
        badgeBg: "#fef2f2",
        icon: "",
        placeholderEmail: "admin@campus.edu",
      },
    };

    const current = portalConfig[activePortal];

    return (
      <div style={{ maxWidth: 720, margin: "20px auto 60px" }}>
        {/* Load Official Google Identity Services SDK */}
        <Script src="https://accounts.google.com/gsi/client" strategy="lazyOnload" />

        {/* Title Header */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ margin: 0, fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em" }}>
            CampusGrieve Portal Gateway
          </h1>
          <p style={{ color: "#64748b", fontSize: 15, marginTop: 6, margin: "6px 0 0" }}>
            Select your assigned portal to sign in or create an account
          </p>
        </div>

        {/* 3 Portal Selection Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {(["student", "worker", "admin"] as UserRole[]).map((role) => {
            const cfg = portalConfig[role];
            const isSelected = activePortal === role;
            return (
              <div
                key={role}
                onClick={() => {
                  setActivePortal(role);
                  setIsRegister(false);
                }}
                className="card card-interactive"
                style={{
                  padding: "20px 14px", textAlign: "center", borderRadius: 16,
                  border: isSelected ? `2.5px solid ${cfg.badgeColor}` : "1.5px solid #e2e8f0",
                  background: isSelected ? cfg.badgeBg : "#ffffff",
                  transform: isSelected ? "translateY(-2px)" : "none",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ fontWeight: 800, fontSize: 14, color: isSelected ? cfg.badgeColor : "#1e293b", textTransform: "capitalize" }}>
                  {role} Portal
                </div>
                <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
                  {role === "student" ? "Students & Residents" : role === "worker" ? "Technicians & Staff" : "System Administrators"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="card" style={{ padding: "32px 28px", background: "#ffffff", borderRadius: 20 }}>
          {/* Banner */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px", borderRadius: 12, background: current.badgeBg,
            border: `1px solid ${current.badgeColor}30`, marginBottom: 24,
          }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: current.badgeColor }}>
                {current.title}
              </div>
              <div style={{ fontSize: 12, color: "#475569" }}>
                {current.subtitle}
              </div>
            </div>
          </div>

          {/* Google OAuth Button — our styled button + invisible Google renderButton overlay */}
          <div style={{ position: "relative", width: "100%", marginBottom: activePortal === "admin" ? 0 : 20 }}>
            {/* Visual styled button */}
            <button
              type="button"
              disabled={googleLoading || formLoading}
              style={{
                width: "100%", padding: "14px", borderRadius: 12, border: "1.5px solid #cbd5e1",
                background: "#ffffff", color: "#1e293b", fontWeight: 800, fontSize: 15,
                cursor: googleLoading ? "not-allowed" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                transition: "background 0.15s ease", boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                opacity: googleLoading ? 0.7 : 1,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              {googleLoading ? "Authenticating with Google..." : `Sign in with Authorized Google OAuth (${activePortal.toUpperCase()})`}
            </button>
            {/* Invisible Google renderButton overlay — handles actual OAuth popup click */}
            <div
              ref={googleButtonRef}
              style={{
                position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
                overflow: "hidden", opacity: 0.001,
                pointerEvents: googleLoading || formLoading ? "none" : "all",
                cursor: "pointer",
                display: "flex", justifyContent: "center", alignItems: "center",
              }}
            />
          </div>

          {/* Admin Policy Notice */}
          {activePortal === "admin" ? (
            <div style={{
              background: "#fff5f5", border: "1.5px solid #fca5a5", borderRadius: 12,
              padding: "16px", marginTop: 20, textAlign: "center", color: "#dc2626", fontSize: 13, fontWeight: 700,
            }}>
              Security Policy Enforced: Password authentication is disabled for Admin Control Center. Only authorized Google OAuth accounts can sign in.
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
                <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700 }}>OR WITH CAMPUS CREDENTIALS</span>
                <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
              </div>

              <form onSubmit={handleAuthSubmit}>
                {isRegister && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arjun Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                        borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Campus Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={`e.g. ${current.placeholderEmail}`}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                      borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                    Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                      borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {isRegister && activePortal === "student" && (
                  <>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        Roll Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 22CS045"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                          borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                        Hostel & Room No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Himalaya Block - Room 304"
                        value={hostel}
                        onChange={(e) => setHostel(e.target.value)}
                        style={{
                          width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                          borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </>
                )}

                {isRegister && activePortal === "worker" && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                      Maintenance Department
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Electrical Maintenance or Plumbing Department"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      style={{
                        width: "100%", padding: "12px 14px", border: "1.5px solid #cbd5e1",
                        borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    width: "100%", padding: "14px", background: current.badgeColor, color: "#ffffff",
                    border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15,
                    cursor: "pointer", boxShadow: `0 4px 14px ${current.badgeColor}40`,
                    transition: "all 0.15s ease",
                  }}
                >
                  {formLoading ? "Authenticating..." : isRegister ? `Create ${activePortal.toUpperCase()} Account` : `Sign In to ${current.title}`}
                </button>
              </form>

              <div style={{ textAlign: "center", marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setIsRegister(!isRegister)}
                  style={{
                    background: "none", border: "none", color: current.badgeColor,
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {isRegister
                    ? "Already have an account? Sign in here"
                    : `Need a new account? Register as ${activePortal}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 2. IF LOGGED IN STUDENT: Render Student Dashboard
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

  return (
    <div>
      {/* Student Welcome Banner */}
      <div className="hero-gradient" style={{
        padding: "32px 36px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20,
      }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: "inline-block", background: "rgba(255,255,255,0.2)", borderRadius: 100, padding: "4px 14px", fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            Student Grievance & Maintenance Portal
          </div>
          <h1 style={{ margin: "0 0 8px", fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>
            Welcome, {user.name}!
          </h1>
          <p style={{ margin: "0 0 20px", color: "#dbeafe", fontSize: 14, lineHeight: 1.5 }}>
            Submit repair issues, track service SLA response timers, rate completed maintenance work, or close solved grievances.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/complaints/new" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#ffffff", color: "#1e3a8a", border: "none",
                borderRadius: 12, padding: "12px 24px",
                fontWeight: 800, fontSize: 14, cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}>
                Report a New Issue
              </button>
            </Link>
            <Link href="/complaints" style={{ textDecoration: "none" }}>
              <button style={{
                background: "rgba(255,255,255,0.15)", color: "#ffffff", border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 12, padding: "12px 22px",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
              }}>
                View My Complaints
              </button>
            </Link>
          </div>
        </div>

        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 20, padding: "20px 24px",
          backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.2)",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, textAlign: "center", minWidth: 220,
        }}>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#ffffff" }}>{stats.total}</div>
            <div style={{ fontSize: 11, color: "#bfdbfe", fontWeight: 700, textTransform: "uppercase" }}>Total Reported</div>
          </div>
          <div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#4ade80" }}>{stats.resolved}</div>
            <div style={{ fontSize: 11, color: "#bfdbfe", fontWeight: 700, textTransform: "uppercase" }}>Resolved</div>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="stats-grid" style={{ marginBottom: 28 }}>
        {[
          { label: "Total Complaints", value: stats.total, color: "#6366f1" },
          { label: "Open & Pending", value: stats.open + stats.inProgress, color: "#3b82f6" },
          { label: "Resolved & Closed", value: stats.resolved, color: "#10b981" },
          { label: "Escalated Issues", value: stats.escalated, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} className="card" style={{
            padding: "20px 16px", textAlign: "center",
            borderTop: `4px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Urgent Alert Banner */}
      {urgent.length > 0 && (
        <div className="card pulse-alert" style={{
          background: "#fff5f5", border: "1.5px solid #fca5a5",
          borderRadius: 16, padding: "20px 24px", marginBottom: 28,
        }}>
          <div style={{ fontWeight: 800, color: "#dc2626", marginBottom: 12, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
            High Priority / Escalated Issues ({urgent.length})
          </div>
          {urgent.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div style={{
                background: "#ffffff", borderRadius: 12, padding: "14px 18px",
                marginBottom: 8, borderLeft: "4px solid #ef4444", boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.title}</div>
                <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                  {c.id} {c.location ? `· ${c.location}` : ""} · Priority: <strong style={{ color: "#dc2626" }}>{c.priority.toUpperCase()}</strong>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Recent Complaints Card */}
      <div className="card" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 18, color: "#0f172a" }}>Recent Complaints</div>
          <Link href="/complaints" style={{ textDecoration: "none", color: "#1e40af", fontWeight: 700, fontSize: 13 }}>
            View All →
          </Link>
        </div>

        {dashboardLoading ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "#94a3b8" }}>Loading complaint updates...</div>
        ) : recent.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
            <div style={{ fontWeight: 700, color: "#334155" }}>No active complaints logged</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Click <strong>Report a New Issue</strong> to log a maintenance request.</div>
          </div>
        ) : (
          recent.map((c) => (
            <Link key={c.id} href={`/complaints/${c.id}`} style={{ textDecoration: "none" }}>
              <div className="complaint-row" style={{
                padding: "16px 0", borderBottom: "1px solid #f1f5f9",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
              }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>{c.title}</div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
                    {c.id} · Category: <strong>{c.category}</strong> · {getTimeAgo(c.createdAt)}
                  </div>
                </div>
                <span style={{
                  background: statusColor[c.status] + "18",
                  color: statusColor[c.status],
                  border: `1px solid ${statusColor[c.status]}40`,
                  borderRadius: 100, padding: "5px 14px",
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
