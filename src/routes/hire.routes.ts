import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, AuthRequest } from "../middleware/auth";

const router = Router();

const hireInclude = {
  addedBy: { select: { id: true, name: true, avatar: true } },
};

// GET /api/hires - list with optional filters
router.get("/", requireAuth, async (req, res) => {
  const { status, search } = req.query as Record<string, string | undefined>;

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { role: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const hires = await prisma.hire.findMany({
    where,
    include: hireInclude,
    orderBy: { createdAt: "desc" },
  });
  res.json({ hires });
});

// GET /api/hires/:id
router.get("/:id", requireAuth, async (req, res) => {
  const hire = await prisma.hire.findUnique({ where: { id: req.params.id }, include: hireInclude });
  if (!hire) return res.status(404).json({ error: "Hire not found" });
  res.json({ hire });
});

const compensationSchema = z
  .object({
    compensationType: z.enum(["SALARY", "PERCENTAGE"]).optional(),
    compensationValue: z.number().nonnegative().optional(),
  })
  .refine(
    (data) =>
      data.compensationType !== "PERCENTAGE" ||
      data.compensationValue === undefined ||
      data.compensationValue <= 100,
    { message: "Percentage compensation must be between 0 and 100" }
  );

const createSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    role: z.string().min(1),
    status: z.enum(["INTERVIEWING", "HIRED", "ONBOARDING", "ACTIVE", "ON_HOLD", "REJECTED"]).optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    startDate: z.string().optional(),
  })
  .and(compensationSchema);

// POST /api/hires
router.post("/", requireAuth, async (req: AuthRequest, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;
  const addedById = req.user!.userId;

  const hire = await prisma.hire.create({
    data: {
      name: data.name,
      email: data.email || undefined,
      phone: data.phone,
      role: data.role,
      compensationType: data.compensationType ?? "SALARY",
      compensationValue: data.compensationValue,
      status: data.status ?? "INTERVIEWING",
      source: data.source,
      notes: data.notes,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      addedById,
    },
    include: hireInclude,
  });

  res.status(201).json({ hire });
});

const updateSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    role: z.string().min(1).optional(),
    status: z.enum(["INTERVIEWING", "HIRED", "ONBOARDING", "ACTIVE", "ON_HOLD", "REJECTED"]).optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    startDate: z.string().nullable().optional(),
  })
  .and(compensationSchema);

// PATCH /api/hires/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const existing = await prisma.hire.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Hire not found" });

  const hire = await prisma.hire.update({
    where: { id: req.params.id },
    data: {
      name: data.name,
      email: data.email === "" ? null : data.email,
      phone: data.phone,
      role: data.role,
      compensationType: data.compensationType,
      compensationValue: data.compensationValue,
      status: data.status,
      source: data.source,
      notes: data.notes,
      startDate: data.startDate === null ? null : data.startDate ? new Date(data.startDate) : undefined,
    },
    include: hireInclude,
  });

  res.json({ hire });
});

// DELETE /api/hires/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const existing = await prisma.hire.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Hire not found" });
  await prisma.hire.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
