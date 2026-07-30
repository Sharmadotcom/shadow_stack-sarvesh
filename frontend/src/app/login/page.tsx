"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { UserRole } from "@/types";

export default function LoginPage() {
  const router = useRouter();
  const { user, login, register, googleLogin, quickDemoLogin } = useAuth();

  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("student");

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [department, setDepartment] = useState("");
  const [hostel, setHostel] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "admin") router.push("/admin");
      else if (user.role === "worker") router.push("/worker");
      else router.push("/");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isRegister) {
        await register({
          name,
          email,
          password,
          role: selectedRole,
          rollNo,
          department,
          hostel,
        });
        toast.success("Account registered successfully! Welcome to CampusGrieve.");
      } else {
        await login(email, password);
        toast.success("Signed in successfully!");
      }

      if (selectedRole === "admin") router.push("/admin");
      else if (selectedRole === "worker") router.push("/worker");
      else router.push("/");
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setLoading(true);
    try {
      await quickDemoLogin(role);
      toast.success(`Logged in as Demo ${role.toUpperCase()}!`);
      if (role === "admin") router.push("/admin");
      else if (role === "worker") router.push("/worker");
      else router.push("/");
    } catch (err: any) {
      toast.error("Quick login failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatedGoogleAuth = async () => {
    setLoading(true);
    try {
      const mockGoogleCredential = {
        email: selectedRole === "admin" ? "admin.google@campus.edu" : selectedRole === "worker" ? "worker.google@campus.edu" : "arjun.google@campus.edu",
        name: selectedRole === "admin" ? "Dr. Ramesh (Google)" : selectedRole === "worker" ? "Ramesh Tech (Google)" : "Arjun Sharma (Google)",
        sub: `google-uid-${Date.now()}`,
      };
      await googleLogin(mockGoogleCredential, selectedRole);
      toast.success("Signed in with Google OAuth!");
      if (selectedRole === "admin") router.push("/admin");
      else if (selectedRole === "worker") router.push("/worker");
      else router.push("/");
    } catch (err: any) {
      toast.error("Google sign-in error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 480, margin: "40px auto 60px" }}>
      {/* Title */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🎓</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: "#1e293b" }}>
          CampusGrieve Auth Portal
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, marginTop: 6 }}>
          Sign in or create an account to access grievance redressal services
        </p>
      </div>

      {/* Quick Hackathon Demo Switcher Banner */}
      <div style={{
        background: "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)",
        borderRadius: 16, padding: "20px", color: "#fff", marginBottom: 24,
        boxShadow: "0 8px 20px rgba(30, 64, 175, 0.25)",
      }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
          ⚡ <span>Hackathon Demo One-Click Login</span>
        </div>
        <div style={{ fontSize: 12, color: "#dbeafe", marginBottom: 14 }}>
          Instant role access for presentation testing:
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          <button
            onClick={() => handleQuickLogin("student")}
            disabled={loading}
            style={{
              padding: "10px 8px", background: "#fff", color: "#1e40af",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12,
              cursor: "pointer", transition: "transform 0.15s",
            }}
          >
            🎓 Student
          </button>
          <button
            onClick={() => handleQuickLogin("worker")}
            disabled={loading}
            style={{
              padding: "10px 8px", background: "#fef3c7", color: "#b45309",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12,
              cursor: "pointer", transition: "transform 0.15s",
            }}
          >
            🛠️ Worker
          </button>
          <button
            onClick={() => handleQuickLogin("admin")}
            disabled={loading}
            style={{
              padding: "10px 8px", background: "#fee2e2", color: "#b91c1c",
              border: "none", borderRadius: 10, fontWeight: 700, fontSize: 12,
              cursor: "pointer", transition: "transform 0.15s",
            }}
          >
            ⚙️ Admin
          </button>
        </div>
      </div>

      {/* Main Auth Form Card */}
      <div className="card" style={{ padding: "28px 24px", background: "#fff", borderRadius: 16 }}>
        {/* Role Selector Tabs */}
        <div style={{ display: "flex", gap: 6, background: "#f1f5f9", padding: 4, borderRadius: 12, marginBottom: 20 }}>
          {(["student", "worker", "admin"] as UserRole[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setSelectedRole(r)}
              style={{
                flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 700,
                border: "none", cursor: "pointer", textTransform: "capitalize",
                background: selectedRole === r ? "#fff" : "transparent",
                color: selectedRole === r ? "#1e40af" : "#64748b",
                boxShadow: selectedRole === r ? "0 2px 4px rgba(0,0,0,0.06)" : "none",
                transition: "all 0.15s",
              }}
            >
              {r === "student" ? "🎓 Student" : r === "worker" ? "🛠️ Worker" : "⚙️ Admin"}
            </button>
          ))}
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleSimulatedGoogleAuth}
          disabled={loading}
          style={{
            width: "100%", padding: "12px", borderRadius: 10, border: "1.5px solid #e2e8f0",
            background: "#fff", color: "#1e293b", fontWeight: 700, fontSize: 14,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            marginBottom: 20, transition: "background 0.15s",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          Sign in with Google OAuth ({selectedRole})
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "0 0 20px" }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>OR JWT EMAIL LOGIN</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Auth Credentials Form */}
        <form onSubmit={handleSubmit}>
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
              placeholder={
                selectedRole === "admin"
                  ? "admin@campus.edu"
                  : selectedRole === "worker"
                  ? "worker.elec@campus.edu"
                  : "arjun@campus.edu"
              }
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

          {isRegister && selectedRole === "student" && (
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

          {isRegister && (selectedRole === "worker" || selectedRole === "admin") && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
                Department / Office
              </label>
              <input
                type="text"
                placeholder="e.g. Electrical Maintenance"
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
            disabled={loading}
            style={{
              width: "100%", padding: "14px", background: "#1e40af", color: "#fff",
              border: "none", borderRadius: 12, fontWeight: 800, fontSize: 15,
              cursor: "pointer", boxShadow: "0 4px 12px rgba(30,64,175,0.3)",
              transition: "all 0.15s",
            }}
          >
            {loading ? "Processing..." : isRegister ? `Register as ${selectedRole}` : `Sign In as ${selectedRole}`}
          </button>
        </form>

        {/* Toggle Login / Register */}
        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            style={{
              background: "none", border: "none", color: "#1e40af",
              fontSize: 13, fontWeight: 700, cursor: "pointer",
            }}
          >
            {isRegister
              ? "Already have an account? Sign in here"
              : "Don't have an account? Register new account"}
          </button>
        </div>
      </div>
    </div>
  );
}
