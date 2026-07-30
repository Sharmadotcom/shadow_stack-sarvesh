  const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial campus users & grievances...');

  // 1. Create Users
  const student = await prisma.user.upsert({
    where: { email: 'rahul.student@campus.edu' },
    update: {},
    create: {
      name: 'Rahul Sharma',
      email: 'rahul.student@campus.edu',
      role: 'STUDENT',
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: 'ramesh.plumber@campus.edu' },
    update: {},
    create: {
      name: 'Ramesh Kumar (Plumbing Staff)',
      email: 'ramesh.plumber@campus.edu',
      role: 'STAFF',
      department: 'PLUMBING',
    },
  });

  const hod = await prisma.user.upsert({
    where: { email: 'hod.maintenance@campus.edu' },
    update: {},
    create: {
      name: 'Dr. Suresh Verma (Maintenance HOD)',
      email: 'hod.maintenance@campus.edu',
      role: 'DEPT_HEAD',
      department: 'PLUMBING',
    },
  });

  console.log('Created Users:', { student: student.name, staff: staff.name, hod: hod.name });

  // 2. Create Sample Grievance
  const now = new Date();
  const deadline = new Date(now.getTime() + 6 * 60 * 60 * 1000); // 6 hours SLA

  const grievance = await prisma.grievance.create({
    data: {
      ticketNumber: 'GRV-2026-0001',
      title: 'Water Pipe Leakage in Hostel Block B Room 304',
      description: 'Main bathroom pipe leaking continuously causing water logging in room floor.',
      category: 'PLUMBING',
      priority: 'HIGH',
      status: 'ASSIGNED',
      location: 'Hostel Block B, Room 304',
      department: 'PLUMBING',
      createdById: student.id,
      assignedToId: staff.id,
      slaHours: 6,
      slaDeadline: deadline,
      auditLogs: {
        create: [
          {
            action: 'CREATED',
            performedBy: student.id,
            details: 'Grievance submitted by Rahul Sharma (HIGH Priority, 6h SLA deadline).',
          },
          {
            action: 'ASSIGNED',
            performedBy: hod.id,
            details: 'Assigned responsibility to Ramesh Kumar (Plumbing Staff).',
          },
        ],
      },
      comments: {
        create: [
          {
            content: 'Technician assigned. Inspection scheduled for 5:00 PM today.',
            authorId: staff.id,
            isInternal: false,
          },
        ],
      },
    },
  });

  console.log('Seeded Grievance:', grievance.ticketNumber);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
