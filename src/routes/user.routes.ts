import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import type { User } from "@prisma/client";

type SafeUser = Pick<User, "id" | "name" | "email" | "avatar" | "role" | "createdAt">;

const router = Router();

router.get("/", requireAuth, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const withStats = await Promise.all(
    users.map(async (u: SafeUser) => {
      const [total, pending, inProgress, completed] = await Promise.all([
        prisma.task.count({ where: { assignedToId: u.id } }),
        prisma.task.count({ where: { assignedToId: u.id, status: "PENDING" } }),
        prisma.task.count({ where: { assignedToId: u.id, status: "IN_PROGRESS" } }),
        prisma.task.count({ where: { assignedToId: u.id, status: "COMPLETED" } }),
      ]);
      return { ...u, stats: { total, pending, inProgress, completed } };
    })
  );

  res.json({ users: withStats });
});

export default router;
