import { Router } from "express";
import { prisma } from "../lib/prisma";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const categories = await prisma.category.findMany();
    return res.json(categories);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch categories" });
  }
});

export default router;
