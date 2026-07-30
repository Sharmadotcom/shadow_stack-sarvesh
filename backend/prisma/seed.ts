import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing
  await prisma.rating.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.user.deleteMany();
  await prisma.category.deleteMany();

  // Create hashed passwords
  const adminPassword = await bcrypt.hash("admin123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);
  const workerPassword = await bcrypt.hash("worker123", 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      id: "admin-001",
      email: "admin@campus.edu",
      password: adminPassword,
      name: "Dr. Ramesh Kumar",
      role: "admin",
      department: "Dean of Campus Facilities",
      avatar: "RK",
    },
  });

  const student1 = await prisma.user.create({
    data: {
      id: "student-001",
      email: "arjun@campus.edu",
      password: studentPassword,
      name: "Arjun Sharma",
      role: "student",
      rollNo: "22CS045",
      department: "Computer Science",
      hostel: "Himalaya Block - Room 304",
      avatar: "AS",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      id: "student-002",
      email: "priya@campus.edu",
      password: studentPassword,
      name: "Priya Patel",
      role: "student",
      rollNo: "22EC012",
      department: "Electronics & Comm.",
      hostel: "Ganga Block - Room 102",
      avatar: "PP",
    },
  });

  const worker1 = await prisma.user.create({
    data: {
      id: "worker-001",
      email: "worker.elec@campus.edu",
      password: workerPassword,
      name: "Ramesh Electrician",
      role: "worker",
      department: "Electrical Maintenance",
      avatar: "RE",
    },
  });

  const worker2 = await prisma.user.create({
    data: {
      id: "worker-002",
      email: "worker.plumb@campus.edu",
      password: workerPassword,
      name: "Suresh Plumber",
      role: "worker",
      department: "Plumbing Department",
      avatar: "SP",
    },
  });

  const worker3 = await prisma.user.create({
    data: {
      id: "worker-003",
      email: "worker.wifi@campus.edu",
      password: workerPassword,
      name: "Vikram IT Technician",
      role: "worker",
      department: "IT & Wi-Fi Support",
      avatar: "VT",
    },
  });

  const worker4 = await prisma.user.create({
    data: {
      id: "worker-004",
      email: "worker.carp@campus.edu",
      password: workerPassword,
      name: "Mahesh Carpenter",
      role: "worker",
      department: "Furniture & Woodwork",
      avatar: "MC",
    },
  });

  // 2. Create Categories
  const categories = [
    { id: "electrical", label: "Electrical", icon: "Zap", slaHours: 4, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { id: "plumbing", label: "Plumbing", icon: "Wrench", slaHours: 8, color: "text-blue-400", bg: "bg-blue-400/10" },
    { id: "internet", label: "Internet / WiFi", icon: "Wifi", slaHours: 6, color: "text-purple-400", bg: "bg-purple-400/10" },
    { id: "hostel", label: "Hostel Room", icon: "Home", slaHours: 24, color: "text-green-400", bg: "bg-green-400/10" },
    { id: "canteen", label: "Canteen / Food", icon: "Utensils", slaHours: 12, color: "text-orange-400", bg: "bg-orange-400/10" },
    { id: "academics", label: "Academics", icon: "BookOpen", slaHours: 48, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { id: "transport", label: "Transport", icon: "Bus", slaHours: 12, color: "text-teal-400", bg: "bg-teal-400/10" },
    { id: "security", label: "Security", icon: "Shield", slaHours: 2, color: "text-red-400", bg: "bg-red-400/10" },
    { id: "other", label: "Other", icon: "FileText", slaHours: 48, color: "text-gray-400", bg: "bg-gray-400/10" },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }

  // 3. Create Sample Complaints
  const now = new Date();

  // Complaint 1: Open Electrical
  const c1 = await prisma.complaint.create({
    data: {
      id: "CMP-1001",
      title: "Power Socket Sparking in Room 304",
      description: "The main wall socket near the desk sparks whenever a laptop charger is plugged in. Potential fire hazard.",
      category: "electrical",
      priority: "high",
      status: "open",
      location: "Himalaya Block - Room 304",
      slaDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000), // +4h
      submittedById: student1.id,
      createdAt: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1h ago
    },
  });

  // Complaint 2: In Progress Wi-Fi
  const c2 = await prisma.complaint.create({
    data: {
      id: "CMP-1002",
      title: "Wi-Fi Disconnecting Frequently in Library 2nd Floor",
      description: "Signal drops every 10 minutes on the CS study zone wing. Cannot access research papers.",
      category: "internet",
      priority: "medium",
      status: "in_progress",
      location: "Central Library - 2nd Floor East Wing",
      slaDeadline: new Date(now.getTime() + 3 * 60 * 60 * 1000),
      submittedById: student2.id,
      assignedToId: worker3.id,
      createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    },
  });

  // Complaint 3: Escalated Critical Plumbing
  const c3 = await prisma.complaint.create({
    data: {
      id: "CMP-1003",
      title: "Major Pipe Burst in Himalaya Block 1st Floor Washroom",
      description: "Water flooding into corridor near elevator. Requires immediate shutoff valve repair.",
      category: "plumbing",
      priority: "critical",
      status: "escalated",
      location: "Himalaya Block - 1st Floor Washroom",
      slaDeadline: new Date(now.getTime() - 2 * 60 * 60 * 1000), // Breached 2h ago!
      isEscalated: true,
      escalatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      escalationReason: "SLA Response Breach (+8h elapsed without resolution)",
      submittedById: student1.id,
      assignedToId: worker2.id,
      createdAt: new Date(now.getTime() - 10 * 60 * 60 * 1000),
    },
  });

  // Complaint 4: Resolved Hostel Furniture (with rating)
  const c4 = await prisma.complaint.create({
    data: {
      id: "CMP-1004",
      title: "Broken Study Chair Armrest",
      description: "Right armrest of chair in Room 102 broke off completely.",
      category: "hostel",
      priority: "low",
      status: "resolved",
      location: "Ganga Block - Room 102",
      slaDeadline: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      resolvedAt: new Date(now.getTime() - 5 * 60 * 60 * 1000),
      submittedById: student2.id,
      assignedToId: worker4.id,
      createdAt: new Date(now.getTime() - 20 * 60 * 60 * 1000),
    },
  });

  // Rating for Complaint 4
  await prisma.rating.create({
    data: {
      complaintId: c4.id,
      studentId: student2.id,
      rating: 5,
      feedback: "Quick repair! The carpenter replaced it with a brand new sturdy chair. Excellent work.",
    },
  });

  // Create Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        complaintId: c1.id,
        changedById: student1.id,
        newStatus: "open",
        comment: "Complaint created by Arjun Sharma",
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        complaintId: c2.id,
        changedById: admin.id,
        oldStatus: "open",
        newStatus: "assigned",
        comment: "Assigned to Vikram IT Technician",
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        complaintId: c2.id,
        changedById: worker3.id,
        oldStatus: "assigned",
        newStatus: "in_progress",
        comment: "Inspecting router access point #4 on 2nd floor",
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000),
      },
      {
        complaintId: c3.id,
        changedById: admin.id,
        oldStatus: "in_progress",
        newStatus: "escalated",
        comment: "AUTOMATIC SLA ESCALATION: Urgent priority level elevated",
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
