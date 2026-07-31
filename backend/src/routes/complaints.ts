import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { notifyComplaintCreated, notifyComplaintUpdated } from "../lib/socket";

const router = Router();

// Helper to generate next CMP ID (e.g. CMP-1005)
async function generateComplaintId() {
  const count = await prisma.complaint.count();
  return `CMP-${1001 + count}`;
}

function getMatchingCategoriesForWorker(department: string | null | undefined): string[] {
  if (!department) return [];
  const dept = department.toLowerCase().trim();

  if (dept.includes("electric")) {
    return ["electrical", "electrician"];
  }
  if (dept.includes("plumb")) {
    return ["plumbing", "plumber"];
  }
  if (dept.includes("driver") || dept.includes("transport")) {
    return ["transport", "driver", "vehicle"];
  }
  if (dept.includes("secur")) {
    return ["security"];
  }
  if (dept.includes("tech") || dept.includes("internet") || dept.includes("wifi")) {
    return ["internet", "academics", "technical", "technician"];
  }
  if (dept.includes("hostel")) {
    return ["hostel"];
  }
  if (dept.includes("canteen") || dept.includes("food")) {
    return ["canteen"];
  }

  return [dept, "other"];
}

async function autoProcessExpiredApprovals() {
  try {
    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    const expired = await prisma.complaint.findMany({
      where: {
        status: "pending_approval",
        approvalRequestedAt: {
          lte: eightHoursAgo,
        },
      },
    });

    for (const c of expired) {
      await prisma.complaint.update({
        where: { id: c.id },
        data: {
          status: "closed",
          closedAt: now,
          updatedAt: now,
        },
      });

      await prisma.auditLog.create({
        data: {
          complaintId: c.id,
          changedById: c.submittedById,
          oldStatus: "pending_approval",
          newStatus: "closed",
          comment: "Auto-closed after 8 hours of student approval request without response (deemed satisfied).",
        },
      });
    }
  } catch (err) {
    console.error("Error auto-processing expired approvals:", err);
  }
}

// 1. Get List of Complaints (Role-scoped + Filterable)
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await autoProcessExpiredApprovals();
    const user = req.user!;
    const { status, category, priority, search } = req.query;

    const where: any = {};

    // Role-based visibility
    if (user.role === "student") {
      where.submittedById = user.id;
    } else if (user.role === "worker") {
      const matchingCats = getMatchingCategoriesForWorker(user.department);
      where.OR = [
        { assignedToId: user.id },
        { category: { in: matchingCats } }
      ];
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
      const searchClause = [
        { title: { contains: q } },
        { id: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchClause }
        ];
        delete where.OR;
      } else {
        where.OR = searchClause;
      }
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

    const resultObj = {
      ...complaint,
      attachments: complaint.attachments ? JSON.parse(complaint.attachments) : [],
    };

    notifyComplaintCreated(resultObj);

    return res.status(201).json(resultObj);
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

    const user = req.user!;
    if (user.role === "worker") {
      const matchingCats = getMatchingCategoriesForWorker(user.department);
      const isAssigned = complaint.assignedToId === user.id;
      const isMatchingCategory = matchingCats.includes(complaint.category.toLowerCase());
      if (!isAssigned && !isMatchingCategory) {
        return res.status(403).json({ error: "Access Denied: Ticket category does not match worker specialty." });
      }
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

    if (user.role === "worker") {
      if (existing.assignedToId !== user.id) {
        return res.status(400).json({ error: "Please accept this task from the stack first before updating its progress." });
      }
    }

    const oldStatus = existing.status;
    const now = new Date();

    const updateData: any = {
      status,
      updatedAt: now,
    };

    if (status === "pending_approval" || status === "resolved") {
      updateData.status = "pending_approval";
      updateData.approvalRequestedAt = now;
      if (!existing.resolvedAt) updateData.resolvedAt = now;
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
        newStatus: updateData.status,
        comment: comment || `Work completed and submitted for student approval by ${user.name}`,
      },
    });

    const resultObj = {
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    };
    notifyComplaintUpdated(resultObj, "status_updated", comment);
    return res.json(resultObj);
  } catch (error) {
    console.error("Update status error:", error);
    return res.status(500).json({ error: "Failed to update complaint status" });
  }
});

