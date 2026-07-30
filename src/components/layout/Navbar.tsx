"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { href: "/", label: "🏠 Home" },
  { href: "/complaints", label: "📋 Complaints" },
  { href: "/complaints/new", label: "➕ Report" },
  { href: "/admin", label: "⚙️ Admin" },
];

export function Navbar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav style={{ background: "#1e40af", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
      {/* Top bar */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px", maxWidth: 820, margin: "0 auto",
      }}>
        {/* Logo */}
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0" }}>
            <span style={{ fontSize: 22 }}>🎓</span>
            <div>
              <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>CampusGrieve</div>
              <div style={{ color: "#bfdbfe", fontSize: 11 }}>Report · Track · Resolve</div>
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="nav-links">
          {links.map((link) => {
            const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
            return (
              <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "8px 14px", borderRadius: 8, fontSize: 13, fontWeight: 500,
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

        {/* Right side: user + hamburger */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* User pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,0.15)", borderRadius: 100, padding: "6px 12px 6px 8px",
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "#fff", color: "#1e40af",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 11, flexShrink: 0,
            }}>AS</div>
            <div className="nav-user-name">
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Arjun Sharma</div>
              <div style={{ color: "#bfdbfe", fontSize: 10 }}>Student</div>
            </div>
          </div>

          {/* Hamburger — shown only on mobile via CSS */}
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
        style={{ maxWidth: 820, margin: "0 auto", padding: menuOpen ? "8px 16px 14px" : "0 16px" }}>
        {links.map((link) => {
          const isActive = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link key={link.href} href={link.href} style={{ textDecoration: "none" }}
              onClick={() => setMenuOpen(false)}>
              <div style={{
                padding: "10px 14px", borderRadius: 10, fontSize: 14, fontWeight: 500,
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
