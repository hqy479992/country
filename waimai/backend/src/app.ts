import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { adminRouter } from "./modules/admin/admin.routes.js";
import { cartRouter } from "./modules/cart/cart.routes.js";
import { merchantRouter } from "./modules/merchant/merchant.routes.js";
import { orderRouter } from "./modules/orders/order.routes.js";
import { riderRouter } from "./modules/rider/rider.routes.js";
import { shopRouter } from "./modules/shops/shop.routes.js";
import { userRouter } from "./modules/user/user.routes.js";
import { errorHandler } from "./shared/middleware/errorHandler.js";
import { notFound } from "./shared/middleware/notFound.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { requireActor } from "./modules/auth/auth.middleware.js";
import { env } from "./config/env.js";

import {
  errandRouter,
  adminErrandRouter,
  riderErrandRouter,
} from "./modules/errands/errand.routes.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", "loopback");
  app.set("json replacer", (key: string, value: unknown) =>
    ["passwordHash", "tokenHash"].includes(key) ? undefined : value,
  );

  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));
  if (env.nodeEnv !== "test") app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/api/capabilities", (_req, res) => {
    res.json({
      data: {
        version: 2,
        accounts: true,
        errands: true,
        errandPricing: "manual",
        orderExpiryMinutes: 15,
        paymentMode: env.mockPaymentEnabled ? "mock" : "unavailable",
      },
    });
  });
  app.use("/api/auth", authRouter);
  app.get("/api/staff/session", requireActor(), (req, res) =>
    res.json({ data: req.actor }),
  );
  app.use("/api/shops", shopRouter);
  app.use("/api/user/errand-orders", errandRouter);
  app.use("/api/admin/errand-orders", adminErrandRouter);
  app.use("/api/rider/errands", riderErrandRouter);
  app.use("/api/user", userRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/orders", orderRouter);
  app.use("/api/merchant", merchantRouter);
  app.use("/api/rider", riderRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
