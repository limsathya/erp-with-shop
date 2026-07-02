import { Router } from "express";
import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { asyncHandler, HttpError } from "../utils/asyncHandler.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import {
  signAccessToken,
  issueRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
} from "../utils/jwt.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

const publicUser = (u: { id: string; name: string; email: string; role: string; avatarUrl: string | null }) => ({
  id: u.id, name: u.name, email: u.email, role: u.role, avatarUrl: u.avatarUrl,
});

const credentials = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const data = credentials.parse(req.body);
    const count = await prisma.user.count();
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: await hashPassword(data.password),
        // first account to register becomes the ADMIN
        role: count === 0 ? "ADMIN" : "STAFF",
      },
    });
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);
    res.status(201).json({ user: publicUser(user), accessToken, refreshToken });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = z
      .object({ email: z.string().email(), password: z.string() })
      .parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active || !(await verifyPassword(password, user.password))) {
      throw new HttpError(401, "Invalid email or password");
    }
    const accessToken = signAccessToken(user.id, user.role);
    const refreshToken = await issueRefreshToken(user.id);
    res.json({ user: publicUser(user), accessToken, refreshToken });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw new HttpError(401, "Invalid or expired refresh token");
    }
    // Rotate: revoke the used token, issue a fresh pair.
    await revokeRefreshToken(payload.sub, payload.jti);
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.active) throw new HttpError(401, "Account unavailable");
    const accessToken = signAccessToken(user.id, user.role);
    const newRefresh = await issueRefreshToken(user.id);
    res.json({ accessToken, refreshToken: newRefresh });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    const { refreshToken } = z.object({ refreshToken: z.string() }).parse(req.body);
    try {
      const payload = await verifyRefreshToken(refreshToken);
      await revokeRefreshToken(payload.sub, payload.jti);
    } catch {
      /* token already invalid — nothing to do */
    }
    res.json({ ok: true });
  })
);

router.get(
  "/me",
  authenticate,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) throw new HttpError(404, "User not found");
    res.json({ user: publicUser(user) });
  })
);

router.get(
  "/users",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
    });
    res.json(users);
  })
);

const createUserInput = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "MANAGER", "STAFF"]),
});

router.post(
  "/users",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const data = createUserInput.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new HttpError(409, "A user with this email already exists");
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: await hashPassword(data.password),
        role: data.role,
      },
    });
    res.status(201).json(publicUser(user));
  })
);

export default router;
