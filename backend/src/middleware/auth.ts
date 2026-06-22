import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt.js";
import { HttpError } from "../utils/asyncHandler.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: string };
    }
  }
}

/** Requires a valid access token in the Authorization: Bearer header. */
export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing or invalid Authorization header"));
  }
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}

/** Restricts a route to the given roles (use after `authenticate`). */
export function authorize(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, "Not authenticated"));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new HttpError(403, "Insufficient permissions"));
    }
    next();
  };
}
