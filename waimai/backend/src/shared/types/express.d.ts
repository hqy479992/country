import type { ActorType } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      actor?: {
        type: ActorType;
        id: string;
      };
    }
  }
}
