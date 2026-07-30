// Core types for the Grievance Tracker

export type Priority = "low" | "medium" | "high" | "critical";
export type Status =
  | "open"
  | "assigned"
  | "in_progress"
  | "pending_approval"
  | "resolved"
  | "closed"
  | "escalated";
export type UserRole = "student" | "worker" | "admin";

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

export interface Rating {
  id: string;
  complaintId: string;
  studentId: string;
  rating: number; // 1 to 5
  feedback?: string;
  createdAt: string;
  student?: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface AuditLog {
  id: string;
  complaintId: string;
  changedBy: {
    id: string;
    name: string;
    role: string;
    avatar?: string;
  };
  oldStatus?: Status;
  newStatus?: Status;
  oldPriority?: Priority;
  newPriority?: Priority;
  comment?: string;
  timestamp: string;
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
  assignedToId?: string;
  location?: string;
  attachments?: string[];
  slaDeadline: string; // ISO date string
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  closedAt?: string;
  approvalRequestedAt?: string;
  isEscalated?: boolean;
  escalatedAt?: string;
  escalationReason?: string;
  ratings?: Rating[];
  auditLogs?: AuditLog[];
  tags?: string[];
}

export interface DashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  escalated: number;
  avgResolutionHours: number;
  slaBreachCount: number;
  slaComplianceRate?: number;
  avgRating?: number;
  totalRatingsCount?: number;
}

export interface ComplaintFormData {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  location?: string;
  attachments?: string[];
}
