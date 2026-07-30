import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authenticateToken, authorizeRoles, AuthenticatedRequest } from "../middleware/auth";

const router = Router();

router.get("/", authenticateToken, authorizeRoles("admin"), async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const allComplaints = await prisma.complaint.findMany({
      include: {
        ratings: true,
        assignedTo: true,
      },
    });

    const total = allComplaints.length;
    const open = allComplaints.filter((c) => c.status === "open").length;
    const inProgress = allComplaints.filter((c) => c.status === "in_progress").length;
    const assigned = allComplaints.filter((c) => c.status === "assigned").length;
    const resolved = allComplaints.filter((c) => c.status === "resolved" || c.status === "closed").length;
    const escalated = allComplaints.filter((c) => c.status === "escalated" || c.isEscalated).length;

    // SLA Breaches
    const now = new Date();
    const slaBreachCount = allComplaints.filter((c) => {
      if (c.status === "resolved" || c.status === "closed") {
        return c.resolvedAt ? c.resolvedAt > c.slaDeadline : false;
      }
      return now > c.slaDeadline;
    }).length;

    // Average Resolution Time (hours)
    const resolvedComplaints = allComplaints.filter((c) => c.resolvedAt);
    let totalResolutionHours = 0;
    resolvedComplaints.forEach((c) => {
      const diffMs = c.resolvedAt!.getTime() - c.createdAt.getTime();
      totalResolutionHours += diffMs / (1000 * 60 * 60);
    });
    const avgResolutionHours =
      resolvedComplaints.length > 0
        ? Number((totalResolutionHours / resolvedComplaints.length).toFixed(1))
        : 0;

    // Category Distribution
    const categoryCounts: Record<string, number> = {};
    allComplaints.forEach((c) => {
      categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
    });

    // Priority Distribution
    const priorityCounts = {
      low: allComplaints.filter((c) => c.priority === "low").length,
      medium: allComplaints.filter((c) => c.priority === "medium").length,
      high: allComplaints.filter((c) => c.priority === "high").length,
      critical: allComplaints.filter((c) => c.priority === "critical").length,
    };

    // Status Distribution
    const statusCounts = {
      open,
      assigned,
      in_progress: inProgress,
      resolved,
      escalated,
    };

    // Ratings breakdown
    const allRatings = await prisma.rating.findMany();
    const totalRatingsCount = allRatings.length;
    const avgRating =
      totalRatingsCount > 0
        ? Number(
            (
              allRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatingsCount
            ).toFixed(1)
          )
        : 5.0;

    const ratingDistribution = {
      5: allRatings.filter((r) => r.rating === 5).length,
      4: allRatings.filter((r) => r.rating === 4).length,
      3: allRatings.filter((r) => r.rating === 3).length,
      2: allRatings.filter((r) => r.rating === 2).length,
      1: allRatings.filter((r) => r.rating === 1).length,
    };

    // SLA Compliance rate (%)
    const slaComplianceRate =
      total > 0 ? Number((((total - slaBreachCount) / total) * 100).toFixed(1)) : 100;

    // Worker Performance Leaderboard
    const workers = await prisma.user.findMany({
      where: { role: "worker" },
      include: {
        assignedComplaints: {
          include: { ratings: true },
        },
      },
    });

    const workerStats = workers.map((w) => {
      const assignedCount = w.assignedComplaints.length;
      const resolvedCount = w.assignedComplaints.filter(
        (c) => c.status === "resolved" || c.status === "closed"
      ).length;

      const ratings = w.assignedComplaints.flatMap((c) => c.ratings);
      const workerAvgRating =
        ratings.length > 0
          ? Number(
              (ratings.reduce((s, r) => s + r.rating, 0) / ratings.length).toFixed(1)
            )
          : 5.0;

      return {
        id: w.id,
        name: w.name,
        department: w.department || "Maintenance",
        assignedCount,
        resolvedCount,
        avgRating: workerAvgRating,
      };
    });

    return res.json({
      stats: {
        total,
        open,
        inProgress,
        resolved,
        escalated,
        slaBreachCount,
        avgResolutionHours,
        slaComplianceRate,
        avgRating,
        totalRatingsCount,
      },
      categoryCounts,
      priorityCounts,
      statusCounts,
      ratingDistribution,
      workerStats,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    return res.status(500).json({ error: "Failed to fetch analytics metrics" });
  }
});

export default router;
