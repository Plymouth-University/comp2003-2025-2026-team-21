import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { authMiddleware } from "../middleware/authMiddleware";

/**
 * This file defines the /auth routes and exports an Express router.
 * It's mounted in server.ts as:
 *   app.use("/auth", authRoutes);
 *
 * So routes become:
 *   POST /auth/register
 *   POST /auth/login
 *   GET  /auth/me
 */

const router = Router();
const prisma = new PrismaClient();

/**
 * JWT secret should come from .env (JWT_SECRET=...)
 * You warn if it isn't set (good),
 * and you also guard before jwt.sign (also good).
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment variables");
}

/**
 * Expected token payload shape.
 * This matches what you sign in register/login below.
 */
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * POST /auth/register
 *
 * - Validates required fields
 * - Checks if email exists
 * - Hashes password
 * - Creates user
 * - Signs token (auto-login)
 * - Returns token + safe user fields
 */
router.post("/register", async (req: Request, res: Response) => {
  const { email, username, password, role, name } = req.body;

  // Basic validation - stop early if required fields missing
  if (!email || !username || !password || !name) {
    return res.status(400).json({ error: "Missing email, username, password, or name" });
  }

  try {
    // Check if email or username is already taken
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ error: `${field} already exists` });
    }

    // Hash password for secure storage
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in DB
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role: role || "STUDENT", // default role
        name,
      },
    });

    // If JWT secret missing, you can't sign tokens — treat as server misconfig
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    /**
     * Create token so user is logged in immediately after registering.
     * Payload includes id/email/role so the backend can authorize later.
     */
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return token + safe user fields (important: do NOT send password)
    return res.status(201).json({
      token, // frontend stores this (usually localStorage/cookie) and sends it on future requests
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role,
        name: user.name,
      },
    });
  } catch (err: any) {
    console.error("Registration error:", err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

/**
 * POST /auth/login
 *
 * - Validates email/password
 * - Finds user
 * - Compares bcrypt password
 * - Signs token
 * - Returns token + safe user fields
 */
router.post("/login", async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing credentials" });
  }

  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    // Compare password with stored hash
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: "Invalid password" });

    // Ensure JWT secret exists before signing
    if (!JWT_SECRET) {
      return res.status(500).json({ error: "JWT secret not configured" });
    }

    // Create token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role } as JwtPayload,
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Return token + safe user fields
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

/**
 * GET /auth/me
 *
 * Protected endpoint:
 * - Requires authMiddleware
 * - Reads user id from decoded token (req.user)
 * - Fetches latest user info from DB
 * - Returns user
 */
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    /**
     * authMiddleware sets req.user = decodedPayload
     * Here you cast because TS might not know req.user exists.
     */
    const decoded = (req as any).user as JwtPayload | undefined;

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    // Fetch user by id and return only safe fields
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
