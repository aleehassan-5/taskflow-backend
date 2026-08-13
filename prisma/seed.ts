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

  // One-time cleanup: earlier deploys seeded demo tasks/hires alongside the
  // real accounts. Remove them by their exact known titles/names so they stop
  // mixing in with real data. Safe to run every deploy — once they're gone,
  // these deleteMany calls just match zero rows and do nothing.
  await prisma.task.deleteMany({
    where: { title: { in: ["Website Landing Page", "API Integration", "Database Setup"] } },
  });
  await prisma.hire.deleteMany({
    where: { name: { in: ["Hassan Raza", "Sana Malik"] } },
  });

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
