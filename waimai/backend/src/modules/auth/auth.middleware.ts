import { ActorType } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../../shared/errors/AppError.js";

const actorTypes = new Set(Object.values(ActorType));

export function requireActor(type?: ActorType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const actorType = String(req.header("x-actor-type") ?? "").toUpperCase();
    const actorId = req.header("x-actor-id");

    if (!actorTypes.has(actorType as ActorType) || !actorId) {
      throw new AppError(401, "请提供 x-actor-type 和 x-actor-id", "UNAUTHORIZED");
    }

    if (type && actorType !== type) {
      throw new AppError(403, "当前身份无权访问该接口", "FORBIDDEN");
    }

    req.actor = {
      type: actorType as ActorType,
      id: actorId
    };
    next();
  };
}
