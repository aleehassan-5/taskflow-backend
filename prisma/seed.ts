import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("ALLAH.pk87", 10);

  const ali = await prisma.user.upsert({
    where: { email: "ali@syntralogic.com" },
    update: { password },
    create: {
      name: "Ali",
      email: "ali@syntralogic.com",
      password,
      avatar: "AL",
      role: Role.ADMIN,
    },
  });

  const arooj = await prisma.user.upsert({
    where: { email: "arooj@syntralogic.com" },
    update: { password },
    create: {
      name: "Arooj",
      email: "arooj@syntralogic.com",
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

  const existingHires = await prisma.hire.count();
  if (existingHires === 0) {
    await prisma.hire.createMany({
      data: [
        {
          name: "Hassan Raza",
          email: "hassan.raza@example.com",
          phone: "+92 300 1234567",
          role: "Frontend Developer",
          compensationType: "SALARY",
          compensationValue: 80000,
          status: "INTERVIEWING",
          source: "LinkedIn",
          notes: "Strong React background, second interview scheduled.",
          addedById: ali.id,
        },
        {
          name: "Sana Malik",
          email: "sana.malik@example.com",
          phone: "+92 301 9876543",
          role: "Sales Consultant",
          compensationType: "PERCENTAGE",
          compensationValue: 10,
          status: "ACTIVE",
          source: "Referral",
          notes: "10% commission on closed deals.",
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          addedById: arooj.id,
        },
      ],
    });
  }

  console.log("Seed complete. Login with ali@syntralogic.com / arooj@syntralogic.com, password: ALLAH.pk87");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
