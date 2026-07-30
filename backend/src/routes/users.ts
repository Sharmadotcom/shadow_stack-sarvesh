import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

// 1. Get List of Users (Admin Only) - Filterable by role
router.get("/", authenticateToken, authorizeRoles("admin"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.query;
    const where: any = {};

    if (role && role !== "all") {
      where.role = String(role);
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        department: true,
        hostel: true,
        avatar: true,
        createdAt: true,
        _count: {
          select: {
            submittedComplaints: true,
            assignedComplaints: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return res.json(users);
  } catch (error) {
    console.error("Get users error:", error);
    return res.status(500).json({ error: "Failed to fetch users" });
  }
});

// 2. Get List of Workers Available for Assignment (Admin Only)
router.get("/workers", authenticateToken, authorizeRoles("admin"), async (_req, res) => {
  try {
    const workers = await prisma.user.findMany({
      where: { role: "worker" },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        avatar: true,
      },
    });
    return res.json(workers);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch workers" });
  }
});

// 3. Admin Create User (Student or Worker)
router.post("/", authenticateToken, authorizeRoles("admin"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role, rollNo, department, hostel } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "Name, email, password, and role are required" });
    }

    if (!["student", "worker", "admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid user role" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatarInitials = name
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        role,
        rollNo: rollNo || null,
        department: department || null,
        hostel: hostel || null,
        avatar: avatarInitials || "U",
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        rollNo: true,
        department: true,
        hostel: true,
        avatar: true,
        createdAt: true,
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Admin create user error:", error);
    return res.status(500).json({ error: "Failed to create user" });
  }
});

// 4. Admin Delete User
router.delete("/:id", authenticateToken, authorizeRoles("admin"), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = req.user!;

    if (id === adminUser.id) {
      return res.status(400).json({ error: "You cannot delete your own admin account!" });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete user (cascade handles relations or set null)
    await prisma.user.delete({ where: { id } });

    return res.json({ message: `User ${targetUser.name} deleted successfully` });
  } catch (error) {
    console.error("Admin delete user error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
