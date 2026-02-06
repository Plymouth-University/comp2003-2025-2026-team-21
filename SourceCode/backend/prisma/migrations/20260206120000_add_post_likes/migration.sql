-- Add likes counter to posts
ALTER TABLE "Posts" ADD COLUMN "likes" INTEGER NOT NULL DEFAULT 0;
