import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";

export const merchantRouter = Router();

merchantRouter.use(requireActor(ActorType.MERCHANT));

const productCategorySchema = z.enum(["FOOD", "DRINK", "FRUIT_VEGETABLE", "CONVENIENCE"]);

const productSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: productCategorySchema.default("FOOD"),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).default(9999),
  isOnSale: z.boolean().optional()
});

const updateProductSchema = productSchema.partial();

const updateStockSchema = z.object({
  stock: z.number().int().min(0)
});

const updateShopStatusSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"])
});

const updateShopProfileSchema = z.object({
  phone: z.string().min(1).optional(),
  announcement: z.string().max(300).optional(),
  businessHours: z.string().max(100).optional()
});

async function getMerchantShop(merchantId: string) {
  const shop = await prisma.shop.findFirst({
    where: { merchantId },
    include: {
      products: { orderBy: { createdAt: "desc" } }
    }
  });

  if (!shop) {
    throw new AppError(404, "店铺不存在", "SHOP_NOT_FOUND");
  }

  return shop;
}

async function assertMerchantOwnsProduct(merchantId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      shop: { merchantId }
    },
    include: { shop: true }
  });

  if (!product) {
    throw new AppError(404, "商品不存在", "PRODUCT_NOT_FOUND");
  }

  return product;
}

async function assertMerchantOwnsOrder(merchantId: string, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      shop: { merchantId }
    },
    include: { items: true, shop: true, deliveryOrder: true }
  });

  if (!order) {
    throw new AppError(404, "订单不存在", "ORDER_NOT_FOUND");
  }

  return order;
}

merchantRouter.get(
  "/dashboard",
  asyncHandler(async (req, res) => {
    const shop = await getMerchantShop(req.actor!.id);
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: {
        shopId: shop.id,
        createdAt: { gte: startOfDay }
      },
      select: {
        status: true,
        totalAmount: true
      }
    });

    const completedOrders = orders.filter((order) => order.status === "COMPLETED");
    const dashboard = {
      shop,
      todayOrderCount: orders.length,
      todayRevenue: completedOrders.reduce((sum, order) => sum + order.totalAmount, 0),
      pendingCount: orders.filter((order) => order.status === "PAID").length,
      makingCount: orders.filter((order) => order.status === "MERCHANT_ACCEPTED").length,
      readyCount: orders.filter((order) => order.status === "READY_FOR_PICKUP").length
    };

    res.json({ data: dashboard });
  })
);

merchantRouter.get(
  "/shop",
  asyncHandler(async (req, res) => {
    const shop = await getMerchantShop(req.actor!.id);
    res.json({ data: shop });
  })
);

merchantRouter.post(
  "/shop/status",
  asyncHandler(async (req, res) => {
    const input = updateShopStatusSchema.parse(req.body);
    const shop = await getMerchantShop(req.actor!.id);
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: { status: input.status },
      include: { products: { orderBy: { createdAt: "desc" } } }
    });

    res.json({ data: updated });
  })
);

merchantRouter.put(
  "/shop/profile",
  asyncHandler(async (req, res) => {
    const input = updateShopProfileSchema.parse(req.body);
    const shop = await getMerchantShop(req.actor!.id);
    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: input,
      include: { products: { orderBy: { createdAt: "desc" } } }
    });

    res.json({ data: updated });
  })
);

merchantRouter.get(
  "/products",
  asyncHandler(async (req, res) => {
    const shop = await getMerchantShop(req.actor!.id);
    res.json({ data: shop.products });
  })
);

merchantRouter.post(
  "/products",
  asyncHandler(async (req, res) => {
    const input = productSchema.parse(req.body);
    const shop = await getMerchantShop(req.actor!.id);
    const product = await prisma.product.create({
      data: {
        shopId: shop.id,
        name: input.name,
        description: input.description,
        category: input.category,
        price: input.price,
        stock: input.stock,
        isOnSale: input.isOnSale ?? true
      }
    });

    res.status(201).json({ data: product });
  })
);

