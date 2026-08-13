import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";

const router = Router();

// GET /api/compensation-ranges - list all ranges, lowest amount first, flat rates last
router.get("/", requireAuth, async (_req, res) => {
  const ranges = await prisma.compensationRange.findMany({
    orderBy: [{ isFlat: "asc" }, { minValue: "asc" }],
  });
  res.json({ ranges });
});

const rangeSchema = z
  .object({
    label: z.string().min(1),
    isFlat: z.boolean().optional().default(false),
    minValue: z.number().nonnegative().nullable().optional(),
    maxValue: z.number().nonnegative().nullable().optional(),
    percentage: z.number().min(0).max(100),
  })
  .refine((data) => data.isFlat || data.minValue != null, {
    message: "Min value is required unless this is a flat rate",
    path: ["minValue"],
  })
  .refine((data) => data.maxValue == null || data.minValue == null || data.maxValue >= data.minValue, {
    message: "Max value must be greater than or equal to min value",
  });

// POST /api/compensation-ranges
router.post("/", requireAuth, async (req, res) => {
  const parsed = rangeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const range = await prisma.compensationRange.create({
    data: {
      label: data.label,
      isFlat: data.isFlat,
      minValue: data.isFlat ? null : data.minValue,
      maxValue: data.isFlat ? null : data.maxValue ?? null,
      percentage: data.percentage,
    },
  });
  res.status(201).json({ range });
});

const updateSchema = z
  .object({
    label: z.string().min(1).optional(),
    isFlat: z.boolean().optional(),
    minValue: z.number().nonnegative().nullable().optional(),
    maxValue: z.number().nonnegative().nullable().optional(),
    percentage: z.number().min(0).max(100).optional(),
  })
  .refine(
    (data) => data.maxValue == null || data.minValue == null || data.maxValue >= data.minValue,
    { message: "Max value must be greater than or equal to min value" }
  );

// PATCH /api/compensation-ranges/:id
router.patch("/:id", requireAuth, async (req, res) => {
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
  const data = parsed.data;

  const existing = await prisma.compensationRange.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Range not found" });

  const range = await prisma.compensationRange.update({
    where: { id: req.params.id },
    data: {
      label: data.label,
      isFlat: data.isFlat,
      minValue: data.isFlat ? null : data.minValue,
      maxValue: data.isFlat ? null : data.maxValue,
      percentage: data.percentage,
    },
  });
  res.json({ range });
});

// DELETE /api/compensation-ranges/:id
router.delete("/:id", requireAuth, async (req, res) => {
  const existing = await prisma.compensationRange.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "Range not found" });
  await prisma.compensationRange.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
