import type { NextFunction, Request, Response } from "express";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

/** Wraps an async route so thrown errors reach the error middleware. */
export const asyncHandler =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(fn(req, res, next)).catch(next);
