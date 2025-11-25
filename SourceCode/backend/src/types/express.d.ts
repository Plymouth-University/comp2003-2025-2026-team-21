import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: any;
  }
}

declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email: string;
      role: "STUDENT" | "ORGANISATION";
    };
  }
}
