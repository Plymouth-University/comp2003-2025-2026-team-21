-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "eventImage" BYTEA,
ADD COLUMN     "eventImageMimeType" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "profileImage" BYTEA,
ADD COLUMN     "profileImageMimeType" TEXT;
