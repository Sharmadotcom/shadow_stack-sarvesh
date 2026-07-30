"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { GraduationCap, Moon, Sun, LogOut, LogIn, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

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
        { href: "/", label: "Home" },
        { href: "/login", label: "Login / Register" },
      ];
    }

    if (user.role === "admin") {
      return [
        { href: "/admin", label: "Admin Portal" },
        { href: "/complaints", label: "All Issues" },
      ];
    }

    if (user.role === "worker") {
      return [
        { href: "/worker", label: "Worker Portal" },
        { href: "/complaints", label: "Assigned Tasks" },
      ];
    }

    return [
      { href: "/", label: "Dashboard" },
      { href: "/complaints", label: "My Complaints" },
      { href: "/complaints/new", label: "Report Issue" },
    ];
  };

  const links = getLinks();

  const handleSignOut = () => {
    logout();
    router.push("/login");
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
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "rgba(255,255,255,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center", color: "#fff"
            }}>
              <GraduationCap className="w-5 h-5" />
            </div>
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

        {/* Right side: theme toggle + user profile badge & sign out + hamburger */}
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
            {theme === "light" ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span className="nav-user-name">{theme === "light" ? "Dark" : "Light"}</span>
          </button>

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* User badge */}
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                background: "rgba(255,255,255,0.15)", borderRadius: 100,
                padding: "6px 12px 6px 8px",
                border: "1px solid rgba(255,255,255,0.25)",
              }}>
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
              </div>

              {/* Direct Sign Out Button */}
              <button
                onClick={handleSignOut}
                title="Sign Out"
                style={{
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  color: "#fff", borderRadius: 100,
                  padding: "6px 12px", fontSize: 12, fontWeight: 700,
                  cursor: "pointer", transition: "all 0.15s",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="nav-user-name">Sign Out</span>
              </button>
            </div>
          ) : (
            <Link href="/login" style={{ textDecoration: "none" }}>
              <button style={{
                background: "#fff", color: "#1e40af", border: "none",
                borderRadius: 8, padding: "8px 16px", fontWeight: 700,
                fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              }}>
                <LogIn className="w-4 h-4" /> Sign In
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
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
        {user && (
          <div
            onClick={() => {
              setMenuOpen(false);
              handleSignOut();
            }}
            style={{
              padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              color: "#fca5a5", background: "rgba(239,68,68,0.15)",
              cursor: "pointer", marginTop: 4, display: "flex", alignItems: "center", gap: 8,
            }}
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </div>
        )}
      </div>
    </nav>
  );
}
