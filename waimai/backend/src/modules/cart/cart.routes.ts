import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";

export const cartRouter = Router();

cartRouter.use(requireActor(ActorType.USER));

const addCartItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1)
});

const updateCartItemSchema = z.object({
  quantity: z.number().int().positive()
});

cartRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const items = await prisma.cartItem.findMany({
      where: { userId: req.actor!.id },
      include: {
        shop: true,
        product: true
      },
      orderBy: { createdAt: "asc" }
    });

    res.json({ data: items });
  })
);

cartRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const input = addCartItemSchema.parse(req.body);
    const product = await prisma.product.findUnique({
      where: { id: input.productId },
      include: { shop: true }
    });

    if (!product || !product.isOnSale) {
      throw new AppError(404, "商品不存在或已下架", "PRODUCT_NOT_AVAILABLE");
    }
    if (product.shop.status !== "OPEN") {
      throw new AppError(400, "商家当前未营业", "SHOP_CLOSED");
    }

    const existingDifferentShop = await prisma.cartItem.findFirst({
      where: {
        userId: req.actor!.id,
        shopId: { not: product.shopId }
      }
    });

    if (existingDifferentShop) {
      throw new AppError(400, "购物车暂只支持同一家商家的商品", "CART_SHOP_CONFLICT");
    }

    const existing = await prisma.cartItem.findFirst({
      where: {
        userId: req.actor!.id,
        productId: product.id
      }
    });

    const item = existing
      ? await prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + input.quantity }
        })
      : await prisma.cartItem.create({
          data: {
            userId: req.actor!.id,
            shopId: product.shopId,
            productId: product.id,
            quantity: input.quantity
          }
        });

    res.status(201).json({ data: item });
  })
);

cartRouter.patch(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const input = updateCartItemSchema.parse(req.body);
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, userId: req.actor!.id }
    });

    if (!item) {
      throw new AppError(404, "购物车商品不存在", "CART_ITEM_NOT_FOUND");
    }

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity }
    });

    res.json({ data: updated });
  })
);

cartRouter.post(
  "/items/:itemId/quantity",
  asyncHandler(async (req, res) => {
    const input = updateCartItemSchema.parse(req.body);
    const item = await prisma.cartItem.findFirst({
      where: { id: req.params.itemId, userId: req.actor!.id }
    });

    if (!item) {
      throw new AppError(404, "购物车商品不存在", "CART_ITEM_NOT_FOUND");
    }

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity: input.quantity }
    });

    res.json({ data: updated });
  })
);

cartRouter.delete(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    await prisma.cartItem.deleteMany({
      where: { id: req.params.itemId, userId: req.actor!.id }
    });

    res.status(204).send();
  })
);

cartRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await prisma.cartItem.deleteMany({ where: { userId: req.actor!.id } });
    res.status(204).send();
  })
);
