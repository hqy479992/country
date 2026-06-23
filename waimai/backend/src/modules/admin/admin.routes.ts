import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { AppError } from "../../shared/errors/AppError.js";

export const adminRouter = Router();

adminRouter.use(requireActor(ActorType.ADMIN));

const productCategorySchema = z.enum(["FOOD", "DRINK", "FRUIT_VEGETABLE", "CONVENIENCE"]);

const optionalText = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().optional()
);

const createShopSchema = z.object({
  merchantName: z.string().min(1),
  merchantPhone: optionalText,
  shopName: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  logoUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  ),
  coverUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  ),
  deliveryFee: z.number().int().min(0).default(0),
  minOrderAmount: z.number().int().min(0).default(0)
});

const updateShopSchema = z.object({
  name: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  logoUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  ),
  coverUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  ),
  deliveryFee: z.number().int().min(0).optional(),
  minOrderAmount: z.number().int().min(0).optional(),
  status: z.enum(["OPEN", "CLOSED"]).optional()
});

const createProductSchema = z.object({
  name: z.string().min(1),
  description: optionalText,
  category: productCategorySchema.default("FOOD"),
  imageUrl: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.string().url().optional()
  ),
  price: z.number().int().positive(),
  stock: z.number().int().min(0).default(9999)
});

const createRiderSchema = z.object({
  name: z.string().min(1),
  phone: optionalText
});

const createUserSchema = z.object({
  nickname: optionalText,
  phone: optionalText
});

const createAddressSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1),
  phone: z.string().min(1),
  region: z.string().min(1),
  detail: z.string().min(1),
  isDefault: z.boolean().default(false)
});

adminRouter.post(
  "/users",
  asyncHandler(async (req, res) => {
    const input = createUserSchema.parse(req.body);
    const user = await prisma.user.create({ data: input });
    res.status(201).json({ data: user });
  })
);

adminRouter.get(
  "/users",
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      include: {
        addresses: {
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: users });
  })
);

adminRouter.post(
  "/addresses",
  asyncHandler(async (req, res) => {
    const input = createAddressSchema.parse(req.body);
    const address = await prisma.userAddress.create({ data: input });
    res.status(201).json({ data: address });
  })
);

adminRouter.get(
  "/addresses",
  asyncHandler(async (_req, res) => {
    const addresses = await prisma.userAddress.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: addresses });
  })
);

adminRouter.post(
  "/shops",
  asyncHandler(async (req, res) => {
    const input = createShopSchema.parse(req.body);
    const shop = await prisma.shop.create({
      data: {
        name: input.shopName,
        address: input.address,
        phone: input.phone,
        logoUrl: input.logoUrl,
        coverUrl: input.coverUrl,
        deliveryFee: input.deliveryFee,
        minOrderAmount: input.minOrderAmount,
        merchant: {
          create: {
            name: input.merchantName,
            phone: input.merchantPhone
          }
        }
      },
      include: { merchant: true }
    });

    res.status(201).json({ data: shop });
  })
);

adminRouter.put(
  "/shops/:shopId",
  asyncHandler(async (req, res) => {
    const input = updateShopSchema.parse(req.body);
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.shopId }
    });

    if (!shop) {
      throw new AppError(404, "商家不存在", "SHOP_NOT_FOUND");
    }

    const updated = await prisma.shop.update({
      where: { id: shop.id },
      data: input,
      include: {
        merchant: true,
        products: { orderBy: { createdAt: "desc" } },
        _count: { select: { orders: true } }
      }
    });

    res.json({ data: updated });
  })
);

adminRouter.get(
  "/shops",
  asyncHandler(async (_req, res) => {
    const shops = await prisma.shop.findMany({
      include: {
        merchant: true,
        products: {
          orderBy: { createdAt: "desc" }
        },
        _count: {
          select: { orders: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: shops });
  })
);

adminRouter.get(
  "/shops/:shopId/products",
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.shopId },
      include: {
        products: {
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!shop) {
      throw new AppError(404, "商家不存在", "SHOP_NOT_FOUND");
    }

    res.json({ data: shop.products });
  })
);

adminRouter.post(
  "/shops/:shopId/products",
  asyncHandler(async (req, res) => {
    const input = createProductSchema.parse(req.body);
    const product = await prisma.product.create({
      data: {
        ...input,
        shopId: req.params.shopId
      }
    });

    res.status(201).json({ data: product });
  })
);

adminRouter.get(
  "/riders",
  asyncHandler(async (_req, res) => {
    const riders = await prisma.rider.findMany({
      include: {
        _count: {
          select: { deliveryOrders: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: riders });
  })
);

adminRouter.post(
  "/riders",
  asyncHandler(async (req, res) => {
    const input = createRiderSchema.parse(req.body);
    const rider = await prisma.rider.create({ data: input });
    res.status(201).json({ data: rider });
  })
);

adminRouter.get(
  "/orders",
  asyncHandler(async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: {
        user: true,
        shop: { include: { merchant: true } },
        items: true,
        deliveryOrder: { include: { rider: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ data: orders });
  })
);

adminRouter.get(
  "/orders/:orderId",
  asyncHandler(async (req, res) => {
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: {
        user: true,
        shop: { include: { merchant: true } },
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