merchantRouter.put(
  "/products/:productId",
  asyncHandler(async (req, res) => {
    const input = updateProductSchema.parse(req.body);
    const product = await assertMerchantOwnsProduct(req.actor!.id, req.params.productId);
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: input
    });

    res.json({ data: updated });
  })
);

merchantRouter.post(
  "/products/:productId/on-sale",
  asyncHandler(async (req, res) => {
    const product = await assertMerchantOwnsProduct(req.actor!.id, req.params.productId);
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { isOnSale: true }
    });

    res.json({ data: updated });
  })
);

merchantRouter.post(
  "/products/:productId/off-sale",
  asyncHandler(async (req, res) => {
    const product = await assertMerchantOwnsProduct(req.actor!.id, req.params.productId);
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { isOnSale: false }
    });

    res.json({ data: updated });
  })
);

merchantRouter.post(
  "/products/:productId/stock",
  asyncHandler(async (req, res) => {
    const input = updateStockSchema.parse(req.body);
    const product = await assertMerchantOwnsProduct(req.actor!.id, req.params.productId);
    const updated = await prisma.product.update({
      where: { id: product.id },
      data: { stock: input.stock }
    });

    res.json({ data: updated });
  })
);

merchantRouter.get(
  "/orders",
  asyncHandler(async (req, res) => {
    const orders = await prisma.order.findMany({
      where: { shop: { merchantId: req.actor!.id } },
      include: {
        items: true,
        shop: true,
        deliveryOrder: { include: { rider: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: orders });
  })
);

merchantRouter.get(
  "/orders/:orderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findFirst({
      where: {
        id: req.params.orderId,
        shop: { merchantId: req.actor!.id }
      },
      include: {
        items: true,
        shop: true,
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

merchantRouter.post(
  "/orders/:orderId/accept",
  asyncHandler(async (req, res) => {
    const order = await assertMerchantOwnsOrder(req.actor!.id, req.params.orderId);

    if (order.status !== "PAID") {
      throw new AppError(400, "只有已支付订单可以接单", "ORDER_STATUS_INVALID");
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "MERCHANT_ACCEPTED",
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: "MERCHANT_ACCEPTED",
            actorType: ActorType.MERCHANT,
            actorId: req.actor!.id,
            note: "商家已接单"
          }
        }
      },
      include: { items: true, shop: true }
    });

    res.json({ data: updated });
  })
);

merchantRouter.post(
  "/orders/:orderId/reject",
  asyncHandler(async (req, res) => {
    const order = await assertMerchantOwnsOrder(req.actor!.id, req.params.orderId);

    if (order.status !== "PAID") {
      throw new AppError(400, "只有已支付待接单订单可以拒单", "ORDER_STATUS_INVALID");
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        paymentStatus: "CLOSED",
        cancelledAt: new Date(),
        statusLogs: {
          create: {
            fromStatus: order.status,
            toStatus: "CANCELLED",
            actorType: ActorType.MERCHANT,
            actorId: req.actor!.id,
            note: "商家拒单，后续接入退款"
          }
        }
      }
    });

    res.json({ data: updated });
  })
);

merchantRouter.post(
  "/orders/:orderId/ready",
  asyncHandler(async (req, res) => {
    const order = await assertMerchantOwnsOrder(req.actor!.id, req.params.orderId);

    if (order.status !== "MERCHANT_ACCEPTED") {
      throw new AppError(400, "只有已接单订单可以标记出餐", "ORDER_STATUS_INVALID");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const nextOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "READY_FOR_PICKUP",
          statusLogs: {
            create: {
              fromStatus: order.status,
              toStatus: "READY_FOR_PICKUP",
              actorType: ActorType.MERCHANT,
              actorId: req.actor!.id,
              note: "商家已出餐，等待骑手接单"
            }
          }
        },
        include: { items: true, shop: true }
      });

      await tx.deliveryOrder.create({
        data: {
          orderId: order.id,
          status: "PENDING_ASSIGN"
        }
      });

      return nextOrder;
    });

    res.json({ data: updated });
  })
);
