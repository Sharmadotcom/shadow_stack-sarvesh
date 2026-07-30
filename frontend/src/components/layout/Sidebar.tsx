"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Settings,
  ShieldAlert,
  Bell,
  LogOut,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_USER } from "@/lib/constants";

const navItems = [
  {
    href: "/",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/complaints",
    icon: FileText,
    label: "My Complaints",
  },
  {
    href: "/complaints/new",
    icon: PlusCircle,
    label: "Submit Grievance",
  },
  {
    href: "/admin",
    icon: ShieldAlert,
    label: "Admin Panel",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0 h-screen flex flex-col border-r border-border/50 bg-card/30 backdrop-blur-sm">
      {/* Logo */}
      <div className="p-6 border-b border-border/50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm gradient-text">CampusGrieve</p>
            <p className="text-[10px] text-muted-foreground">
              Grievance Tracker
            </p>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("nav-item", isActive && "active")}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* SLA Alert Banner */}
      <div className="mx-4 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-2 text-red-400 text-xs font-medium">
          <Bell className="w-3 h-3 animate-bounce" />
          <span>2 SLA breaches active</span>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Immediate action required
        </p>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {DEMO_USER.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{DEMO_USER.name}</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {DEMO_USER.rollNo} · Student
            </p>
          </div>
          <button className="text-muted-foreground hover:text-foreground transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
