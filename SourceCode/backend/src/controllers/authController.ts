import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";

/**
 * JWT secret used to sign tokens.
 * The `!` tells TypeScript: "this exists".
 * If JWT_SECRET is missing at runtime, jwt.sign() will throw.
 */
const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * REGISTER
 * Creates a new user:
 * 1) read email/password/role from request body
 * 2) check if the email already exists
 * 3) hash the password (never store plain text)
 * 4) create user in the DB
 * 5) return user
 */
export const register = async (req: Request, res: Response) => {
  try {
    // Data the client sends in POST body
    const { email, username, password, role } = req.body;

    // 1) Does this user already exist?
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    // If yes: stop and return 400 Bad Request
    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({ message: `${field} already exists` });
    }

    // 2) Hash password using bcrypt.
    // 10 = salt rounds (security vs speed trade-off).
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3) Insert the new user into DB
    const newUser = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword, // store the HASH, not the raw password
        role: role || "STUDENT",  // default role if not provided
      },
    });

    // 4) Create JWT token for immediate login
    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser;

    return res.status(201).json({ 
      message: "User created", 
      user: userWithoutPassword,
      token 
    });
  } catch (error) {
    // Catch unexpected errors (db errors, runtime errors, etc.)
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * LOGIN
 * Logs user in:
 * 1) find user by email
 * 2) compare provided password to hashed password from DB
 * 3) sign JWT with (id, role)
 * 4) return token + user
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1) Look up user by email
    const user = await prisma.user.findUnique({ where: { email } });

    // Not found -> 404
    if (!user) return res.status(404).json({ message: "User not found" });

    // 2) Compare raw password with hashed password in DB
    const validPassword = await bcrypt.compare(password, user.password);

    // Wrong password -> 401
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 3) Create a JWT token.
    // Payload is the data you'll later read after verifying the token.
    const token = jwt.sign(
      { id: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    /**
     * ⚠️ SECURITY NOTE:
     * Returning `user` may include hashed password.
     * Safer to select/return only allowed fields.
     */
    return res.json({ token, user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};

/**
 * ME
 * Returns current user info.
 *
 * IMPORTANT: This expects `req.userId` to be set by some auth middleware.
 * But in YOUR uploaded `authMiddleware.ts`, the middleware sets `req.user`, not `req.userId`.
 * So unless you have another middleware or type augmentation, this can return undefined userId.
 */
export const me = async (req: Request, res: Response) => {
  try {
    // @ts-ignore because Express Request type doesn't include `userId` by default.
    // (Better solution is to extend the Request type globally.)
    // @ts-ignore
    const userId = req.userId;

    // Fetch user by the decoded userId
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error", error });
  }
};
