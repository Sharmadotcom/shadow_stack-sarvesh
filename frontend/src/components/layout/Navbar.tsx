"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { UserRole } from "@/types";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, quickDemoLogin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);

  // Light / Dark mode state
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    // Check saved theme or system preference on mount
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        setTheme("dark");
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const getLinks = () => {
    if (!user) {
      return [
        { href: "/", label: "🏠 Home" },
        { href: "/login", label: "🔑 Login / Register" },
      ];
    }

    if (user.role === "admin") {
      return [
        { href: "/admin", label: "⚙️ Admin Portal" },
        { href: "/complaints", label: "📋 All Issues" },
      ];
    }

    if (user.role === "worker") {
      return [
        { href: "/worker", label: "🛠️ Worker Portal" },
        { href: "/complaints", label: "📋 Assigned Tasks" },
      ];
    }

    return [
      { href: "/", label: "🏠 Dashboard" },
      { href: "/complaints", label: "📋 My Complaints" },
      { href: "/complaints/new", label: "➕ Report Issue" },
    ];
  };

  const links = getLinks();

  const handleRoleSwitch = async (role: UserRole) => {
    setSwitcherOpen(false);
    await quickDemoLogin(role);
    if (role === "admin") router.push("/admin");
    else if (role === "worker") router.push("/worker");
    else router.push("/");
  };

  return (
    <nav style={{ background: "var(--nav-bg, #1e40af)", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative", transition: "background 0.2s" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px", maxWidth: 960, margin: "0 auto",
      }}>
        {/* Logo */}
        <Link href={user?.role === "admin" ? "/admin" : user?.role === "worker" ? "/worker" : "/"} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0" }}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 17, lineHeight: 1.2, letterSpacing: "-0.01em" }}>
                CampusGrieve
              </div>
              <div style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 500 }}>
                Grievance & Maintenance Tracker
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links" style={{ display: "flex", gap: 6 }}>
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
                  color: isActive ? "#1e40af" : "#e0f0ff",
                  background: isActive ? "#fff" : "transparent",
                  transition: "all 0.15s",
                }}>
                  {link.label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Right side: theme toggle + user + role switcher + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: 100,
              padding: "6px 12px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <span>{theme === "light" ? "🌙" : "☀️"}</span>
            <span className="nav-user-name">{theme === "light" ? "Dark" : "Light"}</span>
          </button>

          {user ? (
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setSwitcherOpen(!switcherOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: "rgba(255,255,255,0.15)", borderRadius: 100,
                  padding: "6px 12px 6px 8px", cursor: "pointer",
                  border: "1px solid rgba(255,255,255,0.25)",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: user.role === "admin" ? "#dc2626" : user.role === "worker" ? "#d97706" : "#2563eb",
                  color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 11, flexShrink: 0,
                }}>
                  {user.avatar || user.name.substring(0, 2).toUpperCase()}
                </div>
                <div className="nav-user-name">
                  <div style={{ color: "#fff", fontSize: 12, fontWeight: 700 }}>{user.name}</div>
                  <div style={{ color: "#bfdbfe", fontSize: 10, textTransform: "capitalize" }}>
                    {user.role} {user.role === "student" && user.rollNo ? `(${user.rollNo})` : ""}
                  </div>
                </div>
                <span style={{ color: "#bfdbfe", fontSize: 10 }}>▼</span>
              </div>

              {/* Role Switcher & Logout Dropdown */}
              {switcherOpen && (
                <div style={{
                  position: "absolute", top: "115%", right: 0, width: 220,
                  background: "var(--bg-card, #fff)", borderRadius: 12, boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
                  border: "1px solid var(--border-main, #e2e8f0)", zIndex: 100, overflow: "hidden", padding: 6,
                }}>
                  <div style={{ padding: "8px 10px", fontSize: 11, fontWeight: 700, color: "var(--text-muted, #9ca3af)", textTransform: "uppercase" }}>
                    Switch Demo Role
                  </div>
                  <button
                    onClick={() => handleRoleSwitch("student")}
                    style={{
                      width: "100%", padding: "8px 10px", textAlign: "left", background: user.role === "student" ? "rgba(37,99,235,0.1)" : "transparent",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#2563eb", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>🎓</span> Student Portal
                  </button>
                  <button
                    onClick={() => handleRoleSwitch("worker")}
                    style={{
                      width: "100%", padding: "8px 10px", textAlign: "left", background: user.role === "worker" ? "rgba(217,119,6,0.1)" : "transparent",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#d97706", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>🛠️</span> Worker/Staff Portal
                  </button>
                  <button
                    onClick={() => handleRoleSwitch("admin")}
                    style={{
                      width: "100%", padding: "8px 10px", textAlign: "left", background: user.role === "admin" ? "rgba(220,38,38,0.1)" : "transparent",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "#dc2626", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>⚙️</span> Admin Portal
                  </button>

                  <div style={{ borderTop: "1px solid var(--border-main, #f1f5f9)", margin: "6px 0" }} />

                  <button
                    onClick={() => {
                      setSwitcherOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      width: "100%", padding: "8px 10px", textAlign: "left", background: "transparent",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, color: "var(--text-muted, #6b7280)", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>🚪</span> Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#fff", color: "#1e40af", border: "none",
                borderRadius: 8, padding: "8px 16px", fontWeight: 700,
                fontSize: 13, cursor: "pointer",
              }}>
                🔑 Sign In
              </button>
            </Link>
          )}

          {/* Hamburger toggle for mobile */}
          <button
            className="nav-mobile-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "rgba(255,255,255,0.15)", border: "none",
              borderRadius: 8, padding: "8px 10px", cursor: "pointer",
              color: "#fff", fontSize: 18, lineHeight: 1,
            }}
          >
            {menuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      <div className={`mobile-menu ${menuOpen ? "open" : ""}`}
        style={{ maxWidth: 960, margin: "0 auto", padding: menuOpen ? "8px 16px 14px" : "0 16px" }}>
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}>
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600,
                color: isActive ? "#fff" : "#bfdbfe",
                background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
                marginBottom: 4,
              }}>
                {link.label}
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