// 4a. Student Approve Resolution (Satisfied)
router.patch("/:id/approve", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body || {};
    const user = req.user!;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (user.role === "student" && existing.submittedById !== user.id) {
      return res.status(403).json({ error: "Only the student who submitted this issue can approve the resolution." });
    }

    const now = new Date();
    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: "closed",
        closedAt: now,
        updatedAt: now,
      },
      include: {
        submittedBy: true,
        assignedTo: true,
      },
    });

    if (rating) {
      await prisma.rating.create({
        data: {
          complaintId: id,
          studentId: user.id,
          rating: Number(rating),
          feedback: feedback || "Satisfied with resolution.",
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        complaintId: id,
        changedById: user.id,
        oldStatus: existing.status,
        newStatus: "closed",
        comment: feedback ? `Student approved resolution (Satisfied). Rating: ${rating}/5 - ${feedback}` : "Student approved resolution (Satisfied). Ticket closed.",
      },
    });

    const resultObj = {
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    };
    notifyComplaintUpdated(resultObj, "approved", "Student approved resolution");
    return res.json(resultObj);
  } catch (error) {
    console.error("Approve resolution error:", error);
    return res.status(500).json({ error: "Failed to approve complaint resolution" });
  }
});

// 4b. Student Reject Resolution (Unsatisfied -> Re-opens & returns to stack)
router.patch("/:id/reject", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const user = req.user!;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Reason for dissatisfaction is required." });
    }

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    if (user.role === "student" && existing.submittedById !== user.id) {
      return res.status(403).json({ error: "Only the student who submitted this issue can reject the resolution." });
    }

    const now = new Date();
    const rejectionNote = `\n[UNSATISFIED RE-WORK REQUESTED at ${now.toLocaleString()}]: ${reason.trim()}`;

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: "open",
        assignedToId: null, // Re-enters the unassigned trade stack!
        approvalRequestedAt: null,
        description: existing.description + rejectionNote,
        updatedAt: now,
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
        newStatus: "open",
        comment: `Student rejected resolution (Unsatisfied): '${reason.trim()}'. Ticket re-generated & returned to stack.`,
      },
    });

    const resultObj = {
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    };
    notifyComplaintUpdated(resultObj, "rejected", reason);
    return res.json(resultObj);
  } catch (error) {
    console.error("Reject resolution error:", error);
    return res.status(500).json({ error: "Failed to submit dissatisfaction feedback" });
  }
});

// 5. Accept / Claim Task from Stack (Worker)
router.patch("/:id/accept", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (user.role !== "worker") {
      return res.status(403).json({ error: "Only maintenance workers can accept tasks from the stack" });
    }

    const { id } = req.params;
    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Complaint not found" });
    }

    const matchingCats = getMatchingCategoriesForWorker(user.department);
    const isMatchingCategory = matchingCats.includes(existing.category.toLowerCase());
    if (!isMatchingCategory) {
      return res.status(403).json({ error: "Access Denied: Ticket category does not match your trade specialty." });
    }

    if (existing.assignedToId && existing.assignedToId !== user.id) {
      return res.status(400).json({ error: "This task has already been claimed by another worker or assigned by Admin." });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        assignedToId: user.id,
        status: existing.status === "open" ? "assigned" : existing.status,
        updatedAt: new Date(),
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
        comment: `Task accepted from category stack by worker ${user.name} (${user.department || "Staff"})`,
      },
    });

    const resultObj = {
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    };
    notifyComplaintUpdated(resultObj, "claimed", `Task claimed by ${user.name}`);
    return res.json(resultObj);
  } catch (error) {
    console.error("Accept task error:", error);
    return res.status(500).json({ error: "Failed to accept task" });
  }
});

// 6. Assign Complaint to Worker (Admin or Worker Self-Assign)
router.patch("/:id/assign", authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { id } = req.params;
    let workerId = req.body?.workerId;

    if (user.role === "worker") {
      workerId = user.id;
    } else if (user.role !== "admin") {
      return res.status(403).json({ error: "Permission denied" });
    }

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

    const resultObj = {
      ...updated,
      attachments: updated.attachments ? JSON.parse(updated.attachments) : [],
    };
    notifyComplaintUpdated(resultObj, "assigned", `Task assigned to ${worker.name}`);
    return res.json(resultObj);
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
