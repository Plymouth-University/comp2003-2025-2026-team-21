/*
  NOTE:
  This migration normalizes the Posts primary key constraint name.
  It intentionally avoids dropping the id column or data.
*/
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Post_pkey'
  ) THEN
    ALTER TABLE "Posts" RENAME CONSTRAINT "Post_pkey" TO "Posts_pkey";
  END IF;
END $$;
