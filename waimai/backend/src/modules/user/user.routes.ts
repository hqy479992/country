import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";

export const userRouter = Router();

userRouter.use(requireActor(ActorType.USER));

const addressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  detail: z.string().min(1),
  isDefault: z.boolean().default(false)
});

const updateAddressSchema = addressSchema.partial();

const errandAddressSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  detail: z.string().min(1)
});

const createErrandOrderSchema = z.object({
  serviceType: z.enum(["DELIVERY", "BUY", "HELP"]).default("DELIVERY"),
  deliveryMode: z.enum(["SEND", "PICK", "EXPRESS"]).default("SEND"),
  vehicleType: z.enum(["BIKE", "CAR"]).default("BIKE"),
  pickupAddress: errandAddressSchema,
  deliveryAddress: errandAddressSchema,
  itemNote: z.string().max(200).optional(),
  remark: z.string().max(300).optional()
});

function generateErrandOrderNo() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp = `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  return `PT${stamp}${Math.floor(Math.random() * 9000 + 1000)}`;
}

userRouter.get(
  "/profile",
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.actor!.id },
      select: {
        id: true,
        phone: true,
        nickname: true,
        createdAt: true
      }
    });

    if (!user) {
      throw new AppError(404, "用户不存在", "USER_NOT_FOUND");
    }

    res.json({ data: user });
  })
);

userRouter.get(
  "/addresses",
  asyncHandler(async (req, res) => {
    const addresses = await prisma.userAddress.findMany({
      where: { userId: req.actor!.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }]
    });

    res.json({ data: addresses });
  })
);

userRouter.get(
  "/errand-orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.errandOrder.findMany({
      where: { userId: req.actor!.id },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: orders });
  })
);

userRouter.post(
  "/errand-orders",
  asyncHandler(async (req, res) => {
    const input = createErrandOrderSchema.parse(req.body);
    const baseFee = input.vehicleType === "CAR" ? 1800 : 1000;
    const serviceFee = input.serviceType === "BUY" ? 300 : input.serviceType === "HELP" ? 500 : 0;
    const order = await prisma.errandOrder.create({
      data: {
        orderNo: generateErrandOrderNo(),
        userId: req.actor!.id,
        serviceType: input.serviceType,
        deliveryMode: input.deliveryMode,
        vehicleType: input.vehicleType,
        pickupAddressSnapshot: input.pickupAddress,
        deliveryAddressSnapshot: input.deliveryAddress,
        itemNote: input.itemNote,
        remark: input.remark,
        distanceText: "预计1分钟内接单",
        baseFee,
        totalAmount: baseFee + serviceFee,
        paidAt: new Date()
      }
    });

    res.status(201).json({ data: order });
  })
);

userRouter.get(
  "/errand-orders/:orderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.errandOrder.findFirst({
      where: { id: req.params.orderId, userId: req.actor!.id }
    });

    if (!order) {
      throw new AppError(404, "跑腿订单不存在", "ERRAND_ORDER_NOT_FOUND");
    }

    res.json({ data: order });
  })
);

userRouter.post(
  "/addresses",
  asyncHandler(async (req, res) => {
    const input = addressSchema.parse(req.body);
    const address = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId: req.actor!.id },
          data: { isDefault: false }
        });
      }

      return tx.userAddress.create({
        data: {
          ...input,
          userId: req.actor!.id
        }
      });
    });

    res.status(201).json({ data: address });
  })
);

userRouter.put(
  "/addresses/:addressId",
  asyncHandler(async (req, res) => {
    const input = updateAddressSchema.parse(req.body);
    const current = await prisma.userAddress.findFirst({
      where: { id: req.params.addressId, userId: req.actor!.id }
    });

    if (!current) {
      throw new AppError(404, "地址不存在", "ADDRESS_NOT_FOUND");
    }

    const address = await prisma.$transaction(async (tx) => {
      if (input.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId: req.actor!.id },
          data: { isDefault: false }
        });
      }

      return tx.userAddress.update({
        where: { id: current.id },
        data: input
      });
    });

    res.json({ data: address });
  })
);

userRouter.post(
  "/addresses/:addressId/default",
  asyncHandler(async (req, res) => {
    const current = await prisma.userAddress.findFirst({
      where: { id: req.params.addressId, userId: req.actor!.id }
    });

    if (!current) {
      throw new AppError(404, "地址不存在", "ADDRESS_NOT_FOUND");
    }

    const address = await prisma.$transaction(async (tx) => {
      await tx.userAddress.updateMany({
        where: { userId: req.actor!.id },
        data: { isDefault: false }
      });

      return tx.userAddress.update({
        where: { id: current.id },
        data: { isDefault: true }
      });
    });

    res.json({ data: address });
  })
);

userRouter.delete(
  "/addresses/:addressId",
  asyncHandler(async (req, res) => {
    await prisma.userAddress.deleteMany({
      where: { id: req.params.addressId, userId: req.actor!.id }
    });

    res.status(204).send();
  })
);
