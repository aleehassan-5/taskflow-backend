import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const punishmentInclude = {
  user: { select: { id: true, name: true, avatar: true } },
  issuedBy: { select: { id: true, name: true, avatar: true } },
  task: { select: { id: true, title: true } },
};

// GET /api/punishments - list with optional filters
router.get("/", requireAuth, async (req, res) => {
  const { userId, status } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;

  const punishments = await prisma.punishment.findMany({
    where,
    include: punishmentInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ punishments });
});

const createSchema = z.object({
  userId: z.string().min(1),
  reason: z.string().min(1),
  punishment: z.string().min(1),
  taskId: z.string().min(1).optional(),
  dueDate: z.string().optional(),
  status: z.enum(["PENDING", "DONE", "FORGIVEN"]).optional().default("PENDING"),
});

// POST /api/punishments
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const issuedById = req.user!.userId;

  const punishment = await prisma.punishment.create({
    data: {
      userId: data.userId,
      reason: data.reason,
      punishment: data.punishment,
      taskId: data.taskId ?? null,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      status: data.status,
      issuedById,
    },
    include: punishmentInclude,
  });
  res.status(201).json({ punishment });
});

const updateSchema = z.object({
  reason: z.string().min(1).optional(),
  punishment: z.string().min(1).optional(),
  taskId: z.string().min(1).nullable().optional(),
  dueDate: z.string().nullable().optional(),
  status: z.enum(["PENDING", "DONE", "FORGIVEN"]).optional(),
});

// PATCH /api/punishments/:id - only the person who issued it can change it
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const existing = await prisma.punishment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Punishment not found" });
  if (existing.issuedById !== req.user!.userId) {
    return res.status(403).json({ error: "Only the person who issued this punishment can change it" });
  }

  const punishment = await prisma.punishment.update({
    where: { id: req.params.id },
    data: {
      reason: data.reason,
      punishment: data.punishment,
      taskId: data.taskId,
      status: data.status,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
    },
    include: punishmentInclude,
  });
  res.json({ punishment });
});

// DELETE /api/punishments/:id - only the person who issued it can delete it
router.delete("/:id", requireAuth, async (req: AuthRequest, res) => {
  const existing = await prisma.punishment.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Punishment not found" });
  if (existing.issuedById !== req.user!.userId) {
    return res.status(403).json({ error: "Only the person who issued this punishment can delete it" });
  }
  await prisma.punishment.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
