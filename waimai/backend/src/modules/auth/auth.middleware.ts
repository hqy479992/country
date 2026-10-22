import { ActorType } from "@prisma/client";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { hashToken } from "./auth.service.js";

export function requireActor(type?: ActorType) {
  return asyncHandler(async (req, _res, next) => {
    if (type === ActorType.USER) {
      const authorization = req.header("authorization") || "";
      if (!authorization.startsWith("Bearer ") || authorization.length > 200)
        throw new AppError(401, "请先登录", "UNAUTHORIZED");
      const session = await prisma.userSession.findUnique({
        where: { tokenHash: hashToken(authorization.slice(7)) },
      });
      if (!session || session.expiresAt <= new Date())
        throw new AppError(401, "登录已过期，请重新登录", "SESSION_EXPIRED");
      req.actor = { type: ActorType.USER, id: session.userId };
      next();
      return;
    }
    const actorType = (
      req.header("x-actor-type") || ""
    ).toUpperCase() as ActorType;
    const actorId = req.header("x-actor-id") || "";
    if (
      ![ActorType.ADMIN, ActorType.MERCHANT, ActorType.RIDER].includes(
        actorType as "ADMIN" | "MERCHANT" | "RIDER",
      ) ||
      !actorId ||
      (type && actorType !== type)
    )
      throw new AppError(401, "请提供有效的工作人员身份", "UNAUTHORIZED");
    const expected =
      actorType === "ADMIN"
        ? env.adminAccessKey
        : env.staffAccessKeys[`${actorType}:${actorId}`];
    const provided = req.header("x-access-key") || "";
    const left = Buffer.from(expected || "");
    const right = Buffer.from(provided);
    if (
      !expected ||
      left.length !== right.length ||
      !timingSafeEqual(left, right)
    )
      throw new AppError(401, "访问凭证不正确或未配置", "STAFF_UNAUTHORIZED");
    req.actor = { type: actorType, id: actorId };
    next();
  });
}
