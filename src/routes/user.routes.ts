import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import type { User } from "@prisma/client";

type SafeUser = Pick<User, "id" | "name" | "email" | "avatar" | "role" | "createdAt">;

const router = Router();

type TaskStats = { total: number; pending: number; inProgress: number; completed: number };

router.get("/", requireAuth, async (_req, res) => {
  // Fetch users and per-status task counts in just 2 queries total,
  // instead of the previous 1 + 4*N queries (N+1 problem).
  const [users, grouped] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, name: true, email: true, avatar: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.task.groupBy({
      by: ["assignedToId", "status"],
      _count: { _all: true },
      where: { assignedToId: { not: null } },
    }),
  ]);

  const statsMap = new Map<string, TaskStats>();
  for (const g of grouped) {
    const id = g.assignedToId as string;
    const entry = statsMap.get(id) ?? { total: 0, pending: 0, inProgress: 0, completed: 0 };
    entry.total += g._count._all;
    if (g.status === "PENDING") entry.pending += g._count._all;
    else if (g.status === "IN_PROGRESS") entry.inProgress += g._count._all;
    else if (g.status === "COMPLETED") entry.completed += g._count._all;
    statsMap.set(id, entry);
  }

  const withStats = users.map((u: SafeUser) => ({
    ...u,
    stats: statsMap.get(u.id) ?? { total: 0, pending: 0, inProgress: 0, completed: 0 },
  }));

  res.json({ users: withStats });
});

export default router;
