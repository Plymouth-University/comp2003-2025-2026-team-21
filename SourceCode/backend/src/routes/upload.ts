import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * This file defines the /api/upload routes for handling image uploads.
 * It's mounted in server.ts as:
 *   app.use("/api", uploadRoutes);
 *
 * So routes become:
 *   POST /api/upload-image
 */

const router = Router();
const prisma = new PrismaClient();

/**
 * Configure multer to store files in memory as buffers.
 * This allows us to save directly to the database.
 */
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

/**
 * JWT payload shape (same as in auth routes)
 */
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * POST /api/upload-image
 *
 * Protected endpoint that requires authentication.
 * - Accepts multipart/form-data with an 'image' field
 * - Stores the image in the user's profileImage field
 * - Returns success message with image metadata
 * 
 * Note: This endpoint should be rate-limited in production to prevent abuse.
 * Consider adding express-rate-limit middleware for production deployments.
 */
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("image"),
  async (req: Request, res: Response) => {
    try {
      // Get authenticated user from middleware
      const decoded = (req as any).user as JwtPayload | undefined;

      if (!decoded || !decoded.id) {
        return res.status(401).json({ error: "Unauthenticated" });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { buffer, mimetype, originalname, size } = req.file;

      // Update user's profile image in the database
      await prisma.user.update({
        where: { id: decoded.id },
        data: {
          profileImage: buffer,
          profileImageMimeType: mimetype,
        },
      });

      // Return success response
      return res.status(200).json({
        message: "Image uploaded successfully",
        image: {
          filename: originalname,
          mimetype: mimetype,
          size: size,
        },
      });
    } catch (error: any) {
      console.error("Image upload error:", error);
      
      // Handle multer errors
      if (error.message === "Only image files are allowed") {
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(500).json({ error: "Failed to upload image" });
    }
  }
);

export default router;
