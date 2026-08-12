import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const ali = await prisma.user.upsert({
    where: { email: "ali@taskflow.dev" },
    update: {},
    create: {
      name: "Ali",
      email: "ali@taskflow.dev",
      password,
      avatar: "AL",
      role: Role.ADMIN,
    },
  });

  const arooj = await prisma.user.upsert({
    where: { email: "arooj@taskflow.dev" },
    update: {},
    create: {
      name: "Arooj",
      email: "arooj@taskflow.dev",
      password,
      avatar: "AR",
      role: Role.MEMBER,
    },
  });

  const existing = await prisma.task.count();
  if (existing === 0) {
    const t1 = await prisma.task.create({
      data: {
        title: "Website Landing Page",
        description: "Design and build the new marketing landing page.",
        status: "IN_PROGRESS",
        priority: "HIGH",
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        tags: ["design", "marketing"],
        createdById: ali.id,
        assignedToId: arooj.id,
        history: {
          create: [
            { action: "Task created by Ali", byId: ali.id },
            { action: "Assigned to Arooj", byId: ali.id },
            { action: "Status changed from Pending to In Progress", byId: arooj.id },
          ],
        },
      },
    });

    await prisma.task.create({
      data: {
        title: "API Integration",
        description: "Connect the billing service to the payments API.",
        status: "COMPLETED",
        priority: "HIGH",
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        tags: ["backend"],
        createdById: arooj.id,
        assignedToId: arooj.id,
        completedById: arooj.id,
        completedAt: new Date(),
        history: {
          create: [
            { action: "Task created by Arooj", byId: arooj.id },
            { action: "Assigned to Arooj", byId: arooj.id },
            { action: "Status changed from Pending to Completed", byId: arooj.id },
            { action: "Completed by Arooj", byId: arooj.id },
          ],
        },
      },
    });

    await prisma.task.create({
      data: {
        title: "Database Setup",
        description: "Provision the production Postgres instance and run migrations.",
        status: "PENDING",
        priority: "MEDIUM",
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        tags: ["infra"],
        createdById: ali.id,
        assignedToId: ali.id,
        history: { create: [{ action: "Task created by Ali", byId: ali.id }] },
      },
    });

    await prisma.notification.createMany({
      data: [
        { userId: arooj.id, message: "You were assigned a new task: Website Landing Page", taskId: t1.id },
        { userId: ali.id, message: "Arooj completed API Integration" },
      ],
    });
  }

  console.log("Seed complete. Login with ali@taskflow.dev / arooj@taskflow.dev, password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
