import { ActorType } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";

export const riderRouter = Router();

riderRouter.use(requireActor(ActorType.RIDER));

riderRouter.get(
  "/orders/available",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.deliveryOrder.findMany({
      where: { status: "PENDING_ASSIGN", riderId: null },
      include: {
        order: {
          include: {
            shop: true,
            items: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ data: orders });
  })
);

riderRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.deliveryOrder.findMany({
      where: { riderId: req.actor!.id },
      include: {
        order: {
          include: {
            shop: true,
            items: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: orders });
  })
);

riderRouter.get(
  "/orders/:deliveryOrderId",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.deliveryOrder.findFirst({
      where: {
        id: req.params.deliveryOrderId,
        OR: [{ riderId: req.actor!.id }, { riderId: null, status: "PENDING_ASSIGN" }]
      },
      include: {
        order: {
          include: {
            shop: true,
            items: true
          }
        },
        rider: true
      }
    });

    if (!delivery) {
      throw new AppError(404, "配送单不存在", "DELIVERY_ORDER_NOT_FOUND");
    }

    res.json({ data: delivery });
  })
);

riderRouter.post(
  "/orders/:deliveryOrderId/accept",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.deliveryOrder.findUnique({
      where: { id: req.params.deliveryOrderId },
      include: { order: true }
    });

    if (!delivery) {
      throw new AppError(404, "配送单不存在", "DELIVERY_ORDER_NOT_FOUND");
    }
    if (delivery.status !== "PENDING_ASSIGN" || delivery.riderId) {
      throw new AppError(400, "配送单已被接走", "DELIVERY_STATUS_INVALID");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextDelivery = await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: {
          riderId: req.actor!.id,
          status: "RIDER_ACCEPTED",
          acceptedAt: new Date()
        },
        include: { order: { include: { shop: true, items: true } }, rider: true }
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "RIDER_ACCEPTED",
          statusLogs: {
            create: {
              fromStatus: delivery.order.status,
              toStatus: "RIDER_ACCEPTED",
              actorType: ActorType.RIDER,
              actorId: req.actor!.id,
              note: "骑手已接单"
            }
          }
        }
      });

      return nextDelivery;
    });

    res.json({ data: updated });
  })
);

riderRouter.post(
  "/orders/:deliveryOrderId/pickup",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.deliveryOrder.findFirst({
      where: { id: req.params.deliveryOrderId, riderId: req.actor!.id },
      include: { order: true }
    });

    if (!delivery) {
      throw new AppError(404, "配送单不存在", "DELIVERY_ORDER_NOT_FOUND");
    }
    if (delivery.status !== "RIDER_ACCEPTED") {
      throw new AppError(400, "只有已接单配送单可以取货", "DELIVERY_STATUS_INVALID");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextDelivery = await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: {
          status: "PICKED_UP",
          pickedUpAt: new Date()
        },
        include: { order: { include: { shop: true, items: true } }, rider: true }
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "PICKED_UP",
          statusLogs: {
            create: {
              fromStatus: delivery.order.status,
              toStatus: "PICKED_UP",
              actorType: ActorType.RIDER,
              actorId: req.actor!.id,
              note: "骑手已取货"
            }
          }
        }
      });

      return nextDelivery;
    });

    res.json({ data: updated });
  })
);

riderRouter.post(
  "/orders/:deliveryOrderId/deliver",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.deliveryOrder.findFirst({
      where: { id: req.params.deliveryOrderId, riderId: req.actor!.id },
      include: { order: true }
    });

    if (!delivery) {
      throw new AppError(404, "配送单不存在", "DELIVERY_ORDER_NOT_FOUND");
    }
    if (delivery.status !== "PICKED_UP") {
      throw new AppError(400, "只有已取货配送单可以送达", "DELIVERY_STATUS_INVALID");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const nextDelivery = await tx.deliveryOrder.update({
        where: { id: delivery.id },
        data: {
          status: "DELIVERED",
          deliveredAt: now
        },
        include: { order: { include: { shop: true, items: true } }, rider: true }
      });

      await tx.order.update({
        where: { id: delivery.orderId },
        data: {
          status: "COMPLETED",
          completedAt: now,
          statusLogs: {
            create: [
              {
                fromStatus: delivery.order.status,
                toStatus: "DELIVERED",
                actorType: ActorType.RIDER,
                actorId: req.actor!.id,
                note: "骑手已送达"
              },
              {
                fromStatus: "DELIVERED",
                toStatus: "COMPLETED",
                actorType: ActorType.RIDER,
                actorId: req.actor!.id,
                note: "订单自动完成"
              }
            ]
          }
        }
      });

      return nextDelivery;
    });

    res.json({ data: updated });
  })
);
