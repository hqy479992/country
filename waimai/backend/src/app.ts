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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(morgan("dev"));

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api/shops", shopRouter);
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
