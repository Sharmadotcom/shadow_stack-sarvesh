import { Router } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles } from "../middleware/auth";

const router = Router();

// Get list of workers available for assignment
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

export default router;
