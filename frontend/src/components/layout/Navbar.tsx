"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { LogOut, ChevronDown } from "lucide-react";

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
      return []; // Return no links for logged out state (Login Portal)
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
      background: "rgba(255, 255, 255, 0.75)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      borderBottom: "1px solid rgba(255, 255, 255, 0.4)",
      boxShadow: "0 8px 32px rgba(15, 23, 42, 0.04)",
      position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px", maxWidth: 1200, margin: "0 auto", height: 76,
      }}>
        {/* Logo */}
        <Link href={getRoleHome()} style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14,
              background: "linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 900, color: "#ffffff",
              boxShadow: "0 8px 20px rgba(37, 99, 235, 0.25)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
            }}>
              CG
            </div>
            <div>
              <div style={{ color: "#0f172a", fontWeight: 900, fontSize: 22, lineHeight: 1.1, letterSpacing: "-0.04em" }}>
                CampusGrieve
              </div>
              <div style={{ color: "#64748b", fontSize: 12, fontWeight: 700, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block", boxShadow: "0 0 10px rgba(16, 185, 129, 0.5)" }}></span>
                Smart Campus Grievance System
              </div>
            </div>
          </div>
        </Link>

        {/* Navigation Links & User Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {user && (
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(241, 245, 249, 0.8)", padding: "4px", borderRadius: 16, marginRight: 12 }}>
              {links.map((link) => {
                const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                    <div style={{
                      padding: "10px 20px", borderRadius: 12, fontSize: 14, fontWeight: isActive ? 800 : 700,
                      color: isActive ? "#ffffff" : "#64748b",
                      background: isActive ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)" : "transparent",
                      boxShadow: isActive ? "0 4px 14px rgba(37, 99, 235, 0.3)" : "none",
                      transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                    }}>
                      {link.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* User Profile Pill */}
          {user && (
            <div style={{ position: "relative" }}>
              <div
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  background: "#ffffff", borderRadius: 100,
                  padding: "6px 16px 6px 6px", cursor: "pointer",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03)",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: user.role === "admin" ? "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)" : user.role === "worker" ? "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)",
                  color: "#ffffff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 800, fontSize: 14, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                }}>
                  {user.avatar || user.name.substring(0, 2).toUpperCase()}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ color: "#0f172a", fontSize: 14, fontWeight: 800, lineHeight: 1.1 }}>{user.name}</div>
                  <div style={{ color: "#64748b", fontSize: 11, textTransform: "uppercase", fontWeight: 700, marginTop: 2, letterSpacing: "0.02em" }}>
                    {user.role} {user.department ? `· ${user.department}` : ""}
                  </div>
                </div>
                <ChevronDown size={16} style={{ color: "#94a3b8", marginLeft: 8 }} />
              </div>

              {/* Profile Dropdown Menu */}
              {userDropdownOpen && (
                <div style={{
                  position: "absolute", top: "120%", right: 0, width: 260,
                  background: "rgba(255, 255, 255, 0.95)", backdropFilter: "blur(16px)", 
                  borderRadius: 20, boxShadow: "0 20px 50px -12px rgba(15, 23, 42, 0.2)",
                  border: "1px solid rgba(255, 255, 255, 0.8)", zIndex: 100, overflow: "hidden", padding: 10,
                }}>
                  <div style={{ padding: "14px 16px", background: "#f8fafc", borderRadius: 14, marginBottom: 8, border: "1px solid #f1f5f9" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signed in as</div>
                    <div style={{ color: "#0f172a", fontWeight: 800, fontSize: 14, wordBreak: "break-all", marginTop: 4 }}>{user.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      logout();
                      router.push("/login");
                    }}
                    style={{
                      width: "100%", padding: "14px 16px", textAlign: "left", background: "#fef2f2",
                      border: "1px solid #fee2e2", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#dc2626", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s",
                    }}
                  >
                    <LogOut size={16} />
                    Sign Out Account
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
