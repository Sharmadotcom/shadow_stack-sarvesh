import { PrismaClient, Priority, Status, Role } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import bcrypt from "bcryptjs";
import path from "path";

const dbUrl =
  process.env.DATABASE_URL ||
  `file:${path.join(process.cwd(), "prisma", "dev.db")}`;

const adapter = new PrismaLibSql({ url: dbUrl });
const prisma = new PrismaClient({ adapter });


async function main() {
  console.log("🌱 Seeding database...");

  // ─── System User (for automated escalation timeline events) ───────────────

  const systemUser = await prisma.user.upsert({
    where: { email: "system@campus.internal" },
    update: {},
    create: {
      name: "System",
      email: "system@campus.internal",
      role: Role.SUPER_ADMIN,
      isSystem: true,
      authProvider: "LOCAL",
    },
  });
  console.log("✅ System user:", systemUser.id);

  // ─── Super Admin ──────────────────────────────────────────────────────────

  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@vitbhopal.ac.in" },
    update: {},
    create: {
      name: "Admin User",
      email: "admin@vitbhopal.ac.in",
      passwordHash: await bcrypt.hash("admin123", 12),
      role: Role.SUPER_ADMIN,
      department: "Administration",
      authProvider: "LOCAL",
    },
  });
  console.log("✅ Super Admin:", superAdmin.email);

  // ─── Categories with SLA config ───────────────────────────────────────────

  const categories = [
    {
      name: "Electrical",
      slug: "electrical",
      defaultPriority: Priority.MEDIUM,
      slaAckHours: 4,
      slaResolveHours: 48,
    },
    {
      name: "Plumbing",
      slug: "plumbing",
      defaultPriority: Priority.MEDIUM,
      slaAckHours: 4,
      slaResolveHours: 48,
    },
    {
      name: "IT / Network",
      slug: "it-network",
      defaultPriority: Priority.HIGH,
      slaAckHours: 2,
      slaResolveHours: 24,
    },
    {
      name: "Furniture",
      slug: "furniture",
      defaultPriority: Priority.LOW,
      slaAckHours: 48,
      slaResolveHours: 168,
    },
    {
      name: "Hostel",
      slug: "hostel",
      defaultPriority: Priority.MEDIUM,
      slaAckHours: 24,
      slaResolveHours: 120,
    },
    {
      name: "Sanitation",
      slug: "sanitation",
      defaultPriority: Priority.HIGH,
      slaAckHours: 2,
      slaResolveHours: 24,
    },
    {
      name: "Academic",
      slug: "academic",
      defaultPriority: Priority.LOW,
      slaAckHours: 48,
      slaResolveHours: 168,
    },
    {
      name: "Harassment / Safety",
      slug: "harassment-safety",
      defaultPriority: Priority.CRITICAL,
      slaAckHours: 1,
      slaResolveHours: 12,
      isRestricted: true,
    },
    {
      name: "Other",
      slug: "other",
      defaultPriority: Priority.LOW,
      slaAckHours: 48,
      slaResolveHours: 168,
    },
  ];

  const createdCategories: Record<string, number> = {};

  for (const cat of categories) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    createdCategories[cat.slug] = created.id;
    console.log(`✅ Category: ${created.name}`);
  }

  // ─── Demo Staff / Technicians ─────────────────────────────────────────────

  const staffMembers = [
    { name: "Ramesh Kumar", email: "ramesh@vitbhopal.ac.in", dept: "Electrical", categorySlug: "electrical" },
    { name: "Priya Sharma", email: "priya@vitbhopal.ac.in", dept: "Plumbing", categorySlug: "plumbing" },
    { name: "Arjun IT", email: "arjun@vitbhopal.ac.in", dept: "IT", categorySlug: "it-network" },
    { name: "Kavita Warden", email: "kavita@vitbhopal.ac.in", dept: "Hostel", categorySlug: "hostel" },
    { name: "Suresh Sanitation", email: "suresh@vitbhopal.ac.in", dept: "Sanitation", categorySlug: "sanitation" },
  ];

  const createdStaff: { id: number; categorySlug: string }[] = [];

  for (const s of staffMembers) {
    const staff = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        passwordHash: await bcrypt.hash("staff123", 12),
        role: Role.STAFF,
        department: s.dept,
        authProvider: "LOCAL",
      },
    });

    // Add to category team
    await prisma.categoryTeamMember.upsert({
      where: {
        categoryId_userId: {
          categoryId: createdCategories[s.categorySlug],
          userId: staff.id,
        },
      },
      update: {},
      create: {
        categoryId: createdCategories[s.categorySlug],
        userId: staff.id,
      },
    });

    createdStaff.push({ id: staff.id, categorySlug: s.categorySlug });
    console.log(`✅ Staff: ${staff.name}`);
  }

  // ─── Dept Admin ───────────────────────────────────────────────────────────

  const deptAdmin = await prisma.user.upsert({
    where: { email: "deptadmin@vitbhopal.ac.in" },
    update: {},
    create: {
      name: "Dept Admin",
      email: "deptadmin@vitbhopal.ac.in",
      passwordHash: await bcrypt.hash("admin123", 12),
      role: Role.DEPT_ADMIN,
      department: "Electrical",
      authProvider: "LOCAL",
    },
  });
  console.log("✅ Dept Admin:", deptAdmin.email);

  // ─── Demo Students ────────────────────────────────────────────────────────

  const students = [
    { name: "Riya Patel", email: "21BCE0001@vitbhopal.ac.in" },
    { name: "Ankit Mehta", email: "21BCE0002@vitbhopal.ac.in" },
    { name: "Deepa Krishnan", email: "21BCE0003@vitbhopal.ac.in" },
  ];

  const createdStudents: { id: number }[] = [];

  for (const s of students) {
    const student = await prisma.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        name: s.name,
        email: s.email,
        passwordHash: await bcrypt.hash("student123", 12),
        role: Role.STUDENT,
        authProvider: "LOCAL",
      },
    });
    createdStudents.push({ id: student.id });
    console.log(`✅ Student: ${student.name}`);
  }

  // ─── Demo Tickets ──────────────────────────────────────────────────────────

  const now = new Date();
  const pastDate = (hoursAgo: number) =>
    new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);

  const tickets = [
    // 1. Normal open ticket
    {
      ticketCode: "GRV-2024-001001",
      studentId: createdStudents[0].id,
      categoryId: createdCategories["plumbing"],
      title: "Water leakage in Hostel B, Room 204",
      description: "There is a pipe burst causing water leakage on the floor. The room is getting flooded.",
      priority: Priority.HIGH,
      location: "Hostel B, Room 204",
      status: Status.OPEN,
      assignedToId: createdStaff.find(s => s.categorySlug === "plumbing")?.id ?? null,
      slaDeadlineAck: new Date(now.getTime() + 4 * 60 * 60 * 1000),
      slaDeadlineResolve: new Date(now.getTime() + 48 * 60 * 60 * 1000),
    },
    // 2. In-progress ticket
    {
      ticketCode: "GRV-2024-001002",
      studentId: createdStudents[1].id,
      categoryId: createdCategories["electrical"],
      title: "Lights not working in Lab 3B",
      description: "All ceiling lights in Lab 3B are not working since yesterday morning.",
      priority: Priority.MEDIUM,
      location: "Main Block, Lab 3B",
      status: Status.IN_PROGRESS,
      assignedToId: createdStaff.find(s => s.categorySlug === "electrical")?.id ?? null,
      slaDeadlineAck: pastDate(3),
      slaDeadlineResolve: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      acknowledgedAt: pastDate(2),
    },
    // 3. PRE-BREACHED ticket for demo escalation (SLA already expired)
    {
      ticketCode: "GRV-2024-001003",
      studentId: createdStudents[2].id,
      categoryId: createdCategories["it-network"],
      title: "WiFi down in Hostel A wing",
      description: "No internet connectivity in the entire Hostel A wing. Students cannot attend online classes.",
      priority: Priority.CRITICAL,
      location: "Hostel A, All Floors",
      status: Status.OPEN,
      assignedToId: createdStaff.find(s => s.categorySlug === "it-network")?.id ?? null,
      slaDeadlineAck: pastDate(5), // 5 hours overdue — BREACHED
      slaDeadlineResolve: pastDate(2), // Also overdue
      createdAt: pastDate(8),
    },
    // 4. Resolved ticket
    {
      ticketCode: "GRV-2024-001004",
      studentId: createdStudents[0].id,
      categoryId: createdCategories["hostel"],
      title: "AC not working in Hostel C Room 101",
      description: "Air conditioning unit has stopped working.",
      priority: Priority.HIGH,
      location: "Hostel C, Room 101",
      status: Status.RESOLVED,
      assignedToId: createdStaff.find(s => s.categorySlug === "hostel")?.id ?? null,
      slaDeadlineAck: pastDate(30),
      slaDeadlineResolve: pastDate(10),
      acknowledgedAt: pastDate(45),
      resolvedAt: pastDate(12),
      resolutionNote: "AC unit repaired. Replaced faulty capacitor.",
    },
    // 5. Escalated ticket already (for super admin demo)
    {
      ticketCode: "GRV-2024-001005",
      studentId: createdStudents[1].id,
      categoryId: createdCategories["sanitation"],
      title: "Blocked drainage in Girls Hostel Block D",
      description: "Main drainage blocked causing water logging near the entrance.",
      priority: Priority.HIGH,
      location: "Girls Hostel Block D",
      status: Status.ESCALATED,
      assignedToId: createdStaff.find(s => s.categorySlug === "sanitation")?.id ?? null,
      slaDeadlineAck: pastDate(10),
      slaDeadlineResolve: pastDate(6),
      isEscalated: true,
      escalationTier: 2,
      createdAt: pastDate(15),
    },
  ];

  for (const t of tickets) {
    const ticket = await prisma.ticket.upsert({
      where: { ticketCode: t.ticketCode },
      update: {},
      create: t as any,
    });

    // Seed basic timeline
    await prisma.ticketTimeline.create({
      data: {
        ticketId: ticket.id,
        actorId: t.studentId,
        action: "CREATED",
        newStatus: Status.OPEN,
        note: "Ticket created",
      },
    });

    if (t.status === Status.ESCALATED) {
      await prisma.ticketTimeline.create({
        data: {
          ticketId: ticket.id,
          actorId: systemUser.id,
          action: "ESCALATION",
          oldStatus: Status.OPEN,
          newStatus: Status.ESCALATED,
          note: "SLA breach — acknowledgement overdue. Escalated to Department Admin.",
        },
      });
    }

    if (t.status === Status.RESOLVED && t.resolvedAt) {
      await prisma.ticketTimeline.create({
        data: {
          ticketId: ticket.id,
          actorId: t.assignedToId ?? superAdmin.id,
          action: "STATUS_CHANGED",
          oldStatus: Status.IN_PROGRESS,
          newStatus: Status.RESOLVED,
          note: t.resolutionNote ?? "Issue resolved",
        },
      });
    }

    console.log(`✅ Ticket: ${ticket.ticketCode} — ${ticket.title}`);
  }

  // ─── Demo notifications ───────────────────────────────────────────────────

  await prisma.notification.createMany({
    data: [
      {
        userId: createdStudents[0].id,
        ticketId: 1,
        message: "Your ticket GRV-2024-001001 has been assigned to Priya Sharma (Plumbing Team)",
      },
      {
        userId: createdStudents[2].id,
        ticketId: 3,
        message: "Your ticket GRV-2024-001003 has been escalated due to SLA breach",
      },
    ],
  });



  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Demo credentials:");
  console.log("  Super Admin  → admin@vitbhopal.ac.in      / admin123");
  console.log("  Dept Admin   → deptadmin@vitbhopal.ac.in  / admin123");
  console.log("  Staff (Ramesh) → ramesh@vitbhopal.ac.in   / staff123");
  console.log("  Student (Riya) → 21BCE0001@vitbhopal.ac.in / student123");
  console.log("\n⚡ Ticket GRV-2024-001003 has an already-breached SLA — trigger");
  console.log("   GET /api/admin/escalation/trigger to demo live escalation!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
