import { Request, Response, NextFunction } from "express";

/**
 * ROLE MIDDLEWARE FACTORY
 *
 * Usage:
 *   router.get("/admin", authMiddleware, requireRole("ORGANISATION"), handler)
 *
 * - First you authenticate (authMiddleware attaches req.user)
 * - Then you authorize (requireRole checks req.user.role)
 */
export const requireRole = (role: "STUDENT" | "ORGANISATION") => {
  // Return the real Express middleware function:
  return (req: Request, res: Response, next: NextFunction) => {
    /**
     * If authMiddleware didn't run, or token wasn't valid,
     * req.user won't exist -> not authenticated.
     */
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    /**
     * Compare user's role from token payload with required role.
     * If mismatch -> forbidden.
     */
    if (req.user.role !== role) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    // Role is allowed -> proceed to the route handler
    next();
  };
};

export const requireAnyRole = (roles: Array<"STUDENT" | "ORGANISATION">) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!roles.includes(req.user.role as "STUDENT" | "ORGANISATION")) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};
