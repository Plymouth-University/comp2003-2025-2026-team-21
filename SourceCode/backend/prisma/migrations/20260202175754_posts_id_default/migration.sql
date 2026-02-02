/*
  Warnings:

  - The primary key for the `Posts` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `Posts` table. All the data in the column will be lost.
  - The required column `Post_pkey` was added to the `Posts` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- AlterTable
ALTER TABLE "Posts" DROP CONSTRAINT "Post_pkey",
RENAME CONSTRAINT "Post_pkey" TO "Posts_pkey",
DROP COLUMN "id",
ADD COLUMN     "Post_pkey" TEXT NOT NULL,
ADD CONSTRAINT "Posts_pkey" PRIMARY KEY ("Post_pkey");
