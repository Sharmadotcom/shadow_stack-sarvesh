import { UserRole } from "@/types";

// Complaint Categories with SLA rules
export const CATEGORIES = [
  {
    id: "electrical",
    label: "Electrical",
    icon: "Zap",
    slaHours: 4,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
  },
  {
    id: "plumbing",
    label: "Plumbing",
    icon: "Wrench",
    slaHours: 8,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
  },
  {
    id: "internet",
    label: "Internet / WiFi",
    icon: "Wifi",
    slaHours: 6,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
  },
  {
    id: "hostel",
    label: "Hostel Room",
    icon: "Home",
    slaHours: 24,
    color: "text-green-400",
    bg: "bg-green-400/10",
  },
  {
    id: "canteen",
    label: "Canteen / Food",
    icon: "Utensils",
    slaHours: 12,
    color: "text-orange-400",
    bg: "bg-orange-400/10",
  },
  {
    id: "academics",
    label: "Academics",
    icon: "BookOpen",
    slaHours: 48,
    color: "text-indigo-400",
    bg: "bg-indigo-400/10",
  },
  {
    id: "transport",
    label: "Transport",
    icon: "Bus",
    slaHours: 12,
    color: "text-teal-400",
    bg: "bg-teal-400/10",
  },
  {
    id: "security",
    label: "Security",
    icon: "Shield",
    slaHours: 2,
    color: "text-red-400",
    bg: "bg-red-400/10",
  },
  {
    id: "other",
    label: "Other",
    icon: "FileText",
    slaHours: 48,
    color: "text-gray-400",
    bg: "bg-gray-400/10",
  },
];

export const PRIORITIES = [
  {
    id: "low",
    label: "Low",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
  },
  {
    id: "medium",
    label: "Medium",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
  },
  {
    id: "high",
    label: "High",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    border: "border-orange-400/30",
  },
  {
    id: "critical",
    label: "Critical",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
];

export const STATUSES = [
  {
    id: "open",
    label: "Open",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
  },
  {
    id: "assigned",
    label: "Assigned",
    color: "text-violet-400",
    bg: "bg-violet-400/10",
    border: "border-violet-400/30",
  },
  {
    id: "in_progress",
    label: "In Progress",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
  },
  {
    id: "resolved",
    label: "Resolved",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/30",
  },
  {
    id: "closed",
    label: "Closed",
    color: "text-gray-400",
    bg: "bg-gray-400/10",
    border: "border-gray-400/30",
  },
  {
    id: "escalated",
    label: "Escalated",
    color: "text-red-400",
    bg: "bg-red-400/10",
    border: "border-red-400/30",
  },
];

export const DEMO_USER = {
  id: "student-001",
  name: "Arjun Sharma",
  email: "arjun@campus.edu",
  role: "student" as UserRole,
  rollNo: "22CS045",
  department: "Computer Science",
  hostel: "Himalaya Block - Room 304",
  avatar: "AS",
};

export const ADMIN_USER = {
  id: "admin-001",
  name: "Dr. Ramesh Kumar",
  email: "admin@campus.edu",
  role: "admin" as UserRole,
  avatar: "RK",
};
