import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();
const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment variables");
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

router.post("/register", async (req: Request, res: Response) => {
  const { email, password, role, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Missing email, password, or name" });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || "STUDENT",
        name,
      },
    });

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    // auto-login token after register
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token, //frontend needs this
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// login
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Missing credentials" });

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid password" });

    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

// me (current user)
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const decoded = (req as any).user as JwtPayload | undefined;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    return res.json({ user });
  } catch (err) {
    console.error("Me endpoint error:", err);
    return res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
