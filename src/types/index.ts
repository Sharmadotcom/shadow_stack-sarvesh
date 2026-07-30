// Core types for the Grievance Tracker

export type Priority = "low" | "medium" | "high" | "critical";
export type Status =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "closed"
  | "escalated";
export type UserRole = "student" | "staff" | "admin" | "department_head";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  rollNo?: string;
  department?: string;
  hostel?: string;
  avatar?: string;
}

export interface Category {
  id: string;
  label: string;
  icon: string;
  slaHours: number;
  color: string;
  bg: string;
}

export interface Complaint {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: Priority;
  status: Status;
  submittedBy: User;
  assignedTo?: User;
  location?: string;
  attachments?: string[];
  slaDeadline: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  tags?: string[];
}

export interface AuditLog {
  id: string;
  complaintId: string;
  changedBy: User;
  oldStatus?: Status;
  newStatus?: Status;
  comment?: string;
  timestamp: string;
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  avgResolutionHours: number;
  slaBreachCount: number;
}

export interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  location?: string;
}
