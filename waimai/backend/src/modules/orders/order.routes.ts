import { ActorType, OrderStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { createOrderNo } from "../../shared/utils/orderNo.js";

export const orderRouter = Router();

const createOrderSchema = z.object({
  addressId: z.string().min(1),
  remark: z.string().max(200).optional()
});

orderRouter.use(requireActor(ActorType.USER));

orderRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const input = createOrderSchema.parse(req.body);
    const userId = req.actor!.id;

    const [address, cartItems] = await Promise.all([
      prisma.userAddress.findFirst({ where: { id: input.addressId, userId } }),
      prisma.cartItem.findMany({
        where: { userId },
        include: { product: true, shop: true }
      })
    ]);

    if (!address) {
      throw new AppError(404, "收货地址不存在", "ADDRESS_NOT_FOUND");
    }
    if (cartItems.length === 0) {
      throw new AppError(400, "购物车为空", "CART_EMPTY");
    }

    const shopId = cartItems[0].shopId;
    const mixedShop = cartItems.some((item) => item.shopId !== shopId);
    if (mixedShop) {
      throw new AppError(400, "一个订单只能购买一家商家的商品", "ORDER_SHOP_CONFLICT");
    }

    const shop = cartItems[0].shop;
    if (shop.status !== "OPEN") {
      throw new AppError(400, "商家当前未营业", "SHOP_CLOSED");
    }

    for (const item of cartItems) {
      if (!item.product.isOnSale || item.product.stock < item.quantity) {
        throw new AppError(400, `商品库存不足或已下架: ${item.product.name}`, "PRODUCT_NOT_AVAILABLE");
      }
    }

    const goodsAmount = cartItems.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    if (goodsAmount < shop.minOrderAmount) {
      throw new AppError(400, "未达到起送价", "MIN_ORDER_AMOUNT_NOT_MET");
    }

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNo: createOrderNo(),
          userId,
          shopId,
          addressSnapshot: {
            name: address.name,
            phone: address.phone,
            region: address.region,
            detail: address.detail
          },
          remark: input.remark,
          goodsAmount,
          deliveryFee: shop.deliveryFee,
          totalAmount: goodsAmount + shop.deliveryFee,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              productImageUrl: item.product.imageUrl,
              unitPrice: item.product.price,
              quantity: item.quantity,
              totalPrice: item.product.price * item.quantity
            }))
          },
          statusLogs: {
            create: {
              toStatus: OrderStatus.PENDING_PAYMENT,
              actorType: ActorType.USER,
              actorId: userId,
              note: "用户提交订单"
            }
          }
        },
        include: { items: true }
      });

      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } }
        });
      }

      await tx.cartItem.deleteMany({ where: { userId } });
      return created;
    });

    res.status(201).json({ data: order });
  })
);

orderRouter.post(
  "/:orderId/pay/mock",
  asyncHandler(async (req, res) => {
    const userId = req.actor!.id;
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId }
    });

    if (!order) {
      throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
    }
    if (order.status !== "PENDING_PAYMENT") {
      throw new AppError(400, "当前订单状态不可支付", "ORDER_STATUS_INVALID");
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        paymentStatus: "PAID",
        paidAt: new Date(),
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: "PAID",
            actorType: ActorType.USER,
            actorId: userId,
            note: "模拟支付成功，后续替换为微信支付回调"
          }
        }
      },
      include: { items: true, shop: true }
    });

    res.json({ data: updated });
  })
);

orderRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { userId: req.actor!.id },
      include: {
        shop: true,
        items: true,
        deliveryOrder: { include: { rider: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: orders });
  })
);

orderRouter.get(
  "/:orderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: { id: req.params.orderId, userId: req.actor!.id },
      include: {
        shop: true,
        items: true,
        statusLogs: { orderBy: { createdAt: "asc" } },
        deliveryOrder: { include: { rider: true } }
      }
    });

    if (!order) {
      throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
    }

    res.json({ data: order });
  })
);
