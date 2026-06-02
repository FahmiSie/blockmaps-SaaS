-- CreateEnum
CREATE TYPE "statusCompany" AS ENUM ('Active', 'Delete');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "status" "statusCompany" NOT NULL DEFAULT 'Active';
