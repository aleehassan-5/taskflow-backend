import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

const taskListInclude = {
  assignedTo: { select: { id: true, name: true, avatar: true } },
  createdBy: { select: { id: true, name: true, avatar: true } },
  completedBy: { select: { id: true, name: true, avatar: true } },
  _count: { select: { history: true } },
};

const taskDetailInclude = {
  assignedTo: { select: { id: true, name: true, avatar: true } },
  createdBy: { select: { id: true, name: true, avatar: true } },
  completedBy: { select: { id: true, name: true, avatar: true } },
  history: { include: { by: { select: { id: true, name: true, avatar: true } } }, orderBy: { createdAt: "asc" as const } },
};

// kept for the mutation endpoints below, which all return the full detail shape
const taskInclude = taskDetailInclude;

// GET /api/tasks - list with optional filters
router.get("/", requireAuth, async (req, res) => {
  const { status, priority, assignedTo, search } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status) where.status = status;
  if (priority) where.priority = priority;
  if (assignedTo) where.assignedToId = assignedTo;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const tasks = await prisma.task.findMany({
    where,
    include: taskListInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ tasks });
});

// GET /api/tasks/activity/recent - lightweight feed for dashboard, doesn't require loading full task list
router.get("/activity/recent", requireAuth, async (req, res) => {
  const entries = await prisma.taskHistory.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: {
      by: { select: { id: true, name: true, avatar: true } },
      task: { select: { id: true, title: true } },
    },
  });
  res.json({ activity: entries });
});

// GET /api/tasks/:id
router.get("/:id", requireAuth, async (req, res) => {
  const task = await prisma.task.findUnique({ where: { id: req.params.id }, include: taskDetailInclude });
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json({ task });
});

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assignedToId: z.string().optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

// POST /api/tasks
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const creatorId = req.user!.userId;

  const creator = await prisma.user.findUnique({ where: { id: creatorId } });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      status: data.status ?? "PENDING",
      priority: data.priority ?? "MEDIUM",
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      tags: data.tags ?? [],
      createdById: creatorId,
      history: {
        create: [
          { action: `Task created by ${creator?.name ?? "Someone"}`, byId: creatorId },
          ...(data.assignedToId
            ? [{ action: `Assigned to task owner`, byId: creatorId }]
            : []),
        ],
      },
    },
    include: taskInclude,
  });

  if (data.assignedToId && data.assignedToId !== creatorId) {
    await prisma.notification.create({
      data: {
        userId: data.assignedToId,
        message: `You were assigned a new task: ${task.title}`,
        taskId: task.id,
      },
    });
  }

  res.status(201).json({ task });
});

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  assignedToId: z.string().nullable().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  dueDate: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
});

// PATCH /api/tasks/:id - general field updates
router.patch("/:id", requireAuth, async (req: AuthRequest, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const actorId = req.user!.userId;

  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  const historyEntries: { action: string; byId: string }[] = [];

  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    const newAssignee = data.assignedToId
      ? await prisma.user.findUnique({ where: { id: data.assignedToId } })
      : null;
    historyEntries.push({
      action: newAssignee ? `Reassigned to ${newAssignee.name}` : "Unassigned",
      byId: actorId,
    });
    if (newAssignee && newAssignee.id !== actorId) {
      await prisma.notification.create({
        data: {
          userId: newAssignee.id,
          message: `You were assigned a task: ${existing.title}`,
          taskId: existing.id,
        },
      });
    }
  }

  let dueDateNotifyUserId: string | null = null;
  if (data.dueDate !== undefined) {
    const newDue = data.dueDate ? new Date(data.dueDate) : null;
    const oldDue = existing.dueDate;
    const changed = (newDue?.getTime() ?? null) !== (oldDue?.getTime() ?? null);
    if (changed) {
      historyEntries.push({
        action: newDue
          ? `Due date changed to ${newDue.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" })}`
          : "Due date removed",
        byId: actorId,
      });
      if (existing.assignedToId && existing.assignedToId !== actorId) {
        dueDateNotifyUserId = existing.assignedToId;
      }
    }
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      title: data.title,
      description: data.description,
      assignedToId: data.assignedToId,
      priority: data.priority,
      dueDate: data.dueDate === null ? null : data.dueDate ? new Date(data.dueDate) : undefined,
      tags: data.tags,
      history: historyEntries.length
        ? { create: historyEntries }
        : {
            create: [{ action: `Task updated by ${actor?.name ?? "Someone"}`, byId: actorId }],
          },
    },
    include: taskInclude,
  });

  if (dueDateNotifyUserId) {
    await prisma.notification.create({
      data: {
        userId: dueDateNotifyUserId,
        message: task.dueDate
          ? `Due date changed for ${task.title}`
          : `Due date removed for ${task.title}`,
        taskId: task.id,
      },
    });
  }

  res.json({ task });
});

const statusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "COMPLETED"]),
});

// POST /api/tasks/:id/status - status change (handles completion tracking)
router.post("/:id/status", requireAuth, async (req: AuthRequest, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Valid status is required" });
  const { status } = parsed.data;
  const actorId = req.user!.userId;

  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });

  const actor = await prisma.user.findUnique({ where: { id: actorId } });
  const fromLabel = STATUS_LABEL[existing.status];
  const toLabel = STATUS_LABEL[status];

  const isCompleting = status === "COMPLETED" && existing.status !== "COMPLETED";
  const isReopening = status !== "COMPLETED" && existing.status === "COMPLETED";

  const historyEntries = [{ action: `Status changed from ${fromLabel} to ${toLabel}`, byId: actorId }];
  if (isCompleting) {
    historyEntries.push({ action: `Completed by ${actor?.name ?? "Someone"}`, byId: actorId });
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      status,
      completedById: isCompleting ? actorId : isReopening ? null : undefined,
      completedAt: isCompleting ? new Date() : isReopening ? null : undefined,
      history: { create: historyEntries },
    },
    include: taskInclude,
  });

  if (isCompleting && existing.createdById !== actorId) {
    await prisma.notification.create({
      data: {
        userId: existing.createdById,
        message: `${actor?.name ?? "Someone"} completed ${task.title}`,
        taskId: task.id,
      },
    });
  }

  res.json({ task });
});

// DELETE /api/tasks/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const existing = await prisma.task.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Task not found" });
  await prisma.task.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
