import { Prisma } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import {
  createSession,
  hashPassword,
  hashToken,
  publicUserSelect,
  verifyPassword,
} from "./auth.service.js";
import { requireActor } from "./auth.middleware.js";

export const authRouter = Router();
const credentials = z.object({
  account: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9_]{4,24}$/, "账号需为4–24位字母、数字或下划线"),
  password: z.string().min(8, "密码至少8位").max(72, "密码最多72位"),
});
const registerSchema = credentials.extend({
  nickname: z.string().trim().min(1).max(24),
});
const attempts = new Map<string, { count: number; reset: number }>();
authRouter.use((req, res, next) => {
  if (!["/login", "/register"].includes(req.path)) return next();
  const now = Date.now();
  for (const [key, value] of attempts)
    if (value.reset < now) attempts.delete(key);
  const key = req.ip || "unknown";
  const item = attempts.get(key) || { count: 0, reset: now + 15 * 60_000 };
  if (item.count >= 60 || (!attempts.has(key) && attempts.size >= 10_000)) {
    res.setHeader("Retry-After", "900");
    return next(
      new AppError(429, "操作过于频繁，请稍后再试", "AUTH_RATE_LIMIT"),
    );
  }
  item.count += 1;
  attempts.set(key, item);
  next();
});
authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body);
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.user.create({
        data: {
          account: input.account,
          nickname: input.nickname,
          passwordHash,
        },
        select: publicUserSelect,
      });
      res
        .status(201)
        .json({ data: { user, ...(await createSession(user.id)) } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new AppError(409, "这个账号已被使用，请换一个", "ACCOUNT_EXISTS");
      throw error;
    }
  }),
);
authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = credentials.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { account: input.account },
    });
    const dummy = "0".repeat(32) + ":" + "0".repeat(128);
    const valid = await verifyPassword(
      input.password,
      user?.passwordHash || dummy,
    );
    if (!user || !user.passwordHash || !valid)
      throw new AppError(401, "账号或密码不正确", "LOGIN_FAILED");
    const profile = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: publicUserSelect,
    });
    res.json({ data: { user: profile, ...(await createSession(user.id)) } });
  }),
);
authRouter.post(
  "/logout",
  requireActor("USER"),
  asyncHandler(async (req, res) => {
    await prisma.userSession.deleteMany({
      where: {
        tokenHash: hashToken((req.header("authorization") || "").slice(7)),
      },
    });
    res.status(204).send();
  }),
);
