import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

/**
 * This is the shape we EXPECT to be inside the JWT token payload.
 * Your /routes/auth.ts signs a token with { id, email, role } which matches this.
 */
interface JwtPayload {
  id: string;
  email: string;
  role: string;
}

/**
 * AUTH MIDDLEWARE
 * Protects routes by requiring a valid JWT.
 *
 * How it works:
 * 1) read Authorization header
 * 2) extract token (supports "Bearer <token>" format)
 * 3) verify token signature + expiry using JWT_SECRET
 * 4) attach decoded payload to req.user
 * 5) call next() to continue to the route handler
 */
export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Example: Authorization: Bearer eyJhbGciOi...
  const authHeader = req.headers.authorization;

  // No auth header means the request isn't authenticated
  if (!authHeader) {
    return res.status(401).json({ error: "Missing authorization header" });
  }

  /**
   * If header starts with "Bearer ", split it to get the real token.
   * Otherwise treat the header as the raw token (some clients send it that way).
   */
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  // If we still don't have a token, reject
  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    /**
     * jwt.verify does two main things:
     * - checks the token was signed with our JWT_SECRET (signature verification)
     * - checks token isn't expired (if it has exp)
     *
     * If verification fails, it throws.
     */
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JwtPayload;

    /**
     * Attach the decoded payload to the request so downstream handlers can use it:
     * - req.user.id
     * - req.user.email
     * - req.user.role
     *
     * NOTE: Express's Request type doesn't include `user` by default.
     * Many projects fix this by declaring a global type augmentation.
     * If you don't have that, TypeScript will complain here.
     */
    req.user = decoded;

    // Continue to the next middleware/route
    next();
  } catch (err: any) {
    // If token is valid but expired
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    }

    // Any other verification error (bad signature, malformed token, etc.)
    return res.status(403).json({ error: "Invalid token" });
  }
};
