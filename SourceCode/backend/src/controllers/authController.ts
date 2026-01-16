import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET!;

export const register = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;
    const rawRole = req.body?.role;
    const rawName = req.body?.name;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    const password =
      typeof rawPassword === "string" ? rawPassword : "";

    const name =
      typeof rawName === "string" && rawName.trim().length > 0
        ? rawName.trim()
        : "Student";

    const role: Role =
      rawRole === Role.ORGANISATION ? Role.ORGANISATION : Role.STUDENT;

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        name,
      },
    });

    const token = jwt.sign(
      { id: newUser.id, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.status(201).json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        name: newUser.name,
      },
    });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;

    const email =
      typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";

    const password =
      typeof rawPassword === "string" ? rawPassword : "";

    if (!email || !password) {
      return res.status(400).json({ message: "Missing email or password" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user.id, role: user.role },
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
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};

export const me = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        createdAt: true,
      },
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};