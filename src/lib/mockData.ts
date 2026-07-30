import { Complaint, AuditLog, DashboardStats } from "@/types";
import { DEMO_USER, ADMIN_USER } from "@/lib/constants";

const now = new Date();
const hoursAgo = (h: number) =>
  new Date(now.getTime() - h * 60 * 60 * 1000).toISOString();
const hoursFromNow = (h: number) =>
  new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

export const MOCK_COMPLAINTS: Complaint[] = [
  {
    id: "GRV-001",
    title: "WiFi not working in Lab 3",
    description:
      "The WiFi connection in Computer Lab 3 has been down since Monday morning. Students are unable to access online resources during practicals. This is severely affecting our lab sessions.",
    category: "internet",
    priority: "high",
    status: "in_progress",
    submittedBy: DEMO_USER,
    assignedTo: { ...ADMIN_USER, name: "Rahul (IT Dept)", avatar: "RI" },
    location: "Computer Lab 3, Block A",
    slaDeadline: hoursFromNow(1.5),
    createdAt: hoursAgo(4),
    updatedAt: hoursAgo(1),
    tags: ["wifi", "lab", "urgent"],
  },
  {
    id: "GRV-002",
    title: "Broken ceiling fan in Room 304",
    description:
      "The ceiling fan in my hostel room (Himalaya Block, Room 304) stopped working. The room gets extremely hot at night and it is affecting sleep and studies.",
    category: "hostel",
    priority: "medium",
    status: "assigned",
    submittedBy: DEMO_USER,
    assignedTo: { ...ADMIN_USER, name: "Maintenance Team", avatar: "MT" },
    location: "Himalaya Block - Room 304",
    slaDeadline: hoursFromNow(6),
    createdAt: hoursAgo(8),
    updatedAt: hoursAgo(3),
    tags: ["fan", "hostel"],
  },
  {
    id: "GRV-003",
    title: "Water leakage in washroom corridor",
    description:
      "There is a major water leakage in the washroom corridor near Block B ground floor. The floor is completely wet and it is a slip hazard for students.",
    category: "plumbing",
    priority: "critical",
    status: "escalated",
    submittedBy: { ...DEMO_USER, name: "Priya Nair", avatar: "PN" },
    location: "Block B, Ground Floor Washroom",
    slaDeadline: hoursAgo(2),
    createdAt: hoursAgo(12),
    updatedAt: hoursAgo(0.5),
    tags: ["leak", "hazard", "urgent"],
  },
  {
    id: "GRV-004",
    title: "Canteen food quality issue",
    description:
      "The food served in the main canteen has been of very poor quality for the past week. Several students have complained of stomach issues. The vegetables seem stale.",
    category: "canteen",
    priority: "high",
    status: "open",
    submittedBy: { ...DEMO_USER, name: "Vikram Singh", avatar: "VS" },
    location: "Main Canteen, Ground Floor",
    slaDeadline: hoursFromNow(4),
    createdAt: hoursAgo(2),
    updatedAt: hoursAgo(2),
    tags: ["food", "health"],
  },
  {
    id: "GRV-005",
    title: "Projector not working in Seminar Hall",
    description:
      "The main projector in the Seminar Hall has been malfunctioning. The display flickers and sometimes goes completely black during presentations.",
    category: "electrical",
    priority: "medium",
    status: "resolved",
    submittedBy: { ...DEMO_USER, name: "Ananya Patel", avatar: "AP" },
    assignedTo: { ...ADMIN_USER, name: "IT Support", avatar: "IT" },
    location: "Seminar Hall, Block C",
    slaDeadline: hoursFromNow(20),
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(24),
    resolvedAt: hoursAgo(24),
    tags: ["projector", "electrical"],
  },
  {
    id: "GRV-006",
    title: "Library AC not working",
    description:
      "The air conditioning system in the library reading hall has not been functioning for 3 days. The temperature inside is very uncomfortable making it hard to study.",
    category: "electrical",
    priority: "medium",
    status: "open",
    submittedBy: { ...DEMO_USER, name: "Karan Mehta", avatar: "KM" },
    location: "Central Library, 1st Floor",
    slaDeadline: hoursFromNow(0.5),
    createdAt: hoursAgo(6),
    updatedAt: hoursAgo(6),
    tags: ["ac", "library"],
  },
  {
    id: "GRV-007",
    title: "Bus route 5 not running on time",
    description:
      "The college bus on route 5 is consistently running 30-45 minutes late, causing students to miss their first period. This has been happening for 2 weeks.",
    category: "transport",
    priority: "low",
    status: "closed",
    submittedBy: { ...DEMO_USER, name: "Sneha Reddy", avatar: "SR" },
    assignedTo: { ...ADMIN_USER, name: "Transport Office", avatar: "TO" },
    location: "Route 5 - City Stop",
    slaDeadline: hoursAgo(48),
    createdAt: hoursAgo(96),
    updatedAt: hoursAgo(72),
    resolvedAt: hoursAgo(72),
    tags: ["bus", "transport"],
  },
];

export const MOCK_AUDIT_LOGS: AuditLog[] = [
  {
    id: "LOG-001",
    complaintId: "GRV-001",
    changedBy: ADMIN_USER,
    oldStatus: "open",
    newStatus: "assigned",
    comment: "Assigned to IT Department. Will be resolved within SLA.",
    timestamp: hoursAgo(3),
  },
  {
    id: "LOG-002",
    complaintId: "GRV-001",
    changedBy: { ...ADMIN_USER, name: "Rahul (IT Dept)", avatar: "RI" },
    oldStatus: "assigned",
    newStatus: "in_progress",
    comment: "Team is on-site investigating the router issue.",
    timestamp: hoursAgo(1),
  },
  {
    id: "LOG-003",
    complaintId: "GRV-003",
    changedBy: ADMIN_USER,
    oldStatus: "open",
    newStatus: "escalated",
    comment:
      "SLA breached. Escalated to Department Head. Immediate action required.",
    timestamp: hoursAgo(0.5),
  },
];

export const MOCK_STATS: DashboardStats = {
  total: MOCK_COMPLAINTS.length,
  open: MOCK_COMPLAINTS.filter((c) => c.status === "open").length,
  inProgress: MOCK_COMPLAINTS.filter((c) => c.status === "in_progress").length,
  resolved: MOCK_COMPLAINTS.filter(
    (c) => c.status === "resolved" || c.status === "closed"
  ).length,
  escalated: MOCK_COMPLAINTS.filter((c) => c.status === "escalated").length,
  avgResolutionHours: 18,
  slaBreachCount: 2,
};
