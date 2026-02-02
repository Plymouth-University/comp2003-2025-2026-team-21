import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import uploadRoutes from "./routes/upload";
import { PrismaClient } from "@prisma/client";

/**
 * Loads variables from .env into process.env
 * Example:
 *  PORT=3001
 *  JWT_SECRET=supersecret
 */
dotenv.config();

const app = express();

/**
 * GLOBAL MIDDLEWARE
 * - cors(): allow requests from different origins (frontend dev server, etc.)
 * - express.json(): allows Express to parse JSON request bodies into req.body
 */
app.use(cors());
app.use(express.json());

/**
 * Prisma client instance to query your database.
 * Used in /events endpoint below.
 */
const prisma = new PrismaClient();

/**
 * Mount auth routes under /auth
 * This means the router in routes/auth.ts becomes:
 *  POST /auth/register
 *  POST /auth/login
 *  GET  /auth/me
 */
app.use("/auth", authRoutes);

/**
 * Mount upload routes under /api
 * This means the router in routes/upload.ts becomes:
 *  POST /api/upload-image
 */
app.use("/api", uploadRoutes);

/**
 * Simple health check endpoint.
 * Useful to confirm server is up.
 */
app.get("/", (req, res) => {
  res.send("UniVerse backend is running 🚀");
});

/**
 * GET /events
 * Example data endpoint:
 * - Fetches all events from the DB
 * - orders by date ascending
 * - includes organiser relation
 */
app.get("/events", async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: { organiser: true },
    });

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Could not fetch events" });
  }
});

/**
 * Start server on PORT from env, else default 3001.
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
