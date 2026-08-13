-- CreateEnum
CREATE TYPE "HireStatus" AS ENUM ('INTERVIEWING', 'HIRED', 'ONBOARDING', 'ACTIVE', 'ON_HOLD', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompensationType" AS ENUM ('SALARY', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "Hire" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "compensationType" "CompensationType" NOT NULL DEFAULT 'SALARY',
    "compensationValue" DOUBLE PRECISION,
    "status" "HireStatus" NOT NULL DEFAULT 'INTERVIEWING',
    "source" TEXT,
    "notes" TEXT,
    "startDate" TIMESTAMP(3),
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hire_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Hire" ADD CONSTRAINT "Hire_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
