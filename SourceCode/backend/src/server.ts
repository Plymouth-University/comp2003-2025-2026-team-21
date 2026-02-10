import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth";
import postsRoutes from "./routes/posts";
import eventsRoutes from "./routes/events";

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
app.use(express.json({ limit: "10mb" })); // Increased limit for image uploads


/**
 * Mount auth routes under /auth
 * This means the router in routes/auth.ts becomes:
 *  POST /auth/register
 *  POST /auth/login
 *  GET  /auth/me
 */
app.use("/auth", authRoutes);

/**
 * Mount posts routes under /posts
 * This means the router in routes/posts.ts becomes:
 *  POST /posts
 *  GET  /posts
 *  GET  /posts/user/:userId
 *  DELETE /posts/:postId
 */
app.use("/posts", postsRoutes);

/**
 * Mount events routes under /events
 * This means the router in routes/events.ts becomes:
 *  GET  /events
 *  POST /events
 */
app.use("/events", eventsRoutes);

/**
 * Simple health check endpoint.
 * Useful to confirm server is up.
 */
app.get("/", (req, res) => {
  res.send("UniVerse backend is running 🚀");
});

/**
 * Start server on PORT from env, else default 3001.
 */
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
