import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { env } from "../../config/env.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { createOrderNo } from "../../shared/utils/orderNo.js";
import {
  assertCartAvailable,
  lockUser,
  readCart,
  summarizeCart,
} from "../cart/cart.service.js";
import { closeUnpaidOrder, expireOrders } from "./order.service.js";

export const orderRouter = Router();
const include = {
  items: true,
  shop: true,
  statusLogs: { orderBy: { createdAt: "asc" as const } },
  deliveryOrder: { include: { rider: true } },
};
const createSchema = z.object({
  addressId: z.string().min(1),
  remark: z.string().trim().max(200).optional(),
  requestId: z.string().min(16).max(80),
  cartVersion: z.string().length(64),
});
orderRouter.use(requireActor(ActorType.USER));
orderRouter.use(
  asyncHandler(async (req, _res, next) => {
    await expireOrders(req.actor!.id);
    next();
  }),
);
orderRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createSchema.parse(req.body);
    const userId = req.actor!.id;
    const order = await prisma.$transaction(
      async (tx) => {
        await lockUser(tx, userId);
        const existing = await tx.order.findUnique({
          where: { userId_requestId: { userId, requestId: input.requestId } },
          include,
        });
        if (existing) return existing;
        const address = await tx.userAddress.findFirst({
          where: { id: input.addressId, userId },
        });
        if (!address)
          throw new AppError(
            404,
            "收货地址不存在，请重新选择",
            "ADDRESS_NOT_FOUND",
          );
        const summary = summarizeCart(await readCart(tx, userId));
        if (summary.version !== input.cartVersion)
          throw new AppError(
            409,
            "商品或价格已变化，请确认最新费用后再提交",
            "CART_CHANGED",
          );
        assertCartAvailable(summary);
        const shop = summary.shop!;
        for (const item of [...summary.items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        )) {
          const reserved = await tx.product.updateMany({
            where: {
              id: item.productId,
              stock: { gte: item.quantity },
              isOnSale: true,
              price: item.product.price,
            },
            data: { stock: { decrement: item.quantity } },
          });
          if (!reserved.count)
            throw new AppError(
              409,
              `${item.product.name}库存或价格已变化，请重新确认`,
              "PRODUCT_CHANGED",
            );
        }
        const created = await tx.order.create({
          data: {
            orderNo: createOrderNo(),
            userId,
            shopId: shop.id,
            requestId: input.requestId,
            expiresAt: new Date(Date.now() + 15 * 60_000),
            addressSnapshot: {
              name: address.name,
              phone: address.phone,
              region: address.region,
              detail: address.detail,
            },
            remark: input.remark,
            goodsAmount: summary.goodsAmount,
            deliveryFee: summary.deliveryFee,
            totalAmount: summary.totalAmount,
            items: {
              create: summary.items.map((item) => ({
                productId: item.productId,
                productName: item.product.name,
                productImageUrl: item.product.imageUrl,
                unitPrice: item.product.price,
                quantity: item.quantity,
                totalPrice: item.product.price * item.quantity,
              })),
            },
            statusLogs: {
              create: {
                toStatus: "PENDING_PAYMENT",
                actorType: "USER",
                actorId: userId,
                note: "用户提交订单，15分钟内完成支付",
              },
            },
          },
          include,
        });
        await tx.cartItem.deleteMany({ where: { userId } });
        return created;
      },
      { timeout: 10_000 },
    );
    res.status(201).json({ data: order });
  }),
);
orderRouter.post(
  "/:orderId/cancel",
  asyncHandler(async (req, res) => {
    const userId = req.actor!.id;
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: req.params.orderId, userId },
      });
      if (!order) throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
      if (
        order.status !== "CANCELLED" &&
        !(await closeUnpaidOrder(tx, order.id, userId, "用户取消未支付订单"))
      ) {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include,
        });
        if (current.status === "CANCELLED") return current;
        throw new AppError(
          409,
          "仅待支付订单可以取消，订单状态可能已更新",
          "ORDER_STATUS_INVALID",
        );
      }
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include });
    });
    res.json({ data: updated });
  }),
);
orderRouter.post(
  "/:orderId/pay/mock",
  asyncHandler(async (req, res) => {
    if (!env.mockPaymentEnabled)
      throw new AppError(
        403,
        "测试支付未开启，正式支付尚未接入",
        "PAYMENT_UNAVAILABLE",
      );
    const userId = req.actor!.id;
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findFirst({
        where: { id: req.params.orderId, userId },
      });
      if (!order) throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
      if (order.paymentStatus === "PAID")
        return tx.order.findUniqueOrThrow({ where: { id: order.id }, include });
      const result = await tx.order.updateMany({
        where: {
          id: order.id,
          status: "PENDING_PAYMENT",
          paymentStatus: "PENDING",
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: "PAID", paymentStatus: "PAID", paidAt: new Date() },
      });
      if (!result.count) {
        const current = await tx.order.findUniqueOrThrow({
          where: { id: order.id },
          include,
        });
        if (current.paymentStatus === "PAID") return current;
        throw new AppError(
          409,
          "订单已关闭、超时或状态已更新，请查看订单",
          "ORDER_STATUS_INVALID",
        );
      }
      await tx.orderStatusLog.create({
        data: {
          orderId: order.id,
          fromStatus: "PENDING_PAYMENT",
          toStatus: "PAID",
          actorType: "USER",
          actorId: userId,
          note: "测试支付成功，未扣款",
        },
      });
      return tx.order.findUniqueOrThrow({ where: { id: order.id }, include });
    });
    res.json({ data: updated });
  }),
);
orderRouter.get(
  "/",
  asyncHandler(async (req, res) =>
    res.json({
      data: await prisma.order.findMany({
        where: { userId: req.actor!.id },
        include,
        orderBy: { createdAt: "desc" },
      }),
    }),
  ),
);
orderRouter.get(
  "/:orderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.actor!.id },
      include,
    });
    if (!order) throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
    res.json({ data: order });
  }),
);
