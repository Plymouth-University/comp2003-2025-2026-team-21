/*
  Warnings:

  - You are about to drop the column `authorId` on the `Posts` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Posts" DROP CONSTRAINT "Posts_authorId_fkey";

-- AlterTable
ALTER TABLE "Posts" DROP COLUMN "authorId",
ADD COLUMN     "organisationId" TEXT,
ADD COLUMN     "studentId" TEXT;

-- AddForeignKey
ALTER TABLE "Posts" ADD CONSTRAINT "Posts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Posts" ADD CONSTRAINT "Posts_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
