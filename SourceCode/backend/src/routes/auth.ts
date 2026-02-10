import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment variables");
}

interface JwtPayload {
  id: string;
  email: string;
  role: "STUDENT" | "ORGANISATION";
}

const signToken = (payload: JwtPayload) => {
  if (!JWT_SECRET) {
    throw new Error("JWT secret not configured");
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const sanitizeStudent = (student: {
  id: string;
  email: string;
  username: string;
  name: string | null;
  createdAt: Date;
  profileImage: Buffer | null;
  profileImageMimeType: string | null;
}) => ({
  id: student.id,
  email: student.email,
  username: student.username,
  role: "STUDENT" as const,
  name: student.name,
  createdAt: student.createdAt,
  profileImage: student.profileImage ? student.profileImage.toString("base64") : null,
  profileImageMimeType: student.profileImageMimeType,
});

const sanitizeOrganisation = (org: {
  id: string;
  email: string;
  name: string;
  location: string;
  createdAt: Date;
  profileImage: Buffer | null;
  profileImageMimeType: string | null;
  evidenceImage: Buffer | null;
  evidenceImageMimeType: string | null;
}) => ({
  id: org.id,
  email: org.email,
  role: "ORGANISATION" as const,
  username: org.name,
  name: org.name,
  location: org.location,
  createdAt: org.createdAt,
  profileImage: org.profileImage ? org.profileImage.toString("base64") : null,
  profileImageMimeType: org.profileImageMimeType,
  evidenceImage: org.evidenceImage ? org.evidenceImage.toString("base64") : null,
  evidenceImageMimeType: org.evidenceImageMimeType,
});

const emailExists = async (email: string) => {
  const [student, org] = await Promise.all([
    prisma.student.findUnique({ where: { email } }),
    prisma.organisation.findUnique({ where: { email } }),
  ]);

  return Boolean(student || org);
};

/**
 * POST /auth/register-student
 */
router.post("/register-student", async (req: Request, res: Response) => {
  const { email, username, password, name } = req.body;

  if (!email || !username || !password) {
    return res.status(400).json({ error: "Missing email, username, or password" });
  }

  try {
    if (await emailExists(email)) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const existingUsername = await prisma.student.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ error: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const student = await prisma.student.create({
      data: {
        email,
        username,
        password: hashedPassword,
        name: name || null,
      },
    });

    const token = signToken({ id: student.id, email: student.email, role: "STUDENT" });

    return res.status(201).json({
      token,
      user: sanitizeStudent({
        ...student,
        profileImage: student.profileImage ?? null,
        profileImageMimeType: student.profileImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("Student registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/register-org
 */
router.post("/register-org", async (req: Request, res: Response) => {
  const { email, password, name, location } = req.body;

  if (!email || !password || !name || !location) {
    return res.status(400).json({ error: "Missing email, password, name, or location" });
  }

  try {
    if (await emailExists(email)) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const org = await prisma.organisation.create({
      data: {
        email,
        password: hashedPassword,
        name,
        location,
      },
    });

    const token = signToken({ id: org.id, email: org.email, role: "ORGANISATION" });

    return res.status(201).json({
      token,
      user: sanitizeOrganisation({
        ...org,
        evidenceImage: org.evidenceImage ?? null,
        evidenceImageMimeType: org.evidenceImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("Organisation registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login-student
 */
router.post("/login-student", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const student = await prisma.student.findUnique({ where: { email } });

    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }

    const isValid = await bcrypt.compare(password, student.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = signToken({ id: student.id, email: student.email, role: "STUDENT" });

    return res.json({
      token,
      user: sanitizeStudent({
        ...student,
        profileImage: student.profileImage ?? null,
        profileImageMimeType: student.profileImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("Student login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /auth/login-org
 */
router.post("/login-org", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    const org = await prisma.organisation.findUnique({ where: { email } });

    if (!org) {
      return res.status(404).json({ error: "Organisation not found" });
    }

    const isValid = await bcrypt.compare(password, org.password);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const token = signToken({ id: org.id, email: org.email, role: "ORGANISATION" });

    return res.json({
      token,
      user: sanitizeOrganisation({
        ...org,
        evidenceImage: org.evidenceImage ?? null,
        evidenceImageMimeType: org.evidenceImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("Organisation login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * GET /auth/me
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user as JwtPayload | undefined;

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (decoded.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: decoded.id } });
      if (!student) return res.status(404).json({ error: "Student not found" });

      return res.json({
        user: sanitizeStudent({
          ...student,
          profileImage: student.profileImage ?? null,
          profileImageMimeType: student.profileImageMimeType ?? null,
        }),
      });
    }

    const org = await prisma.organisation.findUnique({ where: { id: decoded.id } });
    if (!org) return res.status(404).json({ error: "Organisation not found" });

    return res.json({
      user: sanitizeOrganisation({
        ...org,
        evidenceImage: org.evidenceImage ?? null,
        evidenceImageMimeType: org.evidenceImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("Fetch current user error:", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

/**
 * GET /auth/user/:userId
 */
router.get("/user/:userId", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const student = await prisma.student.findUnique({ where: { id: userId } });
    if (student) {
      return res.json({
        user: sanitizeStudent({
          ...student,
          profileImage: student.profileImage ?? null,
          profileImageMimeType: student.profileImageMimeType ?? null,
        }),
      });
    }

    const org = await prisma.organisation.findUnique({ where: { id: userId } });
    if (!org) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({
      user: sanitizeOrganisation({
        ...org,
        evidenceImage: org.evidenceImage ?? null,
        evidenceImageMimeType: org.evidenceImageMimeType ?? null,
      }),
    });
  } catch (err: any) {
    console.error("User profile endpoint error:", err);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

/**
 * PUT /auth/profile-image
 */
router.put("/profile-image", authMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user as JwtPayload | undefined;

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { image, imageMimeType } = req.body;
    if (!image || !imageMimeType) {
      return res.status(400).json({ error: "Missing image or imageMimeType" });
    }

    const imageBuffer = Buffer.from(image, "base64");

    if (decoded.role === "STUDENT") {
      const updatedStudent = await prisma.student.update({
        where: { id: decoded.id },
        data: {
          profileImage: imageBuffer,
          profileImageMimeType: imageMimeType,
        },
      });

      return res.json({
        user: sanitizeStudent({
          ...updatedStudent,
          profileImage: updatedStudent.profileImage ?? null,
          profileImageMimeType: updatedStudent.profileImageMimeType ?? null,
        }),
      });
    }

    if (decoded.role === "ORGANISATION") {
      const updatedOrg = await prisma.organisation.update({
        where: { id: decoded.id },
        data: {
          profileImage: imageBuffer,
          profileImageMimeType: imageMimeType,
        },
      });

      return res.json({
        user: sanitizeOrganisation({
          ...updatedOrg,
          profileImage: updatedOrg.profileImage ?? null,
          profileImageMimeType: updatedOrg.profileImageMimeType ?? null,
          evidenceImage: updatedOrg.evidenceImage ?? null,
          evidenceImageMimeType: updatedOrg.evidenceImageMimeType ?? null,
        }),
      });
    }

    return res.status(403).json({ error: "Invalid role" });
  } catch (err: any) {
    console.error("Profile image update error:", err);
    return res.status(500).json({ error: "Failed to update profile image" });
  }
});

/**
 * PUT /auth/password
 */
router.put("/password", authMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user as JwtPayload | undefined;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: "Missing password fields" });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "New passwords do not match" });
    }

    if (decoded.role === "STUDENT") {
      const student = await prisma.student.findUnique({ where: { id: decoded.id } });

      if (!student) {
        return res.status(404).json({ error: "Student not found" });
      }

      const isValid = await bcrypt.compare(currentPassword, student.password);
      if (!isValid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.student.update({
        where: { id: decoded.id },
        data: { password: hashedPassword },
      });

      return res.json({ message: "Password updated" });
    }

    const org = await prisma.organisation.findUnique({ where: { id: decoded.id } });
    if (!org) {
      return res.status(404).json({ error: "Organisation not found" });
    }

    const isValid = await bcrypt.compare(currentPassword, org.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.organisation.update({
      where: { id: decoded.id },
      data: { password: hashedPassword },
    });

    return res.json({ message: "Password updated" });
  } catch (err: any) {
    console.error("Password update error:", err);
    return res.status(500).json({ error: "Failed to update password" });
  }
});

/**
 * DELETE /auth/me
 */
router.delete("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user as JwtPayload | undefined;

    if (!decoded) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (decoded.role === "STUDENT") {
      await prisma.$transaction([
        prisma.posts.deleteMany({ where: { studentId: decoded.id } }),
        prisma.student.delete({ where: { id: decoded.id } }),
      ]);

      return res.json({ message: "Account deleted" });
    }

    if (decoded.role === "ORGANISATION") {
      await prisma.$transaction([
        prisma.posts.deleteMany({ where: { organisationId: decoded.id } }),
        prisma.event.deleteMany({ where: { organiserId: decoded.id } }),
        prisma.organisation.delete({ where: { id: decoded.id } }),
      ]);

      return res.json({ message: "Account deleted" });
    }

    return res.status(403).json({ error: "Invalid role" });
  } catch (err: any) {
    console.error("Account deletion error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
