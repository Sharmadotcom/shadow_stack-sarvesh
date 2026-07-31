"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { ShieldCheck, Wrench, GraduationCap, LogOut, ChevronDown, User as UserIcon } from "lucide-react";

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
        { href: "/", label: "Home Portal" },
        { href: "/login", label: "Sign In" },
      ];
    }

    if (user.role === "admin") {
      return [
        { href: "/admin", label: "Admin Control Center" },
      ];
    }

    if (user.role === "worker") {
      return [
        { href: "/worker", label: "Maintenance Tasks Stack" },
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
      background: "rgba(15, 23, 42, 0.94)",
      backdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      boxShadow: "0 4px 25px rgba(0, 0, 0, 0.15)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px", maxWidth: 1100, margin: "0 auto", height: 68,
      }}>
        {/* Logo */}
        <Link href={getRoleHome()} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "#ffffff",
              boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}>
              CG
            </div>
            <div>
              <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 19, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
                CampusGrieve
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, fontWeight: 600, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }}></span>
                Smart Campus Grievance System
              </div>
            </div>
          </div>
        </Link>

        {/* Navigation Links */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {user ? (
            links.map((link) => {
              const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                  <div style={{
                    padding: "8px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700,
                    color: isActive ? "#ffffff" : "#cbd5e1",
                    background: isActive ? "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)" : "rgba(255, 255, 255, 0.05)",
                    border: isActive ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                    boxShadow: isActive ? "0 4px 12px rgba(79, 70, 229, 0.3)" : "none",
                    transition: "all 0.2s ease",
                  }}>
                    {link.label}
                  </div>
                </Link>
              );
            })
          ) : null}

          {/* User Profile Pill */}
          {user ? (
            <div style={{ position: "relative", marginLeft: 8 }}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "rgba(255, 255, 255, 0.08)", borderRadius: 100,
                  padding: "6px 14px 6px 8px", cursor: "pointer",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: user.role === "admin" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : user.role === "worker" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 12, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                }}>
                  {user.avatar || user.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#ffffff", fontSize: 13, fontWeight: 700, lineHeight: 1.1 }}>{user.name}</div>
                  <div style={{ color: user.role === "admin" ? "#fca5a5" : user.role === "worker" ? "#fde68a" : "#bfdbfe", fontSize: 10, textTransform: "uppercase", fontWeight: 800, marginTop: 2 }}>
                    {user.role} {user.department ? `· ${user.department}` : ""}
                  </div>
                </div>
                <ChevronDown size={14} style={{ color: "#94a3b8", marginLeft: 4 }} />
              </div>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div style={{
                  position: "absolute", top: "118%", right: 0, width: 230,
                  background: "#ffffff", borderRadius: 16, boxShadow: "0 16px 40px rgba(15, 23, 42, 0.22)",
                  border: "1px solid #e2e8f0", zIndex: 100, overflow: "hidden", padding: 8,
                }}>
                  <div style={{ padding: "10px 12px", background: "#f8fafc", borderRadius: 10, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Signed in as</div>
                    <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 13, wordBreak: "break-all", marginTop: 2 }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      width: "100%", padding: "10px 12px", textAlign: "left", background: "#fff5f5",
                      border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#dc2626", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 8, transition: "background 0.15s",
                    }}
                  >
                    <LogOut size={14} />
                    Sign Out Account
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <button style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)", color: "#ffffff", border: "none",
                borderRadius: 12, padding: "10px 20px", fontWeight: 800,
                fontSize: 13, cursor: "pointer", boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
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
