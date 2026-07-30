import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// Helper to generate next CMP ID (e.g. CMP-1005)
async function generateComplaintId() {
  const count = await prisma.complaint.count();
  return `CMP-${1001 + count}`;
}

// 1. Get List of Complaints (Role-scoped + Filterable)
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { status, category, priority, search } = req.query;

    const where: any = {};

    // Role-based visibility
    if (user.role === "student") {
      where.submittedById = user.id;
    } else if (user.role === "worker") {
      where.assignedToId = user.id;
    }
    // Admin sees all complaints

    if (status && status !== "all") {
      where.status = String(status);
    }
    if (category && category !== "all") {
      where.category = String(category);
    }
    if (priority && priority !== "all") {
      where.priority = String(priority);
    }
    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { title: { contains: q } },
        { id: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true, role: true, rollNo: true, department: true, hostel: true, avatar: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, department: true, avatar: true },
        },
        ratings: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const parsedComplaints = complaints.map((c) => ({
      ...c,
      attachments: c.attachments ? JSON.parse(c.attachments) : [],
    }));

    return res.json(parsedComplaints);
  } catch (error) {
    console.error("Get complaints error:", error);
    return res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// 2. Create Complaint (Students / Users)
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { title, description, category, priority = "medium", location, attachments = [] } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category are required" });
    }

    // Lookup Category for SLA hours
    const cat = await prisma.category.findUnique({ where: { id: category } });
    const slaHours = cat ? cat.slaHours : 24;

    const now = new Date();
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);
    const complaintId = await generateComplaintId();

    const complaint = await prisma.complaint.create({
      data: {
        id: complaintId,
        title,
        description,
        category,
        priority: ["low", "medium", "high", "critical"].includes(priority) ? priority : "medium",
        status: "open",
        location,
        attachments: JSON.stringify(attachments),
        slaDeadline,
        submittedById: user.id,
      },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true, role: true, rollNo: true, department: true, hostel: true, avatar: true },
        },
      },
    });

    // Initial audit log
    await prisma.auditLog.create({
      data: {
        complaintId: complaint.id,
        changedById: user.id,
        newStatus: "open",
        comment: `Complaint submitted under category '${category}' with ${slaHours}h SLA.`,
      },
    });

    return res.status(201).json({
      ...complaint,
      attachments: complaint.attachments ? JSON.parse(complaint.attachments) : [],
    });
  } catch (error) {
    console.error("Create complaint error:", error);
    return res.status(500).json({ error: "Failed to create complaint" });
  }
});

// 3. Get Complaint Detail
router.get("/:id", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        submittedBy: {
          select: { id: true, name: true, email: true, role: true, rollNo: true, department: true, hostel: true, avatar: true },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, role: true, department: true, avatar: true },
        },
        auditLogs: {
          include: {
            changedBy: {
              select: { id: true, name: true, role: true, avatar: true },
            },
          },
          orderBy: { timestamp: "asc" },
        },
        ratings: {
          include: {
            student: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    return res.json({
      ...complaint,
      attachments: complaint.attachments ? JSON.parse(complaint.attachments) : [],
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch complaint detail" });
  }
});

// 4. Update Complaint Status (Worker / Admin / Student)
router.patch("/:id/status", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;
    const user = req.user!;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const oldStatus = existing.status;
    const now = new Date();

    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === "resolved" && !existing.resolvedAt) {
      updateData.resolvedAt = now;
    }
    if (status === "closed" && !existing.closedAt) {
      updateData.closedAt = now;
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
      include: {
        submittedBy: true,
        assignedTo: true,
      },
    });

    // Create Audit Log entry
    await prisma.auditLog.create({
      data: {
        complaintId: id,
        changedById: user.id,
        oldStatus,
        newStatus: status,
        comment: comment || `Status updated to '${status}' by ${user.name}`,
      },
    });

    return res.json({
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    });
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({ error: "Failed to update complaint status" });
  }
});

// 5. Assign Complaint to Worker (Admin Only)
router.patch("/:id/assign", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can assign complaints to staff" });
    }

    const { id } = req.params;
    const { workerId } = req.body;

    const worker = await prisma.user.findUnique({ where: { id: workerId } });
    if (!worker) {
      return res.status(404).json({ error: "Worker not found" });
    }

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId: workerId,
        status: existing.status === "open" ? "assigned" : existing.status,
      },
      include: {
        submittedBy: true,
        assignedTo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: id,
        changedById: user.id,
        oldStatus: existing.status,
        newStatus: updated.status,
        comment: `Assigned to worker ${worker.name} (${worker.department || "Staff"})`,
      },
    });

    return res.json({
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    });
  } catch (error) {
    console.error("Assign worker error:", error);
    return res.status(500).json({ error: "Failed to assign worker" });
  }
});

// 6. Priority Escalation (Admin / System / Student request)
router.patch("/:id/escalate", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { priority = "critical", reason } = req.body;
    const user = req.user!;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const oldPriority = existing.priority;
    const oldStatus = existing.status;

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        priority,
        status: "escalated",
        isEscalated: true,
        escalatedAt: new Date(),
        escalationReason: reason || `Manual escalation requested by ${user.name}`,
      },
      include: {
        submittedBy: true,
        assignedTo: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        complaintId: id,
        changedById: user.id,
        oldStatus,
        newStatus: "escalated",
        oldPriority,
        newPriority: priority,
        comment: `Priority Escalated to '${priority}'. Reason: ${reason || "High Urgency Notice"}`,
      },
    });

    return res.json({
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    });
  } catch (error) {
    console.error("Escalate error:", error);
    return res.status(500).json({ error: "Failed to escalate complaint" });
  }
});

// 7. Submit Service Rating (Student for resolved complaints)
router.post("/:id/rating", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const user = req.user!;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5 stars" });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const existingRating = await prisma.rating.findFirst({
      where: { complaintId: id, studentId: user.id },
    });

    let serviceRating;
    if (existingRating) {
      serviceRating = await prisma.rating.update({
        where: { id: existingRating.id },
        data: { rating: Number(rating), feedback },
      });
    } else {
      serviceRating = await prisma.rating.create({
        data: {
          complaintId: id,
          studentId: user.id,
          rating: Number(rating),
          feedback,
        },
      });
    }

    // Optionally mark complaint as closed if student rates it
    if (complaint.status === "resolved") {
      await prisma.complaint.update({
        where: { id },
        data: { status: "closed", closedAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          complaintId: id,
          changedById: user.id,
          oldStatus: "resolved",
          newStatus: "closed",
          comment: `Student submitted ${rating}-star rating and closed the issue.`,
        },
      });
    }

    return res.status(201).json(serviceRating);
  } catch (error) {
    console.error("Rating error:", error);
    return res.status(500).json({ error: "Failed to save rating" });
  }
});

export default router;
