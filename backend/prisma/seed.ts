import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding production database configuration...");

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

  // 1. Initial Master Admin Account
  const admin = await prisma.user.create({
    data: {
      id: "admin-001",
      email: "admin@campus.edu",
      password: adminPassword,
      name: "Dr. Ramesh Kumar (Admin)",
      role: "admin",
      department: "Dean of Campus Facilities",
      avatar: "RK",
    },
  });

  // 2. Initial Sample Worker & Student for setup
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

  // 3. Issue Categories & SLA Rules
  const categories = [
    { id: "electrical", label: "Electrical", icon: "", slaHours: 4, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { id: "plumbing", label: "Plumbing", icon: "", slaHours: 8, color: "text-blue-400", bg: "bg-blue-400/10" },
    { id: "internet", label: "Internet / WiFi", icon: "", slaHours: 6, color: "text-purple-400", bg: "bg-purple-400/10" },
    { id: "hostel", label: "Hostel Room", icon: "", slaHours: 24, color: "text-green-400", bg: "bg-green-400/10" },
    { id: "canteen", label: "Canteen / Food", icon: "", slaHours: 12, color: "text-orange-400", bg: "bg-orange-400/10" },
    { id: "academics", label: "Academics", icon: "", slaHours: 48, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { id: "transport", label: "Transport", icon: "", slaHours: 12, color: "text-teal-400", bg: "bg-teal-400/10" },
    { id: "security", label: "Security", icon: "", slaHours: 2, color: "text-red-400", bg: "bg-red-400/10" },
    { id: "other", label: "Other", icon: "", slaHours: 48, color: "text-gray-400", bg: "bg-gray-400/10" },
  ];

  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }

  // Initial Sample Complaint
  const now = new Date();
  const c1 = await prisma.complaint.create({
    data: {
      id: "CMP-1001",
      title: "Power Socket Sparking in Room 304",
      description: "The main wall socket near desk sparks whenever plugged in.",
      category: "electrical",
      priority: "high",
      status: "assigned",
      location: "Himalaya Block - Room 304",
      slaDeadline: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      submittedById: student1.id,
      assignedToId: worker1.id,
      createdAt: now,
    },
  });

  await prisma.auditLog.create({
    data: {
      complaintId: c1.id,
      changedById: admin.id,
      newStatus: "assigned",
      comment: "Complaint created and assigned to Ramesh Electrician",
    },
  });

  console.log("Database initialized cleanly!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
