"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleHome = () => {
    if (!user) return "/";
    if (user.role === "admin") return "/admin";
    if (user.role === "worker") return "/worker";
    return "/";
  };

  const getLinks = () => {
    if (!user) {
      return [
        { href: "/", label: "Home" },
        { href: "/login", label: "Sign In Portals" },
      ];
    }

    if (user.role === "admin") {
      return [
        { href: "/admin", label: "Admin Control Center" },
      ];
    }

    if (user.role === "worker") {
      return [
        { href: "/worker", label: "Maintenance Tasks" },
      ];
    }

    return [
      { href: "/", label: "Student Dashboard" },
      { href: "/complaints", label: "My Complaints" },
      { href: "/complaints/new", label: "Report Issue" },
    ];
  };

  const links = getLinks();

  return (
    <nav style={{
      background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
      boxShadow: "0 4px 16px rgba(15, 23, 42, 0.12)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px", maxWidth: 1040, margin: "0 auto", height: 64,
      }}>
        {/* Logo */}
        <Link href={getRoleHome()} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, fontWeight: 800, color: "#ffffff", border: "1px solid rgba(255, 255, 255, 0.3)",
            }}>
              CG
            </div>
            <div>
              <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
                CampusGrieve
              </div>
              <div style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 500, marginTop: 1 }}>
                Grievance & Maintenance System
              </div>
            </div>
          </div>
        </Link>

        {/* Desktop Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    color: isActive ? "#1e40af" : "#e0f0ff",
                    background: isActive ? "#ffffff" : "rgba(255, 255, 255, 0.1)",
                    boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
                    transition: "all 0.15s ease",
                  }}>
                    {link.label}
                  </div>
                </Link>
              );
            })
          ) : null}

          {/* User Profile / Single Clean Sign In button */}
          {user ? (
            <div style={{ position: "relative", marginLeft: 8 }}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255, 255, 255, 0.18)", borderRadius: 100,
                  padding: "6px 14px 6px 8px", cursor: "pointer",
                  border: "1px solid rgba(255, 255, 255, 0.25)",
                  transition: "background 0.15s",
                }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: user.role === "admin" ? "#ef4444" : user.role === "worker" ? "#f59e0b" : "#3b82f6",
                  color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 12, flexShrink: 0,
                  boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
                }}>
                  {user.avatar || user.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <div style={{ color: "#ffffff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{user.name}</div>
                  <div style={{ color: "#bfdbfe", fontSize: 10, textTransform: "uppercase", fontWeight: 800, marginTop: 2 }}>
                    {user.role}
                  </div>
                </div>
                <span style={{ color: "#bfdbfe", fontSize: 10, marginLeft: 4 }}>▼</span>
              </div>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div style={{
                  position: "absolute", top: "115%", right: 0, width: 220,
                  background: "#ffffff", borderRadius: 14, boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
                  border: "1px solid #e2e8f0", zIndex: 100, overflow: "hidden", padding: 8,
                }}>
                  <div style={{ padding: "8px 10px", fontSize: 12, color: "#64748b" }}>
                    Signed in as <br /><strong style={{ color: "#0f172a" }}>{user.email}</strong>
                  </div>
                  <div style={{ borderTop: "1px solid #f1f5f9", margin: "6px 0" }} />
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      width: "100%", padding: "10px 12px", textAlign: "left", background: "#fff5f5",
                      border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, color: "#dc2626", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s",
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#ffffff", color: "#1e40af", border: "none",
                borderRadius: 10, padding: "9px 20px", fontWeight: 800,
                fontSize: 13, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                transition: "transform 0.15s ease",
              }}>
                Sign In
              </button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
